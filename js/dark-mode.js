/* ============================================================
   DRYME - Mode sombre
   ============================================================ */

'use strict';

(function () {
  /**
   * Initialise le mode sombre dès que le DOM est prêt
   */
  function initDarkMode() {
    const saved     = localStorage.getItem('dryme_dark');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark    = saved !== null ? saved === 'true' : prefersDark;

    applyDark(isDark, false); // false = pas d'animation au démarrage

    // Écouter les changements système (uniquement si aucune préférence sauvée)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (localStorage.getItem('dryme_dark') === null) {
        applyDark(e.matches, true);
      }
    });
  }

  /**
   * Bascule le mode sombre
   */
  function toggleDarkMode() {
    const isDark = !document.body.classList.contains('dark');
    applyDark(isDark, true);
    localStorage.setItem('dryme_dark', isDark);
  }

  /**
   * Applique ou retire le mode sombre
   * @param {boolean} isDark
   * @param {boolean} animate - Animer le bouton
   */
  function applyDark(isDark, animate) {
    document.body.classList.toggle('dark', isDark);

    // Mettre à jour meta theme-color
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.content = isDark ? '#0b1120' : '#1d4ed8';
    }

    // Animation bouton
    if (animate) {
      const btn = document.getElementById('darkToggle');
      if (btn) {
        btn.style.transform = 'rotate(20deg) scale(1.1)';
        setTimeout(() => { btn.style.transform = ''; }, 250);
      }
    }
  }

  // Attacher au scope global
  window.toggleDarkMode = toggleDarkMode;

  // Initialiser
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDarkMode);
  } else {
    initDarkMode();
  }
})();
