/* ============================================================
   DRYME - Partage social
   ============================================================ */

'use strict';

/**
 * Partage un créneau optimal
 * @param {Object} slot - Données du créneau
 */
async function shareSlot(slot) {
  if (!slot) return;

  const badge = getScoreBadge(slot.score);
  const text  = `${badge.emoji} Meilleur moment pour étendre le linge : ${slot.startHour}h–${slot.endHour}h !\n` +
                `Score : ${slot.score}/100 (${badge.text})\n` +
                `💚 Économie : 80g de CO₂\n\n` +
                `#DRYME #ÉcoGeste #SéchageMalin`;

  const shareData = {
    title: 'DRYME – Mon créneau optimal',
    text,
    url: window.location.origin + '/app.html'
  };

  // Web Share API (natif mobile)
  if (navigator.share) {
    try {
      await navigator.share(shareData);
      showToast('✅ Partagé avec succès !');
      return;
    } catch (err) {
      if (err.name === 'AbortError') return; // L'utilisateur a annulé
    }
  }

  // Fallback : copier dans le presse-papier
  try {
    await copyToClipboard(text + '\n' + shareData.url);
    showToast('📋 Copié dans le presse-papier !');
  } catch {
    // Fallback ultime : ouvrir les liens réseaux sociaux
    showSocialModal(slot, text);
  }
}

/**
 * Copie du texte dans le presse-papier
 * @param {string} text
 */
async function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Fallback anciens navigateurs
  const el = document.createElement('textarea');
  el.value = text;
  el.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}

/**
 * Affiche un modal avec les liens vers les réseaux sociaux
 * @param {Object} slot
 * @param {string} text
 */
function showSocialModal(slot, text) {
  const enc   = encodeURIComponent;
  const url   = enc(window.location.origin + '/app.html');
  const tweet = enc(text);

  const links = {
    twitter:  `https://twitter.com/intent/tweet?text=${tweet}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    whatsapp: `https://wa.me/?text=${tweet}%20${url}`,
    telegram: `https://t.me/share/url?url=${url}&text=${tweet}`
  };

  // Créer et afficher un modal temporaire
  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.id = 'socialModal';
  modal.innerHTML = `
    <div class="modal" style="max-width:360px">
      <div class="modal-header">
        <h3 class="modal-title">Partager</h3>
        <button class="modal-close" onclick="document.getElementById('socialModal').remove()">✕</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px">
        <a href="${links.whatsapp}"  target="_blank" rel="noopener" class="btn btn-secondary" onclick="closeSocialModal()">WhatsApp</a>
        <a href="${links.telegram}"  target="_blank" rel="noopener" class="btn btn-secondary" onclick="closeSocialModal()">Telegram</a>
        <a href="${links.twitter}"   target="_blank" rel="noopener" class="btn btn-secondary" onclick="closeSocialModal()">Twitter / X</a>
        <a href="${links.facebook}"  target="_blank" rel="noopener" class="btn btn-secondary" onclick="closeSocialModal()">Facebook</a>
      </div>
    </div>
  `;
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  document.body.appendChild(modal);
}

function closeSocialModal() {
  const m = document.getElementById('socialModal');
  if (m) setTimeout(() => m.remove(), 300);
}

// Export global
window.shareSlot = shareSlot;
