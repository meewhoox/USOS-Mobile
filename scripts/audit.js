/*
 * Mobile layout audit, run inside a USOS page (Chrome DevTools MCP).
 * Defines window.__usmAudit(wait = 1200) → Promise<report>. Empty fields are dropped, so a clean
 * page returns only { url, title, ctx, mainH, … }.
 *
 * Loaded by dist/test-setup.js (see CLAUDE.md, "Testing workflow"): stored in localStorage and
 * evaluated by navigate_page's initScript, before the page's own scripts, so it also records
 * warnings from our features ("[USOS Mobile] … failed") and page errors.
 *
 * Report fields:
 *   iw         layout viewport width when ≠ 390 — something widens the page (fixed bars move/stretch)
 *   ui         missing .usm-topbar / .usm-bottomnav
 *   ctx        "Section > Subpage" shown in the top bar
 *   overflow   elements sticking out of the screen, not inside a scroller/clipper
 *   escaped    absolutely/fixed positioned elements outside the screen (they widen the page too)
 *   squeezed   text blocks < 90 px wide and > 3 lines tall (squeezed columns, floats)
 *   small      interactive elements < 28 px tall in the content (+ examples)
 *   tiny       visible text nodes with font-size < 12 px
 *   hscroll    tables wrapped in .usm-hscroll (horizontal scrolling)
 *   warns      our warnings + page errors
 */
(() => {
  if (window.__usmAudit) return;
  const warns = [];
  const origWarn = console.warn.bind(console);
  console.warn = (...args) => {
    if (String(args[0]).includes('USOS Mobile')) warns.push(args.map(String).join(' ').slice(0, 200));
    origWarn(...args);
  };
  window.addEventListener('error', (e) => warns.push(`error: ${e.message} @${(e.filename || '').split('/').pop()}:${e.lineno}`));

  const WS = /\s+/g;
  const text = (el, n = 30) => (el?.textContent || '').trim().replace(WS, ' ').slice(0, n);
  const describe = (e) => {
    const cls = typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(WS).slice(0, 3).join('.') : '';
    return `${e.localName}${e.id ? '#' + e.id : ''}${cls}`;
  };
  const composedParent = (e) => e.parentElement || e.getRootNode()?.host || null;

  window.__usmAudit = async (wait = 1200) => {
    await new Promise((r) => setTimeout(r, wait));
    const d = document;
    const W = d.documentElement.clientWidth;
    const main = d.getElementById('layout-main-content');
    const res = {
      url: location.href.replace(/^https:\/\/usosweb\.polsl\.pl\/kontroler\.php\?_action=/, ''),
      iw: innerWidth === W ? undefined : innerWidth,
      title: d.title.split(' - ')[0],
      h1: text(main?.querySelector('h1'), 60),
      ctx: [d.querySelector('.usm-context small'), d.querySelector('.usm-context b')].map((e) => e?.textContent).filter(Boolean).join(' > '),
      ui: ['usm-topbar', 'usm-bottomnav'].filter((c) => !d.querySelector('.' + c)).map((c) => 'missing ' + c),
    };

    const clipped = (e) => {
      for (let p = composedParent(e); p && p !== d.documentElement && p !== d.body; p = composedParent(p)) {
        if (getComputedStyle(p).overflowX !== 'visible') return true;
      }
      return false;
    };
    // An absolutely positioned box is clipped only by an overflow element that is its containing
    // block (nearest positioned ancestor) or an ancestor of it. A scroller *between* the box and its
    // containing block does not clip it: the box escapes and widens the page.
    const clippedPositioned = (e) => {
      let p = composedParent(e);
      while (p && p !== d.documentElement && p !== d.body) {
        const cs = getComputedStyle(p);
        if (cs.position !== 'static' || cs.transform !== 'none') break;
        p = composedParent(p);
      }
      return !!p && p !== d.documentElement && p !== d.body && (getComputedStyle(p).overflowX !== 'visible' || clipped(p));
    };
    const outside = (r) => r.width > 0 && r.height > 0 && (r.right > W + 1 || r.left < -1);
    const overflow = [];
    const escaped = [];
    const walk = (root) => {
      for (const e of root.querySelectorAll('*')) {
        if (e.shadowRoot) walk(e.shadowRoot);
        if (e.closest('menu-left, menu-top, dialog, .usm-bottomnav, .usm-backdrop')) continue;
        const r = e.getBoundingClientRect();
        if (!outside(r)) continue;
        const pos = getComputedStyle(e).position;
        if (pos === 'absolute' || pos === 'fixed') {
          if ((pos === 'absolute' && !clippedPositioned(e)) || (pos === 'fixed' && r.width > W + 1)) escaped.push(`${describe(e)} [${Math.round(r.left)}..${Math.round(r.right)}]`);
          continue;
        }
        if (clipped(e)) continue;
        const parent = composedParent(e);
        if (parent && outside(parent.getBoundingClientRect())) continue; // report the outermost one only
        overflow.push(`${describe(e)} [${Math.round(r.left)}..${Math.round(r.right)}]`);
      }
    };
    walk(d);
    res.overflow = overflow.slice(0, 8);
    res.escaped = escaped.slice(0, 5);

    if (main) {
      const all = [...main.querySelectorAll('*')].filter((e) => e.getClientRects().length);
      res.squeezed = all
        .filter((e) => {
          const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ');
          if (own.length < 12) return false;
          const r = e.getBoundingClientRect();
          return r.width < 90 && r.height > parseFloat(getComputedStyle(e).fontSize) * 1.3 * 3;
        })
        .slice(0, 5)
        .map((e) => `${describe(e)} w=${Math.round(e.getBoundingClientRect().width)} "${text(e)}"`);
      const small = [...main.querySelectorAll('a, button, input:not([type=hidden]), select')].filter((e) => {
        const r = e.getBoundingClientRect();
        return r.width && r.height && r.height < 28 && getComputedStyle(e).visibility !== 'hidden';
      });
      res.small = small.length;
      res.smallEx = [...new Set(small.slice(0, 5).map((e) => text(e, 25) || e.value || e.type))];
      res.tiny = all.filter((e) => e.children.length === 0 && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 12).length;
      res.hscroll = main.querySelectorAll('.usm-hscroll').length;
      res.mainH = Math.round(main.scrollHeight);
    }
    res.warns = warns.slice();

    for (const k of Object.keys(res)) {
      const v = res[k];
      if (v === undefined || v === '' || v === 0 || (Array.isArray(v) && !v.length)) delete res[k];
    }
    return res;
  };
})();
