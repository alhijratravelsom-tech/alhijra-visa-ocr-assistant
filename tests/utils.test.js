/* Alhijra Visa OCR Assistant — Utils Unit Tests */
/* Run: node tests/utils.test.js */

global.FIELD_CATEGORIES = {
  DYNAMIC_OCR: 'Dynamic OCR Field', DYNAMIC_CUSTOMER: 'Dynamic Customer Field',
  DYNAMIC_TRAVEL: 'Dynamic Travel Field', FIXED_DEFAULT: 'Fixed Default Field',
  FILE_UPLOAD: 'File Upload Field', IGNORE: 'Ignore Field'
};
global.COUNTRY_CODE_MAP = { SOM: { name: 'Somalia', nationality: 'Somali' } };
var mockTC = '';
global.document = {
  createElement: function () {
    return { get textContent() { return mockTC; }, set textContent(v) { mockTC = v; },
      get innerHTML() { return mockTC; }, set innerHTML(v) { mockTC = v; } };
  }
};
global.CSS = { escape: function (s) { return s; } };

var fs = require('fs');
eval(fs.readFileSync('./utils.js', 'utf8'));

var passed = 0, failed = 0;
function assert(c, n) { if (c) { passed++; console.log('  PASS: ' + n); } else { failed++; console.log('  FAIL: ' + n); } }
function assertEq(a, e, n) { if (a === e) { passed++; console.log('  PASS: ' + n); } else { failed++; console.log('  FAIL: ' + n + ' (expected: ' + JSON.stringify(e) + ', got: ' + JSON.stringify(a) + ')'); } }

console.log('\n=== Utils Tests ===\n');

console.log('--- formatDate ---');
assertEq(typeof formatDate('2026-06-17', 'DD/MM/YYYY'), 'string', 'formatDate returns string');
assertEq(formatDate('', 'DD/MM/YYYY'), '', 'Empty date returns empty');
assertEq(formatDate('invalid', 'DD/MM/YYYY'), 'invalid', 'Invalid date returns as-is');

console.log('\n--- escapeHtml ---');
assertEq(escapeHtml(''), '', 'Empty string');
assertEq(typeof escapeHtml('hello'), 'string', 'Plain text returns string');

console.log('\n--- truncate ---');
assertEq(truncate('Hello World', 5), 'Hello...', 'Truncate with ellipsis');
assertEq(truncate('Hi', 5), 'Hi', 'Short string no truncation');
assertEq(truncate('', 5), '', 'Empty string');

console.log('\n--- getDomainFromUrl ---');
assertEq(getDomainFromUrl('https://visa.visitsaudi.com/form'), 'visa.visitsaudi.com', 'Valid URL');
assertEq(getDomainFromUrl(''), '', 'Empty URL');

console.log('\n--- isTargetDomain ---');
assert(isTargetDomain('https://visa.visitsaudi.com/page'), 'visa.visitsaudi.com');
assert(!isTargetDomain('https://google.com'), 'google.com');
assert(!isTargetDomain(''), 'Empty URL');

console.log('\n--- countMappedFields ---');
assertEq(countMappedFields(null), 0, 'Null input');
assertEq(countMappedFields([]), 0, 'Empty array');
assertEq(countMappedFields([{ category: 'Dynamic OCR Field' }, { category: 'Fixed Default Field' }, { category: 'Ignore Field' }]), 2, 'Mixed categories');

console.log('\n--- countIgnoredFields ---');
assertEq(countIgnoredFields([{ category: 'Dynamic OCR Field' }, { category: 'Ignore Field' }]), 1, 'One ignored');

console.log('\n--- normalizeString ---');
assertEq(normalizeString('  Hello  '), 'hello', 'Trim and lowercase');
assertEq(normalizeString(''), '', 'Empty string');

console.log('\n--- generateId ---');
assert(typeof generateId() === 'string' && generateId().length > 0, 'generateId returns non-empty string');

console.log('\n--- deepClone ---');
var obj = { a: 1, b: { c: 2 } };
var cloned = deepClone(obj);
assertEq(cloned.b.c, 2, 'Deep clone nested value');
cloned.b.c = 3;
assertEq(obj.b.c, 2, 'Clone independent from original');

console.log('\n=== Results: ' + passed + ' passed, ' + failed + ' failed ===\n');
process.exit(failed > 0 ? 1 : 0);
