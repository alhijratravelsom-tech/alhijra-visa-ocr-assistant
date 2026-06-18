/* Alhijra Visa OCR Assistant - Firestore REST API Client
 * Phase 9: Real-time polling, conflict resolution, offline queue, audit log sync
 * Uses Firestore REST API directly (no Firebase SDK).
 */

var FIRESTORE_CONFIG = {
  apiKey: 'AIzaSyDDuq7aLPpQDw6IavfsQL2xtCXzRh9DYK8',
  authDomain: 'alhijra-visa-ocr-assistant.firebaseapp.com',
  projectId: 'alhijra-visa-ocr-assistant',
  storageBucket: 'alhijra-visa-ocr-assistant.firebasestorage.app',
  messagingSenderId: '62147262528',
  appId: '1:62147262528:web:beb55256d355d275c047a5',
  databaseId: '(default)',
  teamToken: 'alhijra_2026_team_secret'
};

var FIRESTORE_BASE = 'https://firestore.googleapis.com/v1/projects/' + FIRESTORE_CONFIG.projectId + '/databases/' + FIRESTORE_CONFIG.databaseId;

var syncPollInterval = null;
var syncLastCloudUpdate = null;
var syncIsPolling = false;

/* ==================== INTERNAL HELPERS ==================== */

function _toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(_toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    var fields = {};
    for (var k in val) {
      if (val.hasOwnProperty(k)) fields[k] = _toFirestoreValue(val[k]);
    }
    return { mapValue: { fields: fields } };
  }
  return { stringValue: String(val) };
}

function _fromFirestoreValue(val) {
  if (val === null || val === undefined) return null;
  if (val.nullValue !== undefined) return null;
  if (val.booleanValue !== undefined) return val.booleanValue;
  if (val.integerValue !== undefined) return parseInt(val.integerValue, 10);
  if (val.doubleValue !== undefined) return val.doubleValue;
  if (val.stringValue !== undefined) return val.stringValue;
  if (val.timestampValue !== undefined) return val.timestampValue;
  if (val.arrayValue !== undefined) {
    return (val.arrayValue.values || []).map(_fromFirestoreValue);
  }
  if (val.mapValue !== undefined) {
    var result = {};
    var fields = val.mapValue.fields || {};
    for (var k in fields) {
      if (fields.hasOwnProperty(k)) result[k] = _fromFirestoreValue(fields[k]);
    }
    return result;
  }
  return val;
}

function _toFirestoreDocument(obj) {
  var fields = {};
  for (var k in obj) {
    if (obj.hasOwnProperty(k)) fields[k] = _toFirestoreValue(obj[k]);
  }
  return { fields: fields };
}

function _fromFirestoreDocument(doc) {
  if (!doc || !doc.fields) return null;
  var result = _fromFirestoreValue({ mapValue: { fields: doc.fields } });
  if (doc.name) {
    var parts = doc.name.split('/');
    result._id = parts[parts.length - 1];
  }
  result._createTime = doc.createTime;
  result._updateTime = doc.updateTime;
  return result;
}

function _buildUrl(collection, docId) {
  var url = FIRESTORE_BASE + '/documents/' + encodeURIComponent(collection);
  if (docId) url += '/' + encodeURIComponent(docId);
  return url;
}

async function _fetch(url, options) {
  try {
    var resp = await fetch(url, options);
    var data = await resp.json();
    if (!resp.ok) {
      var msg = (data.error && data.error.message) || ('HTTP ' + resp.status);
      throw new Error('Firestore API error: ' + msg);
    }
    return data;
  } catch (err) {
    if (err.message.indexOf('Firestore API') === -1) throw new Error('Firestore network error: ' + err.message);
    throw err;
  }
}

/* ==================== CRUD ==================== */

async function fsGetDocument(collection, docId) {
  var data = await _fetch(_buildUrl(collection, docId));
  return _fromFirestoreDocument(data);
}

