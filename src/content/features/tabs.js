/* Main navigation (<menu-top>) as a horizontally scrollable tab strip: centre the selected tab. */
(() => {
  'use strict';
  const { waitFor } = globalThis.USM;

  globalThis.USM.registerFeature({
    id: 'tabs',
    async mount() {
      const menu = document.querySelector('menu-top');
      const selected = menu?.querySelector('menu-top-item[selected]');
      if (!selected) return;
      const strip = await waitFor(() => menu.shadowRoot?.getElementById('ul'));
      if (!strip) return;
      requestAnimationFrame(() => {
        const s = strip.getBoundingClientRect();
        const r = selected.getBoundingClientRect();
        strip.scrollLeft += r.left - s.left - (s.width - r.width) / 2;
      });
    },
  });
})();
