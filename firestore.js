/* Alhijra Visa OCR Assistant - Firestore REST API Client
 * Uses Firestore REST API directly (no Firebase SDK).
 * Requires Firestore in test mode (or with appropriate rules).
 */

var FIRESTORE_CONFIG = {
  apiKey: 'AIzaSyDDuq7aLPpQDw6IavfsQL2xtCXzRh9DYK8',
  authDomain: 'alhijra-visa-ocr-assistant.firebaseapp.com',
  projectId: 'alhijra-visa-ocr-assistant',
  storageBucket: 'alhijra-visa-ocr-assistant.firebasestorage.app',
  messagingSenderId: '62147262528',
  appId: '1:62147262528:web:beb55256d355d275c047a5',
  databaseId: '(default)'
};

var FIRESTORE_BASE = 'https://firestore.googleapis.com/v1/projects/' + FIRESTORE_CONFIG.projectId + '/databases/' + FIRESTORE_CONFIG.databaseId;

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

/* ==================== PUBLIC API ==================== */

async function fsGetDocument(collection, docId) {
  var data = await _fetch(_buildUrl(collection, docId));
  return _fromFirestoreDocument(data);
}

async function fsSetDocument(collection, docId, data) {
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

/* ==================== SYNC HELPERS ==================== */

/* Sync local data to Firestore: stores all profiles, mappings, staff, settings */
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

  /* Store as a single document in 'sync' collection with fixed ID */
  await fsSetDocument('sync', 'latest', syncData);

  /* Also store a history entry */
  await fsSetDocument('sync_history', new Date().toISOString().replace(/[:.]+/g, '-'), {
    syncedAt: syncData.lastSyncedAt,
    profileCount: profiles.length,
    totalMappings: Object.keys(mappings).length
  });

  return syncData;
}

/* Pull latest sync data from Firestore */
async function fsPullFullSync() {
  try {
    var doc = await fsGetDocument('sync', 'latest');
    if (!doc) return null;
    return doc;
  } catch (e) {
    return null;
  }
}

/* Apply synced data locally (overwrites current) */
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
  return true;
}

/* Sync latest audit log entries */
async function fsSyncAuditLogs() {
  var logs = await getAuditLogs(50);
  await fsSetDocument('sync_audit', new Date().toISOString().replace(/[:.]+/g, '-'), {
    logs: logs,
    syncedAt: new Date().toISOString()
  });
}