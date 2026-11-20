/*
 * Entry point of the UI scripts (loaded last): mounts features and page modules once the
 * DOM is ready and re-runs their update() when settings change.
 */
(() => {
  'use strict';
  const USM = globalThis.USM;
  const ctx = { settings: USM.storage.get(), action: USM.action(), cas: null };
  let mounted = false;

  const activePages = () =>
    USM.pages.filter((p) => {
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

  USM.storage.onChange((s) => {
    ctx.settings = s;
    if (mounted) runAll([...USM.features, ...activePages()], 'update');
  });

  USM.onReady(() => {
    ctx.cas = document.querySelector('cas-bar');
    runAll(USM.features, 'mount');
    runAll(activePages(), 'mount');
    mounted = true;
  });

  /**
   * Back gesture (called by the Android app): close the topmost open sheet/dialog.
   * Returns true when something was closed, false to let the app navigate back.
   */
  USM.back = () => {
    if (!mounted) return false;
    // USOS's own modals: <usos-dialog> keeps a native <dialog> in its shadow root.
    const dialog = [...document.querySelectorAll('usos-dialog')].map((d) => d.shadowRoot?.querySelector('dialog[open]')).filter(Boolean).pop();
    if (dialog) {
      // requestClose() fires `cancel` like the Escape key, so the component sees a normal dismissal.
      if (dialog.requestClose) dialog.requestClose();
      else dialog.close();
      return true;
    }
    return [...USM.features].reverse().some((f) => {
      try {
        return f.back?.(ctx) === true;
      } catch {
        return false;
      }
    });
  };

  USM.ctx = ctx; // handy for debugging from devtools
})();
