/*
 * USOS Mobile — shared core for the isolated content scripts.
 * All content-script files share `globalThis.USM`; each file is an IIFE.
 */
(() => {
  'use strict';
  if (globalThis.USM) return;

  const KEY = 'usm:settings';
  const DEFAULTS = Object.freeze({ mode: 'auto', theme: 'default' });
  const THEMES = ['default', 'modern', 'dark'];

  const ext = globalThis.browser?.storage ? globalThis.browser : globalThis.chrome?.storage ? globalThis.chrome : null;

  /* ---------- settings ---------- */
  const normalize = (s) => {
    const out = { ...DEFAULTS, ...(s || {}) };
    if (!['auto', 'always', 'off'].includes(out.mode)) out.mode = DEFAULTS.mode;
    if (!THEMES.includes(out.theme)) out.theme = DEFAULTS.theme;
    return out;
  };
  const readMirror = () => {
    try {
      return normalize(JSON.parse(localStorage.getItem(KEY) || '{}'));
    } catch {
      return normalize();
    }
  };
  const writeMirror = (s) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* storage blocked */
    }
  };

  const listeners = new Set();
  const storage = {
    async get() {
      if (!ext) return readMirror();
      try {
        const r = await ext.storage.local.get('settings');
        return normalize(r.settings);
      } catch {
        return readMirror();
      }
    },
    async set(patch) {
      const next = normalize({ ...(await storage.get()), ...patch });
      if (ext) {
        await ext.storage.local.set({ settings: next }); // onChanged will notify
      } else {
        listeners.forEach((fn) => fn(next)); // dev harness: no extension APIs
      }
      return next;
    },
    onChange(fn) {
      listeners.add(fn);
    },
  };
  if (ext) {
    ext.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.settings) {
        const next = normalize(changes.settings.newValue);
        listeners.forEach((fn) => fn(next));
      }
    });
  }

  /** Mirror settings into page localStorage and hand them to the MAIN-world script. */
  const pushSettings = (s) => {
    writeMirror(s);
    document.dispatchEvent(new CustomEvent('usm:settings', { detail: JSON.stringify(s) }));
  };

  const isPhone = () => /Mobi|Android.+Mobile|iPhone|iPod/i.test(navigator.userAgent);
  const isActive = (s) => s.mode === 'always' || (s.mode === 'auto' && isPhone());

  /* ---------- i18n ---------- */
  const STRINGS = {
    pl: {
      menu: 'Menu',
      openMenu: 'Otwórz menu',
      closeMenu: 'Zamknij menu',
      account: 'Konto i ustawienia',
      close: 'Zamknij',
      notLoggedIn: 'Nie jesteś zalogowany',
      loggedInAs: 'Zalogowano jako',
      login: 'Zaloguj się',
      logout: 'Wyloguj się',
      changePassword: 'Zmień hasło',
      myUsos: 'Mój USOSweb',
      language: 'Język',
      appearance: 'Wygląd',
      themeDefault: 'Domyślny',
      themeModern: 'Nowoczesny',
      themeDark: 'Ciemny',
      showFull: 'Pokaż pełną wersję strony',
      mobileVersion: 'wersja mobilna',
      home: 'Strona główna',
    },
    en: {
      menu: 'Menu',
      openMenu: 'Open menu',
      closeMenu: 'Close menu',
      account: 'Account and settings',
      close: 'Close',
      notLoggedIn: 'You are not logged in',
      loggedInAs: 'Logged in as',
      login: 'Log in',
      logout: 'Log out',
      changePassword: 'Change password',
      myUsos: 'My USOSweb',
      language: 'Language',
      appearance: 'Appearance',
      themeDefault: 'Default',
      themeModern: 'Modern',
      themeDark: 'Dark',
      showFull: 'Show full site',
      mobileVersion: 'mobile version',
      home: 'Home page',
    },
  };
  const lang = () => ((document.documentElement.lang || 'pl').toLowerCase().startsWith('en') ? 'en' : 'pl');
  const t = (key) => STRINGS[lang()][key] ?? STRINGS.pl[key] ?? key;

  /* ---------- DOM helpers ---------- */
  const h = (tag, attrs, ...children) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : String(v));
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  };

  // Material Symbols (Apache 2.0) path data, 24×24.
  const ICONS = {
    menu: 'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
    close: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
    account:
      'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-4.43-.82-6.14-2.88a9.947 9.947 0 0 1 12.28 0C16.43 19.18 14.03 20 12 20z',
    logout: 'M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z',
    login: 'M11 7 9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z',
    key: 'M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z',
    person: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
    desktop:
      'M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7v2H8v2h8v-2h-2v-2h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H3V4h18v12z',
    check: 'M9 16.17 4.83 12l-1.42 1.42L9 19 21 7l-1.41-1.41z',
  };
  const icon = (name) => {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', 'usm-icon');
    svg.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', ICONS[name] || '');
    svg.append(p);
    return svg;
  };

  /** Poll until fn() returns a truthy value (shadow roots render asynchronously). */
  const waitFor = (fn, { timeout = 4000, interval = 50 } = {}) =>
    new Promise((resolve) => {
      const start = Date.now();
      const tick = () => {
        let v;
        try {
          v = fn();
        } catch {
          v = null;
        }
        if (v) return resolve(v);
        if (Date.now() - start > timeout) return resolve(null);
        setTimeout(tick, interval);
      };
      tick();
    });

  const onReady = (fn) => {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  };

  const debounce = (fn, ms) => {
    let id;
    return (...args) => {
      clearTimeout(id);
      id = setTimeout(() => fn(...args), ms);
    };
  };

  /**
   * Make <usos-frame> elements collapsible using the component's native
   * `expandable`/`expanded` attributes; the open/closed state is remembered per page.
   * Returns an undo function.
   */
  const collapsibleFrames = (frames, { storeKey, collapsed = () => false }) => {
    let state = {};
    try {
      state = JSON.parse(localStorage.getItem(storeKey) || '{}');
    } catch {
      /* ignore */
    }
    const save = () => {
      try {
        localStorage.setItem(storeKey, JSON.stringify(state));
      } catch {
        /* ignore */
      }
    };
    const undo = [];
    for (const frame of frames) {
      if (frame.hasAttribute('expandable')) continue;
      const key = frame.id || frame.querySelector('[slot="title"]')?.textContent.trim() || frame.className;
      const open = key in state ? state[key] : !collapsed(frame);
      frame.setAttribute('expandable', '');
      frame.toggleAttribute('expanded', open);
      const mo = new MutationObserver(() => {
        state[key] = frame.hasAttribute('expanded');
        save();
      });
      mo.observe(frame, { attributes: true, attributeFilter: ['expanded'] });
      undo.push(() => {
        mo.disconnect();
        frame.removeAttribute('expandable');
        frame.removeAttribute('expanded');
      });
    }
    return () => undo.forEach((fn) => fn());
  };

  /** Current USOSweb action, e.g. "news/default" (from ?_action=). */
  const action = () => new URL(location.href).searchParams.get('_action') || '';

  globalThis.USM = {
    DEFAULTS,
    THEMES,
    storage,
    pushSettings,
    isPhone,
    isActive,
    t,
    lang,
    h,
    icon,
    waitFor,
    onReady,
    debounce,
    collapsibleFrames,
    action,
    /** Features: { id, mount(ctx), unmount?(ctx), update?(ctx) } — mounted in registration order. */
    features: [],
    /** Page modules: { id, match(action) => bool, mount(ctx), unmount?(ctx) }. */
    pages: [],
    registerFeature(f) {
      this.features.push(f);
    },
    registerPage(p) {
      this.pages.push(p);
    },
  };
})();
