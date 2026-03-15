/* ============================================================
   DRYME - Service météo OpenWeatherMap
   ============================================================ */

'use strict';

// ⚠️ REMPLACER PAR VOTRE CLÉ API OpenWeatherMap
const WEATHER_API_KEY = 'f2fe53786c12b2606e1aebcb2b910f93';
const WEATHER_BASE    = 'https://api.openweathermap.org/data/2.5';
const GEO_BASE        = 'https://api.openweathermap.org/geo/1.0';

/**
 * Récupère les prévisions météo (16 créneaux de 3h)
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<{city, country, forecasts}>}
 */
async function fetchWeatherData(lat, lon) {
  const url = `${WEATHER_BASE}/forecast?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric&lang=fr&cnt=16`;

  const response = await fetch(url);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Erreur météo HTTP ${response.status}`);
  }

  const data = await response.json();
  return {
    city:      data.city.name,
    country:   data.city.country,
    forecasts: data.list
  };
}

/**
 * Récupère la qualité de l'air
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<{aqi, pm25, pm10, label}>}
 */
async function fetchAirQuality(lat, lon) {
  try {
    const url      = `${WEATHER_BASE}/air_pollution?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}`;
    const response = await fetch(url);
    const data     = await response.json();

    const aqi        = data.list[0].main.aqi;
    const components = data.list[0].components;

    return {
      aqi,
      pm25:  components.pm2_5,
      pm10:  components.pm10,
      label: getAirQualityLabel(aqi)
    };
  } catch (error) {
    console.warn('⚠️ Qualité air non disponible:', error.message);
    return { aqi: 1, pm25: 0, pm10: 0, label: getAirQualityLabel(1) };
  }
}

/**
 * Convertit l'AQI (1-5) en objet lisible
 * @param {number} aqi
 * @returns {{text, cssClass, emoji}}
 */
function getAirQualityLabel(aqi) {
  const map = {
    1: { text: 'Très bon',      cssClass: 'good',   emoji: '💨🍃' },
    2: { text: 'Bon',           cssClass: 'good',   emoji: '💨🍃' },
    3: { text: 'Moyen',         cssClass: 'medium', emoji: '💨'   },
    4: { text: 'Mauvais',       cssClass: 'bad',    emoji: '⚠️'   },
    5: { text: 'Très mauvais',  cssClass: 'bad',    emoji: '🚫'   }
  };
  return map[aqi] || map[1];
}

/**
 * Estime le niveau de pollen à partir du PM2.5
 * Source officielle (Atmo/RNSA) non dispo sur API publique gratuite
 * → PM2.5 comme proxy raisonnable pour usagers français
 * @param {number} pm25 - µg/m³
 * @returns {{level, text, cssClass, emoji, dashOffset}}
 */
function getPollenData(pm25) {
  if (pm25 < 25) {
    return { level: 1, text: 'Faible', cssClass: 'green',  emoji: '🟢', color: '#059669', dashOffset: 176 };
  } else if (pm25 < 50) {
    return { level: 3, text: 'Moyen',  cssClass: 'orange', emoji: '🟠', color: '#ea580c', dashOffset: 88  };
  } else {
    return { level: 5, text: 'Élevé',  cssClass: 'red',    emoji: '🔴', color: '#dc2626', dashOffset: 0   };
  }
}

/**
 * Géo-reverse : coordonnées → nom de ville
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<string>}
 */
async function getCityName(lat, lon) {
  try {
    const url      = `${GEO_BASE}/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${WEATHER_API_KEY}`;
    const response = await fetch(url);
    const data     = await response.json();
    if (data && data.length > 0) {
      return data[0].local_names?.fr || data[0].name || 'Localisation inconnue';
    }
  } catch (e) {
    console.warn('Reverse geocoding échoué:', e.message);
  }
  return 'Localisation inconnue';
}

// Export
if (typeof module !== 'undefined') {
  module.exports = { fetchWeatherData, fetchAirQuality, getAirQualityLabel, getPollenData, getCityName };
}
