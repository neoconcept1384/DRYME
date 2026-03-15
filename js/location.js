/* ============================================================
   DRYME - Géolocalisation
   ============================================================ */

'use strict';

const LOCATION_CACHE_KEY = 'dryme_location';
const LOCATION_MAX_AGE   = 7 * 24 * 60 * 60 * 1000; // 7 jours en ms

/**
 * Obtient la localisation de l'utilisateur
 * Ordre de priorité : cache → GPS → fallback Paris
 * @returns {Promise<{lat, lon, city, method}>}
 */
async function getUserLocation() {
  // 1. Essayer le cache
  const cached = loadSavedLocation();
  if (cached) {
    return { lat: cached.lat, lon: cached.lon, city: cached.city, method: 'cache' };
  }

  // 2. GPS
  return await requestGPSLocation();
}

/**
 * Demande la géolocalisation GPS
 * @returns {Promise<{lat, lon, city, method}>}
 */
async function requestGPSLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('Géolocalisation non supportée → Paris');
      resolve(getParisLocation());
      return;
    }

    const timeout = setTimeout(() => {
      console.warn('Timeout géolocalisation → Paris');
      resolve(getParisLocation());
    }, 10000);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        clearTimeout(timeout);
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        try {
          const city = await getCityName(lat, lon);
          const loc  = { lat, lon, city, method: 'gps' };
          saveLocation(lat, lon, city);
          resolve(loc);
        } catch {
          resolve({ lat, lon, city: 'Ma position', method: 'gps' });
        }
      },
      (error) => {
        clearTimeout(timeout);
        console.warn('GPS refusé:', error.message);
        resolve(getParisLocation());
      },
      { timeout: 8000, maximumAge: 60000, enableHighAccuracy: false }
    );
  });
}

/**
 * Localisation de repli : Paris
 */
function getParisLocation() {
  return { lat: 48.8566, lon: 2.3522, city: 'Paris', method: 'fallback' };
}

/**
 * Sauvegarde la localisation dans localStorage
 */
function saveLocation(lat, lon, city) {
  try {
    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify({
      lat, lon, city, savedAt: Date.now()
    }));
  } catch (e) {
    console.warn('Impossible de sauvegarder la localisation:', e.message);
  }
}

/**
 * Charge la localisation depuis le cache si valide
 * @returns {Object|null}
 */
function loadSavedLocation() {
  try {
    const raw = localStorage.getItem(LOCATION_CACHE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw);
    if (Date.now() - data.savedAt < LOCATION_MAX_AGE) return data;

    localStorage.removeItem(LOCATION_CACHE_KEY);
  } catch (e) {
    console.warn('Erreur lecture cache localisation:', e.message);
  }
  return null;
}

/**
 * Efface le cache de localisation (pour forcer un rafraîchissement)
 */
function clearLocationCache() {
  try { localStorage.removeItem(LOCATION_CACHE_KEY); } catch {}
}

// Export
if (typeof module !== 'undefined') {
  module.exports = { getUserLocation, requestGPSLocation, getParisLocation, saveLocation, loadSavedLocation, clearLocationCache };
}
