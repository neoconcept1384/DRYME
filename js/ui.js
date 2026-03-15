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

  // Remplir les données
  document.getElementById('modalScoreVal').textContent    = `${slot.score}/100`;
  document.getElementById('modalScoreEmoji').textContent  = badge.emoji;
  document.getElementById('modalScoreLabel').textContent  = badge.text;
  document.getElementById('modalScoreLabel').className    = `score-badge ${badge.cssClass}`;

  // Barres de détail
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

function buildPollenGauge(pollen) {
  if (!pollen) return '';
  const circumference = 176; // demi-cercle SVG
  const offset = pollen.dashOffset ?? 176;

  return `
    <div class="pollen-section">
      <div class="pollen-title">🌼 Pollen</div>
      <div class="pollen-gauge-wrap">
        <svg class="pollen-gauge" viewBox="0 0 180 110" aria-label="Jauge pollen niveau ${pollen.level}/5">
          <!-- Arc fond -->
          <path d="M 20 100 A 70 70 0 0 1 160 100"
                fill="none" stroke="var(--border-2)" stroke-width="12"
                stroke-linecap="round"/>
          <!-- Arc rempli -->
          <path d="M 20 100 A 70 70 0 0 1 160 100"
                fill="none"
                stroke="${pollen.color}"
                stroke-width="12"
                stroke-linecap="round"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${offset}"
                class="gauge-fill"
                style="transition: stroke-dashoffset .8s cubic-bezier(.4,0,.2,1)"/>
          <!-- Labels -->
          <text x="16"  y="118" font-size="10" fill="var(--text-3)" text-anchor="middle">Faible</text>
          <text x="164" y="118" font-size="10" fill="var(--text-3)" text-anchor="middle">Élevé</text>
        </svg>
      </div>
      <div class="pollen-value-label">${pollen.emoji} ${pollen.text}</div>
    </div>
  `;
}

function buildAirQuality(air) {
  if (!air) return '';
  return `
    <div class="air-row ${air.label.cssClass}">
      <span>${air.label.emoji}</span>
      <span>Qualité de l'air : ${air.label.text}</span>
    </div>
  `;
}

function buildEmptyState(dayLabel) {
  return `
    <div class="empty-state">
      <div class="empty-icon">⛅</div>
      <div class="empty-title">Aucun créneau disponible ${dayLabel === 'Aujourd\'hui' ? 'aujourd\'hui' : 'demain'}</div>
      <p class="empty-text">Les conditions météo ne sont pas favorables.<br>Pensez à utiliser un séchoir d'intérieur.</p>
    </div>
  `;
}

/* ── Affichage de la carte localisation ── */
function renderLocation(city, method) {
  const el = document.getElementById('locationCity');
  if (el) el.textContent = city;

  const meta = document.getElementById('locationMeta');
  if (meta) {
    meta.textContent = method === 'gps'
      ? '📍 Détecté automatiquement'
      : method === 'cache'
        ? '📍 Localisation mémorisée'
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

// Export global pour HTML inline
window.openScoreModal  = openScoreModal;
window.closeScoreModal = closeScoreModal;
window.showToast       = showToast;
window._slots          = {}; // stockage des données pour les callbacks
