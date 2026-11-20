/*
 * USOS Mobile — early script, runs in the page at document start (before USOS renders).
 *
 * Responsibilities:
 *  - inject <meta name="viewport">,
 *  - append our per-component stylesheet to every USOS web component's shadow root
 *    (USOSweb 7 uses Lit + open shadow DOM + adoptedStyleSheets, no ::part()),
 *  - append the global stylesheet to the document,
 *  - apply the theme synchronously from localStorage (no flash), and again when
 *    content/core.js changes it ("usm:settings" event).
 *
 * The build step wraps this file and defines `USM_CSS = { global, components: {tag: css} }`.
 */
(() => {
  'use strict';
  if (window.__usmEarly) return;
  window.__usmEarly = true;

  /* global USM_CSS */
  const CSS = USM_CSS;
  const KEY = 'usm:settings';
  const DEFAULTS = { theme: 'default' };
  const THEMES = ['default', 'modern', 'dark'];

  const readSettings = () => {
    try {
      return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
    } catch {
      return { ...DEFAULTS };
    }
  };

  /* ---------- stylesheets ---------- */
  const DOC = '#document';
  const sheets = new Map();
  sheets.set(DOC, new CSSStyleSheet());
  for (const tag of Object.keys(CSS.components)) sheets.set(tag, new CSSStyleSheet());
  const cssFor = (key) => (key === DOC ? CSS.global : CSS.components[key]) || '';

  const srDesc = Object.getOwnPropertyDescriptor(ShadowRoot.prototype, 'adoptedStyleSheets');
  const docDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'adoptedStyleSheets');

  const withOurs = (list, ours) => {
    const arr = Array.from(list || []).filter((s) => s !== ours);
    if (ours) arr.push(ours); // last = wins at equal specificity
    return arr;
  };

  if (srDesc && srDesc.set) {
    // Lit assigns `renderRoot.adoptedStyleSheets = [...]` once per element; keep ours appended.
    Object.defineProperty(ShadowRoot.prototype, 'adoptedStyleSheets', {
      configurable: true,
      enumerable: srDesc.enumerable,
      get() {
        return srDesc.get.call(this);
      },
      set(value) {
        const ours = this.host ? sheets.get(this.host.localName) : null;
        srDesc.set.call(this, ours ? withOurs(value, ours) : value);
      },
    });

    // Components without own styles never assign adoptedStyleSheets — cover them at creation.
    const origAttach = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function attachShadow(init) {
      const root = origAttach.call(this, init);
      const ours = sheets.get(this.localName);
      if (ours) {
        try {
          srDesc.set.call(root, withOurs(srDesc.get.call(root), ours));
        } catch {
          /* ignore */
        }
      }
      return root;
    };
  }

  if (docDesc && docDesc.set) {
    Object.defineProperty(Document.prototype, 'adoptedStyleSheets', {
      configurable: true,
      enumerable: docDesc.enumerable,
      get() {
        return docDesc.get.call(this);
      },
      set(value) {
        docDesc.set.call(this, this === document ? withOurs(value, sheets.get(DOC)) : value);
      },
    });
  }

  // For roots that already exist (late injection, dev harness).
  const adoptExisting = (root) => {
    for (const el of root.querySelectorAll('*')) {
      const sr = el.shadowRoot;
      if (!sr) continue;
      const ours = sheets.get(el.localName);
      if (ours && srDesc) srDesc.set.call(sr, withOurs(srDesc.get.call(sr), ours));
      adoptExisting(sr);
    }
  };

  /** Run fn(<html>) now, or as soon as the parser creates the root element. */
  const whenRoot = (fn) => {
    if (document.documentElement) return fn(document.documentElement);
    const mo = new MutationObserver(() => {
      if (!document.documentElement) return;
      mo.disconnect();
      fn(document.documentElement);
    });
    mo.observe(document, { childList: true });
  };

  /* ---------- viewport ---------- */
  const setViewport = () => {
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.id = 'usm-viewport';
    meta.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
    const place = () => {
      if (!document.head) return false;
      document.head.prepend(meta);
      return true;
    };
    if (!place()) {
      const mo = new MutationObserver(() => place() && mo.disconnect());
      mo.observe(document, { childList: true, subtree: true });
    }
  };

  /* ---------- activation ---------- */
  const applyTheme = (settings) =>
    whenRoot((html) => html.setAttribute('data-usm-theme', THEMES.includes(settings.theme) ? settings.theme : 'default'));

  for (const [key, sheet] of sheets) sheet.replaceSync(cssFor(key));
  setViewport();
  applyTheme(readSettings());
  whenRoot((html) => {
    // Lets page styles (styles/pages/*.css) scope themselves: html[data-usm-action='home/index'] …
    html.setAttribute('data-usm-action', new URL(location.href).searchParams.get('_action') || '');
    html.setAttribute('data-usm', '');
  });

  document.addEventListener('usm:settings', (e) => {
    try {
      applyTheme({ ...DEFAULTS, ...JSON.parse(e.detail) });
    } catch {
      /* ignore malformed */
    }
  });

  if (docDesc) document.adoptedStyleSheets = document.adoptedStyleSheets; // goes through our setter
  adoptExisting(document);
})();
