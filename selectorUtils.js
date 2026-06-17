function getSelectorByID(el) {
  if (!el || !el.id || el.id.trim() === '') return null;
  const id = CSS.escape(el.id);
  const matches = document.querySelectorAll(`#${id}`);
  if (matches.length === 1) {
    return { selectorType: 'id', selector: `#${id}`, confidence: 100 };
  }
  return null;
}

function getSelectorByName(el) {
  const name = el.getAttribute('name');
  if (!name) return null;
  const tag = el.tagName.toLowerCase();
  const typeAttr = el.type ? `[type="${el.type}"]` : '';
  const selector = `${tag}${typeAttr}[name="${name.replace(/"/g, '\\"')}"]`;
  const matches = document.querySelectorAll(selector);
  if (matches.length === 1 && matches[0] === el) {
    return { selectorType: 'name', selector, confidence: 95 };
  }
  return null;
}

function getSelectorByFormControlName(el) {
  const fcn = el.getAttribute('formcontrolname') || el.getAttribute('form-control-name');
  if (!fcn) return null;
  const selector = `[formcontrolname="${fcn.replace(/"/g, '\\"')}"]`;
  const matches = document.querySelectorAll(selector);
  if (matches.length === 1 && matches[0] === el) {
    return { selectorType: 'formcontrolname', selector, confidence: 90 };
  }
  return null;
}

function getSelectorByAriaLabel(el) {
  const aria = el.getAttribute('aria-label');
  if (!aria) return null;
  const selector = `[aria-label="${aria.replace(/"/g, '\\"')}"]`;
  const matches = document.querySelectorAll(selector);
  if (matches.length === 1 && matches[0] === el) {
    return { selectorType: 'aria-label', selector, confidence: 85 };
  }
  return null;
}

function getSelectorByPlaceholder(el) {
  const ph = el.getAttribute('placeholder');
  if (!ph) return null;
  const tag = el.tagName.toLowerCase();
  const selector = `${tag}[placeholder="${ph.replace(/"/g, '\\"')}"]`;
  const matches = document.querySelectorAll(selector);
  if (matches.length === 1 && matches[0] === el) {
    return { selectorType: 'placeholder', selector, confidence: 80 };
  }
  return null;
}

