/* ============================================================
   DRYME - Géolocalisation + Recherche manuelle de ville
   ============================================================ */

'use strict';

const LOCATION_CACHE_KEY = 'dryme_location';
const LOCATION_MAX_AGE   = 7 * 24 * 60 * 60 * 1000; // 7 jours

/**
 * Obtient la localisation de l'utilisateur
 * Ordre de priorité : cache → GPS → fallback Paris
 */
async function getUserLocation() {
  const cached = loadSavedLocation();
  if (cached) {
    return { lat: cached.lat, lon: cached.lon, city: cached.city, method: 'cache' };
  }
  return await requestGPSLocation();
}

/**
 * Demande la géolocalisation GPS
 */
async function requestGPSLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(getParisLocation());
      return;
    }
    const timeout = setTimeout(() => resolve(getParisLocation()), 10000);
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
        resolve(getParisLocation());
      },
      { timeout: 8000, maximumAge: 60000, enableHighAccuracy: false }
    );
  });
}

function getParisLocation() {
  return { lat: 48.8566, lon: 2.3522, city: 'Paris', method: 'fallback' };
}

function saveLocation(lat, lon, city) {
  try {
    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify({
      lat, lon, city, savedAt: Date.now()
    }));
  } catch (e) {}
}

function loadSavedLocation() {
  try {
    const raw = localStorage.getItem(LOCATION_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.savedAt < LOCATION_MAX_AGE) return data;
    localStorage.removeItem(LOCATION_CACHE_KEY);
  } catch (e) {}
  return null;
}

function clearLocationCache() {
  try { localStorage.removeItem(LOCATION_CACHE_KEY); } catch {}
}

/* ============================================================
   RECHERCHE MANUELLE DE VILLE
   Utilise l'API Geocoding OpenWeatherMap
   ============================================================ */

let searchTimeout = null;
let searchResults = [];

/**
 * Ouvre le modal de recherche de ville
 */
function openCitySearch() {
  const modal = document.getElementById('citySearchModal');
  if (!modal) return;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  const input = document.getElementById('citySearchInput');
  if (input) {
    input.value = '';
    input.focus();
  }
  document.getElementById('citySearchResults').innerHTML = '';
  document.getElementById('citySearchEmpty').classList.add('hidden');
}

/**
 * Ferme le modal de recherche
 */
function closeCitySearch() {
  const modal = document.getElementById('citySearchModal');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
  clearTimeout(searchTimeout);
}

/**
 * Recherche de villes avec debounce 400ms
 */
function onCitySearchInput(value) {
  clearTimeout(searchTimeout);
  const results = document.getElementById('citySearchResults');
  const empty   = document.getElementById('citySearchEmpty');
  const loader  = document.getElementById('citySearchLoader');

  if (value.trim().length < 2) {
    results.innerHTML = '';
    empty.classList.add('hidden');
    return;
  }

  loader.classList.remove('hidden');

  searchTimeout = setTimeout(async () => {
    try {
      const url  = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(value)}&limit=5&appid=${WEATHER_API_KEY}`;
      const resp = await fetch(url);
      const data = await resp.json();

      loader.classList.add('hidden');
      results.innerHTML = '';

      if (!data || data.length === 0) {
        empty.classList.remove('hidden');
        return;
      }

      empty.classList.add('hidden');
      searchResults = data;

      data.forEach((place, idx) => {
        const name    = place.local_names?.fr || place.name;
        const country = place.country;
        const state   = place.state ? `, ${place.state}` : '';

        const item = document.createElement('button');
        item.className = 'city-result-item';
        item.innerHTML = `
          <span class="city-result-name">📍 ${name}</span>
          <span class="city-result-meta">${state ? state.slice(2) + ', ' : ''}${country}</span>
        `;
        item.onclick = () => selectCity(idx);
        results.appendChild(item);
      });

    } catch (err) {
      loader.classList.add('hidden');
      empty.classList.remove('hidden');
      document.getElementById('citySearchEmpty').textContent = 'Erreur de connexion. Réessayez.';
    }
  }, 400);
}

/**
 * Sélectionne une ville dans les résultats
 */
async function selectCity(idx) {
  const place = searchResults[idx];
  if (!place) return;

  const lat  = place.lat;
  const lon  = place.lon;
  const city = place.local_names?.fr || place.name;

  // Sauvegarder et fermer
  saveLocation(lat, lon, city);
  closeCitySearch();

  // Recharger les données météo
  showToast(`📍 Ville changée : ${city}`);
  await reloadForLocation({ lat, lon, city, method: 'manual' });
}

// Export global
window.openCitySearch  = openCitySearch;
window.closeCitySearch = closeCitySearch;
window.onCitySearchInput = onCitySearchInput;

if (typeof module !== 'undefined') {
  module.exports = { getUserLocation, requestGPSLocation, getParisLocation, saveLocation, loadSavedLocation, clearLocationCache };
}
