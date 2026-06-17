(function () {
  var highlightTimer = null;
  var highlightTooltip = null;

  function getPageStatus() {
    var hostname = window.location.hostname;
    var isTarget = hostname === 'visa.visitsaudi.com';
    var formFields = document.querySelectorAll('input:not([type="hidden"]), select, textarea');
    return {
      isTargetSite: isTarget,
      url: window.location.href,
      hostname: hostname,
      title: document.title,
      readyState: document.readyState,
      fieldCount: formFields.length,
      message: isTarget ? '' : 'Please open https://visa.visitsaudi.com before scanning.'
    };
  }

  function handleHighlightField(fieldData) {
    removeHighlight();

    var targetEl = null;
    if (fieldData.selector && fieldData.selector.selector) {
      targetEl = findElementBySelector(fieldData.selector);
    }
    if (!targetEl && fieldData.fieldId) {
      var allFields = scanFields();
      for (var i = 0; i < allFields.length; i++) {
        if (allFields[i].fieldId === fieldData.fieldId) {
          if (allFields[i].selector) targetEl = findElementBySelector(allFields[i].selector);
          break;
        }
      }
    }
    if (!targetEl) {
      return { success: false, error: 'Field element not found on page.' };
    }

    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

    var originalOutline = targetEl.style.outline;
    var originalBoxShadow = targetEl.style.boxShadow;
    targetEl.style.outline = '3px solid #D4AF37';
    targetEl.style.boxShadow = '0 0 0 3px rgba(140, 191, 232, 0.4)';

    var rect = targetEl.getBoundingClientRect();

    highlightTooltip = document.createElement('div');
    highlightTooltip.className = 'alhijra-field-tooltip';
    highlightTooltip.textContent = 'Detected Field: ' + (fieldData.label || fieldData.name || 'Unknown Field');
    highlightTooltip.style.cssText =
      'position:fixed;' +
      'top:' + Math.max(4, rect.top - 30) + 'px;' +
      'left:' + Math.max(4, rect.left) + 'px;' +
      'background:#163A5F;' +
      'color:#FFFFFF;' +
      'padding:4px 10px;' +
      'border-radius:4px;' +
      'font-size:12px;' +
      'font-family:Arial,sans-serif;' +
      'white-space:nowrap;' +
      'z-index:2147483647;' +
      'pointer-events:none;' +
      'box-shadow:0 2px 6px rgba(0,0,0,0.2);' +
      'border:1px solid #D4AF37;';
    document.body.appendChild(highlightTooltip);

    var restored = { outline: originalOutline, boxShadow: originalBoxShadow };

    highlightTimer = setTimeout(function () {
      targetEl.style.outline = restored.outline;
      targetEl.style.boxShadow = restored.boxShadow;
      removeHighlight();
      highlightTimer = null;
    }, 3000);

    return { success: true };
  }

  function removeHighlight() {
    if (highlightTooltip && highlightTooltip.parentNode) {
      highlightTooltip.remove();
      highlightTooltip = null;
    }
    var tooltips = document.querySelectorAll('.alhijra-field-tooltip');
    for (var i = 0; i < tooltips.length; i++) { tooltips[i].remove(); }
  }

  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    try {
      switch (message.type) {
        case MESSAGE_TYPES.SCAN_FIELDS:
          if (window.location.hostname !== 'visa.visitsaudi.com') {
            sendResponse({ success: false, error: 'Not on visa.visitsaudi.com domain.' });
            return true;
          }
          if (document.readyState !== 'complete' && document.readyState !== 'interactive') {
            sendResponse({ success: false, error: 'Page is not fully loaded yet. Please wait.' });
            return true;
          }
          var fields = scanFields();
          sendResponse({ success: true, fields: fields, url: window.location.href });
          return true;

        case MESSAGE_TYPES.HIGHLIGHT_FIELD:
          var hlResult = handleHighlightField(message.fieldData);
          sendResponse(hlResult);
          return true;

        case MESSAGE_TYPES.GET_PAGE_STATUS:
          var status = getPageStatus();
          sendResponse({ success: true, status: status });
          return true;

        case MESSAGE_TYPES.CLEAR_SCAN:
          removeHighlight();
          sendResponse({ success: true });
          return true;

        case MESSAGE_TYPES.FILL_FIXED_FIELDS:
          if (!message.payload || !message.payload.fields || !Array.isArray(message.payload.fields)) {
            sendResponse({ success: false, error: 'Invalid payload: fields array required.' });
            return true;
          }
          var fillResult = fillFixedFields(message.payload.fields);
          sendResponse(fillResult);
          return true;

        case MESSAGE_TYPES.FILL_DYNAMIC_OCR_FIELDS:
          if (!message.payload || !message.payload.fields || !Array.isArray(message.payload.fields) || !message.payload.passportData) {
            sendResponse({ success: false, error: 'Invalid payload: fields array and passportData required.' });
            return true;
          }
          var dynamicResult = fillDynamicOcrFields(message.payload.fields, message.payload.passportData, message.payload.settings || null);
          sendResponse(dynamicResult);
          return true;

        case MESSAGE_TYPES.FILL_DYNAMIC_CUSTOMER_FIELDS:
          if (!message.payload || !message.payload.fields || !Array.isArray(message.payload.fields)) {
            sendResponse({ success: false, error: 'Invalid payload: fields array required.' });
            return true;
          }
          var customerResult = fillDynamicCustomerFields(message.payload.fields, message.payload.customerData || null, message.payload.settings || null);
          sendResponse(customerResult);
          return true;

        case MESSAGE_TYPES.FILL_DYNAMIC_TRAVEL_FIELDS:
          if (!message.payload || !message.payload.fields || !Array.isArray(message.payload.fields)) {
            sendResponse({ success: false, error: 'Invalid payload: fields array required.' });
            return true;
          }
          var travelResult = fillDynamicTravelFields(message.payload.fields, message.payload.travelData || null, message.payload.settings || null);
          sendResponse(travelResult);
          return true;

        default:
          sendResponse({ success: false, error: 'Unknown message type: ' + message.type });
          return true;
      }
    } catch (err) {
      sendResponse({ success: false, error: err.message });
      return true;
    }
  });
})();
