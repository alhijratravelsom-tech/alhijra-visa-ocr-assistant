function setNativeValue(element, value) {
  var valueSetter = Object.getOwnPropertyDescriptor(element, 'value') ? Object.getOwnPropertyDescriptor(element, 'value').set : null;
  var prototype = Object.getPrototypeOf(element);
  var prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value') ? Object.getOwnPropertyDescriptor(prototype, 'value').set : null;

  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
  } else if (valueSetter) {
    valueSetter.call(element, value);
  } else {
    element.value = value;
  }

  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.dispatchEvent(new Event('blur', { bubbles: true }));
}

function setNativeChecked(element, checked) {
  var checkedSetter = Object.getOwnPropertyDescriptor(element, 'checked') ? Object.getOwnPropertyDescriptor(element, 'checked').set : null;
  var prototype = Object.getPrototypeOf(element);
  var prototypeCheckedSetter = Object.getOwnPropertyDescriptor(prototype, 'checked') ? Object.getOwnPropertyDescriptor(prototype, 'checked').set : null;

  if (prototypeCheckedSetter && checkedSetter !== prototypeCheckedSetter) {
    prototypeCheckedSetter.call(element, checked);
  } else if (checkedSetter) {
    checkedSetter.call(element, checked);
  } else {
    element.checked = checked;
  }

  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function fillInput(element, value) {
  if (!element || element.disabled || element.readOnly) return false;
  var tag = element.tagName.toLowerCase();
  if (tag !== 'input') return false;
  var type = (element.getAttribute('type') || 'text').toLowerCase();
  var supported = ['text', 'email', 'tel', 'number', 'date', 'url', 'search', 'password', 'time', 'datetime-local', 'month', 'week'];
  if (supported.indexOf(type) === -1) return false;
  setNativeValue(element, String(value));
  return true;
}

function fillTextarea(element, value) {
  if (!element || element.disabled || element.readOnly) return false;
  if (element.tagName.toLowerCase() !== 'textarea') return false;
  setNativeValue(element, String(value));
  return true;
}

function fillSelect(element, value) {
  if (!element || element.disabled) return false;
  if (element.tagName.toLowerCase() !== 'select') return false;
  var strValue = String(value).trim();
  var found = false;

  for (var i = 0; i < element.options.length; i++) {
    if (String(element.options[i].value).trim() === strValue) {
      element.selectedIndex = i;
      found = true;
      break;
    }
  }

  if (!found) {
    var normalizedValue = strValue.toLowerCase().replace(/\s+/g, ' ');
    for (var j = 0; j < element.options.length; j++) {
      var optText = element.options[j].text.trim().toLowerCase().replace(/\s+/g, ' ');
      if (optText === normalizedValue || optText.indexOf(normalizedValue) !== -1 || normalizedValue.indexOf(optText) !== -1) {
        element.selectedIndex = j;
        found = true;
        break;
      }
    }
  }

  if (!found && typeof COUNTRY_CODE_MAP !== 'undefined') {
    var countryCode = strValue.toUpperCase();
    var names = COUNTRY_CODE_MAP[countryCode];
    if (names) {
      for (var k = 0; k < element.options.length; k++) {
        var optVal = String(element.options[k].value).trim().toLowerCase();
        var optTxt = element.options[k].text.trim().toLowerCase();
        for (var n = 0; n < names.length; n++) {
          var nameLower = names[n].toLowerCase();
          if (optVal === nameLower || optTxt === nameLower || optTxt.indexOf(nameLower) !== -1 || nameLower.indexOf(optTxt) !== -1) {
            element.selectedIndex = k;
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }
  }

  if (found) {
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
    return true;
  }
  return false;
}

function fillRadioGroup(fieldMapping, value) {
  var strValue = String(value).trim();
  var matched = false;

  if (fieldMapping.metadata && fieldMapping.metadata.radioGroup && fieldMapping.metadata.radioGroup.options) {
    var options = fieldMapping.metadata.radioGroup.options;
    for (var i = 0; i < options.length; i++) {
      if (String(options[i].value).trim() === strValue || options[i].label.trim().toLowerCase() === strValue.toLowerCase()) {
        var selector = '[value="' + options[i].value.replace(/"/g, '\\"') + '"]';
        if (fieldMapping.metadata.radioGroup.groupName) {
          selector += '[name="' + fieldMapping.metadata.radioGroup.groupName.replace(/"/g, '\\"') + '"]';
        }
        var radioEl = document.querySelector('input[type="radio"]' + selector);
        if (radioEl && !radioEl.disabled) {
          setNativeChecked(radioEl, true);
          matched = true;
        }
        break;
      }
    }
  }

  if (!matched && fieldMapping.selector && fieldMapping.selector.selector) {
    var fallbackRadio = findElementBySelector(fieldMapping.selector);
    if (fallbackRadio && fallbackRadio.type === 'radio' && !fallbackRadio.disabled) {
      setNativeChecked(fallbackRadio, true);
      matched = true;
    }
  }

  return matched;
}

function fillCheckbox(element, value) {
  if (!element || element.disabled) return false;
  if (element.type !== 'checkbox') return false;
  var strValue = String(value).trim().toLowerCase();
  var truthy = ['true', 'yes', 'checked', '1', 'on'];
  var shouldCheck = truthy.indexOf(strValue) !== -1;
  setNativeChecked(element, shouldCheck);
  return true;
}

function isElementVisibleForFill(element) {
  if (!element) return false;
  if (element.type && element.type.toLowerCase() === 'hidden') return false;
  var style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
  if (!element.getClientRects || !element.getClientRects().length) return false;
  var parent = element.parentElement;
  while (parent) {
    var ps = window.getComputedStyle(parent);
    if (ps.display === 'none' || ps.visibility === 'hidden') return false;
    parent = parent.parentElement;
  }
  return true;
}

function fillField(fieldMapping) {
  var result = {
    fieldId: fieldMapping.fieldId || '',
    label: fieldMapping.label || '',
    selector: fieldMapping.selector ? fieldMapping.selector.selector : '',
    value: fieldMapping.defaultValue || '',
    status: 'skipped',
    reason: ''
  };

  if (fieldMapping.category !== FIELD_CATEGORIES.FIXED_DEFAULT) {
    result.reason = 'Not a Fixed Default Field';
    return result;
  }

  if (!fieldMapping.defaultValue || String(fieldMapping.defaultValue).trim() === '') {
    result.reason = 'Default value is empty';
    return result;
  }

  if (fieldMapping.selector && fieldMapping.selector.confidence < 50) {
    result.reason = 'Low selector confidence - manual verification required';
    return result;
  }

  if (!fieldMapping.selector || !fieldMapping.selector.selector) {
    result.reason = 'No selector available';
    return result;
  }

  var element = findElementBySelector(fieldMapping.selector);

  if (!element) {
    result.reason = 'Element not found on page';
    return result;
  }

  if (element.disabled) {
    result.reason = 'Element is disabled';
    return result;
  }

  if (element.readOnly) {
    result.reason = 'Element is read-only';
    return result;
  }

  if (!isElementVisibleForFill(element)) {
    result.reason = 'Element is not visible';
    return result;
  }

  var tag = element.tagName.toLowerCase();
  var type = (element.getAttribute('type') || 'text').toLowerCase();
  var value = String(fieldMapping.defaultValue).trim();
  var filled = false;

  if (tag === 'input' && type === 'checkbox') {
    filled = fillCheckbox(element, value);
  } else if (tag === 'input' && type === 'radio') {
    filled = fillRadioGroup(fieldMapping, value);
  } else if (tag === 'input' && type === 'file') {
    result.reason = 'File upload fields cannot be auto-filled';
    return result;
  } else if (tag === 'input') {
    filled = fillInput(element, value);
  } else if (tag === 'textarea') {
    filled = fillTextarea(element, value);
  } else if (tag === 'select') {
    filled = fillSelect(element, value);
  } else {
    result.reason = 'Unsupported field type: ' + tag;
    return result;
  }

  if (filled) {
    result.status = 'filled';
  } else {
    result.status = 'failed';
    result.reason = 'Could not set value on element';
  }

  return result;
}

function fillFixedFields(fields) {
  var filled = [];
  var failed = [];
  var skipped = [];

  for (var i = 0; i < fields.length; i++) {
    var result = fillField(fields[i]);
    if (result.status === 'filled') {
      filled.push(result);
    } else if (result.status === 'failed') {
      failed.push(result);
    } else {
      skipped.push(result);
    }
  }

  return {
    success: true,
    result: {
      filled: filled,
      failed: failed,
      skipped: skipped
    }
  };
}

function formatDateForField(dateStr, element, dateFillMode) {
  if (!dateStr || dateStr.length < 10) return dateStr;
  if (element && element.type === 'date') return dateStr;
  if (!dateFillMode || dateFillMode === 'auto') return dateStr;
  var parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  var y = parts[0], m = parts[1], d = parts[2];
  if (dateFillMode === 'dd/mm/yyyy') return d + '/' + m + '/' + y;
  if (dateFillMode === 'mm/dd/yyyy') return m + '/' + d + '/' + y;
  return dateStr;
}

function getPassportValue(fieldSource, passportData) {
  if (!fieldSource || !passportData) return null;
  var value = passportData[fieldSource];
  if (value === undefined || value === null) return null;
  var strVal = String(value).trim();
  if (strVal === '' || strVal === '-' || strVal === 'Unspecified') return null;
  return strVal;
}

function fillDynamicOcrField(fieldMapping, passportData, settings) {
  var result = {
    fieldId: fieldMapping.fieldId || '',
    label: fieldMapping.label || '',
    selector: fieldMapping.selector ? fieldMapping.selector.selector : '',
    source: fieldMapping.source || '',
    value: '',
    status: 'skipped',
    reason: ''
  };

  if (fieldMapping.category !== FIELD_CATEGORIES.DYNAMIC_OCR) {
    result.reason = 'Not a Dynamic OCR Field';
    return result;
  }

  if (!fieldMapping.source) {
    result.reason = 'No data source mapped';
    return result;
  }

  var passportValue = getPassportValue(fieldMapping.source, passportData);

  if (!passportValue) {
    result.reason = 'No confirmed passport data for source: ' + (fieldMapping.source || 'unknown');
    return result;
  }

  result.value = passportValue;

  if (fieldMapping.selector && fieldMapping.selector.confidence < 50) {
    result.reason = 'Low selector confidence - manual verification required';
    return result;
  }

  if (!fieldMapping.selector || !fieldMapping.selector.selector) {
    result.reason = 'No selector available';
    return result;
  }

  var element = findElementBySelector(fieldMapping.selector);

  if (!element) {
    result.reason = 'Element not found on page';
    return result;
  }

  if (element.disabled) {
    result.reason = 'Element is disabled';
    return result;
  }

  if (element.readOnly) {
    result.reason = 'Element is read-only';
    return result;
  }

  if (!isElementVisibleForFill(element)) {
    result.reason = 'Element is not visible';
    return result;
  }

  var tag = element.tagName.toLowerCase();
  var type = (element.getAttribute('type') || 'text').toLowerCase();

  if (type === 'file') {
    result.reason = 'File upload fields cannot be auto-filled';
    return result;
  }

  if (type === 'password') {
    result.reason = 'Password fields cannot be auto-filled';
    return result;
  }

  if (tag === 'button' || type === 'submit' || type === 'reset' || type === 'button') {
    result.reason = 'Button fields cannot be auto-filled';
    return result;
  }

  var fillValue = passportValue;

  if (fieldMapping.source === 'dateOfBirth' || fieldMapping.source === 'passportExpiryDate') {
    var dfm = (settings && settings.dateFillMode) ? settings.dateFillMode : 'auto';
    fillValue = formatDateForField(passportValue, element, dfm);
  }

  if (fieldMapping.source === 'gender') {
    if (fillValue === 'Male' || fillValue === 'M') {
      fillValue = 'Male';
    } else if (fillValue === 'Female' || fillValue === 'F') {
      fillValue = 'Female';
    }
  }

  if (fieldMapping.source === 'nationality' || fieldMapping.source === 'countryCode') {
    var upperVal = fillValue.toUpperCase();
    if (typeof COUNTRY_CODE_MAP !== 'undefined' && COUNTRY_CODE_MAP[upperVal]) {
      var firstMatch = COUNTRY_CODE_MAP[upperVal][0];
      if (firstMatch && element.options && element.options.length > 0) {
      }
    }
  }

  var filled = false;

  if (tag === 'input' && type === 'checkbox') {
    filled = fillCheckbox(element, fillValue);
  } else if (tag === 'input' && type === 'radio') {
    filled = fillRadioGroup(fieldMapping, fillValue);
  } else if (tag === 'input') {
    filled = fillInput(element, fillValue);
  } else if (tag === 'textarea') {
    filled = fillTextarea(element, fillValue);
  } else if (tag === 'select') {
    filled = fillSelect(element, fillValue);
  } else {
    result.reason = 'Unsupported field type: ' + tag;
    return result;
  }

  if (filled) {
    result.status = 'filled';
  } else {
    result.status = 'failed';
    result.reason = 'Could not set value on element';
  }

  return result;
}

function fillDynamicOcrFields(fields, passportData, settings) {
  var filled = [];
  var failed = [];
  var skipped = [];

  for (var i = 0; i < fields.length; i++) {
    var result = fillDynamicOcrField(fields[i], passportData, settings);
    if (result.status === 'filled') {
      filled.push(result);
    } else if (result.status === 'failed') {
      failed.push(result);
    } else {
      skipped.push(result);
    }
  }

  return {
    success: true,
    result: {
      filled: filled,
      failed: failed,
      skipped: skipped
    }
  };
}

function fillDynamicCustomerField(fieldMapping, customerData, settings) {
  var result = {
    fieldId: fieldMapping.fieldId || '',
    label: fieldMapping.label || '',
    selector: fieldMapping.selector ? fieldMapping.selector.selector : '',
    source: fieldMapping.source || '',
    value: '',
    status: 'skipped',
    reason: ''
  };

  if (fieldMapping.category !== FIELD_CATEGORIES.DYNAMIC_CUSTOMER) {
    result.reason = 'Not a Dynamic Customer Field';
    return result;
  }

  if (!fieldMapping.source) {
    result.reason = 'No data source mapped';
    return result;
  }

  var customerValue = null;
  if (customerData && customerData[fieldMapping.source]) {
    customerValue = String(customerData[fieldMapping.source]).trim();
  }

  if (!customerValue || customerValue === '') {
    result.reason = 'No customer data for source: ' + (fieldMapping.source || 'unknown');
    return result;
  }

  result.value = customerValue;

  if (fieldMapping.selector && fieldMapping.selector.confidence < 50) {
    result.reason = 'Low selector confidence - manual verification required';
    return result;
  }

  if (!fieldMapping.selector || !fieldMapping.selector.selector) {
    result.reason = 'No selector available';
    return result;
  }

  var element = findElementBySelector(fieldMapping.selector);

  if (!element) {
    result.reason = 'Element not found on page';
    return result;
  }

  if (element.disabled) {
    result.reason = 'Element is disabled';
    return result;
  }

  if (element.readOnly) {
    result.reason = 'Element is read-only';
    return result;
  }

  if (!isElementVisibleForFill(element)) {
    result.reason = 'Element is not visible';
    return result;
  }

  var tag = element.tagName.toLowerCase();
  var type = (element.getAttribute('type') || 'text').toLowerCase();

  if (type === 'file') {
    result.reason = 'File upload fields cannot be auto-filled';
    return result;
  }

  if (type === 'password') {
    result.reason = 'Password fields cannot be auto-filled';
    return result;
  }

  if (tag === 'button' || type === 'submit' || type === 'reset' || type === 'button') {
    result.reason = 'Button fields cannot be auto-filled';
    return result;
  }

  var fillValue = customerValue;

  if (fieldMapping.source === 'arrivalDate' || fieldMapping.source === 'departureDate') {
    var dfm = (settings && settings.dateFillMode) ? settings.dateFillMode : 'auto';
    fillValue = formatDateForField(customerValue, element, dfm);
  }

  var filled = false;

  if (tag === 'input' && type === 'checkbox') {
    filled = fillCheckbox(element, fillValue);
  } else if (tag === 'input' && type === 'radio') {
    filled = fillRadioGroup(fieldMapping, fillValue);
  } else if (tag === 'input') {
    filled = fillInput(element, fillValue);
  } else if (tag === 'textarea') {
    filled = fillTextarea(element, fillValue);
  } else if (tag === 'select') {
    filled = fillSelect(element, fillValue);
  } else {
    result.reason = 'Unsupported field type: ' + tag;
    return result;
  }

  if (filled) {
    result.status = 'filled';
  } else {
    result.status = 'failed';
    result.reason = 'Could not set value on element';
  }

  return result;
}

function fillDynamicCustomerFields(fields, customerData, settings) {
  var filled = [];
  var failed = [];
  var skipped = [];

  for (var i = 0; i < fields.length; i++) {
    var result = fillDynamicCustomerField(fields[i], customerData, settings);
    if (result.status === 'filled') {
      filled.push(result);
    } else if (result.status === 'failed') {
      failed.push(result);
    } else {
      skipped.push(result);
    }
  }

  return {
    success: true,
    result: {
      filled: filled,
      failed: failed,
      skipped: skipped
    }
  };
}

function fillDynamicTravelField(fieldMapping, travelData, settings) {
  var result = {
    fieldId: fieldMapping.fieldId || '',
    label: fieldMapping.label || '',
    selector: fieldMapping.selector ? fieldMapping.selector.selector : '',
    source: fieldMapping.source || '',
    value: '',
    status: 'skipped',
    reason: ''
  };

  if (fieldMapping.category !== FIELD_CATEGORIES.DYNAMIC_TRAVEL) {
    result.reason = 'Not a Dynamic Travel Field';
    return result;
  }

  if (!fieldMapping.source) {
    result.reason = 'No data source mapped';
    return result;
  }

  var travelValue = null;
  if (travelData && travelData[fieldMapping.source]) {
    travelValue = String(travelData[fieldMapping.source]).trim();
  }

  if (!travelValue || travelValue === '') {
    result.reason = 'No travel data for source: ' + (fieldMapping.source || 'unknown');
    return result;
  }

  result.value = travelValue;

  if (fieldMapping.selector && fieldMapping.selector.confidence < 50) {
    result.reason = 'Low selector confidence - manual verification required';
    return result;
  }

  if (!fieldMapping.selector || !fieldMapping.selector.selector) {
    result.reason = 'No selector available';
    return result;
  }

  var element = findElementBySelector(fieldMapping.selector);

  if (!element) {
    result.reason = 'Element not found on page';
    return result;
  }

  if (element.disabled) {
    result.reason = 'Element is disabled';
    return result;
  }

  if (element.readOnly) {
    result.reason = 'Element is read-only';
    return result;
  }

  if (!isElementVisibleForFill(element)) {
    result.reason = 'Element is not visible';
    return result;
  }

  var tag = element.tagName.toLowerCase();
  var type = (element.getAttribute('type') || 'text').toLowerCase();

  if (type === 'file') {
    result.reason = 'File upload fields cannot be auto-filled';
    return result;
  }

  if (type === 'password') {
    result.reason = 'Password fields cannot be auto-filled';
    return result;
  }

  if (tag === 'button' || type === 'submit' || type === 'reset' || type === 'button') {
    result.reason = 'Button fields cannot be auto-filled';
    return result;
  }

  var fillValue = travelValue;

  if (fieldMapping.source === 'arrivalDate' || fieldMapping.source === 'departureDate') {
    var dfm = (settings && settings.dateFillMode) ? settings.dateFillMode : 'auto';
    fillValue = formatDateForField(travelValue, element, dfm);
  }

  var filled = false;

  if (tag === 'input' && type === 'checkbox') {
    filled = fillCheckbox(element, fillValue);
  } else if (tag === 'input' && type === 'radio') {
    filled = fillRadioGroup(fieldMapping, fillValue);
  } else if (tag === 'input') {
    filled = fillInput(element, fillValue);
  } else if (tag === 'textarea') {
    filled = fillTextarea(element, fillValue);
  } else if (tag === 'select') {
    filled = fillSelect(element, fillValue);
  } else {
    result.reason = 'Unsupported field type: ' + tag;
    return result;
  }

  if (filled) {
    result.status = 'filled';
  } else {
    result.status = 'failed';
    result.reason = 'Could not set value on element';
  }

  return result;
}

function fillDynamicTravelFields(fields, travelData, settings) {
  var filled = [];
  var failed = [];
  var skipped = [];

  for (var i = 0; i < fields.length; i++) {
    var result = fillDynamicTravelField(fields[i], travelData, settings);
    if (result.status === 'filled') {
      filled.push(result);
    } else if (result.status === 'failed') {
      failed.push(result);
    } else {
      skipped.push(result);
    }
  }

  return {
    success: true,
    result: {
      filled: filled,
      failed: failed,
      skipped: skipped
    }
  };
}

function getFileUploadFields(fields) {
  return fields.filter(function (f) {
    return f.category === FIELD_CATEGORIES.FILE_UPLOAD;
  });
}
