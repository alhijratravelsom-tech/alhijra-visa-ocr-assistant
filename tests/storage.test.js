/* Alhijra Visa OCR Assistant — Storage Unit Tests */
/* Run: node tests/storage.test.js */

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
    },
    session: {
      set: function (obj, cb) { for (var k in obj) mockStore['_session_' + k] = obj[k]; if (cb) cb(); },
      get: function (keys, cb) {
        var result = {};
        if (typeof keys === 'string') result[keys] = mockStore['_session_' + keys];
        else if (Array.isArray(keys)) keys.forEach(function (k) { result[k] = mockStore['_session_' + k]; });
        cb(result);
      },
      remove: function (keys, cb) {
        if (typeof keys === 'string') delete mockStore['_session_' + keys];
        if (cb) cb();
      }
    }
  }
};

/* Also need document mock for utils */
var mockTC = '';
global.document = {
  createElement: function () {
    return { get textContent() { return mockTC; }, set textContent(v) { mockTC = v; },
      get innerHTML() { return mockTC; }, set innerHTML(v) { mockTC = v; } };
  }
};
global.CSS = { escape: function (s) { return s; } };

eval(fs.readFileSync('./utils.js', 'utf8') + '\n' + fs.readFileSync('./constants.js', 'utf8') + '\n' + fs.readFileSync('./storage.js', 'utf8'));

var passed = 0, failed = 0;
function assert(c, n) { if (c) { passed++; console.log('  PASS: ' + n); } else { failed++; console.log('  FAIL: ' + n); } }
function assertEq(a, e, n) { if (JSON.stringify(a) === JSON.stringify(e)) { passed++; console.log('  PASS: ' + n); } else { failed++; console.log('  FAIL: ' + n + ' (expected: ' + JSON.stringify(e) + ', got: ' + JSON.stringify(a) + ')'); } }

async function run() {
  console.log('\n=== Storage Tests ===\n');

  console.log('--- getSettings ---');
  var s1 = await getSettings();
  assert(s1.fieldHighlight !== undefined, 'Default settings contain fieldHighlight');
  assertEq(s1.debugMode, false, 'Default debugMode is false');

  console.log('\n--- saveSettings ---');
  await saveSettings({ fieldHighlight: false, debugMode: true, preferredLanguage: 'ar' });
  var s2 = await getSettings();
  assertEq(s2.fieldHighlight, false, 'Saved fieldHighlight false');
  assertEq(s2.debugMode, true, 'Saved debugMode true');

  console.log('\n--- Profiles ---');
  await saveProfiles([{ id: 'p1', name: 'Profile 1' }, { id: 'p2', name: 'Profile 2' }]);
  var profiles = await getProfiles();
  assertEq(profiles.length, 2, 'Two profiles saved');
  assertEq(profiles[0].name, 'Profile 1', 'First profile name correct');
  assertEq(typeof profiles[0].id, 'string', 'Profile has string id');

  console.log('\n--- Mapping ---');
  await saveMapping('p1', [{ fieldId: 'f1', category: 'Fixed Default Field' }]);
  var mapping = await loadMapping('p1');
  assertEq(mapping.length, 1, 'Mapping has 1 field');
  assertEq(mapping[0].fieldId, 'f1', 'Field ID preserved');

  console.log('\n--- Active Profile ---');
  await saveActiveProfile('p2');
  assertEq(await loadActiveProfile(), 'p2', 'Active profile id saved');

  console.log('\n--- Scanned Fields ---');
  await saveScannedFields([{ fieldId: 's1', label: 'Name' }]);
  var scan = await getScannedFields();
  assertEq(scan.length, 1, 'Scan has 1 field');

  console.log('\n--- Audit Log ---');
  await addAuditLogEntry({ type: 'fill_fixed', staffId: 'staff1', fieldsFilled: 5 });
  await addAuditLogEntry({ type: 'fill_ocr', staffId: 'staff2', fieldsFilled: 3 });
  var logs = await getAuditLogs(10);
  assertEq(logs.length, 2, 'Two audit log entries');
  assertEq(logs[0].type, 'fill_ocr', 'Most recent first');
  assertEq(logs[1].type, 'fill_fixed', 'Second entry');
  assert(logs[0].id && logs[0].timestamp, 'Log entry has id and timestamp');

  console.log('\n--- Clear Audit Logs ---');
  await clearAuditLogs();
  assertEq((await getAuditLogs()).length, 0, 'Audit logs cleared');

  console.log('\n--- Staff Members ---');
  await saveStaffMembers([{ id: 's1', name: 'Alice' }, { id: 's2', name: 'Bob' }]);
  var staff = await getStaffMembers();
  assertEq(staff.length, 2, 'Two staff members');
  assertEq(staff[0].name, 'Alice', 'Custom staff saved');

  console.log('\n--- Full Backup ---');
  await saveProfiles([{ id: 'bp1', name: 'Backup Profile' }]);
  await saveMapping('bp1', [{ fieldId: 'bf1' }]);
  var backup = await createFullBackup();
  assert(backup.backupType === 'full', 'Backup has type full');
  assertEq(backup.profiles.length, 1, 'Backup contains 1 profile');
  assert(backup.exportedAt, 'Backup has timestamp');

  console.log('\n--- Restore ---');
  var restored = await restoreFromBackup(backup);
  assertEq(restored.restoredProfiles, 1, 'Restored 1 profile');

  console.log('\n=== Results: ' + passed + ' passed, ' + failed + ' failed ===\n');
  process.exit(failed > 0 ? 1 : 0);
}

run();
