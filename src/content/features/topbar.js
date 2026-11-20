/*
 * Compact sticky top bar replacing cas-bar + app-header + menu-top on mobile:
 *   [logo USOSweb → Aktualności (home)] | [Section › Subpage ▾] [avatar → account sheet]
 * The context button opens the section's subpage sheet (features/submenu.js).
 */
(() => {
  'use strict';
  const USM = globalThis.USM;
  const { h, icon, t, cap } = USM;

  const initials = (name) =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('');

  /** Section = selected main-menu item ("mój USOSweb"), subpage = deepest selected left-menu link. */
  const sectionName = () => cap(document.querySelector('menu-top > menu-top-item[selected]')?.getAttribute('name')?.trim() || '');
  const pageName = () => {
    const selected = [...document.querySelectorAll('menu-left a.selected')].pop();
    // Fallback: page <title> is "Subpage - Section - USOSweb - University".
    const text = (selected?.textContent || document.title.split(' - ')[0] || '').trim();
    // Top-level left-menu entries are written in capitals ("NA SKRÓTY") → sentence case.
    return cap(text === text.toLocaleUpperCase() ? text.toLocaleLowerCase() : text);
  };

  USM.registerFeature({
    id: 'topbar',
    mount(ctx) {
      const layout = document.querySelector('usos-layout');
      if (!layout) return;
      const header = document.querySelector('app-header');
      const logo = header?.querySelector('img[slot="logo-img"]');
      const user = ctx.cas?.getAttribute('logged-user') || '';
      const section = sectionName();
      const page = pageName();
      const showSection = section && section.toLowerCase() !== page.toLowerCase();

      this.el = h(
        'header',
        { class: 'usm-topbar', id: 'usm-topbar' },
        h(
          'a',
          { class: 'usm-brand', href: header?.getAttribute('href') || '/kontroler.php?_action=news/default', 'aria-label': `USOSweb — ${t('home')}` },
          logo ? h('img', { src: logo.src, alt: '' }) : null,
          h('b', null, 'USOSweb')
        ),
        h(
          'button',
          {
            type: 'button',
            class: 'usm-context',
            id: 'usm-menu-btn',
            'aria-haspopup': 'true',
            'aria-expanded': 'false',
            'aria-controls': 'ui-skip-target-menu-left',
            title: t('openSubpages'),
          },
          h('span', { class: 'usm-context-text' }, showSection ? h('small', null, section) : null, h('b', null, page || section)),
          icon('expandMore')
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
          user ? h('span', { class: 'usm-avatar', 'aria-hidden': 'true' }, initials(user)) : icon('account')
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
