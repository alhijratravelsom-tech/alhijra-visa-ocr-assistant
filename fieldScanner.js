function isElementVisible(element) {
  if (!element) return false;
  if (element.type && element.type.toLowerCase() === 'hidden') return false;
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
    return false;
  }
  if (!element.getClientRects().length) return false;
  let parent = element.parentElement;
  while (parent) {
    const parentStyle = window.getComputedStyle(parent);
    if (parentStyle.display === 'none' || parentStyle.visibility === 'hidden' || Number(parentStyle.opacity) === 0) {
      return false;
    }
    parent = parent.parentElement;
  }
  return true;
}

function isHiddenField(el) {
  if (!el) return false;
  if (el.tagName.toLowerCase() === 'input' && (el.getAttribute('type') || '').toLowerCase() === 'hidden') return true;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return true;
  return false;
}

function getFieldType(el) {
  if (!el) return 'unknown';
  const tag = el.tagName.toLowerCase();
  if (tag === 'select') {
    return el.multiple ? 'select-multiple' : 'select-one';
  }
  if (tag === 'textarea') return 'textarea';
  if (tag === 'input') {
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    return `input:${type}`;
  }
  return tag;
}

function getFieldState(el) {
  return {
    required: el.hasAttribute('required') || el.getAttribute('aria-required') === 'true',
    disabled: el.disabled || el.hasAttribute('disabled'),
    readonly: el.readOnly || el.hasAttribute('readonly'),
    visible: isElementVisible(el),
    hidden: isHiddenField(el),
    checked: (el.type === 'checkbox' || el.type === 'radio') ? el.checked : null,
    selectedValue: el.tagName === 'SELECT' ? el.value : null
  };
}

function getFieldLabel(el) {
  const labelPriorities = [
    () => {
      const id = el.getAttribute('id');
      if (id) {
        const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
        if (label) return getTextContent(label);
      }
      return null;
    },
    () => {
      let parent = el.parentElement;
      while (parent) {
        if (parent.tagName === 'LABEL') return getTextContent(parent);
        if (parent.tagName === 'FIELDSET') break;
        if (parent.tagName === 'FORM') break;
        parent = parent.parentElement;
      }
      return null;
    },
    () => el.getAttribute('aria-label'),
    () => {
      const ariaLabelledby = el.getAttribute('aria-labelledby');
      if (ariaLabelledby) {
        const labelEl = document.getElementById(ariaLabelledby);
        if (labelEl) return getTextContent(labelEl);
      }
      return null;
    },
    () => el.getAttribute('placeholder'),
    () => el.getAttribute('title'),
    () => {
      const prev = el.previousElementSibling;
      if (prev) return getTextContent(prev);
      return null;
    },
    () => {
      const parent = el.parentElement;
      if (parent) {
        const textNodes = Array.from(parent.childNodes)
          .filter(n => n.nodeType === Node.TEXT_NODE)
          .map(n => n.textContent.trim())
          .filter(t => t);
        if (textNodes.length > 0) return textNodes[0];
      }
      return null;
    },
    () => {
      const next = el.nextElementSibling;
      if (next && (next.tagName === 'LABEL' || next.tagName === 'SPAN')) return getTextContent(next);
      return null;
    }
  ];
  for (const getLabel of labelPriorities) {
    const label = getLabel();
    if (label && label.trim()) return getCleanLabel(label);
  }
  return '';
}

function getFieldBasicInfo(el) {
  return {
    tagName: el.tagName.toLowerCase(),
    inputType: el.type || null,
    name: el.getAttribute('name') || '',
    id: el.getAttribute('id') || '',
    className: (el.className && typeof el.className === 'string') ? el.className : '',
    placeholder: el.getAttribute('placeholder') || '',
    value: el.value || '',
    ariaLabel: el.getAttribute('aria-label') || '',
    ariaDescribedby: el.getAttribute('aria-describedby') || '',
    ariaLabelledby: el.getAttribute('aria-labelledby') || '',
    autocomplete: el.getAttribute('autocomplete') || '',
    formControlName: el.getAttribute('formcontrolname') || el.getAttribute('form-control-name') || '',
    role: el.getAttribute('role') || '',
    title: el.getAttribute('title') || '',
    dataAttributes: getDataAttributes(el)
  };
}

function getDataAttributes(el) {
  const data = {};
  if (!el || !el.dataset) return data;
  for (const key of Object.keys(el.dataset)) {
    data[`data-${key}`] = el.dataset[key];
  }
  return data;
}

function getFieldPosition(el) {
  const rect = el.getBoundingClientRect();
  return {
    boundingBox: {
      top: Math.round(rect.top),
      left: Math.round(rect.left),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    },
    pageSection: rect.top < window.innerHeight / 2 ? 'top-half' : 'bottom-half'
  };
}

function getSelectOptions(el) {
  if (el.tagName !== 'SELECT') return { empty: false, options: [] };
  const opts = Array.from(el.options)
    .filter(opt => opt.text && opt.text.trim() !== '')
    .map(opt => ({
      text: opt.text.trim(),
      value: opt.value,
      selected: opt.selected,
      disabled: opt.disabled
    }));
  const hasEmptyPlaceholder = opts.length > 0 && (!opts[0].value || opts[0].text.trim() === '');
  return { empty: hasEmptyPlaceholder, options: opts };
}

