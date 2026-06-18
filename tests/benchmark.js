/* Alhijra Visa OCR Assistant — Performance Benchmark */
/* Run: node tests/benchmark.js */

var fs = require('fs');

/* Mock chrome */
var mockStore = {};
global.chrome = {
  runtime: { lastError: null },
  storage: {
    local: {
      get: function (keys, cb) {
        var result = {};
        if (typeof keys === 'string') { result[keys] = mockStore[keys]; }
        else if (Array.isArray(keys)) { keys.forEach(function (k) { result[k] = mockStore[k]; }); }
        else if (typeof keys === 'object') { for (var k in keys) result[k] = mockStore[k] !== undefined ? mockStore[k] : keys[k]; }
        cb(result);
      },
      set: function (obj, cb) { for (var k in obj) { mockStore[k] = obj[k]; } if (cb) cb(); },
      remove: function (keys, cb) {
        if (typeof keys === 'string') delete mockStore[keys];
        else keys.forEach(function (k) { delete mockStore[k]; });
        if (cb) cb();
      },
      clear: function (cb) { mockStore = {}; if (cb) cb(); }
    }
  }
};

var mockTC = '';
global.document = {
  createElement: function () {
    return { get textContent() { return mockTC; }, set textContent(v) { mockTC = v; },
      get innerHTML() { return mockTC; }, set innerHTML(v) { mockTC = v; } };
  }
};
global.CSS = { escape: function (s) { return s; } };

eval(fs.readFileSync('./utils.js', 'utf8') + '\n' + fs.readFileSync('./constants.js', 'utf8') + '\n' + fs.readFileSync('./storage.js', 'utf8'));

var results = {};

function bench(name, fn, iterations) {
  iterations = iterations || 10000;
  var start = process.hrtime.bigint();
  for (var i = 0; i < iterations; i++) fn();
  var end = process.hrtime.bigint();
  var elapsedMs = Number(end - start) / 1e6;
  results[name] = { iterations: iterations, totalMs: elapsedMs.toFixed(3), avgUs: (elapsedMs / iterations * 1000).toFixed(3) };
}

console.log('\n=== Alhijra Performance Benchmark ===\n');

console.log('--- Utility Functions ---');
bench('formatDate (YYYY-MM-DD)', function () { formatDate('2026-06-17', 'YYYY-MM-DD'); });
bench('formatDate (DD/MM/YYYY)', function () { formatDate('2026-06-17', 'DD/MM/YYYY'); });
bench('formatDate (MM/DD/YYYY)', function () { formatDate('2026-06-17', 'MM/DD/YYYY'); });
bench('normalizeString (mixed)', function () { normalizeString('  Hello World!  '); });
bench('normalizeString (empty)', function () { normalizeString(''); });
bench('generateId', function () { generateId(); });
bench('deepClone (small obj)', function () { deepClone({ a: 1, b: { c: [1, 2, 3] } }); });
bench('truncate (long)', function () { truncate('This is a very long string that needs truncation', 20); });
bench('escapeHtml', function () { escapeHtml('<script>alert("xss")</script>'); });
bench('getDomainFromUrl', function () { getDomainFromUrl('https://visa.visitsaudi.com/form?lang=en'); });
bench('isTargetDomain (valid)', function () { isTargetDomain('https://visa.visitsaudi.com/page'); });
bench('isTargetDomain (invalid)', function () { isTargetDomain('https://google.com'); });
bench('countMappedFields', function () { countMappedFields([{ category: 'Dynamic OCR Field' }, { category: 'Ignore Field' }, { category: 'Fixed Default Field' }]); });
bench('safeJSONParse (valid)', function () { safeJSONParse('{"a":1,"b":2}', null); });
bench('safeJSONParse (invalid)', function () { safeJSONParse('not json', null); });
bench('generateProfileId', function () { generateProfileId('My Custom Profile'); });
bench('getTextContent', function () { getTextContent({ textContent: 'Hello World', innerText: '' }); });
bench('getCleanLabel', function () { getCleanLabel('Full Name *:'); });

console.log('\n--- Storage Operations (async with Promise) ---');
var iterations = 1000;
var startStore, endStore;

