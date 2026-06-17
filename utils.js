function normalizeString(str) {
  if (!str) return '';
  return str.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '');
}

function getTextContent(el) {
  if (!el) return '';
  return (el.textContent || el.innerText || '').trim();
}

function getCleanLabel(text) {
  if (!text) return '';
  return text.replace(/[\*:\[\]\(\)]/g, '').trim();
}

function safeJSONParse(str, fallback = null) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function generateId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `field_${timestamp}${random}`;
}

function generateProfileId(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '_' + Date.now().toString(36);
}

function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function formatDate(dateStr, format) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  switch (format) {
    case 'DD/MM/YYYY': return `${day}/${month}/${year}`;
    case 'MM/DD/YYYY': return `${month}/${day}/${year}`;
    default: return `${year}-${month}-${day}`;
  }
}

function escapeCSS(str) {
  if (!str) return '';
  return CSS.escape(str);
}

function truncate(str, maxLen) {
  if (!str || str.length <= (maxLen || 40)) return str || '';
  return str.substring(0, maxLen) + '...';
}

function getDomainFromUrl(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function isTargetDomain(url) {
  const hostname = getDomainFromUrl(url);
  return hostname === 'visa.visitsaudi.com' || hostname.endsWith('.visa.visitsaudi.com');
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function countMappedFields(fields) {
  if (!fields || !Array.isArray(fields)) return 0;
  return fields.filter(f => f.category && f.category !== FIELD_CATEGORIES.IGNORE).length;
}

function countIgnoredFields(fields) {
  if (!fields || !Array.isArray(fields)) return 0;
  return fields.filter(f => f.category === FIELD_CATEGORIES.IGNORE).length;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

let debugModeEnabled = false;

function setDebugMode(enabled) {
  debugModeEnabled = enabled;
}

function debugLog(...args) {
  if (debugModeEnabled) {
    console.log('[Alhijra Debug]', ...args);
  }
}

function getStatusMessage(type) {
  const messages = {
    scanComplete: 'Field scan completed successfully.',
    noFields: 'No form fields detected on this page.',
    notTargetDomain: 'This extension only works on visa.visitsaudi.com.',
    contentScriptError: 'Could not connect to the page. Please refresh and try again.',
    storageError: 'Failed to save data. Please try again.',
    invalidJSON: 'Invalid mapping file. Please select a valid Alhijra Visa OCR Assistant mapping JSON.',
    mappingSaved: 'Mapping saved successfully.',
    mappingLoaded: 'Mapping loaded successfully.',
    mappingDeleted: 'Mapping deleted successfully.',
    profileCreated: 'Profile created successfully.',
    importSuccess: 'Mapping imported successfully.',
    exportSuccess: 'Mapping exported successfully.',
    clearSuccess: 'All data cleared successfully.'
  };
  return messages[type] || '';
}
