/* MÓJ USOSWEB (home/index): long or duplicated frames start collapsed (state is remembered). */
(() => {
  'use strict';
  const USM = globalThis.USM;

  // Frames that are long, or duplicate the KATALOG tab / settings pages.
  const COLLAPSED = (frame) =>
    frame.matches('.student, #katalog-frame, #plany-frame, #preferencje-frame') ||
    /preferencje|preferences/i.test(frame.querySelector('[slot="title"]')?.textContent || '');

  USM.registerPage({
    id: 'home',
    match: (action) => action === 'home/index',
    mount() {
      const frames = document.querySelectorAll('#layout-main-content .local-home-table usos-frame');
      USM.collapsibleFrames(frames, { storeKey: 'usm:frames:home', collapsed: COLLAPSED });
    },
  });
})();
