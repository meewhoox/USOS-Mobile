/* Dev audit run in the page after dev-inject.js: reports overflow and layout problems. */
(() => {
  const W = document.documentElement.clientWidth;
  const out = { action: new URL(location.href).searchParams.get('_action'), docWidth: document.documentElement.scrollWidth, viewport: W, overflowing: [], wideTables: [], smallTargets: 0, forms: 0 };
  const main = document.getElementById('layout-main-content');
  const walk = (root) => {
    for (const e of root.querySelectorAll('*')) {
      const r = e.getBoundingClientRect();
      if (r.width && r.right > W + 1 && !e.closest('.usm-hscroll') && !e.closest('menu-left') && !e.closest('menu-top') && e.getRootNode().host?.localName !== 'menu-top-item') {
        out.overflowing.push(`${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).join('.') : ''} w=${Math.round(r.width)}`);
      }
      if (e.shadowRoot) walk(e.shadowRoot);
    }
  };
  walk(document);
  out.overflowing = out.overflowing.slice(0, 15);
  if (main) {
    out.wideTables = [...main.querySelectorAll('.usm-hscroll > table')].map((t) => `${t.className || 'table'} ${t.offsetWidth}px`);
    out.smallTargets = [...main.querySelectorAll('a, button, input, select')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.height && r.height < 24; }).length;
    out.forms = main.querySelectorAll('form').length;
    out.customEls = [...new Set([...main.querySelectorAll('*')].map((e) => e.localName).filter((t) => t.includes('-')))];
  }
  return out;
})();
