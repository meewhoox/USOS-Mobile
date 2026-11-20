(async () => {
  'use strict';
  const api = globalThis.browser ?? globalThis.chrome;
  const DEFAULTS = { mode: 'auto', theme: 'default' };
  const ORIGINS = { origins: ['https://usosweb.polsl.pl/*'] };

  for (const el of document.querySelectorAll('[data-i18n]')) {
    el.textContent = api.i18n.getMessage(el.dataset.i18n) || el.dataset.i18n;
  }
  document.documentElement.lang = api.i18n.getUILanguage().startsWith('pl') ? 'pl' : 'en';

  const { settings: stored } = await api.storage.local.get('settings');
  const settings = { ...DEFAULTS, ...(stored || {}) };

  for (const name of ['mode', 'theme']) {
    const input = document.querySelector(`input[name="${name}"][value="${settings[name]}"]`);
    if (input) input.checked = true;
  }

  document.addEventListener('change', async (e) => {
    const { name, value } = e.target;
    if (name !== 'mode' && name !== 'theme') return;
    const { settings: cur } = await api.storage.local.get('settings');
    await api.storage.local.set({ settings: { ...DEFAULTS, ...(cur || {}), [name]: value } });
  });

  // Firefox MV3: host permissions may need to be granted by the user.
  try {
    if (!(await api.permissions.contains(ORIGINS))) {
      const box = document.getElementById('perm');
      box.hidden = false;
      document.getElementById('perm-btn').addEventListener('click', async () => {
        if (await api.permissions.request(ORIGINS)) box.hidden = true;
      });
    }
  } catch {
    /* permissions API unavailable */
  }
})();
