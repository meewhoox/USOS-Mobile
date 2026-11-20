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
      const rescan = debounce(scan, 200);
      window.addEventListener('resize', rescan);
      window.addEventListener('load', rescan, { once: true }); // images may change widths
      new MutationObserver(debounce(scan, 150)).observe(main, { childList: true, subtree: true });
    },
  });
})();
