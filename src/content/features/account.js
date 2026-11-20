/*
 * Account & settings bottom sheet (native <dialog>): user, login/logout, password,
 * language switch, theme picker, "show full site".
 * Data comes from <cas-bar> attributes (logged-user, logout-url, passwd-url, lang-switch-url).
 */
(() => {
  'use strict';
  const USM = globalThis.USM;
  const { h, icon, t } = USM;

  const THEME_SWATCH = {
    default: { top: '#4F4C6A', bg: '#FFFFFF', line: '#DADADE', accent: '#FBB040' },
    modern: { top: 'linear-gradient(120deg,#221F45,#4F4C6A)', bg: '#F4F3F8', line: '#FFFFFF', accent: '#F5A623' },
    dark: { top: '#1E1C2C', bg: '#17161F', line: '#2C2A3D', accent: '#FBB040' },
  };
  const THEME_LABEL = { default: 'themeDefault', modern: 'themeModern', dark: 'themeDark' };

  const row = (href, iconName, label, extra = {}) =>
    h('a', { class: 'usm-row', href, ...extra }, icon(iconName), h('span', null, label));

  globalThis.USM.registerFeature({
    id: 'account',
    mount(ctx) {
      const btn = document.getElementById('usm-account-btn');
      if (!btn) return;
      const cas = ctx.cas;
      const user = cas?.getAttribute('logged-user') || '';
      const langUrl = cas?.getAttribute('lang-switch-url');
      const myUsos = document.querySelector('menu-top-item[href*="home/index"]')?.getAttribute('href');
      // "katalog" (people / units / courses search) is not in the bottom nav — it lives here.
      const catalog = document.querySelector('menu-top-item[href*="katalog2/index"]:not([greyed])');
      const lang = USM.lang();

      this.themeButtons = USM.THEMES.map((id) => {
        const sw = THEME_SWATCH[id];
        return h(
          'button',
          {
            type: 'button',
            class: 'usm-theme-opt',
            role: 'radio',
            'aria-checked': String(ctx.settings.theme === id),
            'data-theme': id,
            onclick: () => USM.storage.set({ theme: id }),
          },
          h(
            'span',
            { class: 'usm-swatch', style: `--sw-top:${sw.top};--sw-bg:${sw.bg};--sw-line:${sw.line};--sw-accent:${sw.accent}` },
            h('i'),
            h('i'),
            h('i'),
            h('i')
          ),
          h('span', null, t(THEME_LABEL[id]))
        );
      });

      const langSeg = h(
        'div',
        { class: 'usm-seg', role: 'group', 'aria-label': t('language') },
        ...['pl', 'en'].map((code) =>
          code === lang || !langUrl
            ? h('span', { 'aria-current': code === lang ? 'true' : null, lang: code }, code === 'pl' ? 'Polski' : 'English')
            : h('a', { href: langUrl, lang: code }, code === 'pl' ? 'Polski' : 'English')
        )
      );

      const closeBtn = h('button', { type: 'button', class: 'usm-icon-btn', 'aria-label': t('close'), onclick: () => this.dialog.close() }, icon('close'));

      this.dialog = h(
        'dialog',
        { class: 'usm-sheet', id: 'usm-account', 'aria-label': t('account') },
        // Grip + header stay pinned while the sheet content scrolls.
        h(
          'div',
          { class: 'usm-sheet-top' },
          h('div', { class: 'usm-sheet-grip', 'aria-hidden': 'true' }),
          h(
            'div',
            { class: 'usm-sheet-head' },
            btn.querySelector('.usm-avatar')?.cloneNode(true) || h('span', { class: 'usm-avatar usm-avatar-anon' }, icon('person')),
            h('div', { class: 'usm-sheet-who' }, user ? [h('small', null, t('loggedInAs')), h('b', null, user)] : h('b', null, t('notLoggedIn'))),
            closeBtn
          )
        ),
        h(
          'nav',
          { class: 'usm-sheet-list' },
          user
            ? [
                myUsos && row(myUsos, 'person', t('myUsos')),
                catalog && row(catalog.getAttribute('href'), 'catalog', USM.cap(catalog.getAttribute('name') || '')),
                cas.getAttribute('passwd-url') && row(cas.getAttribute('passwd-url'), 'key', t('changePassword')),
                cas.getAttribute('logout-url') && row(cas.getAttribute('logout-url'), 'logout', t('logout')),
              ]
            : row(USM.loginUrl(cas), 'login', t('login'), { class: 'usm-row usm-row-primary' })
        ),
        h('div', { class: 'usm-sheet-section' }, h('div', { class: 'usm-sheet-label' }, t('language')), langSeg),
        h(
          'div',
          { class: 'usm-sheet-section' },
          h('div', { class: 'usm-sheet-label', id: 'usm-theme-label' }, t('appearance')),
          h('div', { class: 'usm-themes', role: 'radiogroup', 'aria-labelledby': 'usm-theme-label' }, this.themeButtons)
        ),
        h(
          'div',
          { class: 'usm-sheet-list usm-sheet-foot' },
          h(
            'button',
            { type: 'button', class: 'usm-row', onclick: () => USM.storage.set({ mode: 'off' }) },
            icon('desktop'),
            h('span', null, t('showFull'))
          )
        )
      );
      document.body.append(this.dialog);

      // Tap outside the sheet (on ::backdrop) closes it.
      this.dialog.addEventListener('click', (e) => {
        if (e.target === this.dialog) {
          const r = this.dialog.getBoundingClientRect();
          if (e.clientY < r.top || e.clientY > r.bottom || e.clientX < r.left || e.clientX > r.right) this.dialog.close();
        }
      });
      this.dialog.addEventListener('close', () => document.documentElement.classList.remove('usm-lock'));

      this.onBtn = () => {
        this.dialog.showModal();
        document.documentElement.classList.add('usm-lock');
        closeBtn.focus();
      };
      btn.addEventListener('click', this.onBtn);
      this.btn = btn;
    },
    update(ctx) {
      this.themeButtons?.forEach((b) => b.setAttribute('aria-checked', String(b.dataset.theme === ctx.settings.theme)));
    },
    unmount() {
      this.btn?.removeEventListener('click', this.onBtn);
      if (this.dialog?.open) this.dialog.close();
      this.dialog?.remove();
      this.dialog = this.btn = this.themeButtons = null;
    },
  });
})();