async function fsSetDocument(collection, docId, data) {
  data.teamToken = FIRESTORE_CONFIG.teamToken;
  var body = _toFirestoreDocument(data);
  var url = _buildUrl(collection, docId);
  var resp = await _fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return _fromFirestoreDocument(resp);
}

async function fsUpdateDocument(collection, docId, data) {
  data.teamToken = FIRESTORE_CONFIG.teamToken;
  var mask = Object.keys(data).map(function (k) { return 'updateMask.fieldPaths=' + encodeURIComponent(k); }).join('&');
  var url = _buildUrl(collection, docId) + '?' + mask;
  var body = _toFirestoreDocument(data);
  var resp = await _fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return _fromFirestoreDocument(resp);
}

async function fsDeleteDocument(collection, docId) {
  await _fetch(_buildUrl(collection, docId), { method: 'DELETE' });
  return true;
}

async function fsQueryCollection(collection, field, op, value) {
  var url = _buildUrl(collection) + ':runQuery';
  var structuredQuery = {
    from: [{ collectionId: collection }]
  };
  if (field && op !== undefined && value !== undefined) {
    structuredQuery.where = {
      fieldFilter: {
        field: { fieldPath: field },
        op: op,
        value: _toFirestoreValue(value)
      }
    };
  }
  structuredQuery.orderBy = [{ field: { fieldPath: '_updateTime' }, direction: 'DESCENDING' }];
  var results = await _fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: structuredQuery })
  });
  if (!Array.isArray(results)) return [];
  return results.filter(function (r) { return r.document; }).map(function (r) { return _fromFirestoreDocument(r.document); });
}

async function fsListDocuments(collection) {
  var url = FIRESTORE_BASE + '/documents/' + encodeURIComponent(collection);
  var data = await _fetch(url);
  if (!data.documents || !Array.isArray(data.documents)) return [];
  return data.documents.map(function (d) { return _fromFirestoreDocument(d); });
}

/* ==================== OFFLINE QUEUE ==================== */

var QUEUE_KEY = 'alhijra_syncQueue';

async function _getQueue() {
  try {
    var data = await loadFromStorage(QUEUE_KEY);
    return data || [];
  } catch (e) { return []; }
}

async function _saveQueue(queue) {
  try {
    await saveToStorage(QUEUE_KEY, queue);
  } catch (e) {}
}

async function fsEnqueueOperation(type, payload) {
  var queue = await _getQueue();
  queue.push({
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
    type: type,
    payload: payload,
    createdAt: new Date().toISOString(),
    retries: 0
  });
  await _saveQueue(queue);
}

async function fsProcessQueue() {
  var queue = await _getQueue();
  if (queue.length === 0) return { processed: 0, failed: 0 };

  var processed = 0, failed = 0;
  var remaining = [];

  for (var i = 0; i < queue.length; i++) {
    var item = queue[i];
    try {
      if (item.type === 'push_full') {
        await fsPushFullSync();
      } else if (item.type === 'push_audit') {
        await fsSyncAuditLogs();
      }
      processed++;
    } catch (e) {
      item.retries++;
      if (item.retries < 5) {
        remaining.push(item);
      } else {
        failed++;
      }
    }
  }

  await _saveQueue(remaining);
  return { processed: processed, failed: failed, remaining: remaining.length };
}

async function fsGetQueueStatus() {
  var queue = await _getQueue();
  return { pending: queue.length, items: queue };
}

/* ==================== CONFLICT DETECTION ==================== */

