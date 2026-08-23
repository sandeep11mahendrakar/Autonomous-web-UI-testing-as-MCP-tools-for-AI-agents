'use strict';

async function getDOMElements(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let totalHeight = 0;
      const distance = 300;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve();
        }
      }, 200); // slowed from 150 to 200
    });
  });

  await page.waitForTimeout(500);

  const elements = await page.evaluate(() => {
    const nodes = document.querySelectorAll('button, input, a, select, textarea');
    const results = [];

    nodes.forEach((el, index) => {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return;
      if (el.offsetWidth === 0 && el.offsetHeight === 0) return;

      let selector = '';
      if (el.id) {
        selector = '#' + el.id;
      } else if (el.getAttribute('name')) {
        selector = `[name="${el.getAttribute('name')}"]`;
      } else if (el.tagName === 'A' && el.getAttribute('href')) {
        // Links: href attribute selectors survive DOM reshuffling far better
        // than positional ones.
        const href = el.getAttribute('href');
        selector = 'a[href="' + href.replace(/"/g, '\\"') + '"]';
      } else if (el.className && typeof el.className === 'string' && el.className.trim()) {
        // Escape CSS-special characters inside class names (Tailwind classes
        // like `focus:outline-none` or `bg-black/50` otherwise produce
        // selectors querySelectorAll() rejects).
        const escapeClass = (c) => c.replace(/([:./\\[\]()#,%>"'=~|^$*+?{}])/g, '\\$1');
        const classes = el.className.trim().split(/\s+/).map(escapeClass).join('.');
        selector = el.tagName.toLowerCase() + '.' + classes;
      } else {
        // :nth-of-type() is relative to same-tag SIBLINGS under the element's
        // own parent — NOT the flattened document-wide node index.
        const parent = el.parentElement;
        const sameTagSiblings = parent
          ? Array.prototype.filter.call(parent.children, c => c.tagName === el.tagName)
          : [el];
        const pos = Array.prototype.indexOf.call(sameTagSiblings, el) + 1;
        selector = el.tagName.toLowerCase() + ':nth-of-type(' + pos + ')';
      }

      const href = el.tagName === 'A' ? (el.getAttribute('href') || '') : '';
      const inputType = el.getAttribute('type') || '';
      const placeholder = el.getAttribute('placeholder') || '';
      const ariaLabel = el.getAttribute('aria-label') || '';
      const text = (el.innerText || el.value || el.textContent || '')
        .replace(/\s+/g, ' ').trim().slice(0, 100);

      // Collection-relevant semantics for the Fusion-era observation schema.
      const disabled = el.disabled === true || el.getAttribute('disabled') !== null;
      const required = el.required === true || el.getAttribute('required') !== null;

      // Custom-dropdown detection (react-select et al.): these widgets reject
      // direct text entry and need click-to-open + option-click instead of
      // fill(). Native selects count too. Cheap heuristics only.
      let isDropdown = false;
      try {
        isDropdown = el.tagName === 'SELECT'
          || /^react-select/i.test(el.id || '')
          || el.getAttribute('role') === 'combobox'
          || el.getAttribute('aria-haspopup') !== null
          || !!el.closest('[class*="select" i], [class*="dropdown" i], [class*="combo" i]');
      } catch (_) {}

      let formInfo = null;
      if (el.form) {
        formInfo = {
          id: el.form.id || null,
          method: (el.form.method || '').toLowerCase(),
          action: el.form.action || '',
        };
      }

      results.push({
        elementId: index,
        tag: el.tagName,
        text,
        id: el.id || null,
        className: el.className || '',
        selector,
        href,
        inputType,
        placeholder,
        ariaLabel,
        name: el.getAttribute('name') || null,
        disabled,
        required,
        isDropdown,
        form: formInfo,
      });
    });

    return results;
  });

  return elements;
}

async function getPageMeta(page) {
  const url = page.url();
  const title = await page.title();
  return { url, title };
}

module.exports = { getDOMElements, getPageMeta };