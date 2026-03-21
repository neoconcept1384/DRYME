/* ============================================================
   DRYME - Algorithme de calcul du score de séchage
   Basé sur formule Magnus (pression vapeur) et modèle Penman
   ============================================================ */

'use strict';

/**
 * Calcule le lever et coucher du soleil pour une date et position données
 * Algorithme de Jean Meeus (Astronomical Algorithms) — précision ±1 min
 *
 * @param {number} lat       - Latitude en degrés
 * @param {number} lon       - Longitude en degrés
 * @param {Date}   date      - Date cible
 * @returns {{ sunrise: Date, sunset: Date }}
 */
function getSunriseSunset(lat, lon, date) {
  const rad  = Math.PI / 180;
  const deg  = 180 / Math.PI;

  // Jour julien
  const JD = Math.floor(date.getTime() / 86400000) + 2440587.5;

  // Calcul intermédiaire
  const n    = JD - 2451545.0;
  const L    = (280.460 + 0.9856474 * n) % 360;
  const g    = (357.528 + 0.9856003 * n) % 360;
  const lambda = L + 1.915 * Math.sin(g * rad) + 0.020 * Math.sin(2 * g * rad);
  const epsilon = 23.439 - 0.0000004 * n;
  const sinDec = Math.sin(epsilon * rad) * Math.sin(lambda * rad);
  const dec    = Math.asin(sinDec) * deg;

  // Angle horaire au lever/coucher (hauteur = -0.83° pour réfraction + disque solaire)
  const cosH = (Math.sin(-0.83 * rad) - Math.sin(lat * rad) * Math.sin(dec * rad))
             / (Math.cos(lat * rad) * Math.cos(dec * rad));

  // Soleil toujours levé ou jamais levé (cercle polaire)
  if (cosH > 1)  return { sunrise: null, sunset: null, polarNight: true  };
  if (cosH < -1) return { sunrise: null, sunset: null, polarDay:   true  };

  const H = Math.acos(cosH) * deg;

  // Midi solaire local
  const GMST  = 6.697375 + 0.0657098242 * n;
  const RA    = Math.atan2(Math.cos(epsilon * rad) * Math.sin(lambda * rad), Math.cos(lambda * rad)) * deg / 15;
  const noon  = (RA - (GMST % 24) - lon / 15 + 24) % 24; // en heures UTC

  const sunriseUTC = noon - H / 15;
  const sunsetUTC  = noon + H / 15;

  // Convertir en Date locale
  const base = new Date(date);
  base.setUTCHours(0, 0, 0, 0);

  const sunrise = new Date(base.getTime() + sunriseUTC * 3600000);
  const sunset  = new Date(base.getTime() + sunsetUTC  * 3600000);

  return { sunrise, sunset };
}

/**
 * Vérifie si un créneau (fenêtre de prévisions) est compatible
 * avec les contraintes solaires : au moins 30 min après le lever
 * et au moins 30 min avant le coucher.
 *
 * @param {Array}  window    - Tableau de 2 prévisions OWM
 * @param {number} lat       - Latitude
 * @param {number} lon       - Longitude
 * @returns {boolean}
 */
function isWithinDaylight(window, lat, lon) {
  const startDate = new Date(window[0].dt * 1000);
  const endDate   = new Date(window[window.length - 1].dt * 1000);
  // La fin du créneau = heure de début de la dernière prévision + 3h
  endDate.setHours(endDate.getHours() + 3);

  const { sunrise, sunset } = getSunriseSunset(lat, lon, startDate);

  // Nuit polaire → pas de séchage
  if (!sunrise || !sunset) return false;

  const MARGIN = 30 * 60 * 1000; // 30 minutes en ms
  const dayStart = new Date(sunrise.getTime() + MARGIN);
  const dayEnd   = new Date(sunset.getTime()  - MARGIN);

  // Le créneau doit commencer après dayStart ET se terminer avant dayEnd
  return startDate >= dayStart && endDate <= dayEnd;
}

/**
 * Calcule le score de séchage pour une prévision donnée
 * @param {Object} weather - Prévision OpenWeatherMap (1 entrée de /forecast)
 * @returns {number} Score entre 0 et 100
 */
function calculateDryingScore(weather) {
  const temp     = weather.main.temp;
  const humidity = weather.main.humidity;
  const windMps  = weather.wind.speed;
  const windKmh  = windMps * 3.6;
  const clouds   = weather.clouds.all;
  const rainProb = weather.pop || 0;

  // ── 1. Température (30 pts max) ──
  let tempScore;
  if      (temp >= 15 && temp <= 25) tempScore = 30;
  else if (temp > 25  && temp <= 35) tempScore = 25;
  else if (temp >= 10 && temp < 15)  tempScore = 20;
  else if (temp >= 5  && temp < 10)  tempScore = 10;
  else                               tempScore = 5;

  // ── 2. Humidité (25 pts max) ──
  const humidityScore = Math.max(0, 25 - (humidity * 0.25));

  // ── 3. Vent (25 pts max) ──
  let windScore;
  if      (windKmh >= 8  && windKmh <= 20) windScore = 25;
  else if (windKmh >= 5  && windKmh < 8)   windScore = 18;
  else if (windKmh > 20  && windKmh <= 30) windScore = 15;
  else if (windKmh < 5)                    windScore = 8;
  else                                     windScore = 5;

  // ── 4. Ensoleillement (20 pts max) ──
  const sunshine = 100 - clouds;
  const sunScore = (sunshine / 100) * 20;

  // ── 5. Pénalités ──
  let penalties = 0;

  // Probabilité de pluie
  penalties += rainProb * 100 * 0.8;

  // Humidité excessive
  if (humidity > 85) {
    penalties += (humidity - 85) * 2;
  }

  // Froid extrême
  if (temp < 5) {
    penalties += (5 - temp) * 3;
  }

  // Pluie effective (si données rain présentes)
  if (weather.rain && weather.rain['3h'] > 0.5) {
    penalties += 30;
  }

  const total = tempScore + humidityScore + windScore + sunScore - penalties;
  return Math.max(0, Math.min(100, Math.round(total)));
}