async function fsDetectConflicts() {
  try {
    var cloudData = await fsPullFullSync();
    if (!cloudData || !cloudData.lastSyncedAt) return { hasConflict: false };

    var lastLocalSync = await loadFromStorage('alhijra_lastSyncTimestamp') || '1970-01-01T00:00:00.000Z';

    var localProfiles = await getProfiles();
    var localUpdatedAt = '1970-01-01T00:00:00.000Z';
    for (var i = 0; i < localProfiles.length; i++) {
      if (localProfiles[i].updatedAt && localProfiles[i].updatedAt > localUpdatedAt) {
        localUpdatedAt = localProfiles[i].updatedAt;
      }
    }

    var cloudNewer = cloudData.lastSyncedAt > lastLocalSync;
    var localNewer = localUpdatedAt > cloudData.lastSyncedAt;

    return {
      hasConflict: cloudNewer && localNewer,
      cloudNewer: cloudNewer,
      localNewer: localNewer,
      cloudUpdatedAt: cloudData.lastSyncedAt,
      localUpdatedAt: localUpdatedAt
    };
  } catch (e) {
    return { hasConflict: false, error: e.message };
  }
}

/* Merge: combine local and cloud data with timestamp-based resolution */
async function fsMergeSync() {
  var conflict = await fsDetectConflicts();
  if (!conflict.hasConflict) {
    /* No conflict — just sync the newer side */
    if (conflict.cloudNewer) {
      var cloudData = await fsPullFullSync();
      if (cloudData) await fsApplySync(cloudData);
      return { source: 'cloud', message: 'Cloud data applied' };
    }
    return { source: 'local', message: 'Local data is current' };
  }

  /* Conflict: merge profiles from both sides */
  var cloudData = await fsPullFullSync();
  if (!cloudData) return { source: 'local', message: 'No cloud data' };

  var localProfiles = await getProfiles();
  var cloudProfiles = cloudData.profiles || [];
  var mergedProfiles = [];
  var profileMap = {};

  /* Index local profiles */
  for (var i = 0; i < localProfiles.length; i++) {
    profileMap[localProfiles[i].id] = { profile: localProfiles[i], source: 'local' };
  }
  /* Index cloud profiles, prefer newer timestamp */
  for (var i = 0; i < cloudProfiles.length; i++) {
    var cp = cloudProfiles[i];
    if (!profileMap[cp.id] || (cp.updatedAt || '') > (profileMap[cp.id].profile.updatedAt || '')) {
      profileMap[cp.id] = { profile: cp, source: 'cloud' };
    }
  }
  for (var id in profileMap) {
    if (profileMap.hasOwnProperty(id)) mergedProfiles.push(profileMap[id].profile);
  }
  await saveProfiles(mergedProfiles);

  /* Merge mappings: prefer cloud for profiles that exist, add local-only */
  var cloudMappings = cloudData.mappings || {};
  for (var i = 0; i < localProfiles.length; i++) {
    var lid = localProfiles[i].id;
    if (!cloudMappings[lid]) {
      var localMap = await loadMapping(lid);
      if (localMap) cloudMappings[lid] = localMap;
    }
  }
  var profileKeys = Object.keys(cloudMappings);
  for (var i = 0; i < profileKeys.length; i++) {
    if (cloudMappings[i] && Array.isArray(cloudMappings[i])) {
      await saveMapping(profileKeys[i], cloudMappings[i]);
    }
  }

  return { source: 'merged', message: 'Local and cloud data merged' };
}

/* ==================== SYNC HELPERS ==================== */

async function fsPushFullSync() {
  var profiles = await getProfiles();
  var mappings = {};
  for (var i = 0; i < profiles.length; i++) {
    mappings[profiles[i].id] = await loadMapping(profiles[i].id);
  }
  var settings = await getSettings();
  var staffMembers = await getStaffMembers();
  var activeProfileId = await loadActiveProfile();

  var syncData = {
    profiles: profiles,
    mappings: mappings,
    settings: settings,
    staffMembers: staffMembers,
    activeProfileId: activeProfileId,
    lastSyncedAt: new Date().toISOString(),
    version: '1.0.0'
  };

  await fsSetDocument('sync', 'latest', syncData);

  /* History entry */
  await fsSetDocument('sync_history', new Date().toISOString().replace(/[:.]+/g, '-'), {
    syncedAt: syncData.lastSyncedAt,
    profileCount: profiles.length,
    totalMappings: Object.keys(mappings).length
  });

  /* Update local timestamp */
  await saveToStorage('alhijra_lastSyncTimestamp', syncData.lastSyncedAt);
  syncLastCloudUpdate = syncData.lastSyncedAt;

  return syncData;
}

