/* ============================================================
   DRYME - Logique principale
   ============================================================ */

'use strict';

const AppState = {
  location:     null,
  weather:      null,
  airData:      null,
  slotToday:    null,
  slotTomorrow: null,
};

document.addEventListener('DOMContentLoaded', async () => {
  showLoading(true);
  try {
    AppState.location = await getUserLocation();
    await loadWeatherAndRender();
  } catch (err) {
    console.error('❌ Erreur DRYME:', err);
    showLoading(false);
    showError(err.message || 'Une erreur est survenue. Vérifiez votre clé API.');
  }
});

async function loadWeatherAndRender() {
  const { lat, lon, city, method } = AppState.location;
  renderLocation(city, method);

  const [weatherResult, airResult] = await Promise.allSettled([
    fetchWeatherData(lat, lon),
    fetchAirQuality(lat, lon)
  ]);

  if (weatherResult.status === 'rejected') {
    throw new Error('Météo indisponible. Vérifiez votre clé API OpenWeatherMap.');
  }

  AppState.weather = weatherResult.value;
  AppState.airData = airResult.status === 'fulfilled' ? airResult.value : null;

  const pollenData = AppState.airData ? getPollenData(AppState.airData.pm25) : null;

  // ── Passage des coordonnées GPS pour le filtre lever/coucher ──
  AppState.slotToday    = findBestTimeSlot(getForecastsForDay(AppState.weather.forecasts, 0), 4, lat, lon);
  AppState.slotTomorrow = findBestTimeSlot(getForecastsForDay(AppState.weather.forecasts, 1), 4, lat, lon);

  [AppState.slotToday, AppState.slotTomorrow].forEach(slot => {
    if (slot) { slot.pollenData = pollenData; slot.airData = AppState.airData; }
  });

  window._slots['cardToday']    = AppState.slotToday;
  window._slots['cardTomorrow'] = AppState.slotTomorrow;

  renderSlot('cardToday',    AppState.slotToday,    "Aujourd'hui");
  renderSlot('cardTomorrow', AppState.slotTomorrow, 'Demain');

  showLoading(false);
}

async function refreshApp() {
  clearLocationCache();
  showLoading(true);
  try {
    AppState.location = await getUserLocation();
    await loadWeatherAndRender();
    showToast('✅ Données actualisées !');
  } catch (err) {
    showLoading(false);
    showError(err.message);
  }
}

async function reloadForLocation(loc) {
  AppState.location = loc;
  showLoading(true);
  try {
    await loadWeatherAndRender();
  } catch (err) {
    showLoading(false);
    showError(err.message);
  }
}

window.refreshApp        = refreshApp;
window.reloadForLocation = reloadForLocation;
