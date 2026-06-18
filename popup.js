(function () {
  var currentFields = [];
  var currentProfiles = [];
  var currentSettings = {};
  var activeProfileId = null;
  var selectedProfileId = null;

  var sessionData = {
    passportData: null,
    customerData: null,
    travelData: null,
    selectedDocuments: {}
  };

  window.alhijraSessionData = sessionData;

  /* Phase 7 — pagination state */
  var fieldPageSize = 50;
  var fieldCurrentPage = 1;

  /* ==================== PHASE 6 — AUDIT LOGGING ==================== */

  function getCurrentStaffId() {
    return currentSettings.currentStaffId || 'staff1';
  }

  async function logAuditEvent(type, details) {
    try {
      var entry = {
        type: type,
        staffId: getCurrentStaffId(),
        profileId: details.profileId || activeProfileId || '',
        profileName: details.profileName || '',
        fieldsFilled: details.fieldsFilled || 0,
        fieldsFailed: details.fieldsFailed || 0,
        fieldsSkipped: details.fieldsSkipped || 0,
        extra: details.extra || ''
      };
      await addAuditLogEntry(entry);
    } catch (e) {}
  }

  function getCurrentStaffName() {
    var id = getCurrentStaffId();
    for (var i = 0; i < STAFF_MEMBERS.length; i++) {
      if (STAFF_MEMBERS[i].id === id) return STAFF_MEMBERS[i].name;
    }
    return 'Staff 1';
  }

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    loadInitialData().then(function () {
      setupEventDelegation();
      updatePageStatus();
    });
  }

  /* ==================== DATA LOADING ==================== */

  async function loadInitialData() {
    try {
      currentSettings = await getSettings();
      currentProfiles = await getProfiles();
      activeProfileId = await loadActiveProfile();
      var savedFields = await getScannedFields();
      if (savedFields && Array.isArray(savedFields)) {
        currentFields = savedFields;
      }
      if (!currentProfiles || currentProfiles.length === 0) {
        currentProfiles = DEFAULT_PROFILES.map(function (p) {
          return { id: p.id, name: p.name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        });
        await saveProfiles(currentProfiles);
      }
      if (!activeProfileId && currentProfiles.length > 0) {
        activeProfileId = currentProfiles[0].id;
        await saveActiveProfile(activeProfileId);
      }
      setDebugMode(!!currentSettings.debugMode);
      /* Refresh Phase 6 UI */
      var sel = document.getElementById('staffSelector');
      if (sel && currentSettings.currentStaffId) sel.value = currentSettings.currentStaffId;
    } catch (err) {
      showMessage('dashMessage', 'Failed to load data: ' + err.message, 'error');
    }
  }

  /* ==================== CENTRALIZED EVENT DELEGATION ==================== */

  function setupEventDelegation() {
    document.addEventListener('click', handleClick);
    document.addEventListener('change', handleChange);
    document.addEventListener('keydown', handleKeydown);
    document.getElementById('importFileInput').addEventListener('change', importMappingHandler);
    document.getElementById('restoreFileInput').addEventListener('change', restoreBackupHandler);
  }

  function handleClick(e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');
    var tab = btn.getAttribute('data-tab');
    var fieldId = btn.getAttribute('data-field-id');
    var profileId = btn.getAttribute('data-profile-id');
    debugLog('Action:', action, 'Tab:', tab, 'FieldId:', fieldId);

    switch (action) {
      case 'switch-tab': switchTab(tab); break;
      case 'scan-fields': performScan(); break;
      case 'clear-scan': clearScanHandler(); break;
      case 'save-mapping': saveCurrentMapping(); break;
      case 'load-mapping': loadProfileMapping(); break;
      case 'clear-mapping': clearMappingHandler(); break;
      case 'export-mapping': exportMappingHandler(); break;
      case 'import-mapping-trigger': document.getElementById('importFileInput').click(); break;
      case 'export-scan': exportScanHandler(); break;
      case 'clear-all-data': clearAllDataHandler(); break;
      case 'create-profile': createProfile(); break;
      case 'rename-profile': renameProfile(); break;
      case 'delete-profile': deleteProfile(); break;
      case 'duplicate-profile': duplicateProfile(); break;
      case 'highlight-field': highlightField(fieldId); break;
      case 'view-field-details': viewFieldDetails(fieldId); break;
      case 'classify-field': classifyField(fieldId); break;
      case 'select-profile': selectProfile(profileId); break;
      case 'save-settings': saveSettingsHandler(); break;
      case 'reset-settings': resetSettingsHandler(); break;
      case 'copy-selector': copySelector(fieldId); break;
      case 'fill-fixed-fields': showFillReviewModal(); break;
      case 'confirm-fill': confirmFill(); break;
      case 'close-modal': closeModal(); break;
      case 'ocr-browse': document.getElementById('ocrFileInput').click(); break;
      case 'ocr-run': runOcr(); break;
      case 'ocr-stop': stopOcr(); break;
      case 'ocr-clear-image': clearOcrImage(); break;
      case 'ocr-clear-all': clearOcrData(); break;
      case 'ocr-confirm-data': confirmOcrData(); break;
      case 'ocr-copy-json': copyOcrJson(); break;
      case 'fill-dynamic-ocr-fields': showDynamicFillReviewModal(); break;
      case 'confirm-dynamic-fill': confirmDynamicFill(); break;
      case 'customer-save-session': saveCustomerSession(); break;
      case 'customer-clear-session': clearCustomerSession(); break;
      case 'customer-fill-fields': showCustomerFillReviewModal(); break;
      case 'confirm-customer-fill': confirmCustomerFill(); break;
      case 'travel-save-session': saveTravelSession(); break;
      case 'travel-clear-session': clearTravelSession(); break;
      case 'travel-fill-fields': showTravelFillReviewModal(); break;
      case 'confirm-travel-fill': confirmTravelFill(); break;
      case 'field-page-prev':
        if (fieldCurrentPage > 1) { fieldCurrentPage--; renderFieldsTable(); }
        break;
      case 'field-page-next':
        var totalPages = Math.max(1, Math.ceil(currentFields.length / fieldPageSize));
        if (fieldCurrentPage < totalPages) { fieldCurrentPage++; renderFieldsTable(); }
        break;
      case 'docs-highlight-fields': highlightDocUploadFields(); break;
      case 'docs-refresh': refreshDocsList(); break;
      /* Phase 6 */
      case 'create-backup': createBackupHandler(); break;
      case 'generate-report': generateReportHandler(); break;
      case 'sync-push': syncPushHandler(); break;
      case 'sync-pull': syncPullHandler(); break;
      case 'restore-backup-trigger': document.getElementById('restoreFileInput').click(); break;
      case 'logs-refresh': renderAuditLogs(); break;
      case 'logs-export': exportAuditLogs(); break;
      case 'logs-clear': clearAuditLogsHandler(); break;
      case 'logs-apply-filters': renderAuditLogs(); break;
    }
  }

  /* ==================== PHASE 7 — KEYBOARD SHORTCUTS ==================== */

  function handleKeydown(e) {
    /* Ctrl+Enter — confirm modal action */
    if (e.ctrlKey && e.key === 'Enter') {
      var visibleModal = document.querySelector('.modal-overlay[style*="flex"]');
      if (visibleModal) {
        var confirmBtn = visibleModal.querySelector('[data-action^="confirm-"]');
        if (confirmBtn) { e.preventDefault(); confirmBtn.click(); return; }
      }
      return;
    }

    /* Escape — close modal */
    if (e.key === 'Escape') {
      var visibleModal = document.querySelector('.modal-overlay[style*="flex"]');
      if (visibleModal) {
        var closeBtn = visibleModal.querySelector('[data-action="close-modal"]');
        if (closeBtn) { e.preventDefault(); closeBtn.click(); return; }
      }
      return;
    }

    /* Ctrl+Shift+1-9 — switch tabs */
    if (e.ctrlKey && e.shiftKey && e.key >= '1' && e.key <= '9') {
      e.preventDefault();
      var tabIndex = parseInt(e.key) - 1;
      var tabBtns = document.querySelectorAll('.tab-btn');
      if (tabBtns[tabIndex]) {
        var tabAction = tabBtns[tabIndex].getAttribute('data-action');
        var tabName = tabBtns[tabIndex].getAttribute('data-tab');
        if (tabAction === 'switch-tab' && tabName) {
          switchTab(tabName);
        }
      }
    }
  }

  function handleChange(e) {
    var el = e.target;
    if (el.id === 'staffSelector') {
      handleStaffChange(el.value);
      return;
    }
    if (el.id === 'fieldFilterInput') {
      fieldCurrentPage = 1;
      renderFieldsTable();
      return;
    }
    if (el.id && el.id.startsWith('cat-')) {
      var fieldId = el.id.substring(4);
      onCategoryChange(fieldId);
    }
  }

  /* ==================== TAB SWITCHING ==================== */

  function switchTab(tabName) {
    var tabs = document.querySelectorAll('.tab-btn');
    var contents = document.querySelectorAll('.tab-content');
    tabs.forEach(function (t) { t.classList.remove('active'); });
    contents.forEach(function (c) { c.classList.remove('active'); });
    var activeBtn = document.querySelector('[data-action="switch-tab"][data-tab="' + tabName + '"]');
    if (activeBtn) activeBtn.classList.add('active');
    var target = document.getElementById('tab-' + tabName);
    if (target) target.classList.add('active');
    if (tabName === 'scanner') renderFieldsTable();
    if (tabName === 'mapping') renderMappingList();
    if (tabName === 'profiles') renderProfilesList();
    if (tabName === 'dashboard') updateDashboard();
  }

  /* ==================== MESSAGING ==================== */

  async function sendMessageToTab(message) {
    try {
      var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs || tabs.length === 0) {
        return { success: false, error: 'No active tab found.' };
      }
      var tab = tabs[0];
      if (!tab.url || !tab.url.includes('visa.visitsaudi.com')) {
        return { success: false, error: 'Please open https://visa.visitsaudi.com before scanning.' };
      }
      return new Promise(function (resolve) {
        chrome.tabs.sendMessage(tab.id, message, function (response) {
          if (chrome.runtime.lastError) {
            resolve({ success: false, error: 'Could not connect to page. Please refresh and try again.' });
          } else {
            resolve(response || { success: false, error: 'No response from page.' });
          }
        });
      });
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  function showLoading(show) {
    var el = document.getElementById('loadingIndicator');
    if (el) el.style.display = show ? 'block' : 'none';
  }

  function showMessage(elementId, text, type) {
    var el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = text;
    el.className = 'status-message ' + (type || 'info');
    el.style.display = 'block';
    setTimeout(function () { el.style.display = 'none'; }, 5000);
  }

  /* ==================== DASHBOARD ==================== */

  async function updatePageStatus() {
    var statusEl = document.getElementById('domainStatus');
    var result = await sendMessageToTab({ type: MESSAGE_TYPES.GET_PAGE_STATUS });
    if (result.success && result.status) {
      var s = result.status;
      statusEl.textContent = s.isTargetSite ? 'Valid Domain' : 'Invalid Domain';
      statusEl.className = 'status-badge ' + (s.isTargetSite ? 'status-valid' : 'status-invalid');
      var formsEl = document.getElementById('dashForms');
      if (formsEl) formsEl.textContent = s.fieldCount > 0 ? s.fieldCount + ' fields' : '0 fields';
    } else {
      statusEl.textContent = 'Unknown';
      statusEl.className = 'status-badge status-unknown';
    }
    updateDashboard();
  }

  function updateDashboard() {
    var dashUrl = document.getElementById('dashUrl');
    var dashHostname = document.getElementById('dashHostname');
    var dashTotal = document.getElementById('dashTotal');
    var dashMapped = document.getElementById('dashMapped');
    var dashIgnored = document.getElementById('dashIgnored');
    var dashProfile = document.getElementById('dashProfile');

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs && tabs[0]) {
        if (dashUrl) dashUrl.textContent = truncate(tabs[0].url || '-', 50);
        if (dashHostname) dashHostname.textContent = tabs[0].url ? getDomainFromUrl(tabs[0].url) : '-';
      }
    });

    if (dashTotal) dashTotal.textContent = currentFields.length;
    if (dashMapped) dashMapped.textContent = countMappedFields(currentFields);
    if (dashIgnored) dashIgnored.textContent = countIgnoredFields(currentFields);

    var profile = null;
    if (currentProfiles) {
      for (var i = 0; i < currentProfiles.length; i++) {
        if (currentProfiles[i].id === activeProfileId) { profile = currentProfiles[i]; break; }
      }
    }
    if (dashProfile) dashProfile.textContent = profile ? profile.name : 'None';
    updateAnalytics();
  }

  /* ==================== PHASE 7 — ANALYTICS ==================== */

  async function updateAnalytics() {
    try {
      var profiles = await getProfiles();
      var mappings = 0;
      for (var i = 0; i < profiles.length; i++) {
        var m = await loadMapping(profiles[i].id);
        if (m) mappings += m.length;
      }
      document.getElementById('anaProfiles').textContent = profiles.length;
      document.getElementById('anaMappings').textContent = mappings;

      var logs = await getAuditLogs(500);
      var today = new Date().toISOString().slice(0, 10);
      var fillsToday = 0;
      var totalFills = 0;
      var ocrRuns = 0;
      var fillTypes = { fill_fixed: {ok:0,total:0}, fill_ocr: {ok:0,total:0}, fill_customer: {ok:0,total:0}, fill_travel: {ok:0,total:0} };

      for (var i = 0; i < logs.length; i++) {
        var l = logs[i];
        if (l.type === 'ocr_run') ocrRuns++;
        if (l.type === 'fill_fixed' || l.type === 'fill_ocr' || l.type === 'fill_customer' || l.type === 'fill_travel') {
          totalFills++;
          if (l.timestamp && l.timestamp.slice(0, 10) === today) fillsToday++;
        }
        if (fillTypes[l.type]) {
          fillTypes[l.type].total++;
          if (l.fieldsFilled > 0) fillTypes[l.type].ok++;
        }
      }

      document.getElementById('anaFillsToday').textContent = fillsToday;
      document.getElementById('anaTotalFills').textContent = totalFills;
      document.getElementById('anaOcrRuns').textContent = ocrRuns;

      function rate(t) { return t.total > 0 ? Math.round(t.ok / t.total * 100) + '%' : '-'; }
      document.getElementById('anaFixedRate').textContent = rate(fillTypes.fill_fixed);
      document.getElementById('anaOcrFillRate').textContent = rate(fillTypes.fill_ocr);
      document.getElementById('anaCustomerRate').textContent = rate(fillTypes.fill_customer);
      document.getElementById('anaTravelRate').textContent = rate(fillTypes.fill_travel);

      /* Recent activity: last 8 logs */
      var recentBody = document.getElementById('anaRecentBody');
      var recent = logs.slice(0, 8);
      if (recent.length === 0) {
        recentBody.innerHTML = '<tr><td colspan="4" class="empty-state">No recent activity.</td></tr>';
      } else {
        recentBody.innerHTML = recent.map(function (l) {
          var ts = l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : '';
          var staff = getStaffName(l.staffId);
          var action = getLogTypeLabel(l.type);
          var result = (l.fieldsFilled || 0) + ' filled';
          if (l.fieldsFailed > 0) result += ', ' + l.fieldsFailed + ' failed';
          return '<tr><td>' + escapeHtml(ts) + '</td><td>' + escapeHtml(staff) + '</td><td>' + escapeHtml(action) + '</td><td>' + escapeHtml(result) + '</td></tr>';
        }).join('');
      }
    } catch (e) {
      debugLog('Analytics update error:', e);
    }
  }

  /* ==================== SCANNER ==================== */

  async function performScan() {
    showLoading(true);
    try {
      var result = await sendMessageToTab({ type: MESSAGE_TYPES.SCAN_FIELDS });
      if (result.success) {
        currentFields = result.fields || [];
        await saveScannedFields(currentFields);
        renderFieldsTable();
        updateScanStats();
        showMessage('scannerMessage', 'Scan complete. Found ' + currentFields.length + ' fields.', 'success');
        updateDashboard();
      } else {
        showMessage('scannerMessage', result.error || 'Scan failed.', 'error');
      }
    } finally {
      showLoading(false);
    }
  }

  function updateScanStats() {
    var statsEl = document.getElementById('scanStats');
    if (statsEl) statsEl.style.display = 'flex';
    var det = document.getElementById('statDetected');
    var map = document.getElementById('statMapped');
    var ign = document.getElementById('statIgnored');
    if (det) det.textContent = currentFields.length;
    if (map) map.textContent = countMappedFields(currentFields);
    if (ign) ign.textContent = countIgnoredFields(currentFields);
  }

  function renderFieldsTable() {
    var tbody = document.getElementById('fieldsTableBody');
    if (!tbody) return;
    if (!currentFields || currentFields.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" class="empty-state">No fields detected. Click "Scan Current Page Fields" to start.</td></tr>';
      return;
    }

    /* Apply filter */
    var filterEl = document.getElementById('fieldFilterInput');
    var filter = filterEl ? filterEl.value.toLowerCase().trim() : '';
    var filtered = currentFields;
    if (filter) {
      filtered = currentFields.filter(function (f) {
        return (f.label && f.label.toLowerCase().indexOf(filter) !== -1) ||
               (f.name && f.name.toLowerCase().indexOf(filter) !== -1) ||
               (f.id && f.id.toLowerCase().indexOf(filter) !== -1) ||
               (f.fieldType && f.fieldType.toLowerCase().indexOf(filter) !== -1) ||
               (f.placeholder && f.placeholder.toLowerCase().indexOf(filter) !== -1);
      });
    }

    /* Apply pagination */
    var totalPages = Math.max(1, Math.ceil(filtered.length / fieldPageSize));
    if (fieldCurrentPage > totalPages) fieldCurrentPage = totalPages;
    var start = (fieldCurrentPage - 1) * fieldPageSize;
    var pageItems = filtered.slice(start, start + fieldPageSize);

    /* Show filter on scan */
    if (filterEl) filterEl.style.display = currentFields.length > 10 ? '' : 'none';

    /* Update pagination controls */
    var pagEl = document.getElementById('fieldPagination');
    var prevBtn = document.querySelector('[data-action="field-page-prev"]');
    var nextBtn = document.querySelector('[data-action="field-page-next"]');
    var infoEl = document.getElementById('fieldPageInfo');
    if (pagEl && totalPages > 1) {
      pagEl.style.display = 'flex';
      if (infoEl) infoEl.textContent = 'Page ' + fieldCurrentPage + ' of ' + totalPages + ' (' + filtered.length + ' fields)';
      if (prevBtn) prevBtn.disabled = fieldCurrentPage <= 1;
      if (nextBtn) nextBtn.disabled = fieldCurrentPage >= totalPages;
    } else if (pagEl) {
      pagEl.style.display = 'none';
    }

    tbody.innerHTML = pageItems.map(function (field, idx) {
      var globalIdx = start + idx + 1;
      var category = field.category || (field.classification ? field.classification.suggestedCategory : null) || '';
      var badgeClass = getCategoryBadgeClass(category);
      var badgeText = category || 'Unclassified';
      var reqIcon = field.required ? '&#10003;' : '&minus;';
      var visIcon = field.visible !== false ? '&#10003;' : '&#10007;';
      var selectorStr = field.selector ? (field.selector.selector || '-') : '-';
      var confStr = field.selector ? (field.selector.confidence || 0) + '%' : '-';
      var needsVerify = field.selectorNeedsVerification || (field.selector && field.selector.confidence < 50);

      return '<tr>' +
        '<td>' + globalIdx + '</td>' +
        '<td class="cell-truncate" title="' + escapeHtml(field.label || '') + '">' + escapeHtml(truncate(field.label || '-', 25)) + '</td>' +
        '<td>' + escapeHtml(field.fieldType || '-') + '</td>' +
        '<td class="cell-truncate" title="' + escapeHtml(field.name || '') + '">' + escapeHtml(truncate(field.name || '-', 20)) + '</td>' +
        '<td class="cell-truncate" title="' + escapeHtml(field.id || '') + '">' + escapeHtml(truncate(field.id || '-', 20)) + '</td>' +
        '<td class="cell-truncate" title="' + escapeHtml(field.placeholder || '') + '">' + escapeHtml(truncate(field.placeholder || '-', 18)) + '</td>' +
        '<td class="col-center" style="color:' + (field.required ? '#28A745' : '#ADB5BD') + '">' + reqIcon + '</td>' +
        '<td class="col-center" style="color:' + (field.visible !== false ? '#28A745' : '#DC3545') + '">' + visIcon + '</td>' +
        '<td class="cell-selector" title="Confidence: ' + confStr + '">' +
          '<span class="selector-text">' + escapeHtml(truncate(selectorStr, 14)) + '</span>' +
          (needsVerify ? '<span class="needs-verify-badge">Verify</span>' : '') +
          '<button class="btn btn-sm btn-outline btn-copy" data-action="copy-selector" data-field-id="' + field.fieldId + '" title="Copy selector">C</button>' +
        '</td>' +
        '<td class="col-actions">' +
          '<button class="btn btn-sm btn-outline" data-action="view-field-details" data-field-id="' + field.fieldId + '">View</button>' +
          '<button class="btn btn-sm btn-gold" data-action="highlight-field" data-field-id="' + field.fieldId + '">HL</button>' +
          '<button class="btn btn-sm btn-secondary" data-action="classify-field" data-field-id="' + field.fieldId + '">Map</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  /* ==================== FIELD DETAILS MODAL ==================== */

  function viewFieldDetails(fieldId) {
    var field = null;
    for (var i = 0; i < currentFields.length; i++) {
      if (currentFields[i].fieldId === fieldId) { field = currentFields[i]; break; }
    }
    if (!field) return;
    showFieldDetailsModal(field);
  }

  function showFieldDetailsModal(field) {
    var existing = document.querySelector('.modal-overlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML =
      '<div class="modal-content">' +
        '<div class="modal-header">' +
          '<h3>Field Details: ' + escapeHtml(field.label || 'Unnamed Field') + '</h3>' +
          '<button class="modal-close" data-action="close-modal">&times;</button>' +
        '</div>' +
        '<div class="modal-body">' +
          makeDetailRow('Field ID', field.fieldId) +
          makeDetailRow('Label', field.label || '-') +
          makeDetailRow('Type', field.fieldType || '-') +
          makeDetailRow('Name', field.name || '-') +
          makeDetailRow('ID', field.id || '-') +
          makeDetailRow('Class', field.className || '-') +
          makeDetailRow('Placeholder', field.placeholder || '-') +
          makeDetailRow('Value', field.value || '-') +
          makeDetailRow('Aria Label', field.ariaLabel || '-') +
          makeDetailRow('Autocomplete', field.autocomplete || '-') +
          makeDetailRow('Form Control Name', field.formControlName || '-') +
          makeDetailRow('Required', field.required ? 'Yes' : 'No') +
          makeDetailRow('Disabled', field.disabled ? 'Yes' : 'No') +
          makeDetailRow('Readonly', field.readonly ? 'Yes' : 'No') +
          makeDetailRow('Visible', field.visible !== false ? 'Yes' : 'No') +
          makeDetailRow('Hidden', field.hidden ? 'Yes' : 'No') +
          makeDetailRow('Selector', (field.selector ? field.selector.selector : '-') || '-') +
          makeDetailRow('Selector Type', (field.selector ? field.selector.selectorType : '-') || '-') +
          makeDetailRow('Confidence', field.selector ? field.selector.confidence + '%' : '-') +
          (field.selector && field.selector.confidence < 50 ? '<div class="detail-row" style="color:#DC3545;font-weight:600;"><span class="detail-label">&#9888;</span><span class="detail-value">Needs manual verification</span></div>' : '') +
          makeDetailRow('Nearby Text', truncate((field.labelInfo ? field.labelInfo.nearbyText : null) || '-', 60)) +
          makeDetailRow('Section Title', (field.labelInfo ? field.labelInfo.sectionTitle : null) || '-') +
          makeDetailRow('Fieldset Legend', (field.labelInfo ? field.labelInfo.fieldsetLegend : null) || '-') +
          makeDetailRow('Closest Heading', (field.labelInfo ? field.labelInfo.closestHeading : null) || '-') +
          makeDetailRow('Position', 'top: ' + (field.position ? field.position.boundingBox.top : '?') + 'px, left: ' + (field.position ? field.position.boundingBox.left : '?') + 'px') +
          makeDetailRow('Size', (field.position ? field.position.boundingBox.width : '?') + ' x ' + (field.position ? field.position.boundingBox.height : '?') + 'px') +
          (field.metadata && field.metadata.selectOptions && field.metadata.selectOptions.length > 0 ? makeDetailRow('Options (' + field.metadata.selectOptions.length + ')', field.metadata.selectOptions.map(function (o) { return o.text + '=' + o.value; }).join(', ')) : '') +
          (field.metadata && field.metadata.radioGroup ? makeDetailRow('Radio Group', field.metadata.radioGroup.groupName + ': ' + field.metadata.radioGroup.options.map(function (o) { return o.label + '=' + o.value; }).join(', ')) : '') +
          (field.metadata && field.metadata.fileUploadInfo ? makeDetailRow('File Upload', 'Accept: ' + (field.metadata.fileUploadInfo.accept || '*') + ' | Multiple: ' + (field.metadata.fileUploadInfo.multiple ? 'Yes' : 'No')) : '') +
          (field.classification ? makeDetailRow('Suggested', (field.classification.suggestedCategory || 'None') + ' &rarr; ' + (field.classification.suggestedSource || 'N/A') + ' (' + field.classification.confidence + '%)') : '') +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
  }

  function makeDetailRow(label, value) {
    return '<div class="detail-row"><span class="detail-label">' + escapeHtml(label) + '</span><span class="detail-value">' + value + '</span></div>';
  }

  /* ==================== HIGHLIGHT FIELD ==================== */

  async function highlightField(fieldId) {
    var field = null;
    for (var i = 0; i < currentFields.length; i++) {
      if (currentFields[i].fieldId === fieldId) { field = currentFields[i]; break; }
    }
    if (!field) return;
    var result = await sendMessageToTab({
      type: MESSAGE_TYPES.HIGHLIGHT_FIELD,
      fieldData: field
    });
    if (result.success) {
      showMessage('scannerMessage', 'Highlighted: ' + (field.label || field.name || 'Field'), 'info');
    } else {
      showMessage('scannerMessage', result.error || 'Failed to highlight field.', 'error');
    }
  }

  function classifyField(fieldId) {
    switchTab('mapping');
    var mappingItem = document.getElementById('mapping-' + fieldId);
    if (mappingItem) {
      mappingItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      mappingItem.style.outline = '2px solid #D4AF37';
      setTimeout(function () { mappingItem.style.outline = ''; }, 2000);
    }
  }

  /* ==================== CATEGORY BADGE ==================== */

  function getCategoryBadgeClass(category) {
    switch (category) {
      case FIELD_CATEGORIES.DYNAMIC_OCR: return 'badge-ocr';
      case FIELD_CATEGORIES.DYNAMIC_CUSTOMER: return 'badge-customer';
      case FIELD_CATEGORIES.DYNAMIC_TRAVEL: return 'badge-travel';
      case FIELD_CATEGORIES.FIXED_DEFAULT: return 'badge-fixed';
      case FIELD_CATEGORIES.FILE_UPLOAD: return 'badge-file';
      case FIELD_CATEGORIES.IGNORE: return 'badge-ignore';
      default: return '';
    }
  }

  /* ==================== FIELD MAPPING ==================== */

  function renderMappingList() {
    var container = document.getElementById('mappingList');
    if (!container) return;
    if (!currentFields || currentFields.length === 0) {
      container.innerHTML = '<p class="empty-state">No fields detected. Please scan a page first.</p>';
      document.getElementById('mappingProgress').textContent = '0 of 0 fields mapped';
      return;
    }

    var mappedCount = countMappedFields(currentFields);
    document.getElementById('mappingProgress').textContent = mappedCount + ' of ' + currentFields.length + ' fields mapped';

    container.innerHTML = currentFields.map(function (field) {
      var category = field.category || (field.classification ? field.classification.suggestedCategory : null) || '';
      var source = field.source || (field.classification ? field.classification.suggestedSource : null) || '';
      var sources = getSourcesForCategory(category);
      var isDisabled = !sources || sources.length === 0;

      return '<div class="mapping-item" id="mapping-' + field.fieldId + '">' +
        '<div class="mapping-item-header">' +
          '<span class="mapping-item-label">' + escapeHtml(field.label || 'Unnamed Field') + ' <span class="mapping-item-type">' + escapeHtml(field.fieldType || '') + '</span></span>' +
          '<span class="badge ' + getCategoryBadgeClass(category || '') + '">' + (category || 'Unclassified') + '</span>' +
        '</div>' +
        '<div class="mapping-controls">' +
          '<div class="mapping-control-group">' +
            '<label>Field Category</label>' +
            '<select id="cat-' + field.fieldId + '">' +
              '<option value="">-- Select Category --</option>' +
              '<option value="' + FIELD_CATEGORIES.DYNAMIC_OCR + '"' + (category === FIELD_CATEGORIES.DYNAMIC_OCR ? ' selected' : '') + '>Dynamic OCR Field</option>' +
              '<option value="' + FIELD_CATEGORIES.DYNAMIC_CUSTOMER + '"' + (category === FIELD_CATEGORIES.DYNAMIC_CUSTOMER ? ' selected' : '') + '>Dynamic Customer Field</option>' +
              '<option value="' + FIELD_CATEGORIES.DYNAMIC_TRAVEL + '"' + (category === FIELD_CATEGORIES.DYNAMIC_TRAVEL ? ' selected' : '') + '>Dynamic Travel Field</option>' +
              '<option value="' + FIELD_CATEGORIES.FIXED_DEFAULT + '"' + (category === FIELD_CATEGORIES.FIXED_DEFAULT ? ' selected' : '') + '>Fixed Default Field</option>' +
              '<option value="' + FIELD_CATEGORIES.FILE_UPLOAD + '"' + (category === FIELD_CATEGORIES.FILE_UPLOAD ? ' selected' : '') + '>File Upload Field</option>' +
              '<option value="' + FIELD_CATEGORIES.IGNORE + '"' + (category === FIELD_CATEGORIES.IGNORE ? ' selected' : '') + '>Ignore Field</option>' +
            '</select>' +
          '</div>' +
          '<div class="mapping-control-group">' +
            '<label>Data Source</label>' +
            '<select id="src-' + field.fieldId + '"' + (isDisabled ? ' disabled' : '') + '>' +
              '<option value="">-- Select Source --</option>' +
              sources.map(function (s) { return '<option value="' + s.id + '"' + (source === s.id ? ' selected' : '') + '>' + escapeHtml(s.label) + '</option>'; }).join('') +
            '</select>' +
          '</div>' +
          '<div class="mapping-control-group">' +
            '<label>Default Value</label>' +
            '<input type="text" id="def-' + field.fieldId + '" value="' + escapeHtml(field.defaultValue || '') + '" placeholder="Leave empty if not fixed">' +
          '</div>' +
          '<div class="mapping-control-group">' +
            '<label>Staff Notes</label>' +
            '<textarea id="note-' + field.fieldId + '" rows="1" placeholder="Add notes...">' + escapeHtml(field.staffNotes || '') + '</textarea>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function onCategoryChange(fieldId) {
    var catSelect = document.getElementById('cat-' + fieldId);
    var srcSelect = document.getElementById('src-' + fieldId);
    if (!catSelect || !srcSelect) return;
    var category = catSelect.value;
    var sources = getSourcesForCategory(category);
    srcSelect.innerHTML = '<option value="">-- Select Source --</option>' +
      sources.map(function (s) { return '<option value="' + s.id + '">' + escapeHtml(s.label) + '</option>'; }).join('');
    srcSelect.disabled = !sources || sources.length === 0;

    var field = null;
    for (var i = 0; i < currentFields.length; i++) {
      if (currentFields[i].fieldId === fieldId) { field = currentFields[i]; break; }
    }
    if (field && field.classification && field.classification.suggestedCategory === category && field.classification.suggestedSource) {
      srcSelect.value = field.classification.suggestedSource;
    }

    var badge = document.querySelector('#mapping-' + fieldId + ' .badge');
    if (badge) {
      badge.textContent = category || 'Unclassified';
      badge.className = 'badge ' + getCategoryBadgeClass(category || '');
    }
    updateMappingProgress();
  }

  function updateMappingProgress() {
    var count = 0;
    for (var i = 0; i < currentFields.length; i++) {
      var catEl = document.getElementById('cat-' + currentFields[i].fieldId);
      if (catEl && catEl.value && catEl.value !== '') count++;
    }
    var el = document.getElementById('mappingProgress');
    if (el) el.textContent = count + ' of ' + currentFields.length + ' fields mapped';
  }

  function collectMappingData() {
    return currentFields.map(function (field) {
      var catEl = document.getElementById('cat-' + field.fieldId);
      var srcEl = document.getElementById('src-' + field.fieldId);
      var defEl = document.getElementById('def-' + field.fieldId);
      var noteEl = document.getElementById('note-' + field.fieldId);
      return {
        ...field,
        category: (catEl && catEl.value) ? catEl.value : null,
        source: (srcEl && srcEl.value) ? srcEl.value : null,
        defaultValue: (defEl && defEl.value) ? defEl.value : '',
        staffNotes: (noteEl && noteEl.value) ? noteEl.value : ''
      };
    });
  }

  async function saveCurrentMapping() {
    if (!activeProfileId) {
      showMessage('mappingMessage', 'No active profile selected.', 'error');
      return;
    }
    var confirmSave = currentSettings.confirmBeforeSave;
    if (confirmSave && !confirm('Save current mapping to profile?')) return;

    try {
      currentFields = collectMappingData();
      debugLog('Saving mapping to profile:', activeProfileId, 'fields:', currentFields.length);
      await saveMapping(activeProfileId, currentFields);
      await saveScannedFields(currentFields);
      updateDashboard();
      showMessage('mappingMessage', 'Mapping saved to profile successfully.', 'success');
    } catch (err) {
      showMessage('mappingMessage', 'Failed to save mapping: ' + err.message, 'error');
    }
  }

  async function clearMappingHandler() {
    if (!confirm('Clear all field mappings? This cannot be undone.')) return;
    currentFields = currentFields.map(function (f) {
      return { ...f, category: null, source: null, defaultValue: '', staffNotes: '' };
    });
    await saveScannedFields(currentFields);
    renderMappingList();
    updateDashboard();
    showMessage('mappingMessage', 'All mappings cleared.', 'info');
  }

  /* ==================== PROFILES ==================== */

  function renderProfilesList() {
    var container = document.getElementById('profilesList');
    if (!container) return;
    if (!currentProfiles || currentProfiles.length === 0) {
      container.innerHTML = '<p class="empty-state">No profiles yet. Create one above.</p>';
      return;
    }
    container.innerHTML = currentProfiles.map(function (p) {
      var isActive = p.id === activeProfileId;
      return '<div class="profile-item ' + (isActive ? 'active' : '') + '" data-action="select-profile" data-profile-id="' + p.id + '">' +
        '<span class="profile-item-name">' + escapeHtml(p.name) + '</span>' +
        '<span class="profile-item-date">' + formatDate(p.updatedAt || p.createdAt, currentSettings.dateFormat) + '</span>' +
      '</div>';
    }).join('');
  }

  function selectProfile(profileId) {
    selectedProfileId = profileId;
    activeProfileId = profileId;
    saveActiveProfile(profileId);
    renderProfilesList();
    updateDashboard();
    var profile = null;
    for (var i = 0; i < currentProfiles.length; i++) {
      if (currentProfiles[i].id === profileId) { profile = currentProfiles[i]; break; }
    }
    showMessage('profilesMessage', 'Selected profile: ' + (profile ? profile.name : ''), 'info');
  }

  async function createProfile() {
    var input = document.getElementById('profileNameInput');
    var name = input.value.trim();
    if (!name) {
      showMessage('profilesMessage', 'Please enter a profile name.', 'error');
      return;
    }
    var id = generateProfileId(name);
    var profile = {
      id: id,
      name: name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    currentProfiles.push(profile);
    await saveProfiles(currentProfiles);
    activeProfileId = id;
    selectedProfileId = id;
    await saveActiveProfile(id);
    await saveMapping(id, []);
    input.value = '';
    renderProfilesList();
    updateDashboard();
    showMessage('profilesMessage', 'Profile "' + name + '" created.', 'success');
  }

  async function duplicateProfile() {
    var targetId = activeProfileId || selectedProfileId;
    if (!targetId) {
      showMessage('profilesMessage', 'Select a profile to duplicate.', 'error');
      return;
    }
    var original = null;
    for (var i = 0; i < currentProfiles.length; i++) {
      if (currentProfiles[i].id === targetId) { original = currentProfiles[i]; break; }
    }
    if (!original) {
      showMessage('profilesMessage', 'Profile not found.', 'error');
      return;
    }
    var newId = generateProfileId(original.name + ' (Copy)');
    var newProfile = {
      id: newId,
      name: original.name + ' (Copy)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    currentProfiles.push(newProfile);
    await saveProfiles(currentProfiles);
    var originalMapping = await loadMapping(targetId);
    await saveMapping(newId, originalMapping);
    renderProfilesList();
    showMessage('profilesMessage', 'Profile duplicated as "' + newProfile.name + '".', 'success');
  }

  async function renameProfile() {
    var targetId = activeProfileId || selectedProfileId;
    if (!targetId) {
      showMessage('profilesMessage', 'Select a profile to rename.', 'error');
      return;
    }
    var profile = null;
    for (var i = 0; i < currentProfiles.length; i++) {
      if (currentProfiles[i].id === targetId) { profile = currentProfiles[i]; break; }
    }
    if (!profile) {
      showMessage('profilesMessage', 'Profile not found.', 'error');
      return;
    }
    var newName = prompt('Enter new name:', profile.name);
    if (!newName || newName.trim() === '') return;
    profile.name = newName.trim();
    profile.updatedAt = new Date().toISOString();
    await saveProfiles(currentProfiles);
    renderProfilesList();
    updateDashboard();
    showMessage('profilesMessage', 'Profile renamed to "' + profile.name + '".', 'success');
  }

  async function deleteProfile() {
    var targetId = activeProfileId || selectedProfileId;
    if (!targetId) {
      showMessage('profilesMessage', 'Select a profile to delete.', 'error');
      return;
    }
    if (currentProfiles.length <= 1) {
      showMessage('profilesMessage', 'Cannot delete the last remaining profile.', 'error');
      return;
    }
    if (!confirm('Delete this profile and its mapping? This cannot be undone.')) return;

    currentProfiles = currentProfiles.filter(function (p) { return p.id !== targetId; });
    await saveProfiles(currentProfiles);
    var mappings = await loadFromStorage(STORAGE_KEYS.MAPPINGS) || {};
    delete mappings[targetId];
    await saveToStorage(STORAGE_KEYS.MAPPINGS, mappings);
    if (activeProfileId === targetId) {
      activeProfileId = currentProfiles.length > 0 ? currentProfiles[0].id : null;
      selectedProfileId = activeProfileId;
      await saveActiveProfile(activeProfileId);
    }
    renderProfilesList();
    updateDashboard();
    showMessage('profilesMessage', 'Profile deleted.', 'info');
  }

  async function loadProfileMapping() {
    var targetId = activeProfileId || selectedProfileId;
    if (!targetId) {
      showMessage('profilesMessage', 'Select a profile to load.', 'error');
      return;
    }
    try {
      var mapping = await loadMapping(targetId);
      if (mapping && mapping.length > 0) {
        var merged = currentFields.map(function (f) {
          var mapped = null;
          for (var i = 0; i < mapping.length; i++) {
            if (mapping[i].fieldId === f.fieldId) { mapped = mapping[i]; break; }
          }
          return mapped || f;
        });
        var newFields = mapping.filter(function (m) {
          return !currentFields.some(function (f) { return f.fieldId === m.fieldId; });
        });
        currentFields = merged.concat(newFields);
        await saveScannedFields(currentFields);
      }
      activeProfileId = targetId;
      selectedProfileId = targetId;
      await saveActiveProfile(targetId);
      renderMappingList();
      updateDashboard();
      var profile = null;
      for (var i = 0; i < currentProfiles.length; i++) {
        if (currentProfiles[i].id === targetId) { profile = currentProfiles[i]; break; }
      }
      showMessage('profilesMessage', 'Mapping loaded for "' + (profile ? profile.name : '') + '".', 'success');
    } catch (err) {
      showMessage('profilesMessage', 'Failed to load mapping: ' + err.message, 'error');
    }
  }

  /* ==================== IMPORT / EXPORT ==================== */

  async function exportMappingHandler() {
    var targetId = activeProfileId || selectedProfileId;
    if (!targetId) {
      showMessage('importExportMessage', 'No profile selected for export.', 'error');
      return;
    }
    try {
      var data = await exportMapping(targetId);
      var json = JSON.stringify(data, null, 2);
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'alhijra-mapping-' + data.profileName.replace(/\s+/g, '-').toLowerCase() + '.json';
      a.click();
      URL.revokeObjectURL(url);
      showMessage('importExportMessage', 'Mapping exported successfully.', 'success');
    } catch (err) {
      showMessage('importExportMessage', 'Export failed: ' + err.message, 'error');
    }
  }

  async function importMappingHandler(event) {
    var file = event.target.files[0];
    if (!file) return;
    try {
      var text = await file.text();
      var result = await importMapping(text);
      var profile = {
        id: result.profileId,
        name: result.profileName,
        createdAt: result.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      var existingIdx = -1;
      for (var i = 0; i < currentProfiles.length; i++) {
        if (currentProfiles[i].id === result.profileId) { existingIdx = i; break; }
      }
      if (existingIdx >= 0) {
        currentProfiles[existingIdx] = profile;
      } else {
        currentProfiles.push(profile);
      }
      await saveProfiles(currentProfiles);
      activeProfileId = result.profileId;
      selectedProfileId = result.profileId;
      await saveActiveProfile(result.profileId);
      currentFields = result.fields;
      await saveScannedFields(currentFields);
      renderProfilesList();
      renderMappingList();
      renderFieldsTable();
      updateDashboard();
      showMessage('importExportMessage', 'Mapping imported: "' + result.profileName + '" (' + result.fields.length + ' fields).', 'success');
    } catch (err) {
      showMessage('importExportMessage', err.message || 'Import failed.', 'error');
    }
    event.target.value = '';
  }

  async function exportScanHandler() {
    try {
      var data = await exportCurrentScan();
      var json = JSON.stringify(data, null, 2);
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'alhijra-scan-' + new Date().toISOString().split('T')[0] + '.json';
      a.click();
      URL.revokeObjectURL(url);
      showMessage('importExportMessage', 'Current scan exported successfully.', 'success');
    } catch (err) {
      showMessage('importExportMessage', 'Export failed: ' + err.message, 'error');
    }
  }

  async function clearScanHandler() {
    if (!confirm('Clear the current scan data? Fields will be removed from the display.')) return;
    currentFields = [];
    await saveScannedFields(currentFields);
    renderFieldsTable();
    updateDashboard();
    var stats = document.getElementById('scanStats');
    if (stats) stats.style.display = 'none';
    showMessage('dashMessage', 'Current scan cleared.', 'info');
  }

  async function clearAllDataHandler() {
    if (!confirm('Delete ALL stored data? This includes all profiles, mappings, and settings. This cannot be undone.')) return;
    try {
      await clearAllStorage();
      currentFields = [];
      currentProfiles = [];
      currentSettings = deepClone(DEFAULT_SETTINGS);
      activeProfileId = null;
      selectedProfileId = null;
      await loadInitialData();
      renderFieldsTable();
      renderMappingList();
      renderProfilesList();
      updateDashboard();
      applySettings();
      showMessage('importExportMessage', 'All data cleared successfully.', 'success');
    } catch (err) {
      showMessage('importExportMessage', 'Failed to clear data: ' + err.message, 'error');
    }
  }

  /* ==================== COPY SELECTOR ==================== */

  function copySelector(fieldId) {
    var field = null;
    for (var i = 0; i < currentFields.length; i++) {
      if (currentFields[i].fieldId === fieldId) { field = currentFields[i]; break; }
    }
    if (!field || !field.selector) return;
    var text = field.selector.selector || '';
    if (!text) return;
    navigator.clipboard.writeText(text).then(function () {
      showMessage('scannerMessage', 'Selector copied to clipboard.', 'info');
    }).catch(function () {
      showMessage('scannerMessage', 'Failed to copy selector.', 'error');
    });
  }

  /* ==================== SETTINGS ==================== */

  function applySettings() {
    document.getElementById('settingHighlight').value = currentSettings.fieldHighlight ? 'true' : 'false';
    document.getElementById('settingDebug').value = currentSettings.debugMode ? 'true' : 'false';
    document.getElementById('settingLanguage').value = currentSettings.preferredLanguage || 'en';
    document.getElementById('settingDateFormat').value = currentSettings.dateFormat || 'YYYY-MM-DD';
    document.getElementById('settingAutoSave').value = currentSettings.autoSaveMapping ? 'true' : 'false';
    document.getElementById('settingConfirmSave').value = currentSettings.confirmBeforeSave ? 'true' : 'false';
    var dfm = document.getElementById('settingDateFillMode');
    if (dfm) dfm.value = currentSettings.dateFillMode || 'auto';
    var ccf = document.getElementById('settingConfirmBeforeCustomerFill');
    if (ccf) ccf.value = currentSettings.confirmBeforeCustomerFill !== false ? 'true' : 'false';
    var ctf = document.getElementById('settingConfirmBeforeTravelFill');
    if (ctf) ctf.value = currentSettings.confirmBeforeTravelFill !== false ? 'true' : 'false';
    var cdr = document.getElementById('settingConfirmBeforeDocReview');
    if (cdr) cdr.value = currentSettings.confirmBeforeDocumentReview !== false ? 'true' : 'false';
  }

  async function saveSettingsHandler() {
    currentSettings = {
      fieldHighlight: document.getElementById('settingHighlight').value === 'true',
      debugMode: document.getElementById('settingDebug').value === 'true',
      preferredLanguage: document.getElementById('settingLanguage').value,
      dateFormat: document.getElementById('settingDateFormat').value,
      autoSaveMapping: document.getElementById('settingAutoSave').value === 'true',
      confirmBeforeSave: document.getElementById('settingConfirmSave').value === 'true',
      dateFillMode: document.getElementById('settingDateFillMode') ? document.getElementById('settingDateFillMode').value : 'auto',
      confirmBeforeCustomerFill: document.getElementById('settingConfirmBeforeCustomerFill') ? document.getElementById('settingConfirmBeforeCustomerFill').value === 'true' : true,
      confirmBeforeTravelFill: document.getElementById('settingConfirmBeforeTravelFill') ? document.getElementById('settingConfirmBeforeTravelFill').value === 'true' : true,
      confirmBeforeDocumentReview: document.getElementById('settingConfirmBeforeDocReview') ? document.getElementById('settingConfirmBeforeDocReview').value === 'true' : true
    };
    try {
      setDebugMode(currentSettings.debugMode);
      await saveSettings(currentSettings);
      var dir = currentSettings.preferredLanguage === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.dir = dir;
      showMessage('settingsMessage', 'Settings saved successfully.', 'success');
    } catch (err) {
      showMessage('settingsMessage', 'Failed to save settings: ' + err.message, 'error');
    }
  }

  async function resetSettingsHandler() {
    currentSettings = deepClone(DEFAULT_SETTINGS);
    applySettings();
    try {
      await saveSettings(currentSettings);
      showMessage('settingsMessage', 'Settings reset to defaults.', 'info');
    } catch (err) {
      showMessage('settingsMessage', 'Failed to reset settings: ' + err.message, 'error');
    }
  }

  /* ==================== FILL FIXED FIELDS ==================== */

  var fillReviewData = null;

  function closeModal() {
    var overlays = document.querySelectorAll('.modal-overlay');
    for (var i = 0; i < overlays.length; i++) {
      overlays[i].style.display = 'none';
    }
  }

  async function showFillReviewModal() {
    var targetId = activeProfileId || selectedProfileId;
    if (!targetId) {
      showMessage('dashMessage', 'No active profile selected.', 'error');
      return;
    }

    try {
      showLoading(true);
      var mapping = await loadMapping(targetId);
      if (!mapping || mapping.length === 0) {
        showMessage('dashMessage', 'No mapping data found for this profile. Please save a mapping first.', 'error');
        return;
      }

      var profile = null;
      for (var i = 0; i < currentProfiles.length; i++) {
        if (currentProfiles[i].id === targetId) { profile = currentProfiles[i]; break; }
      }

      var fixedFields = [];
      var skippedFields = [];
      for (var j = 0; j < mapping.length; j++) {
        var f = mapping[j];
        if (f.category === FIELD_CATEGORIES.FIXED_DEFAULT) {
          if (f.defaultValue && String(f.defaultValue).trim() !== '') {
            fixedFields.push(f);
          } else {
            skippedFields.push(f);
          }
        }
      }

      if (fixedFields.length === 0) {
        showMessage('dashMessage', 'No Fixed Default Fields with default values found in this profile.', 'warning');
        return;
      }

      fillReviewData = {
        profileId: targetId,
        profileName: profile ? profile.name : 'Unknown',
        fixedFields: fixedFields,
        skippedFields: skippedFields
      };

      var infoEl = document.getElementById('fillReviewInfo');
      infoEl.innerHTML =
        '<div class="info-row"><span class="info-label">Profile:</span><span>' + escapeHtml(fillReviewData.profileName) + '</span></div>' +
        '<div class="info-row"><span class="info-label">Fields to fill:</span><span>' + fixedFields.length + '</span></div>' +
        '<div class="info-row"><span class="info-label">Skipped (no value):</span><span>' + skippedFields.length + '</span></div>';

      var tbody = document.getElementById('fillReviewBody');
      tbody.innerHTML = fixedFields.map(function (f) {
        var conf = f.selector ? f.selector.confidence : 0;
        var status = conf < 50 ? '<span class="needs-verify-badge">Verify</span>' : '<span style="color:var(--success);">&#10003;</span>';
        return '<tr>' +
          '<td>' + escapeHtml(truncate(f.label || 'Unnamed', 30)) + '</td>' +
          '<td>' + escapeHtml(f.source || '-') + '</td>' +
          '<td>' + escapeHtml(truncate(f.defaultValue || '', 25)) + '</td>' +
          '<td>' + conf + '%</td>' +
          '<td>' + status + '</td>' +
        '</tr>';
      }).join('') +
      skippedFields.map(function (f) {
        return '<tr style="color:var(--gray-500);">' +
          '<td>' + escapeHtml(truncate(f.label || 'Unnamed', 30)) + '</td>' +
          '<td>' + escapeHtml(f.source || '-') + '</td>' +
          '<td><em>empty</em></td>' +
          '<td>-</td>' +
          '<td><span style="color:var(--gray-500);">Skipped</span></td>' +
        '</tr>';
      }).join('');

      document.getElementById('fillReviewModal').style.display = 'flex';
    } catch (err) {
      showMessage('dashMessage', 'Failed to prepare fill review: ' + err.message, 'error');
    } finally {
      showLoading(false);
    }
  }

  async function confirmFill() {
    if (!fillReviewData || !fillReviewData.fixedFields || fillReviewData.fixedFields.length === 0) {
      showMessage('dashMessage', 'No fields to fill.', 'error');
      return;
    }

    document.getElementById('fillReviewModal').style.display = 'none';

    try {
      showLoading(true);
      debugLog('Filling fixed fields:', fillReviewData.fixedFields.length);

      var result = await sendMessageToTab({
        type: MESSAGE_TYPES.FILL_FIXED_FIELDS,
        payload: { fields: fillReviewData.fixedFields }
      });

      if (!result.success) {
        showMessage('dashMessage', result.error || 'Fill request failed.', 'error');
        return;
      }

      logAuditEvent(AUDIT_EVENT_TYPES.FILL_FIXED, {
        profileId: fillReviewData.profileId,
        profileName: fillReviewData.profileName,
        fieldsFilled: (result.result.filled || []).length,
        fieldsFailed: (result.result.failed || []).length,
        fieldsSkipped: (result.result.skipped || []).length
      });

      showFillResultModal(result.result);
    } catch (err) {
      showMessage('dashMessage', 'Fill failed: ' + err.message, 'error');
    } finally {
      showLoading(false);
    }
  }

  function showFillResultModal(result) {
    var filled = result.filled || [];
    var failed = result.failed || [];
    var skipped = result.skipped || [];

    var summaryEl = document.getElementById('fillResultSummary');
    summaryEl.innerHTML =
      '<div class="result-stat"><span class="result-stat-icon filled"></span>Filled: <span class="result-stat-value filled">' + filled.length + '</span></div>' +
      '<div class="result-stat"><span class="result-stat-icon failed"></span>Failed: <span class="result-stat-value failed">' + failed.length + '</span></div>' +
      '<div class="result-stat"><span class="result-stat-icon skipped"></span>Skipped: <span class="result-stat-value skipped">' + skipped.length + '</span></div>';

    var tbody = document.getElementById('fillResultBody');
    var rows = [];

    for (var i = 0; i < filled.length; i++) {
      var f = filled[i];
      rows.push('<tr class="result-row-filled">' +
        '<td>' + escapeHtml(truncate(f.label || 'Unnamed', 25)) + '</td>' +
        '<td>' + escapeHtml(truncate(f.value || '', 20)) + '</td>' +
        '<td style="color:var(--success);font-weight:600;">&#10003; Filled</td>' +
        '<td>' + escapeHtml(f.selector || '') + '</td>' +
      '</tr>');
    }

    for (var j = 0; j < failed.length; j++) {
      var fl = failed[j];
      rows.push('<tr class="result-row-failed">' +
        '<td>' + escapeHtml(truncate(fl.label || 'Unnamed', 25)) + '</td>' +
        '<td>' + escapeHtml(truncate(fl.value || '', 20)) + '</td>' +
        '<td style="color:var(--danger);font-weight:600;">&#10007; Failed</td>' +
        '<td>' + escapeHtml(fl.reason || '') + '</td>' +
      '</tr>');
    }

    for (var k = 0; k < skipped.length; k++) {
      var s = skipped[k];
      rows.push('<tr class="result-row-skipped">' +
        '<td>' + escapeHtml(truncate(s.label || 'Unnamed', 25)) + '</td>' +
        '<td>' + escapeHtml(truncate(s.value || '', 20)) + '</td>' +
        '<td style="color:var(--warning);font-weight:600;">&#9888; Skipped</td>' +
        '<td>' + escapeHtml(s.reason || '') + '</td>' +
      '</tr>');
    }

    tbody.innerHTML = rows.join('');

    document.getElementById('fillResultModal').style.display = 'flex';
  }

  /* ==================== OCR / PASSPORT MODULE ==================== */

  var ocrState = {
    imageDataUrl: null,
    fileName: null,
    isRunning: false,
    dataConfirmed: false,
    parsedData: null,
    mrzLines: null
  };

  var OCR_FIELD_MAP = {
    passportNumber: 'ocrPassportNumber',
    firstName: 'ocrFirstName',
    middleName: 'ocrMiddleName',
    lastName: 'ocrLastName',
    fullName: 'ocrFullName',
    nationality: 'ocrNationality',
    countryCode: 'ocrCountryCode',
    dateOfBirth: 'ocrDateOfBirth',
    gender: 'ocrGender',
    passportExpiryDate: 'ocrExpiryDate',
    issuingCountry: 'ocrIssuingCountry',
    documentType: 'ocrDocumentType'
  };

  function getOcrElement(fieldId) {
    var id = OCR_FIELD_MAP[fieldId];
    return id ? document.getElementById(id) : null;
  }

  function setOcrField(fieldId, value) {
    var el = getOcrElement(fieldId);
    if (el) {
      el.value = value || '';
    }
  }

  function getOcrFieldValue(fieldId) {
    var el = getOcrElement(fieldId);
    return el ? el.value : '';
  }

  function enableOcrButtons() {
    var hasImage = !!ocrState.imageDataUrl;
    document.getElementById('ocrRunBtn').disabled = !hasImage || ocrState.isRunning;
    document.getElementById('ocrClearBtn').disabled = !hasImage && !ocrState.parsedData;
  }

  function showOcrMessage(text, type) {
    showMessage('ocrMessage', text, type || 'info');
  }

  /* Upload / Drag & Drop */
  function setupOcrUpload() {
    var area = document.getElementById('ocrUploadArea');
    var input = document.getElementById('ocrFileInput');

    area.addEventListener('click', function (e) {
      if (e.target.tagName !== 'BUTTON') {
        input.click();
      }
    });

    area.addEventListener('dragover', function (e) {
      e.preventDefault();
      area.classList.add('drag-over');
    });

    area.addEventListener('dragleave', function () {
      area.classList.remove('drag-over');
    });

    area.addEventListener('drop', function (e) {
      e.preventDefault();
      area.classList.remove('drag-over');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleOcrFile(e.dataTransfer.files[0]);
      }
    });

    input.addEventListener('change', function () {
      if (input.files && input.files.length > 0) {
        handleOcrFile(input.files[0]);
      }
    });
  }

  async function handleOcrFile(file) {
    try {
      var dataUrl = await OcrEngine.loadImage(file);
      ocrState.imageDataUrl = dataUrl;
      ocrState.fileName = file.name;
      ocrState.parsedData = null;
      ocrState.mrzLines = null;
      ocrState.dataConfirmed = false;

      showPreview(dataUrl);
      resetOcrResults();
      enableOcrButtons();
      showOcrMessage('Image loaded: ' + file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)', 'success');
    } catch (err) {
      showOcrMessage(err.message, 'error');
    }
  }

  function showPreview(dataUrl) {
    document.getElementById('ocrUploadArea').style.display = 'none';
    var previewArea = document.getElementById('ocrPreviewArea');
    previewArea.style.display = 'block';
    document.getElementById('ocrPreviewImage').src = dataUrl;
  }

  function resetOcrResults() {
    for (var key in OCR_FIELD_MAP) {
      var el = document.getElementById(OCR_FIELD_MAP[key]);
      if (el) el.value = '';
    }
    document.getElementById('ocrMrzLine1').textContent = '-';
    document.getElementById('ocrMrzLine2').textContent = '-';
    document.getElementById('ocrCheckDigitStatus').textContent = '-';
    document.getElementById('ocrCheckDigitStatus').className = 'ocr-check-badge';
    document.getElementById('ocrConfidenceValue').textContent = '-';
    document.getElementById('ocrDataReview').style.display = 'none';
    document.getElementById('ocrDebugSection').style.display = 'none';
    document.getElementById('ocrRawText').textContent = '';
    document.getElementById('ocrProgressArea').style.display = 'none';
    document.getElementById('ocrProgressBar').style.width = '0%';
    document.getElementById('ocrStopBtn').style.display = 'none';
    document.getElementById('ocrRunBtn').style.display = '';
    ocrState.isRunning = false;
    ocrState.parsedData = null;
    ocrState.mrzLines = null;
    ocrState.dataConfirmed = false;
    enableOcrButtons();
  }

  /* Run OCR */
  async function runOcr() {
    if (!ocrState.imageDataUrl) {
      showOcrMessage('Please upload a passport image first.', 'error');
      return;
    }

    if (ocrState.isRunning) return;

    ocrState.isRunning = true;
    document.getElementById('ocrRunBtn').disabled = true;
    document.getElementById('ocrRunBtn').style.display = 'none';
    document.getElementById('ocrStopBtn').style.display = '';
    document.getElementById('ocrProgressArea').style.display = 'block';
    document.getElementById('ocrDataReview').style.display = 'none';
    document.getElementById('ocrDebugSection').style.display = 'none';

    showOcrMessage('OCR in progress...', 'info');

    OcrEngine.runOCR(ocrState.imageDataUrl, {
      onProgress: function (status, percent) {
        document.getElementById('ocrProgressBar').style.width = percent + '%';
        document.getElementById('ocrProgressStatus').textContent = status;
      },
      onComplete: function (result) {
        onOcrComplete(result);
      },
      onError: function (error) {
        onOcrError(error);
      }
    });
  }

  function stopOcr() {
    OcrEngine.stopOCR();
    ocrState.isRunning = false;
    document.getElementById('ocrRunBtn').style.display = '';
    document.getElementById('ocrStopBtn').style.display = 'none';
    document.getElementById('ocrProgressArea').style.display = 'none';
    document.getElementById('ocrProgressBar').style.width = '0%';
    enableOcrButtons();
    showOcrMessage('OCR stopped by user.', 'info');
  }

  function onOcrComplete(result) {
    ocrState.isRunning = false;
    document.getElementById('ocrRunBtn').style.display = '';
    document.getElementById('ocrStopBtn').style.display = 'none';
    document.getElementById('ocrProgressArea').style.display = 'none';
    enableOcrButtons();

    if (!result.success) {
      logAuditEvent(AUDIT_EVENT_TYPES.OCR_RUN, { fieldsFilled: 0, fieldsFailed: 1, extra: 'OCR failed: ' + (result.error || 'unknown') });
      showOcrMessage(result.error || 'OCR could not read the passport clearly.', 'warning');
      return;
    }

    ocrState.parsedData = result.parsedData;
    ocrState.mrzLines = result.mrzLines;

    populateOcrData(result);
    logAuditEvent(AUDIT_EVENT_TYPES.OCR_RUN, { fieldsFilled: Object.keys(result.parsedData || {}).length, extra: 'MRZ parsed successfully' });
    showOcrMessage('Passport data extracted successfully. Please review and confirm.', 'success');
  }

  function onOcrError(error) {
    ocrState.isRunning = false;
    document.getElementById('ocrRunBtn').style.display = '';
    document.getElementById('ocrStopBtn').style.display = 'none';
    document.getElementById('ocrProgressArea').style.display = 'none';
    document.getElementById('ocrProgressBar').style.width = '0%';
    enableOcrButtons();
    showOcrMessage(error, 'error');
  }

  function populateOcrData(result) {
    var pd = result.parsedData;
    if (!pd) return;

    setOcrField('passportNumber', pd.passportNumber || '');
    setOcrField('firstName', pd.firstName || '');
    setOcrField('middleName', pd.middleName || '');
    setOcrField('lastName', pd.lastName || '');
    setOcrField('fullName', pd.fullName || '');
    setOcrField('nationality', pd.nationality || '');
    setOcrField('countryCode', pd.issuingCountry || '');
    setOcrField('dateOfBirth', pd.dateOfBirth || '');
    setOcrField('gender', pd.gender || '');
    setOcrField('passportExpiryDate', pd.passportExpiryDate || '');
    setOcrField('issuingCountry', pd.issuingCountry || '');
    setOcrField('documentType', pd.documentType || '');

    if (result.mrzLines) {
      document.getElementById('ocrMrzLine1').textContent = result.mrzLines.line1 || '-';
      document.getElementById('ocrMrzLine2').textContent = result.mrzLines.line2 || '-';
    }

    var checkEl = document.getElementById('ocrCheckDigitStatus');
    if (pd.checkDigitValid) {
      checkEl.textContent = 'Valid';
      checkEl.className = 'ocr-check-badge valid';
    } else if (pd.checkDigitWarnings && pd.checkDigitWarnings.length > 0) {
      checkEl.textContent = 'Warning';
      checkEl.className = 'ocr-check-badge warning';
      checkEl.title = pd.checkDigitWarnings.join('; ');
    } else {
      checkEl.textContent = 'N/A';
      checkEl.className = 'ocr-check-badge';
    }

    document.getElementById('ocrConfidenceValue').textContent = (result.ocrConfidence || 0) + '%';
    document.getElementById('ocrDataReview').style.display = 'block';

    if (currentSettings.debugMode) {
      document.getElementById('ocrDebugSection').style.display = 'block';
      document.getElementById('ocrRawText').textContent = result.ocrRawText || 'No raw text available.';
    }
  }

  /* Confirm Passport Data */
  function confirmOcrData() {
    var data = collectOcrData();
    var missing = [];
    if (!data.passportNumber) missing.push('Passport Number');
    if (!data.firstName && !data.fullName) missing.push('Name');
    if (!data.dateOfBirth) missing.push('Date of Birth');

    if (missing.length > 0) {
      if (!confirm('Missing fields: ' + missing.join(', ') + '. Confirm anyway?')) return;
    }

    ocrState.parsedData = data;
    ocrState.dataConfirmed = true;

    logAuditEvent(AUDIT_EVENT_TYPES.OCR_CONFIRM, { fieldsFilled: Object.keys(data).length - 2, extra: missing.length > 0 ? 'Missing: ' + missing.join(', ') : 'All fields present' });

    trySaveOcrSession(data);
    updateDynamicFillButtons();
    showOcrMessage('Passport data confirmed for this session only. Data cleared when popup closes.', 'success');
  }

  function collectOcrData() {
    return {
      passportNumber: getOcrFieldValue('passportNumber'),
      firstName: getOcrFieldValue('firstName'),
      middleName: getOcrFieldValue('middleName'),
      lastName: getOcrFieldValue('lastName'),
      fullName: getOcrFieldValue('fullName'),
      nationality: getOcrFieldValue('nationality'),
      countryCode: getOcrFieldValue('countryCode'),
      dateOfBirth: getOcrFieldValue('dateOfBirth'),
      gender: getOcrFieldValue('gender'),
      passportExpiryDate: getOcrFieldValue('passportExpiryDate'),
      issuingCountry: getOcrFieldValue('issuingCountry'),
      documentType: getOcrFieldValue('documentType'),
      confirmedAt: new Date().toISOString(),
      sessionOnly: true
    };
  }

  async function trySaveOcrSession(data) {
    try {
      if (chrome.storage && chrome.storage.session) {
        await chrome.storage.session.set({ [STORAGE_KEYS.OCR_SESSION]: data });
        debugLog('OCR session data saved to chrome.storage.session');
      } else {
        debugLog('chrome.storage.session unavailable; keeping data in memory only');
      }
    } catch (err) {
      debugLog('Failed to save OCR session:', err.message);
    }
  }

  /* Clear OCR Data */
  function clearOcrData() {
    if (!ocrState.imageDataUrl && !ocrState.parsedData) return;
    if (!confirm('Clear all passport data? This will remove the image and extracted data.')) return;

    if (OcrEngine.isRunning) {
      OcrEngine.stopOCR();
    }

    ocrState.imageDataUrl = null;
    ocrState.fileName = null;
    ocrState.parsedData = null;
    ocrState.mrzLines = null;
    ocrState.dataConfirmed = false;
    ocrState.isRunning = false;

    document.getElementById('ocrUploadArea').style.display = '';
    document.getElementById('ocrPreviewArea').style.display = 'none';
    document.getElementById('ocrPreviewImage').src = '';
    document.getElementById('ocrDataReview').style.display = 'none';
    document.getElementById('ocrDebugSection').style.display = 'none';
    document.getElementById('ocrProgressArea').style.display = 'none';
    document.getElementById('ocrProgressBar').style.width = '0%';
    document.getElementById('ocrRunBtn').style.display = '';
    document.getElementById('ocrStopBtn').style.display = 'none';
    document.getElementById('ocrFileInput').value = '';

    resetOcrResults();
    enableOcrButtons();
    OcrEngine.terminateWorker();

    tryClearOcrSession();
    updateDynamicFillButtons();
    showOcrMessage('Passport data cleared.', 'info');
  }

  async function tryClearOcrSession() {
    try {
      if (chrome.storage && chrome.storage.session) {
        await chrome.storage.session.remove(STORAGE_KEYS.OCR_SESSION);
      }
    } catch (err) {}
  }

  /* Copy Data JSON */
  function copyOcrJson() {
    var data = collectOcrData();
    data.mrzLine1 = document.getElementById('ocrMrzLine1').textContent;
    data.mrzLine2 = document.getElementById('ocrMrzLine2').textContent;
    data.checkDigitStatus = document.getElementById('ocrCheckDigitStatus').textContent;
    data.ocrConfidence = document.getElementById('ocrConfidenceValue').textContent;

    var json = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(json).then(function () {
      showOcrMessage('Passport data JSON copied to clipboard.', 'success');
    }).catch(function () {
      showOcrMessage('Failed to copy to clipboard.', 'error');
    });
  }

  /* Clear Image Only */
  function clearOcrImage() {
    if (OcrEngine.isRunning) {
      OcrEngine.stopOCR();
    }
    ocrState.imageDataUrl = null;
    ocrState.fileName = null;
    document.getElementById('ocrUploadArea').style.display = '';
    document.getElementById('ocrPreviewArea').style.display = 'none';
    document.getElementById('ocrPreviewImage').src = '';
    document.getElementById('ocrFileInput').value = '';
    resetOcrResults();
    enableOcrButtons();
    showOcrMessage('Image cleared.', 'info');
  }

  /* Init OCR on tab switch */
  var origSwitchTab = switchTab;
  switchTab = function (tabName) {
    origSwitchTab(tabName);
    if (tabName === 'passport-ocr') {
      setTimeout(function () {
        setupOcrUpload();
        enableOcrButtons();
        tryLoadOcrSession();
      }, 50);
    }
    if (tabName === 'customer') {
      setTimeout(function () {
        var hasData = sessionData.customerData !== null;
        document.getElementById('customerSavedBanner').style.display = hasData ? 'flex' : 'none';
        document.getElementById('customerFillBtn').disabled = !hasData;
      }, 50);
    }
    if (tabName === 'travel') {
      setTimeout(function () {
        var hasData = sessionData.travelData !== null;
        document.getElementById('travelSavedBanner').style.display = hasData ? 'flex' : 'none';
        document.getElementById('travelFillBtn').disabled = !hasData;
      }, 50);
    }
    if (tabName === 'documents') {
      setTimeout(function () {
        refreshDocsList();
      }, 50);
    }
  };

  async function tryLoadOcrSession() {
    try {
      if (chrome.storage && chrome.storage.session) {
        var data = await chrome.storage.session.get(STORAGE_KEYS.OCR_SESSION);
        if (data && data[STORAGE_KEYS.OCR_SESSION]) {
          debugLog('OCR session data found from previous session');
        }
      }
    } catch (err) {}
  }

  /* ==================== DYNAMIC OCR FILL (PHASE 4) ==================== */

  var dynamicFillData = null;

  function updateDynamicFillButtons() {
    var hasPassportData = ocrState.dataConfirmed && ocrState.parsedData;
    var btns = [
      document.getElementById('dashFillDynamicBtn'),
      document.getElementById('mapFillDynamicBtn'),
      document.getElementById('ocrFillDynamicBtn')
    ];
    for (var i = 0; i < btns.length; i++) {
      if (btns[i]) {
        btns[i].disabled = !hasPassportData;
        if (hasPassportData) {
          btns[i].classList.add('btn-dynamic-ready');
        } else {
          btns[i].classList.remove('btn-dynamic-ready');
        }
      }
    }
  }

  async function showDynamicFillReviewModal() {
    if (!ocrState.dataConfirmed || !ocrState.parsedData) {
      showMessage('dashMessage', 'No confirmed passport data. Please run OCR and confirm passport data first.', 'error');
      return;
    }

    var targetId = activeProfileId || selectedProfileId;
    if (!targetId) {
      showMessage('dashMessage', 'No active profile selected.', 'error');
      return;
    }

    try {
      showLoading(true);
      var mapping = await loadMapping(targetId);
      if (!mapping || mapping.length === 0) {
        showMessage('dashMessage', 'No mapping data found for this profile.', 'error');
        return;
      }

      var profile = null;
      for (var i = 0; i < currentProfiles.length; i++) {
        if (currentProfiles[i].id === targetId) { profile = currentProfiles[i]; break; }
      }

      var readyFields = [];
      var skippedFields = [];
      var passportData = ocrState.parsedData;

      for (var j = 0; j < mapping.length; j++) {
        var f = mapping[j];
        if (f.category === FIELD_CATEGORIES.DYNAMIC_OCR) {
          var pv = passportData[f.source];
          if (pv && String(pv).trim() !== '' && String(pv).trim() !== '-' && pv !== 'Unspecified') {
            readyFields.push(f);
          } else {
            skippedFields.push(f);
          }
        }
      }

      if (readyFields.length === 0) {
        showMessage('dashMessage', 'No Dynamic OCR Fields with matching passport data found in this profile.', 'warning');
        return;
      }

      dynamicFillData = {
        profileId: targetId,
        profileName: profile ? profile.name : 'Unknown',
        readyFields: readyFields,
        skippedFields: skippedFields,
        passportData: passportData
      };

      var infoEl = document.getElementById('dynamicFillReviewInfo');
      infoEl.innerHTML =
        '<div class="info-row"><span class="info-label">Profile:</span><span>' + escapeHtml(dynamicFillData.profileName) + '</span></div>' +
        '<div class="info-row"><span class="info-label">Fields to fill:</span><span>' + readyFields.length + '</span></div>' +
        '<div class="info-row"><span class="info-label">Skipped (no data):</span><span>' + skippedFields.length + '</span></div>';

      var tbody = document.getElementById('dynamicFillReviewBody');
      tbody.innerHTML = readyFields.map(function (f) {
        var conf = f.selector ? f.selector.confidence : 0;
        var pv = passportData[f.source] || '';
        var status = conf < 50 ? '<span class="needs-verify-badge">Verify</span>' : '<span style="color:var(--success);">&#10003;</span>';
        return '<tr>' +
          '<td>' + escapeHtml(truncate(f.label || 'Unnamed', 30)) + '</td>' +
          '<td>' + escapeHtml(f.source || '-') + '</td>' +
          '<td>' + escapeHtml(truncate(String(pv), 25)) + '</td>' +
          '<td>' + conf + '%</td>' +
          '<td>' + status + '</td>' +
        '</tr>';
      }).join('') +
      skippedFields.map(function (f) {
        return '<tr style="color:var(--gray-500);">' +
          '<td>' + escapeHtml(truncate(f.label || 'Unnamed', 30)) + '</td>' +
          '<td>' + escapeHtml(f.source || '-') + '</td>' +
          '<td><em>no data</em></td>' +
          '<td>-</td>' +
          '<td><span style="color:var(--gray-500);">Skipped</span></td>' +
        '</tr>';
      }).join('');

      document.getElementById('dynamicFillReviewModal').style.display = 'flex';
    } catch (err) {
      showMessage('dashMessage', 'Failed to prepare dynamic fill review: ' + err.message, 'error');
    } finally {
      showLoading(false);
    }
  }

  async function confirmDynamicFill() {
    if (!dynamicFillData || !dynamicFillData.readyFields || dynamicFillData.readyFields.length === 0) {
      showMessage('dashMessage', 'No fields to fill.', 'error');
      return;
    }

    document.getElementById('dynamicFillReviewModal').style.display = 'none';

    try {
      showLoading(true);
      debugLog('Filling dynamic OCR fields:', dynamicFillData.readyFields.length);

      var result = await sendMessageToTab({
        type: MESSAGE_TYPES.FILL_DYNAMIC_OCR_FIELDS,
        payload: {
          fields: dynamicFillData.readyFields,
          passportData: dynamicFillData.passportData,
          settings: currentSettings
        }
      });

      if (!result.success) {
        showMessage('dashMessage', result.error || 'Dynamic fill request failed.', 'error');
        return;
      }

      logAuditEvent(AUDIT_EVENT_TYPES.FILL_OCR, {
        profileId: dynamicFillData.profileId,
        profileName: dynamicFillData.profileName,
        fieldsFilled: (result.result.filled || []).length,
        fieldsFailed: (result.result.failed || []).length,
        fieldsSkipped: (result.result.skipped || []).length
      });

      showDynamicFillResultModal(result.result);
    } catch (err) {
      showMessage('dashMessage', 'Dynamic fill failed: ' + err.message, 'error');
    } finally {
      showLoading(false);
    }
  }

  function showDynamicFillResultModal(result) {
    var filled = result.filled || [];
    var failed = result.failed || [];
    var skipped = result.skipped || [];

    var summaryEl = document.getElementById('dynamicFillResultSummary');
    summaryEl.innerHTML =
      '<div class="result-stat"><span class="result-stat-icon filled"></span>Filled: <span class="result-stat-value filled">' + filled.length + '</span></div>' +
      '<div class="result-stat"><span class="result-stat-icon failed"></span>Failed: <span class="result-stat-value failed">' + failed.length + '</span></div>' +
      '<div class="result-stat"><span class="result-stat-icon skipped"></span>Skipped: <span class="result-stat-value skipped">' + skipped.length + '</span></div>';

    var tbody = document.getElementById('dynamicFillResultBody');
    var rows = [];

    for (var i = 0; i < filled.length; i++) {
      var f = filled[i];
      rows.push('<tr class="result-row-filled">' +
        '<td>' + escapeHtml(truncate(f.label || 'Unnamed', 25)) + '</td>' +
        '<td>' + escapeHtml(f.source || '-') + '</td>' +
        '<td>' + escapeHtml(truncate(f.value || '', 20)) + '</td>' +
        '<td style="color:var(--success);font-weight:600;">&#10003; Filled</td>' +
        '<td>' + escapeHtml(f.selector || '') + '</td>' +
      '</tr>');
    }

    for (var j = 0; j < failed.length; j++) {
      var fl = failed[j];
      rows.push('<tr class="result-row-failed">' +
        '<td>' + escapeHtml(truncate(fl.label || 'Unnamed', 25)) + '</td>' +
        '<td>' + escapeHtml(fl.source || '-') + '</td>' +
        '<td>' + escapeHtml(truncate(fl.value || '', 20)) + '</td>' +
        '<td style="color:var(--danger);font-weight:600;">&#10007; Failed</td>' +
        '<td>' + escapeHtml(fl.reason || '') + '</td>' +
      '</tr>');
    }

    for (var k = 0; k < skipped.length; k++) {
      var s = skipped[k];
      rows.push('<tr class="result-row-skipped">' +
        '<td>' + escapeHtml(truncate(s.label || 'Unnamed', 25)) + '</td>' +
        '<td>' + escapeHtml(s.source || '-') + '</td>' +
        '<td>' + escapeHtml(truncate(s.value || '', 20)) + '</td>' +
        '<td style="color:var(--warning);font-weight:600;">&#9888; Skipped</td>' +
        '<td>' + escapeHtml(s.reason || '') + '</td>' +
      '</tr>');
    }

    tbody.innerHTML = rows.join('');
    document.getElementById('dynamicFillResultModal').style.display = 'flex';
  }

  /* ==================== PHASE 5 — CUSTOMER DATA ==================== */

  function saveCustomerSession() {
    var data = collectCustomerData();
    var hasData = false;
    for (var key in data) {
      if (data[key] && String(data[key]).trim() !== '') { hasData = true; break; }
    }
    if (!hasData) {
      showMessage('customerMessage', 'Please enter customer data before saving.', 'warning');
      return;
    }
    sessionData.customerData = data;
    window.alhijraSessionData = sessionData;
    document.getElementById('customerSavedBanner').style.display = 'flex';
    document.getElementById('customerFillBtn').disabled = false;
    showMessage('customerMessage', 'Customer data saved for this session only.', 'success');
  }

  function clearCustomerSession() {
    sessionData.customerData = null;
    window.alhijraSessionData = sessionData;
    resetCustomerForm();
    document.getElementById('customerSavedBanner').style.display = 'none';
    document.getElementById('customerFillBtn').disabled = true;
    showMessage('customerMessage', 'Customer data cleared.', 'info');
  }

  function collectCustomerData() {
    return {
      phoneNumber: document.getElementById('customerPhone').value || '',
      email: document.getElementById('customerEmail').value || '',
      address: document.getElementById('customerAddress').value || '',
      occupation: document.getElementById('customerOccupation').value || '',
      maritalStatus: document.getElementById('customerMaritalStatus').value || '',
      emergencyContact: document.getElementById('customerEmergency').value || '',
      customerNotes: document.getElementById('customerNotes').value || ''
    };
  }

  function resetCustomerForm() {
    var fields = ['customerPhone', 'customerEmail', 'customerAddress', 'customerOccupation',
      'customerMaritalStatus', 'customerEmergency', 'customerNotes'];
    for (var i = 0; i < fields.length; i++) {
      var el = document.getElementById(fields[i]);
      if (el) el.value = '';
    }
  }

  var customerFillData = null;

  async function showCustomerFillReviewModal() {
    if (!sessionData.customerData) {
      showMessage('customerMessage', 'No customer data saved. Please enter and save customer data first.', 'error');
      return;
    }

    var targetId = activeProfileId || selectedProfileId;
    if (!targetId) {
      showMessage('customerMessage', 'No active profile selected.', 'error');
      return;
    }

    try {
      showLoading(true);
      var mapping = await loadMapping(targetId);
      if (!mapping || mapping.length === 0) {
        showMessage('customerMessage', 'No mapping data found for this profile.', 'error');
        return;
      }

      var profile = null;
      for (var i = 0; i < currentProfiles.length; i++) {
        if (currentProfiles[i].id === targetId) { profile = currentProfiles[i]; break; }
      }

      var readyFields = [];
      var skippedFields = [];
      var customerData = sessionData.customerData;

      for (var j = 0; j < mapping.length; j++) {
        var f = mapping[j];
        if (f.category === FIELD_CATEGORIES.DYNAMIC_CUSTOMER) {
          var cv = customerData[f.source];
          if (cv && String(cv).trim() !== '') {
            readyFields.push(f);
          } else {
            skippedFields.push(f);
          }
        }
      }

      if (readyFields.length === 0) {
        showMessage('customerMessage', 'No Dynamic Customer Fields with matching data found in this profile.', 'warning');
        return;
      }

      customerFillData = {
        profileId: targetId,
        profileName: profile ? profile.name : 'Unknown',
        readyFields: readyFields,
        skippedFields: skippedFields,
        customerData: customerData
      };

      var infoEl = document.getElementById('customerFillReviewInfo');
      infoEl.innerHTML =
        '<div class="info-row"><span class="info-label">Profile:</span><span>' + escapeHtml(customerFillData.profileName) + '</span></div>' +
        '<div class="info-row"><span class="info-label">Fields to fill:</span><span>' + readyFields.length + '</span></div>' +
        '<div class="info-row"><span class="info-label">Skipped (no data):</span><span>' + skippedFields.length + '</span></div>';

      var tbody = document.getElementById('customerFillReviewBody');
      tbody.innerHTML = readyFields.map(function (f) {
        var conf = f.selector ? f.selector.confidence : 0;
        var cv = customerData[f.source] || '';
        var status = conf < 50 ? '<span class="needs-verify-badge">Verify</span>' : '<span style="color:var(--success);">&#10003;</span>';
        return '<tr>' +
          '<td>' + escapeHtml(truncate(f.label || 'Unnamed', 30)) + '</td>' +
          '<td>' + escapeHtml(f.source || '-') + '</td>' +
          '<td>' + escapeHtml(truncate(String(cv), 25)) + '</td>' +
          '<td>' + conf + '%</td>' +
          '<td>' + status + '</td>' +
        '</tr>';
      }).join('') +
      skippedFields.map(function (f) {
        return '<tr style="color:var(--gray-500);">' +
          '<td>' + escapeHtml(truncate(f.label || 'Unnamed', 30)) + '</td>' +
          '<td>' + escapeHtml(f.source || '-') + '</td>' +
          '<td><em>no data</em></td>' +
          '<td>-</td>' +
          '<td><span style="color:var(--gray-500);">Skipped</span></td>' +
        '</tr>';
      }).join('');

      document.getElementById('customerFillReviewModal').style.display = 'flex';
    } catch (err) {
      showMessage('customerMessage', 'Failed to prepare fill review: ' + err.message, 'error');
    } finally {
      showLoading(false);
    }
  }

  async function confirmCustomerFill() {
    if (!customerFillData || !customerFillData.readyFields || customerFillData.readyFields.length === 0) {
      showMessage('customerMessage', 'No fields to fill.', 'error');
      return;
    }

    document.getElementById('customerFillReviewModal').style.display = 'none';

    try {
      showLoading(true);
      debugLog('Filling customer fields:', customerFillData.readyFields.length);

      var result = await sendMessageToTab({
        type: MESSAGE_TYPES.FILL_DYNAMIC_CUSTOMER_FIELDS,
        payload: {
          fields: customerFillData.readyFields,
          customerData: customerFillData.customerData,
          settings: currentSettings
        }
      });

      if (!result.success) {
        showMessage('customerMessage', result.error || 'Customer fill request failed.', 'error');
        return;
      }

      logAuditEvent(AUDIT_EVENT_TYPES.FILL_CUSTOMER, {
        profileId: customerFillData.profileId,
        profileName: customerFillData.profileName,
        fieldsFilled: (result.result.filled || []).length,
        fieldsFailed: (result.result.failed || []).length,
        fieldsSkipped: (result.result.skipped || []).length
      });

      trySaveCustomerFillResult(result.result);
      showCustomerFillResultModal(result.result);
    } catch (err) {
      showMessage('customerMessage', 'Customer fill failed: ' + err.message, 'error');
    } finally {
      showLoading(false);
    }
  }

  async function trySaveCustomerFillResult(result) {
    try {
      var meta = {
        filledCount: (result.filled || []).length,
        failedCount: (result.failed || []).length,
        skippedCount: (result.skipped || []).length,
        timestamp: new Date().toISOString(),
        profileId: customerFillData ? customerFillData.profileId : ''
      };
      await saveToStorage(STORAGE_KEYS.LAST_CUSTOMER_FILL, meta);
    } catch (e) {}
  }

  function showCustomerFillResultModal(result) {
    var filled = result.filled || [];
    var failed = result.failed || [];
    var skipped = result.skipped || [];

    var summaryEl = document.getElementById('customerFillResultSummary');
    summaryEl.innerHTML =
      '<div class="result-stat"><span class="result-stat-icon filled"></span>Filled: <span class="result-stat-value filled">' + filled.length + '</span></div>' +
      '<div class="result-stat"><span class="result-stat-icon failed"></span>Failed: <span class="result-stat-value failed">' + failed.length + '</span></div>' +
      '<div class="result-stat"><span class="result-stat-icon skipped"></span>Skipped: <span class="result-stat-value skipped">' + skipped.length + '</span></div>';

    var tbody = document.getElementById('customerFillResultBody');
    var rows = [];

    for (var i = 0; i < filled.length; i++) {
      var f = filled[i];
      rows.push('<tr class="result-row-filled">' +
        '<td>' + escapeHtml(truncate(f.label || 'Unnamed', 25)) + '</td>' +
        '<td>' + escapeHtml(f.source || '-') + '</td>' +
        '<td>' + escapeHtml(truncate(f.value || '', 20)) + '</td>' +
        '<td style="color:var(--success);font-weight:600;">&#10003; Filled</td>' +
        '<td>' + escapeHtml(f.selector || '') + '</td>' +
      '</tr>');
    }

    for (var j = 0; j < failed.length; j++) {
      var fl = failed[j];
      rows.push('<tr class="result-row-failed">' +
        '<td>' + escapeHtml(truncate(fl.label || 'Unnamed', 25)) + '</td>' +
        '<td>' + escapeHtml(fl.source || '-') + '</td>' +
        '<td>' + escapeHtml(truncate(fl.value || '', 20)) + '</td>' +
        '<td style="color:var(--danger);font-weight:600;">&#10007; Failed</td>' +
        '<td>' + escapeHtml(fl.reason || '') + '</td>' +
      '</tr>');
    }

    for (var k = 0; k < skipped.length; k++) {
      var s = skipped[k];
      rows.push('<tr class="result-row-skipped">' +
        '<td>' + escapeHtml(truncate(s.label || 'Unnamed', 25)) + '</td>' +
        '<td>' + escapeHtml(s.source || '-') + '</td>' +
        '<td>' + escapeHtml(truncate(s.value || '', 20)) + '</td>' +
        '<td style="color:var(--warning);font-weight:600;">&#9888; Skipped</td>' +
        '<td>' + escapeHtml(s.reason || '') + '</td>' +
      '</tr>');
    }

    tbody.innerHTML = rows.join('');
    document.getElementById('customerFillResultModal').style.display = 'flex';
  }

  /* ==================== PHASE 5 — TRAVEL DATA ==================== */

  function saveTravelSession() {
    var data = collectTravelData();
    var hasData = false;
    for (var key in data) {
      if (data[key] && String(data[key]).trim() !== '') { hasData = true; break; }
    }
    if (!hasData) {
      showMessage('travelMessage', 'Please enter travel data before saving.', 'warning');
      return;
    }
    sessionData.travelData = data;
    window.alhijraSessionData = sessionData;
    document.getElementById('travelSavedBanner').style.display = 'flex';
    document.getElementById('travelFillBtn').disabled = false;
    showMessage('travelMessage', 'Travel data saved for this session only.', 'success');
  }

  function clearTravelSession() {
    sessionData.travelData = null;
    window.alhijraSessionData = sessionData;
    resetTravelForm();
    document.getElementById('travelSavedBanner').style.display = 'none';
    document.getElementById('travelFillBtn').disabled = true;
    showMessage('travelMessage', 'Travel data cleared.', 'info');
  }

  function collectTravelData() {
    return {
      arrivalDate: document.getElementById('travelArrivalDate').value || '',
      departureDate: document.getElementById('travelDepartureDate').value || '',
      flightNumber: document.getElementById('travelFlightNumber').value || '',
      departureCity: document.getElementById('travelDepartureCity').value || '',
      arrivalCity: document.getElementById('travelArrivalCity').value || '',
      hotelName: document.getElementById('travelHotelName').value || '',
      hotelAddress: document.getElementById('travelHotelAddress').value || '',
      stayDuration: document.getElementById('travelStayDuration').value || '',
      packageName: document.getElementById('travelPackageName').value || ''
    };
  }

  function resetTravelForm() {
    var fields = ['travelArrivalDate', 'travelDepartureDate', 'travelFlightNumber',
      'travelDepartureCity', 'travelArrivalCity', 'travelHotelName',
      'travelHotelAddress', 'travelStayDuration', 'travelPackageName'];
    for (var i = 0; i < fields.length; i++) {
      var el = document.getElementById(fields[i]);
      if (el) el.value = '';
    }
  }

  var travelFillData = null;

  async function showTravelFillReviewModal() {
    if (!sessionData.travelData) {
      showMessage('travelMessage', 'No travel data saved. Please enter and save travel data first.', 'error');
      return;
    }

    var targetId = activeProfileId || selectedProfileId;
    if (!targetId) {
      showMessage('travelMessage', 'No active profile selected.', 'error');
      return;
    }

    try {
      showLoading(true);
      var mapping = await loadMapping(targetId);
      if (!mapping || mapping.length === 0) {
        showMessage('travelMessage', 'No mapping data found for this profile.', 'error');
        return;
      }

      var profile = null;
      for (var i = 0; i < currentProfiles.length; i++) {
        if (currentProfiles[i].id === targetId) { profile = currentProfiles[i]; break; }
      }

      var readyFields = [];
      var skippedFields = [];
      var travelData = sessionData.travelData;

      for (var j = 0; j < mapping.length; j++) {
        var f = mapping[j];
        if (f.category === FIELD_CATEGORIES.DYNAMIC_TRAVEL) {
          var tv = travelData[f.source];
          if (tv && String(tv).trim() !== '') {
            readyFields.push(f);
          } else {
            skippedFields.push(f);
          }
        }
      }

      if (readyFields.length === 0) {
        showMessage('travelMessage', 'No Dynamic Travel Fields with matching data found in this profile.', 'warning');
        return;
      }

      travelFillData = {
        profileId: targetId,
        profileName: profile ? profile.name : 'Unknown',
        readyFields: readyFields,
        skippedFields: skippedFields,
        travelData: travelData
      };

      var infoEl = document.getElementById('travelFillReviewInfo');
      infoEl.innerHTML =
        '<div class="info-row"><span class="info-label">Profile:</span><span>' + escapeHtml(travelFillData.profileName) + '</span></div>' +
        '<div class="info-row"><span class="info-label">Fields to fill:</span><span>' + readyFields.length + '</span></div>' +
        '<div class="info-row"><span class="info-label">Skipped (no data):</span><span>' + skippedFields.length + '</span></div>';

      var tbody = document.getElementById('travelFillReviewBody');
      tbody.innerHTML = readyFields.map(function (f) {
        var conf = f.selector ? f.selector.confidence : 0;
        var tv = travelData[f.source] || '';
        var status = conf < 50 ? '<span class="needs-verify-badge">Verify</span>' : '<span style="color:var(--success);">&#10003;</span>';
        return '<tr>' +
          '<td>' + escapeHtml(truncate(f.label || 'Unnamed', 30)) + '</td>' +
          '<td>' + escapeHtml(f.source || '-') + '</td>' +
          '<td>' + escapeHtml(truncate(String(tv), 25)) + '</td>' +
          '<td>' + conf + '%</td>' +
          '<td>' + status + '</td>' +
        '</tr>';
      }).join('') +
      skippedFields.map(function (f) {
        return '<tr style="color:var(--gray-500);">' +
          '<td>' + escapeHtml(truncate(f.label || 'Unnamed', 30)) + '</td>' +
          '<td>' + escapeHtml(f.source || '-') + '</td>' +
          '<td><em>no data</em></td>' +
          '<td>-</td>' +
          '<td><span style="color:var(--gray-500);">Skipped</span></td>' +
        '</tr>';
      }).join('');

      document.getElementById('travelFillReviewModal').style.display = 'flex';
    } catch (err) {
      showMessage('travelMessage', 'Failed to prepare fill review: ' + err.message, 'error');
    } finally {
      showLoading(false);
    }
  }

  async function confirmTravelFill() {
    if (!travelFillData || !travelFillData.readyFields || travelFillData.readyFields.length === 0) {
      showMessage('travelMessage', 'No fields to fill.', 'error');
      return;
    }

    document.getElementById('travelFillReviewModal').style.display = 'none';

    try {
      showLoading(true);
      debugLog('Filling travel fields:', travelFillData.readyFields.length);

      var result = await sendMessageToTab({
        type: MESSAGE_TYPES.FILL_DYNAMIC_TRAVEL_FIELDS,
        payload: {
          fields: travelFillData.readyFields,
          travelData: travelFillData.travelData,
          settings: currentSettings
        }
      });

      if (!result.success) {
        showMessage('travelMessage', result.error || 'Travel fill request failed.', 'error');
        return;
      }

      logAuditEvent(AUDIT_EVENT_TYPES.FILL_TRAVEL, {
        profileId: travelFillData.profileId,
        profileName: travelFillData.profileName,
        fieldsFilled: (result.result.filled || []).length,
        fieldsFailed: (result.result.failed || []).length,
        fieldsSkipped: (result.result.skipped || []).length
      });

      trySaveTravelFillResult(result.result);
      showTravelFillResultModal(result.result);
    } catch (err) {
      showMessage('travelMessage', 'Travel fill failed: ' + err.message, 'error');
    } finally {
      showLoading(false);
    }
  }

  async function trySaveTravelFillResult(result) {
    try {
      var meta = {
        filledCount: (result.filled || []).length,
        failedCount: (result.failed || []).length,
        skippedCount: (result.skipped || []).length,
        timestamp: new Date().toISOString(),
        profileId: travelFillData ? travelFillData.profileId : ''
      };
      await saveToStorage(STORAGE_KEYS.LAST_TRAVEL_FILL, meta);
    } catch (e) {}
  }

  function showTravelFillResultModal(result) {
    var filled = result.filled || [];
    var failed = result.failed || [];
    var skipped = result.skipped || [];

    var summaryEl = document.getElementById('travelFillResultSummary');
    summaryEl.innerHTML =
      '<div class="result-stat"><span class="result-stat-icon filled"></span>Filled: <span class="result-stat-value filled">' + filled.length + '</span></div>' +
      '<div class="result-stat"><span class="result-stat-icon failed"></span>Failed: <span class="result-stat-value failed">' + failed.length + '</span></div>' +
      '<div class="result-stat"><span class="result-stat-icon skipped"></span>Skipped: <span class="result-stat-value skipped">' + skipped.length + '</span></div>';

    var tbody = document.getElementById('travelFillResultBody');
    var rows = [];

    for (var i = 0; i < filled.length; i++) {
      var f = filled[i];
      rows.push('<tr class="result-row-filled">' +
        '<td>' + escapeHtml(truncate(f.label || 'Unnamed', 25)) + '</td>' +
        '<td>' + escapeHtml(f.source || '-') + '</td>' +
        '<td>' + escapeHtml(truncate(f.value || '', 20)) + '</td>' +
        '<td style="color:var(--success);font-weight:600;">&#10003; Filled</td>' +
        '<td>' + escapeHtml(f.selector || '') + '</td>' +
      '</tr>');
    }

    for (var j = 0; j < failed.length; j++) {
      var fl = failed[j];
      rows.push('<tr class="result-row-failed">' +
        '<td>' + escapeHtml(truncate(fl.label || 'Unnamed', 25)) + '</td>' +
        '<td>' + escapeHtml(fl.source || '-') + '</td>' +
        '<td>' + escapeHtml(truncate(fl.value || '', 20)) + '</td>' +
        '<td style="color:var(--danger);font-weight:600;">&#10007; Failed</td>' +
        '<td>' + escapeHtml(fl.reason || '') + '</td>' +
      '</tr>');
    }

    for (var k = 0; k < skipped.length; k++) {
      var s = skipped[k];
      rows.push('<tr class="result-row-skipped">' +
        '<td>' + escapeHtml(truncate(s.label || 'Unnamed', 25)) + '</td>' +
        '<td>' + escapeHtml(s.source || '-') + '</td>' +
        '<td>' + escapeHtml(truncate(s.value || '', 20)) + '</td>' +
        '<td style="color:var(--warning);font-weight:600;">&#9888; Skipped</td>' +
        '<td>' + escapeHtml(s.reason || '') + '</td>' +
      '</tr>');
    }

    tbody.innerHTML = rows.join('');
    document.getElementById('travelFillResultModal').style.display = 'flex';
  }

  /* ==================== PHASE 5 — DOCUMENTS TAB ==================== */

  async function refreshDocsList() {
    var targetId = activeProfileId || selectedProfileId;
    if (!targetId) {
      showMessage('documentsMessage', 'No active profile selected.', 'error');
      return;
    }

    try {
      var mapping = await loadMapping(targetId);
      var uploadFields = mapping.filter(function (f) {
        return f.category === FIELD_CATEGORIES.FILE_UPLOAD;
      });

      var container = document.getElementById('docsMappingList');
      if (uploadFields.length === 0) {
        container.innerHTML = '<p class="empty-state">No File Upload fields mapped in this profile. Please scan a page and map file upload fields first.</p>';
        return;
      }

      container.innerHTML = uploadFields.map(function (f) {
        var conf = f.selector ? f.selector.confidence : 0;
        var foundOnPage = false;
        if (f.selector && f.selector.selector) {
          try {
            var el = document.querySelector(f.selector.selector);
            foundOnPage = !!el;
          } catch (e) {}
        }
        var statusClass = foundOnPage ? 'found' : 'missing';
        var statusText = foundOnPage ? 'Found on page' : 'Not found';
        return '<div class="docs-mapping-item">' +
          '<div class="docs-mapping-header">' +
            '<span class="docs-mapping-label">' + escapeHtml(f.label || 'Unnamed Field') + '</span>' +
            '<span class="docs-mapping-source">' + escapeHtml(f.source || '-') + '</span>' +
          '</div>' +
          '<div class="docs-mapping-detail">' +
            '<span>Selector: ' + escapeHtml(truncate((f.selector ? f.selector.selector : '-') || '-', 40)) + '</span>' +
            '<span class="docs-status-badge ' + statusClass + '">' + statusText + '</span>' +
          '</div>' +
          '<div class="docs-mapping-detail">' +
            '<span>Confidence: ' + conf + '%</span>' +
            '<span>Accept: ' + escapeHtml((f.metadata && f.metadata.fileUploadInfo ? f.metadata.fileUploadInfo.accept : '') || 'any') + '</span>' +
          '</div>' +
        '</div>';
      }).join('');
    } catch (err) {
      showMessage('documentsMessage', 'Failed to load document mapping: ' + err.message, 'error');
    }
  }

  async function highlightDocUploadFields() {
    var targetId = activeProfileId || selectedProfileId;
    if (!targetId) {
      showMessage('documentsMessage', 'No active profile selected.', 'error');
      return;
    }

    try {
      var mapping = await loadMapping(targetId);
      var uploadFields = mapping.filter(function (f) {
        return f.category === FIELD_CATEGORIES.FILE_UPLOAD && f.selector && f.selector.selector;
      });

      if (uploadFields.length === 0) {
        showMessage('documentsMessage', 'No File Upload fields with selectors found in profile.', 'warning');
        return;
      }

      for (var i = 0; i < uploadFields.length; i++) {
        await sendMessageToTab({
          type: MESSAGE_TYPES.HIGHLIGHT_FIELD,
          fieldData: uploadFields[i]
        });
      }

      showMessage('documentsMessage', 'Highlighted ' + uploadFields.length + ' upload field(s) on the page.', 'success');
    } catch (err) {
      showMessage('documentsMessage', 'Failed to highlight fields: ' + err.message, 'error');
    }
  }

  /* ==================== PHASE 6 — STAFF MANAGEMENT ==================== */

  async function handleStaffChange(staffId) {
    try {
      var prevId = currentSettings.currentStaffId || 'staff1';
      currentSettings.currentStaffId = staffId;
      await saveSettings(currentSettings);
      if (prevId !== staffId) {
        logAuditEvent(AUDIT_EVENT_TYPES.STAFF_CHANGE, { fieldsFilled: 0, extra: 'Changed from ' + prevId + ' to ' + staffId });
      }
      debugLog('Staff changed to:', staffId);
    } catch (e) {}
  }

  /* ==================== PHASE 6 — BACKUP / RESTORE ==================== */

  async function createBackupHandler() {
    try {
      showLoading(true);
      var backupData = await createFullBackup();
      var json = JSON.stringify(backupData, null, 2);
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'alhijra-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      URL.revokeObjectURL(url);
      logAuditEvent(AUDIT_EVENT_TYPES.BACKUP, { fieldsFilled: backupData.totalProfiles || 0, extra: 'Backup created: ' + backupData.totalProfiles + ' profiles, ' + backupData.totalMappings + ' mappings' });
      showMessage('importExportMessage', 'Backup downloaded successfully.', 'success');
    } catch (err) {
      showMessage('importExportMessage', 'Backup failed: ' + err.message, 'error');
    } finally {
      showLoading(false);
    }
  }

  async function restoreBackupHandler(e) {
    var file = e.target.files[0];
    if (!file) return;

    try {
      showLoading(true);
      var text = await file.text();
      var data = JSON.parse(text);

      if (!data.backupType || data.backupType !== 'full') {
        showMessage('importExportMessage', 'Invalid backup file: missing full backup type.', 'error');
        return;
      }

      if (!confirm('This will replace all current data (profiles, mappings, settings, staff, audit logs). Continue?')) return;

      var result = await restoreFromBackup(data);

      /* Reload current state */
      await loadInitialData();

      logAuditEvent(AUDIT_EVENT_TYPES.RESTORE, { fieldsFilled: result.restoredProfiles || 0, extra: 'Restored: ' + result.restoredProfiles + ' profiles, ' + result.restoredMappings + ' mappings, ' + result.restoredAuditLogs + ' audit logs' });
      showMessage('importExportMessage', 'Restore complete: ' + result.restoredProfiles + ' profiles, ' + result.restoredMappings + ' mappings, ' + result.restoredAuditLogs + ' audit logs.', 'success');
    } catch (err) {
      showMessage('importExportMessage', 'Restore failed: ' + err.message, 'error');
    } finally {
      e.target.value = '';
      showLoading(false);
    }
  }

  /* ==================== PHASE 6 — AUDIT LOG VIEWER ==================== */

  function getLogTypeLabel(type) {
    var labels = {
      fill_fixed: 'Fixed Fill',
      fill_ocr: 'OCR Fill',
      fill_customer: 'Customer Fill',
      fill_travel: 'Travel Fill',
      ocr_run: 'OCR Run',
      ocr_confirm: 'OCR Confirm',
      backup: 'Backup',
      restore: 'Restore',
      staff_change: 'Staff Change',
      settings_change: 'Settings'
    };
    return labels[type] || type;
  }

  function getStaffName(id) {
    for (var i = 0; i < STAFF_MEMBERS.length; i++) {
      if (STAFF_MEMBERS[i].id === id) return STAFF_MEMBERS[i].name;
    }
    return id || '-';
  }

  async function renderAuditLogs() {
    try {
      var logs = await getAuditLogs(500);
      var typeFilter = document.getElementById('logTypeFilter').value;
      var staffFilter = document.getElementById('logStaffFilter').value;

      if (typeFilter) logs = logs.filter(function (l) { return l.type === typeFilter; });
      if (staffFilter) logs = logs.filter(function (l) { return l.staffId === staffFilter; });

      var tbody = document.getElementById('logTableBody');
      if (!logs || logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No logs match the current filters.</td></tr>';
        return;
      }

      tbody.innerHTML = logs.map(function (l) {
        var ts = l.timestamp ? new Date(l.timestamp).toLocaleString() : '-';
        return '<tr>' +
          '<td class="log-cell-ts">' + escapeHtml(ts) + '</td>' +
          '<td>' + escapeHtml(getStaffName(l.staffId)) + '</td>' +
          '<td><span class="log-type-badge">' + escapeHtml(getLogTypeLabel(l.type)) + '</span></td>' +
          '<td>' + escapeHtml(l.profileName || '-') + '</td>' +
          '<td>' + (l.fieldsFilled || 0) + '</td>' +
          '<td>' + (l.fieldsFailed || 0) + '</td>' +
          '<td>' + (l.fieldsSkipped || 0) + '</td>' +
        '</tr>';
      }).join('');
    } catch (err) {
      showMessage('logsMessage', 'Failed to load audit logs: ' + err.message, 'error');
    }
  }

  async function exportAuditLogs() {
    try {
      var logs = await getAuditLogs(500);
      var json = JSON.stringify(logs, null, 2);
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'alhijra-audit-logs-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      URL.revokeObjectURL(url);
      showMessage('logsMessage', 'Audit logs exported.', 'success');
    } catch (err) {
      showMessage('logsMessage', 'Export failed: ' + err.message, 'error');
    }
  }

  async function clearAuditLogsHandler() {
    if (!confirm('Clear all audit logs? This cannot be undone.')) return;
    try {
      await clearAuditLogs();
      renderAuditLogs();
      showMessage('logsMessage', 'Audit logs cleared.', 'success');
    } catch (err) {
      showMessage('logsMessage', 'Failed to clear logs: ' + err.message, 'error');
    }
  }

  /* ==================== PHASE 6 — INIT ==================== */

  function initPhase6() {
    /* Populate staff filter */
    var staffFilter = document.getElementById('logStaffFilter');
    if (staffFilter) {
      STAFF_MEMBERS.forEach(function (s) {
        var opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        staffFilter.appendChild(opt);
      });
    }
    /* Set current staff in selector */
    var sel = document.getElementById('staffSelector');
    if (sel && currentSettings.currentStaffId) {
      sel.value = currentSettings.currentStaffId;
    }
    /* Initial render */
    renderAuditLogs();
  }

  /* ==================== PHASE 8 — CLOUD SYNC ==================== */

  async function syncPushHandler() {
    try {
      showLoading(true);
      var result = await fsPushFullSync();
      var statusEl = document.getElementById('syncLastStatus');
      if (statusEl) statusEl.textContent = 'Last sync: ' + new Date(result.lastSyncedAt).toLocaleString() + ' (' + result.profiles.length + ' profiles)';
      showMessage('importExportMessage', 'Data synced to cloud successfully.', 'success');
    } catch (err) {
      showMessage('importExportMessage', 'Sync failed: ' + err.message, 'error');
    } finally {
      showLoading(false);
    }
  }

  async function syncPullHandler() {
    try {
      showLoading(true);
      var syncData = await fsPullFullSync();
      if (!syncData) {
        showMessage('importExportMessage', 'No cloud data found. Push data first.', 'warning');
        return;
      }
      if (!confirm('This will replace all local data with cloud data. Continue?')) return;
      await fsApplySync(syncData);
      await loadInitialData();
      var statusEl = document.getElementById('syncLastStatus');
      if (statusEl) statusEl.textContent = 'Last pulled: ' + (syncData.lastSyncedAt ? new Date(syncData.lastSyncedAt).toLocaleString() : 'unknown');
      showMessage('importExportMessage', 'Data restored from cloud successfully.', 'success');
    } catch (err) {
      showMessage('importExportMessage', 'Pull failed: ' + err.message, 'error');
    } finally {
      showLoading(false);
    }
  }

  /* ==================== PHASE 7 — REPORTING ==================== */

  async function generateReportHandler() {
    try {
      showLoading(true);
      var profiles = await getProfiles();
      var logs = await getAuditLogs(500);
      var today = new Date().toISOString().slice(0, 10);

      var profileStats = {};
      for (var i = 0; i < profiles.length; i++) {
        profileStats[profiles[i].id] = { name: profiles[i].name, fills: 0, succeeded: 0, failed: 0 };
      }

      var typeCounts = {};
      var totalFills = 0;
      var totalFieldsFilled = 0;
      var totalFieldsFailed = 0;

      for (var i = 0; i < logs.length; i++) {
        var l = logs[i];
        if (!typeCounts[l.type]) typeCounts[l.type] = { count: 0, fieldsFilled: 0, fieldsFailed: 0 };
        typeCounts[l.type].count++;
        typeCounts[l.type].fieldsFilled += l.fieldsFilled || 0;
        typeCounts[l.type].fieldsFailed += l.fieldsFailed || 0;

        if (l.type === 'fill_fixed' || l.type === 'fill_ocr' || l.type === 'fill_customer' || l.type === 'fill_travel') {
          totalFills++;
          totalFieldsFilled += l.fieldsFilled || 0;
          totalFieldsFailed += l.fieldsFailed || 0;
          if (profileStats[l.profileId]) {
            profileStats[l.profileId].fills++;
            if (l.fieldsFailed === 0) profileStats[l.profileId].succeeded++;
            else profileStats[l.profileId].failed++;
          }
        }
      }

      var staffLogs = {};
      for (var i = 0; i < STAFF_MEMBERS.length; i++) {
        staffLogs[STAFF_MEMBERS[i].id] = { name: STAFF_MEMBERS[i].name, actions: 0 };
      }
      for (var i = 0; i < logs.length; i++) {
        if (staffLogs[logs[i].staffId]) staffLogs[logs[i].staffId].actions++;
      }

      var report = {
        extensionName: 'Alhijra Visa OCR Assistant',
        version: '1.0.0',
        reportType: 'fill_activity',
        generatedAt: new Date().toISOString(),
        period: { from: logs.length > 0 ? logs[logs.length - 1].timestamp : '-', to: today },
        summary: {
          totalProfiles: profiles.length,
          totalFillOperations: totalFills,
          totalFieldsFilled: totalFieldsFilled,
          totalFieldsFailed: totalFieldsFailed,
          successRate: totalFills > 0 ? Math.round((totalFills - totalFieldsFailed) / totalFills * 100) + '%' : '-',
          fillsToday: logs.filter(function (l) { return l.timestamp && l.timestamp.slice(0, 10) === today && (l.type === 'fill_fixed' || l.type === 'fill_ocr' || l.type === 'fill_customer' || l.type === 'fill_travel'); }).length
        },
        profileStats: Object.keys(profileStats).map(function (id) { return profileStats[id]; }),
        actionTypeBreakdown: typeCounts,
        staffActivity: Object.keys(staffLogs).map(function (id) { return staffLogs[id]; })
      };

      var json = JSON.stringify(report, null, 2);
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'alhijra-report-' + today + '.json';
      a.click();
      URL.revokeObjectURL(url);
      showMessage('importExportMessage', 'Report downloaded successfully.', 'success');
    } catch (err) {
      showMessage('importExportMessage', 'Report generation failed: ' + err.message, 'error');
    } finally {
      showLoading(false);
    }
  }

  /* Init OCR on first load */
  setupOcrUpload();
  enableOcrButtons();
  updateDynamicFillButtons();

  /* Init Phase 5 state */
  document.getElementById('customerFillBtn').disabled = true;
  document.getElementById('travelFillBtn').disabled = true;

  /* Init Phase 6 */
  initPhase6();

})();