async function fsPullFullSync() {
  try {
    var doc = await fsGetDocument('sync', 'latest');
    if (!doc) return null;
    return doc;
  } catch (e) {
    return null;
  }
}

async function fsApplySync(syncData) {
  if (!syncData || !syncData.profiles || !syncData.mappings) {
    throw new Error('Invalid sync data');
  }
  if (syncData.profiles) await saveProfiles(syncData.profiles);
  if (syncData.mappings) {
    var profileKeys = Object.keys(syncData.mappings);
    for (var i = 0; i < profileKeys.length; i++) {
      var mapping = syncData.mappings[profileKeys[i]];
      if (mapping && Array.isArray(mapping)) {
        await saveMapping(profileKeys[i], mapping);
      }
    }
  }
  if (syncData.settings) await saveSettings(syncData.settings);
  if (syncData.staffMembers) await saveStaffMembers(syncData.staffMembers);
  if (syncData.activeProfileId) await saveActiveProfile(syncData.activeProfileId);
  await saveToStorage('alhijra_lastSyncTimestamp', syncData.lastSyncedAt || new Date().toISOString());
  return true;
}

/* ==================== AUDIT LOG SYNC ==================== */

async function fsSyncAuditLogs() {
  var logs = await getAuditLogs(100);
  var batchId = new Date().toISOString().replace(/[:.]+/g, '-');
  await fsSetDocument('audit_logs', 'batch_' + batchId, {
    logs: logs,
    count: logs.length,
    syncedAt: new Date().toISOString()
  });
  return { batchId: batchId, count: logs.length };
}

/* ==================== REAL-TIME POLLING ==================== */

function fsStartPolling(intervalMs) {
  fsStopPolling();
  intervalMs = intervalMs || 30000;
  syncIsPolling = true;
  syncPollInterval = setInterval(async function () {
    if (!syncIsPolling) return;
    try {
      var cloudData = await fsPullFullSync();
      if (!cloudData || !cloudData.lastSyncedAt) return;
      if (syncLastCloudUpdate && cloudData.lastSyncedAt <= syncLastCloudUpdate) return;
      syncLastCloudUpdate = cloudData.lastSyncedAt;
      var lastLocalSync = await loadFromStorage('alhijra_lastSyncTimestamp') || '1970-01-01T00:00:00.000Z';
      if (cloudData.lastSyncedAt > lastLocalSync) {
        /* Cloud has newer data — auto-pull */
        await fsApplySync(cloudData);
        var cb = window.__onSyncUpdate;
        if (cb) cb({ type: 'auto_pull', timestamp: cloudData.lastSyncedAt });
      }
    } catch (e) {}
  }, intervalMs);
}

function fsStopPolling() {
  syncIsPolling = false;
  if (syncPollInterval) {
    clearInterval(syncPollInterval);
    syncPollInterval = null;
  }
}

function fsSetSyncCallback(cb) {
  window.__onSyncUpdate = cb;
}

/* ==================== PUSH WITH QUEUE FALLBACK ==================== */

async function fsSafePush() {
  try {
    var result = await fsPushFullSync();
    /* Process any queued operations */
    var queueResult = await fsProcessQueue();
    return { success: true, result: result, queue: queueResult };
  } catch (e) {
    /* Queue for later */
    await fsEnqueueOperation('push_full', {});
    return { success: false, error: e.message, queued: true };
  }
}

async function fsSafeSyncAuditLogs() {
  try {
    var result = await fsSyncAuditLogs();
    return { success: true, result: result };
  } catch (e) {
    await fsEnqueueOperation('push_audit', {});
    return { success: false, error: e.message, queued: true };
  }
}