/**
 * Trouve le meilleur créneau de 4h dans une liste de prévisions
 * en respectant les contraintes solaires (lever/coucher ± 30 min)
 *
 * @param {Array}  forecasts - Tableau de prévisions OWM
 * @param {number} duration  - Durée en heures (4)
 * @param {number} lat       - Latitude (optionnel, défaut Paris)
 * @param {number} lon       - Longitude (optionnel, défaut Paris)
 * @returns {Object|null}
 */
function findBestTimeSlot(forecasts, duration = 4, lat = 48.8566, lon = 2.3522) {
  const NB_FORECAST = 2; // 2 × 3h ≈ 4-6h

  if (!forecasts || forecasts.length < NB_FORECAST) return null;

  let bestSlot  = null;
  let bestScore = -1;

  for (let i = 0; i <= forecasts.length - NB_FORECAST; i++) {
    const window = forecasts.slice(i, i + NB_FORECAST);

    // ── Filtre solaire : exclure les créneaux nocturnes ──
    if (!isWithinDaylight(window, lat, lon)) continue;

    // Scores individuels
    const scores   = window.map(f => calculateDryingScore(f));
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Bonus heures ensoleillées (10h–17h)
    let sunBonus = 0;
    window.forEach(f => {
      const h = new Date(f.dt * 1000).getHours();
      if (h >= 10 && h <= 17) sunBonus += 1.5;
    });

    const finalScore = avgScore + sunBonus;

    if (finalScore > bestScore) {
      bestScore = finalScore;

      const startDate = new Date(window[0].dt * 1000);
      const startHour = startDate.getHours();

      const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

      // Récupérer les heures de lever/coucher pour les afficher
      const { sunrise, sunset } = getSunriseSunset(lat, lon, startDate);

      bestSlot = {
        date:            startDate,
        startHour:       startHour,
        endHour:         startHour + duration,
        score:           Math.round(avgScore),
        temperature:     Math.round(avg(window.map(f => f.main.temp))),
        humidity:        Math.round(avg(window.map(f => f.main.humidity))),
        windSpeed:       Math.round(avg(window.map(f => f.wind.speed)) * 3.6),
        rainProbability: Math.round(Math.max(...window.map(f => f.pop || 0)) * 100),
        sunshine:        Math.round(100 - avg(window.map(f => f.clouds.all))),
        // Infos solaires
        sunriseHour:     sunrise ? `${sunrise.getHours()}h${String(sunrise.getMinutes()).padStart(2,'0')}` : null,
        sunsetHour:      sunset  ? `${sunset.getHours()}h${String(sunset.getMinutes()).padStart(2,'0')}`  : null,
        // Détail par critère pour le modal
        breakdown: {
          temp:     Math.round(window.reduce((s,f) => {
            const t = f.main.temp;
            let sc = (t>=15&&t<=25)?30:(t>25&&t<=35)?25:(t>=10&&t<15)?20:(t>=5&&t<10)?10:5;
            return s + sc;
          }, 0) / window.length),
          humidity: Math.round(avg(window.map(f => Math.max(0, 25 - f.main.humidity * 0.25)))),
          wind:     Math.round(avg(scores.map((s,idx) => {
            const wk = window[idx].wind.speed * 3.6;
            return (wk>=8&&wk<=20)?25:(wk>=5&&wk<8)?18:(wk>20&&wk<=30)?15:(wk<5)?8:5;
          }))),
          sun:      Math.round(avg(window.map(f => ((100 - f.clouds.all) / 100) * 20)))
        }
      };
    }
  }

  return bestSlot;
}

/**
 * Retourne le badge associé à un score
 */
function getScoreBadge(score) {
  if (score >= 80) return { emoji: '🌟', text: 'Idéal',        cssClass: 'excellent',   color: '#059669' };
  if (score >= 60) return { emoji: '✨', text: 'Très bon',     cssClass: 'tres-bon',    color: '#2563eb' };
  if (score >= 40) return { emoji: '👍', text: 'Correct',      cssClass: 'correct',     color: '#d97706' };
  if (score >= 20) return { emoji: '⚠️', text: 'Déconseillé',  cssClass: 'deconseille', color: '#ea580c' };
  return              { emoji: '❌', text: 'Mauvais',       cssClass: 'mauvais',     color: '#dc2626' };
}

/**
 * Filtre les prévisions pour une journée donnée
 */
function getForecastsForDay(forecasts, dayOffset) {
  const now    = new Date();
  const target = new Date(now);
  target.setDate(target.getDate() + dayOffset);
  target.setHours(0, 0, 0, 0);

  const end = new Date(target);
  end.setHours(23, 59, 59, 999);

  return forecasts.filter(f => {
    const d = new Date(f.dt * 1000);
    return d >= target && d <= end;
  });
}

// Export
if (typeof module !== 'undefined') {
  module.exports = { calculateDryingScore, findBestTimeSlot, getScoreBadge, getForecastsForDay, getSunriseSunset };
}
