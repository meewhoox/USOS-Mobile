/*
 * Bottom navigation with the main sections (replaces the <menu-top> tab strip, which is hidden).
 * Aktualności = home, reached via the "USOSweb" logo; "katalog" is in the account sheet;
 * "dla pracowników" is left out.
 *
 * Taps are delegated to the original <menu-top-item> link when available, so USOS's
 * onclick="return Common.confirmWarnings();" (unsaved-form warning) still runs.
 * Always visible, except while the on-screen keyboard is likely open.
 */
(() => {
  'use strict';
  const USM = globalThis.USM;
  const { h, icon, t } = USM;

  const SECTIONS = [
    { action: 'home/index', icon: 'dashboard', label: 'navMyUsos' },
    { action: 'dla_stud/index', icon: 'school', label: 'navStudents' },
    { action: 'dodatki/index', icon: 'public', label: 'navForAll' },
  ];
  const KEYBOARD = 'usm-nav-kb';

  const isTextInput = (el) =>
    el instanceof Element &&
    (el.matches('textarea, select, [contenteditable=""], [contenteditable="true"]') ||
      (el.matches('input') && !/^(checkbox|radio|submit|button|reset|image|file|range|color|hidden)$/i.test(el.type)));

  USM.registerFeature({
    id: 'bottomnav',
    mount(ctx) {
      const items = [...document.querySelectorAll('menu-top > menu-top-item')];
      const loggedIn = !!ctx.cas?.getAttribute('logged-user');

      const buttons = SECTIONS.map((s) => {
        const item = items.find((i) => (i.getAttribute('href') || '').includes(`_action=${s.action}`));
        const locked = !loggedIn && (!item || item.hasAttribute('greyed'));
        const active = !!item?.hasAttribute('selected');
        const href = locked ? USM.loginUrl(ctx.cas) : item?.getAttribute('href') || `/kontroler.php?_action=${s.action}`;
        const a = h(
          'a',
          {
            class: 'usm-nav-item',
            href,
            'aria-current': active ? 'page' : null,
            'aria-label': locked ? `${t(s.label)} (${t('loginRequired')})` : null,
            'data-locked': locked ? '' : null,
          },
          h('span', { class: 'usm-nav-pill' }, icon(locked ? 'lock' : s.icon)),
          h('span', { class: 'usm-nav-label' }, t(s.label))
        );
        if (item && !locked) {
          a.addEventListener('click', (e) => {
            const inner = item.shadowRoot?.querySelector('a');
            if (!inner) return; // plain navigation
            e.preventDefault();
            inner.click(); // bubbles to the host → USOS onclick handler
          });
        }
        return a;
      });

      this.el = h('nav', { class: 'usm-bottomnav', 'aria-label': t('mainNav') }, buttons);
      document.body.append(this.el);
      document.documentElement.classList.add('usm-has-bottomnav');

      // Keyboard: hide while a text field has focus (also inside USOS shadow components).
      this.onFocusIn = (e) => {
        if (isTextInput(e.composedPath()[0])) this.el.classList.add(KEYBOARD);
      };
      this.onFocusOut = () =>
        setTimeout(() => {
          let el = document.activeElement;
          while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
          if (!isTextInput(el)) this.el?.classList.remove(KEYBOARD);
        }, 50);
      document.addEventListener('focusin', this.onFocusIn);
      document.addEventListener('focusout', this.onFocusOut);
    },
  });
})();
