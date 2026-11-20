/* Compact sticky top bar replacing cas-bar + app-header on mobile. */
(() => {
  'use strict';
  const { h, icon, t } = globalThis.USM;

  const initials = (name) =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('');

  globalThis.USM.registerFeature({
    id: 'topbar',
    mount(ctx) {
      const layout = document.querySelector('usos-layout');
      if (!layout) return;
      const header = document.querySelector('app-header');
      const logo = header?.querySelector('img[slot="logo-img"]');
      const user = ctx.cas?.getAttribute('logged-user') || '';

      const avatar = user
        ? h('span', { class: 'usm-avatar', 'aria-hidden': 'true' }, initials(user))
        : icon('account');

      this.el = h(
        'header',
        { class: 'usm-topbar', id: 'usm-topbar' },
        h(
          'button',
          {
            type: 'button',
            class: 'usm-icon-btn',
            id: 'usm-menu-btn',
            'aria-label': t('openMenu'),
            'aria-expanded': 'false',
            'aria-controls': 'ui-skip-target-menu-left',
          },
          icon('menu')
        ),
        h(
          'a',
          { class: 'usm-brand', href: header?.getAttribute('href') || '/kontroler.php?_action=news/default', 'aria-label': t('home') },
          logo ? h('img', { src: logo.src, alt: '' }) : null,
          h(
            'span',
            { class: 'usm-brand-text' },
            h('b', null, 'USOSweb'),
            h('small', null, header?.getAttribute('display-name') || 'Politechnika Śląska')
          )
        ),
        h(
          'button',
          {
            type: 'button',
            class: 'usm-icon-btn usm-account-btn',
            id: 'usm-account-btn',
            'aria-label': user ? `${t('account')} — ${user}` : t('account'),
            'aria-haspopup': 'dialog',
          },
          avatar
        )
      );
      layout.prepend(this.el);
    },
    unmount() {
      this.el?.remove();
      this.el = null;
    },
  });
})();