async function benchStorage() {
  /* saveProfiles */
  var profiles = [];
  for (var i = 0; i < 10; i++) profiles.push({ id: 'p' + i, name: 'Profile ' + i });
  var s1 = process.hrtime.bigint();
  for (var j = 0; j < iterations; j++) { await saveProfiles(profiles); }
  var e1 = process.hrtime.bigint();
  results['saveProfiles (10 items)'] = { iterations: iterations, totalMs: (Number(e1 - s1) / 1e6).toFixed(3), avgUs: (Number(e1 - s1) / 1e6 / iterations * 1000).toFixed(3) };

  /* getProfiles */
  var s2 = process.hrtime.bigint();
  for (var k = 0; k < iterations; k++) { await getProfiles(); }
  var e2 = process.hrtime.bigint();
  results['getProfiles (10 items)'] = { iterations: iterations, totalMs: (Number(e2 - s2) / 1e6).toFixed(3), avgUs: (Number(e2 - s2) / 1e6 / iterations * 1000).toFixed(3) };

  /* saveSettings */
  var s3 = process.hrtime.bigint();
  for (var l = 0; l < iterations; l++) { await saveSettings({ debugMode: true, fieldHighlight: false }); }
  var e3 = process.hrtime.bigint();
  results['saveSettings'] = { iterations: iterations, totalMs: (Number(e3 - s3) / 1e6).toFixed(3), avgUs: (Number(e3 - s3) / 1e6 / iterations * 1000).toFixed(3) };

  /* getSettings */
  var s4 = process.hrtime.bigint();
  for (var m = 0; m < iterations; m++) { await getSettings(); }
  var e4 = process.hrtime.bigint();
  results['getSettings'] = { iterations: iterations, totalMs: (Number(e4 - s4) / 1e6).toFixed(3), avgUs: (Number(e4 - s4) / 1e6 / iterations * 1000).toFixed(3) };

  /* addAuditLogEntry */
  var s5 = process.hrtime.bigint();
  for (var n = 0; n < iterations; n++) { await addAuditLogEntry({ type: 'fill_fixed', fieldsFilled: 5 }); }
  var e5 = process.hrtime.bigint();
  results['addAuditLogEntry'] = { iterations: iterations, totalMs: (Number(e5 - s5) / 1e6).toFixed(3), avgUs: (Number(e5 - s5) / 1e6 / iterations * 1000).toFixed(3) };

  /* getAuditLogs */
  var s6 = process.hrtime.bigint();
  for (var o = 0; o < iterations; o++) { await getAuditLogs(50); }
  var e6 = process.hrtime.bigint();
  results['getAuditLogs (50)'] = { iterations: iterations, totalMs: (Number(e6 - s6) / 1e6).toFixed(3), avgUs: (Number(e6 - s6) / 1e6 / iterations * 1000).toFixed(3) };

  /* batch: saveMapping */
  var mappingFields = [];
  for (var p = 0; p < 50; p++) mappingFields.push({ fieldId: 'f' + p, category: 'Dynamic OCR Field', source: 'passportNumber' });
  var s7 = process.hrtime.bigint();
  for (var q = 0; q < iterations; q++) { await saveMapping('bench-profile', mappingFields); }
  var e7 = process.hrtime.bigint();
  results['saveMapping (50 fields)'] = { iterations: iterations, totalMs: (Number(e7 - s7) / 1e6).toFixed(3), avgUs: (Number(e7 - s7) / 1e6 / iterations * 1000).toFixed(3) };

  /* loadMapping */
  var s8 = process.hrtime.bigint();
  for (var r = 0; r < iterations; r++) { await loadMapping('bench-profile'); }
  var e8 = process.hrtime.bigint();
  results['loadMapping (50 fields)'] = { iterations: iterations, totalMs: (Number(e8 - s8) / 1e6).toFixed(3), avgUs: (Number(e8 - s8) / 1e6 / iterations * 1000).toFixed(3) };

  /* createFullBackup */
  var s9 = process.hrtime.bigint();
  for (var s = 0; s < 100; s++) { await createFullBackup(); }
  var e9 = process.hrtime.bigint();
  results['createFullBackup'] = { iterations: 100, totalMs: (Number(e9 - s9) / 1e6).toFixed(3), avgUs: (Number(e9 - s9) / 1e6 / 100 * 1000).toFixed(3) };

  /* Deep clone (large object) */
  var largeObj = { profiles: profiles, mappings: { 'p1': mappingFields }, settings: { fieldHighlight: true, debugMode: false, preferredLanguage: 'en' } };
  var s10 = process.hrtime.bigint();
  for (var t = 0; t < 5000; t++) { deepClone(largeObj); }
  var e10 = process.hrtime.bigint();
  results['deepClone (large, 5000x)'] = { iterations: 5000, totalMs: (Number(e10 - s10) / 1e6).toFixed(3), avgUs: (Number(e10 - s10) / 1e6 / 5000 * 1000).toFixed(3) };

  console.log('');
  for (var name in results) {
    var r = results[name];
    console.log('  ' + name + ': ' + r.totalMs + ' ms total, ' + r.avgUs + ' \u00B5s/op (' + r.iterations + ' runs)');
  }

  var totalOps = 0;
  for (var kk in results) totalOps += results[kk].iterations;
  console.log('\n  Total operations: ' + totalOps.toLocaleString());
  console.log('\n=== Benchmark Complete ===\n');
}

benchStorage().catch(function (e) { console.error('Benchmark failed:', e); process.exit(1); });
