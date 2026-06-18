function safeStorageCall(fn) {
  return new Promise(function (resolve, reject) {
    try {
      fn(function () {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(true);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

function saveToStorage(key, data) {
  return safeStorageCall(function (cb) {
    chrome.storage.local.set({ [key]: data }, cb);
  });
}

function loadFromStorage(key) {
  return new Promise(function (resolve, reject) {
    try {
      chrome.storage.local.get([key], function (result) {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result[key] !== undefined ? result[key] : null);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

function removeFromStorage(key) {
  return safeStorageCall(function (cb) {
    chrome.storage.local.remove([key], cb);
  });
}

function clearAllStorage() {
  return safeStorageCall(function (cb) {
    chrome.storage.local.clear(cb);
  });
}

async function saveScannedFields(fields) {
  return saveToStorage(STORAGE_KEYS.LAST_SCAN, fields);
}

async function getScannedFields() {
  return loadFromStorage(STORAGE_KEYS.LAST_SCAN);
}

async function saveMapping(profileId, fields) {
  const mappings = await loadFromStorage(STORAGE_KEYS.MAPPINGS) || {};
  mappings[profileId] = fields;
  return saveToStorage(STORAGE_KEYS.MAPPINGS, mappings);
}

async function loadMapping(profileId) {
  const mappings = await loadFromStorage(STORAGE_KEYS.MAPPINGS) || {};
  return mappings[profileId] || [];
}

async function saveProfiles(profiles) {
  return saveToStorage(STORAGE_KEYS.PROFILES, profiles);
}

async function getProfiles() {
  return loadFromStorage(STORAGE_KEYS.PROFILES) || [];
}

async function saveSettings(settings) {
  return saveToStorage(STORAGE_KEYS.SETTINGS, settings);
}

async function getSettings() {
  const settings = await loadFromStorage(STORAGE_KEYS.SETTINGS);
  return settings || deepClone(DEFAULT_SETTINGS);
}

async function saveActiveProfile(profileId) {
  return saveToStorage(STORAGE_KEYS.ACTIVE_PROFILE, profileId);
}

async function loadActiveProfile() {
  return loadFromStorage(STORAGE_KEYS.ACTIVE_PROFILE);
}

function validateMappingJSON(json) {
  if (!json || typeof json !== 'object') {
    throw new Error('Invalid mapping file. Please select a valid Alhijra Visa OCR Assistant mapping JSON.');
  }
  if (!json.profileId || typeof json.profileId !== 'string') {
    throw new Error('Invalid mapping file. Please select a valid Alhijra Visa OCR Assistant mapping JSON.');
  }
  if (!json.profileName || typeof json.profileName !== 'string') {
    throw new Error('Invalid mapping file. Please select a valid Alhijra Visa OCR Assistant mapping JSON.');
  }
  if (!json.fields || !Array.isArray(json.fields)) {
    throw new Error('Invalid mapping file. Please select a valid Alhijra Visa OCR Assistant mapping JSON.');
  }
  for (var i = 0; i < json.fields.length; i++) {
    var f = json.fields[i];
    if (!f.fieldId) {
      throw new Error('Invalid mapping file. Please select a valid Alhijra Visa OCR Assistant mapping JSON.');
    }
  }
  return true;
}

async function importMapping(jsonStr) {
  var data = safeJSONParse(jsonStr);
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid mapping file. Please select a valid Alhijra Visa OCR Assistant mapping JSON.');
  }
  validateMappingJSON(data);
  var mappings = await loadFromStorage(STORAGE_KEYS.MAPPINGS) || {};
  mappings[data.profileId] = data.fields;
  await saveToStorage(STORAGE_KEYS.MAPPINGS, mappings);
  var profiles = await loadFromStorage(STORAGE_KEYS.PROFILES) || [];
  var existingProfile = null;
  for (var j = 0; j < profiles.length; j++) {
    if (profiles[j].id === data.profileId) { existingProfile = profiles[j]; break; }
  }
  if (!existingProfile) {
    profiles.push({
      id: data.profileId,
      name: data.profileName,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    await saveToStorage(STORAGE_KEYS.PROFILES, profiles);
  }
  return data;
}

async function exportMapping(profileId) {
  var mappings = await loadFromStorage(STORAGE_KEYS.MAPPINGS) || {};
  var profiles = await loadFromStorage(STORAGE_KEYS.PROFILES) || [];
  var profile = null;
  for (var i = 0; i < profiles.length; i++) {
    if (profiles[i].id === profileId) { profile = profiles[i]; break; }
  }
  var fields = mappings[profileId] || [];
  return {
    extensionName: 'Alhijra Visa OCR Assistant',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    targetDomain: 'visa.visitsaudi.com',
    pageUrlPattern: 'https://visa.visitsaudi.com/*',
    profileId: profileId,
    profileName: profile ? profile.name : 'Unknown Profile',
    createdAt: profile ? profile.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    fields: fields
  };
}

async function exportCurrentScan() {
  var fields = await getScannedFields();
  return {
    extensionName: 'Alhijra Visa OCR Assistant',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    targetDomain: 'visa.visitsaudi.com',
    totalFields: fields ? fields.length : 0,
    fields: fields || []
  };
}

/* ==================== PHASE 6 — AUDIT LOG ==================== */

/* Sanitize audit log entry to remove any sensitive data */
function sanitizeAuditLog(entry) {
  var sanitized = { ...entry };
  var sensitiveKeys = [
    'passportNumber', 'firstName', 'middleName', 'lastName', 'fullName',
    'nationality', 'countryCode', 'dateOfBirth', 'gender', 'passportExpiryDate',
    'issuingCountry', 'documentType', 'mrzLines', 'mrzLine1', 'mrzLine2',
    'checkDigit', 'ocrConfidence', 'ocrRawText', 'phoneNumber', 'email',
    'address', 'occupation', 'maritalStatus', 'emergencyContact', 'customerNotes',
    'arrivalDate', 'departureDate', 'flightNumber', 'departureCity', 'arrivalCity',
    'hotelName', 'hotelAddress', 'stayDuration', 'packageName',
    'passportImage', 'personalPhoto', 'hotelBooking', 'flightTicket',
    'insuranceDocument', 'invitationLetter', 'otherDocument',
    'value', 'fieldValue', 'defaultValue'
  ];
  for (var i = 0; i < sensitiveKeys.length; i++) {
    var key = sensitiveKeys[i];
    if (sanitized.hasOwnProperty(key)) delete sanitized[key];
  }
  if (sanitized.extra && typeof sanitized.extra === 'string') {
    sanitized.extra = sanitized.extra.substring(0, 200);
  }
  return sanitized;
}

async function addAuditLogEntry(entry) {
  try {
    var logs = await loadFromStorage(STORAGE_KEYS.AUDIT_LOG) || [];
    var sanitizedEntry = sanitizeAuditLog(entry);
    sanitizedEntry.id = 'log_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    sanitizedEntry.timestamp = sanitizedEntry.timestamp || new Date().toISOString();
    logs.push(sanitizedEntry);
    if (logs.length > 500) logs = logs.slice(-500);
    await saveToStorage(STORAGE_KEYS.AUDIT_LOG, logs);
    return sanitizedEntry;
  } catch (e) {}
}

async function getAuditLogs(limit) {
  try {
    var logs = await loadFromStorage(STORAGE_KEYS.AUDIT_LOG) || [];
    if (limit && limit > 0) logs = logs.slice(-limit);
    return logs.reverse();
  } catch (e) { return []; }
}

async function clearAuditLogs() {
  try {
    await removeFromStorage(STORAGE_KEYS.AUDIT_LOG);
    return true;
  } catch (e) { return false; }
}

/* ==================== PHASE 6 — STAFF MEMBERS ==================== */

async function saveStaffMembers(members) {
  return saveToStorage(STORAGE_KEYS.STAFF_MEMBERS_KEY, members);
}

async function getStaffMembers() {
  var members = await loadFromStorage(STORAGE_KEYS.STAFF_MEMBERS_KEY);
  return members || STAFF_MEMBERS;
}

/* ==================== PHASE 6 — FULL BACKUP ==================== */

async function createFullBackup() {
  var profiles = await getProfiles();
  var mappings = await loadFromStorage(STORAGE_KEYS.MAPPINGS) || {};
  var settings = await getSettings();
  var activeProfileId = await loadActiveProfile();
  var staffMembers = await getStaffMembers();
  var auditLogs = await getAuditLogs(100);

  return {
    extensionName: 'Alhijra Visa OCR Assistant',
    version: '1.0.0',
    backupType: 'full',
    exportedAt: new Date().toISOString(),
    profiles: profiles,
    mappings: mappings,
    settings: settings,
    activeProfileId: activeProfileId,
    staffMembers: staffMembers,
    auditLogs: auditLogs,
    totalProfiles: profiles.length,
    totalMappings: Object.keys(mappings).length,
    totalAuditLogs: auditLogs.length
  };
}

async function restoreFromBackup(backupData) {
  if (!backupData || backupData.backupType !== 'full') {
    throw new Error('Invalid backup file. Expected a full backup.');
  }
  if (backupData.profiles) await saveProfiles(backupData.profiles);
  if (backupData.mappings) await saveToStorage(STORAGE_KEYS.MAPPINGS, backupData.mappings);
  if (backupData.settings) await saveSettings(backupData.settings);
  if (backupData.activeProfileId) await saveActiveProfile(backupData.activeProfileId);
  if (backupData.staffMembers) await saveStaffMembers(backupData.staffMembers);
  if (backupData.auditLogs) await saveToStorage(STORAGE_KEYS.AUDIT_LOG, backupData.auditLogs);
  return {
    restoredProfiles: backupData.profiles ? backupData.profiles.length : 0,
    restoredMappings: backupData.mappings ? Object.keys(backupData.mappings).length : 0,
    restoredAuditLogs: backupData.auditLogs ? backupData.auditLogs.length : 0
  };
}
