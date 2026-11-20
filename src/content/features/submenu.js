/*
 * Section subpages as a bottom sheet, built from the existing <menu-left> — kept in its
 * slot, so its links and onclick handlers stay untouched. Opened by the top bar's context
 * button; open state = attribute on <main-panel>, positioning in styles/components/main-panel.css.
 */
(() => {
  'use strict';
  const USM = globalThis.USM;
  const { h, icon, t } = USM;
  const OPEN_ATTR = 'usm-drawer-open';

  USM.registerFeature({
    id: 'submenu',
    mount() {
      const panel = document.querySelector('main-panel');
      const menu = panel?.querySelector(':scope > menu-left');
      const btn = document.getElementById('usm-menu-btn');
      if (!panel || !menu || !menu.querySelector('a')) {
        // No subpages: the context button is just a title.
        btn?.setAttribute('disabled', '');
        btn?.classList.add('usm-context-static');
        return;
      }
      this.panel = panel;
      this.menu = menu;
      this.btn = btn;

      const title = btn?.querySelector('small')?.textContent || btn?.querySelector('b')?.textContent || t('subpages');
      this.head = h(
        'div',
        { class: 'usm-sheet-head-bar' },
        h('div', { class: 'usm-sheet-grip', 'aria-hidden': 'true' }),
        h(
          'div',
          { class: 'usm-sheet-title' },
          h('span', null, title),
          h('button', { type: 'button', class: 'usm-icon-btn', 'aria-label': t('closeSubpages'), onclick: () => this.close() }, icon('close'))
        )
      );
      menu.prepend(this.head);
      menu.setAttribute('aria-label', t('subpages'));

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

      // Swipe down to close (only when the list is scrolled to the top).
      let y0 = null;
      let dy = 0;
      this.onTouchStart = (e) => {
        if (!this.isOpen() || e.touches.length !== 1 || menu.scrollTop > 0) return;
        y0 = e.touches[0].clientY;
        dy = 0;
      };
      this.onTouchMove = (e) => {
        if (y0 == null) return;
        dy = Math.max(0, e.touches[0].clientY - y0);
        if (dy > 8) {
          menu.style.transition = 'none';
          menu.style.transform = `translateY(${dy}px)`;
        }
      };
      this.onTouchEnd = () => {
        if (y0 == null) return;
        menu.style.transition = '';
        menu.style.transform = '';
        if (dy > 90) this.close();
        y0 = null;
      };
      menu.addEventListener('touchstart', this.onTouchStart, { passive: true });
      menu.addEventListener('touchmove', this.onTouchMove, { passive: true });
      menu.addEventListener('touchend', this.onTouchEnd);
      menu.addEventListener('touchcancel', this.onTouchEnd);

      // Back/forward cache: never restore an open sheet.
      this.onPageShow = () => this.close(false);
      window.addEventListener('pageshow', this.onPageShow);
    },
    /** Back gesture: close the sheet if it is open. */
    back() {
      if (!this.isOpen()) return false;
      this.close();
      return true;
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
      const target = [...this.menu.querySelectorAll('a.selected')].pop();
      if (target) this.menu.scrollTop = Math.max(0, target.offsetTop - this.menu.clientHeight / 2);
      setTimeout(() => this.head.querySelector('button')?.focus({ preventScroll: true }), 30);
    },
    close(restoreFocus = true) {
      if (!this.panel || !this.isOpen()) return;
      this.panel.removeAttribute(OPEN_ATTR);
      this.backdrop.classList.remove('usm-open');
      document.documentElement.classList.remove('usm-lock');
      this.btn?.setAttribute('aria-expanded', 'false');
      if (restoreFocus) this.btn?.focus({ preventScroll: true });
    },
  });
})();
