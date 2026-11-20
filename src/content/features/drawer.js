/*
 * Off-canvas drawer built from the existing <menu-left> (kept in place, so its
 * links and onclick handlers stay untouched). Open state = attribute on <main-panel>,
 * positioning comes from styles/components/main-panel.css.
 */
(() => {
  'use strict';
  const { h, icon, t } = globalThis.USM;
  const OPEN_ATTR = 'usm-drawer-open';

  globalThis.USM.registerFeature({
    id: 'drawer',
    mount() {
      const panel = document.querySelector('main-panel');
      const menu = panel?.querySelector(':scope > menu-left');
      const btn = document.getElementById('usm-menu-btn');
      if (!panel || !menu || !menu.querySelector('a')) {
        if (btn) btn.hidden = true;
        return;
      }
      this.panel = panel;
      this.menu = menu;
      this.btn = btn;

      this.head = h(
        'div',
        { class: 'usm-drawer-head' },
        h('span', null, t('menu')),
        h('button', { type: 'button', class: 'usm-icon-btn', 'aria-label': t('closeMenu'), onclick: () => this.close() }, icon('close'))
      );
      menu.prepend(this.head);

      this.backdrop = h('div', { class: 'usm-backdrop', 'aria-hidden': 'true', onclick: () => this.close() });
      document.body.append(this.backdrop);

      this.onBtn = () => (this.isOpen() ? this.close() : this.open());
      btn?.addEventListener('click', this.onBtn);

      this.onKey = (e) => {
        if (e.key === 'Escape' && this.isOpen()) {
          e.preventDefault();
          this.close();
        }
      };
      document.addEventListener('keydown', this.onKey);

      // Swipe left to close.
      let x0 = null;
      let dx = 0;
      this.onTouchStart = (e) => {
        if (!this.isOpen() || e.touches.length !== 1) return;
        x0 = e.touches[0].clientX;
        dx = 0;
      };
      this.onTouchMove = (e) => {
        if (x0 == null) return;
        dx = Math.min(0, e.touches[0].clientX - x0);
        if (dx < -8) {
          menu.style.transition = 'none';
          menu.style.transform = `translateX(${dx}px)`;
        }
      };
      this.onTouchEnd = () => {
        if (x0 == null) return;
        menu.style.transition = '';
        menu.style.transform = '';
        if (dx < -70) this.close();
        x0 = null;
      };
      menu.addEventListener('touchstart', this.onTouchStart, { passive: true });
      menu.addEventListener('touchmove', this.onTouchMove, { passive: true });
      menu.addEventListener('touchend', this.onTouchEnd);
      menu.addEventListener('touchcancel', this.onTouchEnd);

      // Back/forward cache: never restore an open drawer.
      this.onPageShow = () => this.close(false);
      window.addEventListener('pageshow', this.onPageShow);
    },
    isOpen() {
      return this.panel?.hasAttribute(OPEN_ATTR);
    },
    open() {
      if (!this.panel) return;
      this.panel.setAttribute(OPEN_ATTR, '');
      this.backdrop.classList.add('usm-open');
      document.documentElement.classList.add('usm-lock');
      this.btn?.setAttribute('aria-expanded', 'true');
      this.btn?.setAttribute('aria-label', t('closeMenu'));
      const target = this.menu.querySelector('a.selected') || this.menu.querySelector('a');
      if (target) this.menu.scrollTop = Math.max(0, target.offsetTop - this.menu.clientHeight / 2);
      setTimeout(() => this.head.querySelector('button')?.focus({ preventScroll: true }), 30);
    },
    close(restoreFocus = true) {
      if (!this.panel || !this.isOpen()) return;
      this.panel.removeAttribute(OPEN_ATTR);
      this.backdrop.classList.remove('usm-open');
      document.documentElement.classList.remove('usm-lock');
      this.btn?.setAttribute('aria-expanded', 'false');
      this.btn?.setAttribute('aria-label', t('openMenu'));
      if (restoreFocus) this.btn?.focus({ preventScroll: true });
    },
    unmount() {
      if (!this.panel) return;
      this.close(false);
      this.head.remove();
      this.backdrop.remove();
      this.btn?.removeEventListener('click', this.onBtn);
      document.removeEventListener('keydown', this.onKey);
      window.removeEventListener('pageshow', this.onPageShow);
      this.menu.removeEventListener('touchstart', this.onTouchStart);
      this.menu.removeEventListener('touchmove', this.onTouchMove);
      this.menu.removeEventListener('touchend', this.onTouchEnd);
      this.menu.removeEventListener('touchcancel', this.onTouchEnd);
      this.panel = this.menu = this.btn = null;
    },
  });
})();