function getRadioGroupInfo(el) {
  if (el.type !== 'radio') return null;
  const name = el.getAttribute('name');
  if (!name) return null;
  const group = document.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`);
  const options = Array.from(group).map(radio => {
    const label = getFieldLabel(radio) || radio.value || '';
    return { label, value: radio.value, checked: radio.checked };
  });
  return { groupName: name, options, fieldCount: group.length };
}

function getCheckboxInfo(el) {
  if (el.type !== 'checkbox') return null;
  return {
    label: getFieldLabel(el) || '',
    checked: el.checked,
    value: el.value
  };
}

function getFileUploadInfo(el) {
  if (el.type !== 'file') return null;
  return {
    accept: el.getAttribute('accept') || '',
    multiple: el.hasAttribute('multiple'),
    label: getFieldLabel(el) || ''
  };
}

function deduplicateFields(fields) {
  const seen = new Set();
  return fields.filter(f => {
    const selectorKey = f.selector ? f.selector.selector : '';
    const posKey = f.position ? `${f.position.boundingBox.top}-${f.position.boundingBox.left}-${f.position.boundingBox.width}-${f.position.boundingBox.height}` : '';
    const key = [
      f.name || '',
      f.id || '',
      selectorKey,
      posKey
    ].filter(k => k).join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isEditableField(el) {
  const tag = el.tagName.toLowerCase();
  if (tag === 'textarea') return true;
  if (tag === 'select') return true;
  if (tag === 'input') {
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    return VISUAL_INPUT_TYPES.includes(type);
  }
  if (el.isContentEditable) return true;
  return false;
}

function getFieldIndex(el) {
  const allEditable = document.querySelectorAll(
    FIELD_TAGS.map(t => `${t}:not([type="hidden"])`).join(',')
  );
  let idx = 0;
  for (const field of allEditable) {
    if (isEditableField(field)) {
      idx++;
      if (field === el) return idx;
    }
  }
  return 0;
}

function getFormIndex(el) {
  let current = el.parentElement;
  while (current) {
    if (current.tagName === 'FORM') {
      const forms = document.querySelectorAll('form');
      return Array.from(forms).indexOf(current) + 1;
    }
    current = current.parentElement;
  }
  return 0;
}

function scanFields() {
  const allInputs = document.querySelectorAll('input, select, textarea');
  const fields = [];
  let fieldCounter = 0;
  const seenRadios = new Set();

  for (const el of allInputs) {
    const tag = el.tagName.toLowerCase();
    const type = el.type ? el.type.toLowerCase() : '';

    if (tag === 'input' && type === 'radio') {
      const name = el.getAttribute('name');
      if (!name || seenRadios.has(name)) continue;
      seenRadios.add(name);
    }

    if (!isEditableField(el) && type !== 'hidden') continue;

    fieldCounter++;
    const basicInfo = getFieldBasicInfo(el);
    const label = getFieldLabel(el);
    const state = getFieldState(el);
    const position = getFieldPosition(el);
    const selector = generateStableSelector(el);
    const nearbyText = getNearbyText(el);
    const sectionTitle = getParentSectionTitle(el);
    const fieldsetLegend = getFieldsetLegend(el);
    const closestHeading = getClosestHeadingText(el);
    const selectInfo = tag === 'select' ? getSelectOptions(el) : null;

    const field = {
      fieldId: generateId(),
      number: fieldCounter,
      fieldType: getFieldType(el),
      label,
      ...basicInfo,
      ...state,
      labelInfo: {
        directLabel: label,
        forLabel: findLabelForElement(el) ? getTextContent(findLabelForElement(el)) : '',
        nearbyText,
        sectionTitle,
        fieldsetLegend,
        closestHeading
      },
      position: {
        ...position,
        formIndex: getFormIndex(el),
        fieldIndex: getFieldIndex(el)
      },
      selector: selector || { selectorType: 'none', selector: '', confidence: 0 },
      selectorNeedsVerification: selector ? selector.confidence < 50 : true,
      classification: autoClassifyField(label, basicInfo.name, basicInfo.id, basicInfo.placeholder, nearbyText, tag, type),
      metadata: {
        selectOptions: selectInfo ? selectInfo.options : [],
        selectHasEmpty: selectInfo ? selectInfo.empty : false,
        radioGroup: type === 'radio' ? getRadioGroupInfo(el) : null,
        checkboxInfo: type === 'checkbox' ? getCheckboxInfo(el) : null,
        fileUploadInfo: type === 'file' ? getFileUploadInfo(el) : null
      },
      staffNotes: '',
      category: null,
      source: null,
      defaultValue: ''
    };

    fields.push(field);
  }

  const deduplicated = deduplicateFields(fields);
  debugLog('Field scan complete. Total raw:', fields.length, 'Deduplicated:', deduplicated.length);
  return deduplicated;
}
