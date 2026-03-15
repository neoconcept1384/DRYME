/* ============================================================
   DRYME - Algorithme de calcul du score de séchage
   Basé sur formule Magnus (pression vapeur) et modèle Penman
   ============================================================ */

'use strict';

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
 * OWM fournit des intervalles de 3h → on utilise 2 prévisions = ~4-6h
 *
 * @param {Array}  forecasts - Tableau de prévisions OWM
 * @param {number} duration  - Durée souhaitée (toujours 4h pour l'affichage)
 * @returns {Object|null} Meilleur créneau ou null si insuffisant
 */
function findBestTimeSlot(forecasts, duration = 4) {
  const NB_FORECAST = 2; // 2 × 3h ≈ 4-6h

  if (!forecasts || forecasts.length < NB_FORECAST) return null;

  let bestSlot  = null;
  let bestScore = -1;

  for (let i = 0; i <= forecasts.length - NB_FORECAST; i++) {
    const window = forecasts.slice(i, i + NB_FORECAST);

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

      // Moyennes des métriques
      const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

      bestSlot = {
        date:            startDate,
        startHour:       startHour,
        endHour:         startHour + duration,  // Toujours +4h
        score:           Math.round(avgScore),
        temperature:     Math.round(avg(window.map(f => f.main.temp))),
        humidity:        Math.round(avg(window.map(f => f.main.humidity))),
        windSpeed:       Math.round(avg(window.map(f => f.wind.speed)) * 3.6),
        rainProbability: Math.round(Math.max(...window.map(f => f.pop || 0)) * 100),
        sunshine:        Math.round(100 - avg(window.map(f => f.clouds.all))),
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
 * @param {number} score - Score 0-100
 * @returns {Object} { emoji, text, cssClass, color }
 */
function getScoreBadge(score) {
  if (score >= 80) return { emoji: '🌟', text: 'Idéal',       cssClass: 'excellent',   color: '#059669' };
  if (score >= 60) return { emoji: '✨', text: 'Très bon',    cssClass: 'tres-bon',    color: '#2563eb' };
  if (score >= 40) return { emoji: '👍', text: 'Correct',     cssClass: 'correct',     color: '#d97706' };
  if (score >= 20) return { emoji: '⚠️', text: 'Déconseillé', cssClass: 'deconseille', color: '#ea580c' };
  return              { emoji: '❌', text: 'Mauvais',      cssClass: 'mauvais',     color: '#dc2626' };
}

/**
 * Filtre les prévisions pour une journée donnée
 * @param {Array}  forecasts - Toutes les prévisions
 * @param {number} dayOffset - 0 = aujourd'hui, 1 = demain
 * @returns {Array}
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

// Export pour module ou usage global
if (typeof module !== 'undefined') {
  module.exports = { calculateDryingScore, findBestTimeSlot, getScoreBadge, getForecastsForDay };
}
