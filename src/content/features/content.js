/*
 * Generic content fixes for #layout-main-content:
 *  - tables wider than the screen get wrapped in a horizontal scroller
 *    (only when they actually overflow, so narrow tables are left alone).
 * Re-runs when content changes (USOS loads parts of pages via AJAX).
 */
(() => {
  'use strict';
  const { debounce } = globalThis.USM;
  const WRAP = 'usm-hscroll';

  const scan = () => {
    const main = document.getElementById('layout-main-content');
    if (!main) return;
    for (const table of main.querySelectorAll('table')) {
      const parent = table.parentElement;
      if (!parent || parent.classList.contains(WRAP) || parent.closest('table')) continue;
      if (table.offsetWidth > parent.clientWidth + 1) {
        const wrap = document.createElement('div');
        wrap.className = WRAP;
        parent.insertBefore(wrap, table);
        wrap.append(table);
      }
    }
  };

  globalThis.USM.registerFeature({
    id: 'content',
    mount() {
      const main = document.getElementById('layout-main-content');
      if (!main) return;
      scan();
      this.onResize = debounce(scan, 200);
      window.addEventListener('resize', this.onResize);
      window.addEventListener('load', this.onResize, { once: true }); // images may change widths
      this.observer = new MutationObserver(debounce(scan, 150));
      this.observer.observe(main, { childList: true, subtree: true });
    },
    unmount() {
      this.observer?.disconnect();
      window.removeEventListener('resize', this.onResize);
      for (const wrap of document.querySelectorAll(`.${WRAP}`)) wrap.replaceWith(...wrap.childNodes);
    },
  });
})();
