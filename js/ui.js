/* ============================================================
   DRYME - Gestion de l'interface utilisateur
   ============================================================ */

'use strict';

/* ── Toast ── */
let toastTimeout;
function showToast(message, type = 'info') {
  clearTimeout(toastTimeout);

  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('show');

  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

/* ── Modal score ── */
function openScoreModal(slot) {
  const overlay = document.getElementById('scoreModal');
  if (!overlay) return;

  const badge = getScoreBadge(slot.score);

  document.getElementById('modalScoreVal').textContent    = `${slot.score}/100`;
  document.getElementById('modalScoreEmoji').textContent  = badge.emoji;
  document.getElementById('modalScoreLabel').textContent  = badge.text;
  document.getElementById('modalScoreLabel').className    = `score-badge ${badge.cssClass}`;

  const bd = slot.breakdown || {};
  setBar('barTemp',     bd.temp     || 0, 30);
  setBar('barHumidity', bd.humidity || 0, 25);
  setBar('barWind',     bd.wind     || 0, 25);
  setBar('barSun',      bd.sun      || 0, 20);

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeScoreModal() {
  const overlay = document.getElementById('scoreModal');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

function setBar(id, value, max) {
  const wrap  = document.getElementById(id);
  if (!wrap) return;
  const fill  = wrap.querySelector('.score-bar-fill');
  const label = wrap.querySelector('.score-item-val');
  const pct   = Math.round((value / max) * 100);
  if (fill)  setTimeout(() => { fill.style.width = pct + '%'; }, 50);
  if (label) label.textContent = `${value}/${max}`;
}

/* ── Affichage d'un créneau ── */
function renderSlot(cardId, slot, dayLabel) {
  const card = document.getElementById(cardId);
  if (!card) return;

  if (!slot) {
    card.innerHTML = buildEmptyState(dayLabel);
    return;
  }

  const badge  = getScoreBadge(slot.score);
  const fmt    = (h) => String(h).padStart(2, '0') + 'h';
  const dateStr = slot.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  card.innerHTML = `
    <div class="card-top">
      <span class="day-label">📅 ${dayLabel}</span>
      <button class="score-badge ${badge.cssClass}"
              onclick="openScoreModal(window._slots['${cardId}'])"
              title="Voir le détail du score">
        ${badge.emoji} ${slot.score}/100 — ${badge.text}
      </button>
    </div>

    <div class="card-body">
      <div class="time-display">
        <div class="time-emoji">${badge.emoji}</div>
        <div class="time-range">${fmt(slot.startHour)} – ${fmt(slot.endHour)}</div>
        <div class="time-date">${dateStr}</div>
      </div>

      <div class="weather-grid">
        <div class="weather-item">
          <span class="wi-icon">🌡️</span>
          <div class="wi-text">
            <span class="wi-val">${slot.temperature}°C</span>
            <span class="wi-label">Température</span>
          </div>
        </div>
        <div class="weather-item">
          <span class="wi-icon">💧</span>
          <div class="wi-text">
            <span class="wi-val">${slot.humidity}%</span>
            <span class="wi-label">Humidité</span>
          </div>
        </div>
        <div class="weather-item">
          <span class="wi-icon">💨</span>
          <div class="wi-text">
            <span class="wi-val">${slot.windSpeed} km/h</span>
            <span class="wi-label">Vent</span>
          </div>
        </div>
        <div class="weather-item">
          <span class="wi-icon">🌧️</span>
          <div class="wi-text">
            <span class="wi-val">${slot.rainProbability}%</span>
            <span class="wi-label">Prob. pluie</span>
          </div>
        </div>
      </div>

      <div class="co2-row">
        <span class="co2-icon">🌿</span>
        <span class="co2-text">Économie : 80g de CO₂ si vous n'utilisez pas le sèche-linge</span>
      </div>

      ${buildPollenGauge(slot.pollenData)}
      ${buildAirQuality(slot.airData)}
    </div>

    <div class="card-actions">
      <button onclick="shareSlot(window._slots['${cardId}'])">
        🔗 Partager
      </button>
      <button onclick="openScoreModal(window._slots['${cardId}'])">
        📊 Détail score
      </button>
    </div>
  `;
}

/* ── Jauge pollen
   Sens gauche → droite : Faible à gauche, Élevé à droite
   Arc tracé de gauche (M 20 100) vers droite (160 100) sens horaire (0 0 1)
   dashOffset 176 = arc vide (Faible)
   dashOffset 88  = arc à moitié (Moyen)
   dashOffset 0   = arc plein (Élevé)
── */
function buildPollenGauge(pollen) {
  if (!pollen) return '';
  const offset = pollen.dashOffset ?? 176;

  return `
    <div class="pollen-section">
      <div class="pollen-title">🌼 Indice pollen estimé</div>
      <div class="pollen-gauge-wrap">
        <svg class="pollen-gauge" viewBox="0 0 180 110" aria-label="Jauge pollen : ${pollen.text}">

          <!-- Arc fond : gauche → droite sens horaire -->
          <path d="M 20 100 A 70 70 0 0 1 160 100"
                fill="none" stroke="var(--border-2)" stroke-width="12"
                stroke-linecap="round"/>

          <!-- Arc rempli depuis la GAUCHE (Faible) vers la DROITE (Élevé) -->
          <path d="M 20 100 A 70 70 0 0 1 160 100"
                fill="none"
                stroke="${pollen.color}"
                stroke-width="12"
                stroke-linecap="round"
                stroke-dasharray="176"
                stroke-dashoffset="${offset}"
                class="gauge-fill"
                style="transition: stroke-dashoffset .8s cubic-bezier(.4,0,.2,1)"/>

          <!-- Faible à GAUCHE, Élevé à DROITE -->
          <text x="16"  y="118" font-size="10" fill="var(--text-3)" text-anchor="middle">Faible</text>
          <text x="164" y="118" font-size="10" fill="var(--text-3)" text-anchor="middle">Élevé</text>
        </svg>
      </div>
      <div class="pollen-value-label">${pollen.emoji} ${pollen.text}</div>
      <div class="pollen-disclaimer">
        ⚠️ Estimation basée sur les particules fines (PM2.5).<br>
        Pour un suivi allergie précis : <a href="https://www.pollens.fr" target="_blank" rel="noopener">pollens.fr</a>
      </div>
    </div>
  `;
}

/* ── Qualité air ── */
function buildAirQuality(air) {
  if (!air) return '';
  return `
    <div class="air-row ${air.label.cssClass}">
      <span>${air.label.emoji}</span>
      <span>Qualité de l'air : ${air.label.text}</span>
    </div>
  `;
}

/* ── État vide avec astuce séchage intérieur ── */
function buildEmptyState(dayLabel) {
  const isToday = dayLabel === "Aujourd'hui";

  const tips = [
    { icon: '🪟', title: 'Aérez la pièce',         text: 'Ouvrez deux fenêtres en vis-à-vis 10 minutes pour créer un courant d\'air et évacuer l\'humidité du linge.' },
    { icon: '🌡️', title: 'Choisissez la bonne pièce', text: 'La salle de bain chauffée après une douche est idéale : température élevée + air déjà humide = séchage rapide.' },
    { icon: '📏', title: 'Espacez bien les vêtements', text: 'Laissez au moins 5 cm entre chaque pièce sur l\'étendoir pour permettre à l\'air de circuler librement.' },
    { icon: '🌀', title: 'Activez la VMC',           text: 'Si vous avez une VMC, passez-la en vitesse maximale. Elle extrait l\'humidité produite par le linge.' },
    { icon: '🔄', title: 'Retournez le linge',       text: 'Retournez chaque pièce à mi-séchage. Les zones en contact avec l\'étendoir sèchent moins vite.' },
    { icon: '🌿', title: 'Évitez le radiateur direct', text: 'Préférez un étendoir à 50 cm du radiateur pour un séchage doux qui n\'abîme pas les fibres.' },
    { icon: '⏰', title: 'Essorage optimal',          text: 'Un bon essorage à 1200 tr/min réduit le temps de séchage de 30%. Vérifiez le réglage de votre machine.' },
    { icon: '🧺', title: 'Triez par épaisseur',       text: 'Accrochez les pièces épaisses en hauteur où l\'air est plus chaud, les légères en bas.' },
  ];

  const tip = tips[Math.floor(Math.random() * tips.length)];
  const label = isToday ? "aujourd'hui" : "demain";

  return `
    <div class="empty-state">
      <div class="empty-icon">🌧️</div>
      <div class="empty-title">Pas de créneau idéal ${label}</div>
      <p class="empty-text">Les conditions extérieures ne sont pas favorables au séchage naturel.</p>

      <div class="indoor-tip">
        <div class="indoor-tip-header">
          <span class="indoor-tip-icon">${tip.icon}</span>
          <div>
            <div class="indoor-tip-label">💡 Astuce séchage intérieur</div>
            <div class="indoor-tip-title">${tip.title}</div>
          </div>
        </div>
        <p class="indoor-tip-text">${tip.text}</p>
      </div>

      <p class="empty-comeback">
        🔄 Revérifiez ${isToday ? 'demain matin' : 'après-demain'} — les conditions peuvent évoluer.
      </p>
    </div>
  `;
}

/* ── Localisation ── */
function renderLocation(city, method) {
  const el = document.getElementById('locationCity');
  if (el) el.textContent = city;

  const meta = document.getElementById('locationMeta');
  if (meta) {
    meta.textContent = method === 'gps'
      ? '📍 Détecté automatiquement'
      : method === 'cache'
        ? '📍 Localisation mémorisée'
        : method === 'manual'
          ? '📍 Ville sélectionnée manuellement'
          : '📍 Localisation par défaut';
  }
}

/* ── Chargement ── */
function showLoading(show) {
  const el = document.getElementById('loadingOverlay');
  if (el) el.classList.toggle('hidden', !show);

  const app = document.getElementById('appContent');
  if (app) app.classList.toggle('hidden', show);
}

/* ── Erreur ── */
function showError(message) {
  const el = document.getElementById('errorCard');
  if (!el) return;
  el.querySelector('p').textContent = message;
  el.classList.remove('hidden');
}

// Export global
window.openScoreModal  = openScoreModal;
window.closeScoreModal = closeScoreModal;
window.showToast       = showToast;
window._slots          = {};