function getLabelBasedXPath(el) {
  const label = findLabelForElement(el);
  if (!label) return null;
  const labelText = getTextContent(label).trim();
  if (!labelText) return null;
  const tag = el.tagName.toLowerCase();
  const type = el.getAttribute('type') || 'text';
  const labelTextForXPath = labelText.replace(/['"]/g, '');
  const xpath = `//${tag}[@type='${type}' and preceding-sibling::label[contains(text(), '${labelTextForXPath}']]`;
  return { selectorType: 'xpath', selector: xpath, xpath: xpath, confidence: 70 };
}

function getCSSPathSelector(el) {
  if (!el || el === document.body || el === document.documentElement) return null;
  const parts = [];
  let current = el;
  while (current && current !== document.body && current !== document.documentElement) {
    let selector = current.tagName.toLowerCase();
    if (current.id) {
      selector = `#${CSS.escape(current.id)}`;
      parts.unshift(selector);
      break;
    }
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).filter(c => c && !c.startsWith('ng-') && !c.startsWith('_ng'));
      if (classes.length > 0) {
        selector += '.' + classes.map(c => CSS.escape(c)).join('.');
      }
    }
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(s => s.tagName === current.tagName);
      if (siblings.length > 1) {
        const idx = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${idx})`;
      }
    }
    parts.unshift(selector);
    current = current.parentElement;
  }
  if (parts.length === 0) return null;
  const fullSelector = parts.join(' > ');
  const matches = document.querySelectorAll(fullSelector);
  const isUnique = matches.length === 1 && matches[0] === el;
  const confidence = isUnique ? 65 : matches.length > 0 && matches.length < 3 ? 50 : 35;
  return { selectorType: 'css-path', selector: fullSelector, confidence };
}

function getAbsoluteXPath(el) {
  if (!el) return '';
  if (el === document.body) return '/html/body';
  if (el === document.documentElement) return '/html';
  let idx = 0;
  const siblings = el.parentNode ? Array.from(el.parentNode.children).filter(s => s.tagName === el.tagName) : [];
  if (siblings.length > 1) {
    idx = siblings.indexOf(el) + 1;
  }
  const tag = el.tagName.toLowerCase();
  return getAbsoluteXPath(el.parentNode) + '/' + tag + (idx ? `[${idx}]` : '');
}

function generateStableSelector(el) {
  if (!el) return null;
  const strategies = [
    getSelectorByID,
    getSelectorByName,
    getSelectorByFormControlName,
    getSelectorByAriaLabel,
    getSelectorByPlaceholder,
    getLabelBasedXPath,
    getCSSPathSelector
  ];
  for (const strategy of strategies) {
    const result = strategy(el);
    if (result) {
      debugLog('Selector found:', result.selectorType, result.selector, 'confidence:', result.confidence);
      return result;
    }
  }
  const xpath = getAbsoluteXPath(el);
  const result = { selectorType: 'absolute-xpath', selector: xpath, confidence: 30 };
  debugLog('Fallback XPath selector:', xpath);
  return result;
}

function findElementBySelector(selectorObj) {
  if (!selectorObj || !selectorObj.selector) return null;
  try {
    if (selectorObj.selectorType !== 'xpath' && selectorObj.selectorType !== 'absolute-xpath') {
      const el = document.querySelector(selectorObj.selector);
      if (el) return el;
    }
    const xpathStr = selectorObj.xpath || selectorObj.selector;
    const result = document.evaluate(xpathStr, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    if (result.singleNodeValue) return result.singleNodeValue;
    return null;
  } catch {
    return null;
  }
}

function findLabelForElement(el) {
  if (!el) return null;
  const id = el.getAttribute('id');
  if (id) {
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label) return label;
  }
  let parent = el.parentElement;
  while (parent) {
    if (parent.tagName === 'LABEL') return parent;
    const label = parent.querySelector('label');
    if (label && label.contains(el)) return label;
    if (parent.tagName === 'FIELDSET') break;
    if (parent.tagName === 'FORM') break;
    parent = parent.parentElement;
  }
  return null;
}

function getNearbyText(el) {
  if (!el) return '';
  const texts = [];
  if (el.previousElementSibling) {
    texts.push(getTextContent(el.previousElementSibling));
  }
  if (el.nextElementSibling) {
    texts.push(getTextContent(el.nextElementSibling));
  }
  const parent = el.parentElement;
  if (parent) {
    const siblingTexts = Array.from(parent.children)
      .filter(child => child !== el && !child.contains(el) && !el.contains(child))
      .map(c => getTextContent(c))
      .filter(t => t && t.length < 100);
    texts.push(...siblingTexts);
  }
  return texts.filter(t => t).join(' ').substring(0, 200);
}

function getParentSectionTitle(el) {
  if (!el) return '';
  let current = el.parentElement;
  while (current && current !== document.body) {
    const heading = current.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading) return getTextContent(heading).substring(0, 100);
    const legend = current.querySelector('legend');
    if (legend) return getTextContent(legend).substring(0, 100);
    current = current.parentElement;
  }
  return '';
}

function getFieldsetLegend(el) {
  if (!el) return '';
  let current = el.parentElement;
  while (current) {
    if (current.tagName === 'FIELDSET') {
      const legend = current.querySelector('legend');
      if (legend) return getTextContent(legend).substring(0, 100);
      break;
    }
    if (current.tagName === 'FORM') break;
    current = current.parentElement;
  }
  return '';
}

function getClosestHeadingText(el) {
  if (!el) return '';
  let current = el.parentElement;
  while (current && current !== document.body) {
    const headings = current.querySelectorAll('h1, h2, h3, h4, h5, h6, legend, caption');
    for (const h of headings) {
      if (current.contains(el) || el.contains(current)) continue;
      const text = getTextContent(h);
      if (text) return text.substring(0, 100);
    }
    current = current.parentElement;
  }
  return '';
}
