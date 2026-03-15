/* ============================================================
   DRYME - Gestion des publicités Google AdSense
   ============================================================ */

'use strict';

const adConfig = {
  // ⚠️ REMPLACER par votre Publisher ID AdSense
  client: 'ca-pub-XXXXXXXXXXXXXXXXX',

  slots: {
    topBannerMobile:  'XXXXXXXXXX',
    topBannerTablet:  'XXXXXXXXXX',
    topBannerDesktop: 'XXXXXXXXXX',
    middleRect:       'XXXXXXXXXX',
    bottomBanner:     'XXXXXXXXXX',
    sidebar:          'XXXXXXXXXX'
  },

  // Passer à true une fois votre compte AdSense approuvé
  enabled: false
};

/**
 * Initialise AdSense si activé, sinon affiche les placeholders
 */
function initAds() {
  if (!adConfig.enabled) {
    renderAdPlaceholders();
    return;
  }

  // Charger le script AdSense
  const script = document.createElement('script');
  script.src   = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adConfig.client}`;
  script.async = true;
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);

  script.onload = () => {
    document.querySelectorAll('.adsbygoogle').forEach(() => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.warn('Erreur push AdSense:', e.message);
      }
    });
  };
}

/**
 * Affiche des placeholders visuels en mode développement
 */
function renderAdPlaceholders() {
  document.querySelectorAll('[data-ad-placeholder]').forEach(container => {
    const type = container.dataset.adPlaceholder;
    const sizes = {
      'top-mobile':  { w: 320,  h: 50,  label: 'Bannière 320×50' },
      'top-tablet':  { w: 728,  h: 90,  label: 'Bannière 728×90' },
      'top-desktop': { w: 970,  h: 90,  label: 'Bannière 970×90' },
      'middle':      { w: 300,  h: 250, label: 'Rectangle 300×250' },
      'bottom':      { w: 728,  h: 90,  label: 'Bannière 728×90' },
      'sidebar':     { w: 300,  h: 600, label: 'Sidebar 300×600' }
    };

    const info = sizes[type] || { w: 300, h: 100, label: 'Publicité' };
    container.innerHTML = `
      <div class="ad-placeholder" style="width:${info.w}px;height:${info.h}px;max-width:100%">
        📢 ${info.label}
      </div>
    `;
  });
}

// Initialiser au chargement
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAds);
} else {
  initAds();
}
