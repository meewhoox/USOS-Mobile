/*
 * Entry point of the isolated content scripts (loaded last).
 * Reads settings, syncs them to the MAIN-world script, mounts/unmounts features
 * and page modules, and offers a way back to the mobile view when it is off on a phone.
 */
(() => {
  'use strict';
  const USM = globalThis.USM;
  const ctx = { settings: null, action: USM.action(), cas: null };
  let mounted = false;
  let domReady = false;
  let restoreLink = null;

  const activePages = () => USM.pages.filter((p) => {
    try {
      return p.match(ctx.action);
    } catch {
      return false;
    }
  });

  const runAll = (list, method) => {
    for (const item of list) {
      try {
        item[method]?.(ctx);
      } catch (err) {
        console.warn(`[USOS Mobile] ${item.id}.${method} failed`, err);
      }
    }
  };

  const mount = () => {
    ctx.cas = document.querySelector('cas-bar');
    runAll(USM.features, 'mount');
    runAll(activePages(), 'mount');
    mounted = true;
  };

  const unmount = () => {
    runAll(activePages().reverse(), 'unmount');
    runAll([...USM.features].reverse(), 'unmount');
    mounted = false;
  };

  /** When the mobile view is switched off on a phone, put a link back into the CAS bar. */
  const syncRestoreLink = () => {
    const want = !mounted && USM.isPhone() && ctx.settings.mode === 'off';
    if (want && !restoreLink && ctx.cas) {
      restoreLink = USM.h(
        'a',
        { slot: 'extra-actions', href: '#', class: 'usm-restore', onclick: (e) => (e.preventDefault(), USM.storage.set({ mode: 'auto' })) },
        `📱 ${USM.t('mobileVersion')}`
      );
      ctx.cas.append(restoreLink);
    } else if (!want && restoreLink) {
      restoreLink.remove();
      restoreLink = null;
    }
  };

  const sync = () => {
    if (!domReady) return;
    ctx.cas = ctx.cas || document.querySelector('cas-bar');
    const on = USM.isActive(ctx.settings);
    if (on && !mounted) mount();
    else if (!on && mounted) unmount();
    else if (on) runAll([...USM.features, ...activePages()], 'update');
    syncRestoreLink();
  };

  USM.storage.onChange((s) => {
    ctx.settings = s;
    USM.pushSettings(s);
    sync();
  });

  USM.storage.get().then((s) => {
    ctx.settings = s;
    USM.pushSettings(s);
    USM.onReady(() => {
      domReady = true;
      sync();
    });
  });

  USM.ctx = ctx; // handy for debugging from devtools
})();
