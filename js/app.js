/* ============================================================
   DRYME - Logique principale de l'application
   Point d'entrée : app.html
   ============================================================ */

'use strict';

/** État global de l'application */
const AppState = {
  location:  null,
  weather:   null,
  airData:   null,
  slotToday: null,
  slotTomorrow: null,
  loading:   false,
  error:     null
};

/** Initialisation au chargement de la page */
document.addEventListener('DOMContentLoaded', async () => {
  showLoading(true);

  try {
    // 1. Géolocalisation
    AppState.location = await getUserLocation();
    renderLocation(AppState.location.city, AppState.location.method);

    // 2. Données météo + qualité air en parallèle
    const [weatherResult, airResult] = await Promise.allSettled([
      fetchWeatherData(AppState.location.lat, AppState.location.lon),
      fetchAirQuality(AppState.location.lat, AppState.location.lon)
    ]);

    if (weatherResult.status === 'rejected') {
      throw new Error('Impossible de récupérer la météo. Vérifiez votre clé API.');
    }

    AppState.weather = weatherResult.value;
    AppState.airData = airResult.status === 'fulfilled' ? airResult.value : null;

    const pollenData = AppState.airData
      ? getPollenData(AppState.airData.pm25)
      : null;

    // 3. Calculer les créneaux
    const todayForecasts    = getForecastsForDay(AppState.weather.forecasts, 0);
    const tomorrowForecasts = getForecastsForDay(AppState.weather.forecasts, 1);

    AppState.slotToday    = findBestTimeSlot(todayForecasts);
    AppState.slotTomorrow = findBestTimeSlot(tomorrowForecasts);

    // Enrichir les slots avec données pollen + air
    if (AppState.slotToday) {
      AppState.slotToday.pollenData = pollenData;
      AppState.slotToday.airData    = AppState.airData;
    }
    if (AppState.slotTomorrow) {
      AppState.slotTomorrow.pollenData = pollenData;
      AppState.slotTomorrow.airData    = AppState.airData;
    }

    // Stocker globalement pour les callbacks
    window._slots['cardToday']    = AppState.slotToday;
    window._slots['cardTomorrow'] = AppState.slotTomorrow;

    // 4. Afficher
    renderSlot('cardToday',    AppState.slotToday,    "Aujourd'hui");
    renderSlot('cardTomorrow', AppState.slotTomorrow, 'Demain');

    showLoading(false);

  } catch (err) {
    console.error('❌ Erreur DRYME:', err);
    showLoading(false);
    showError(err.message || 'Une erreur est survenue. Veuillez réessayer.');
  }
});

/** Rafraîchissement manuel */
async function refreshApp() {
  clearLocationCache();
  showLoading(true);

  try {
    AppState.location = await getUserLocation();
    renderLocation(AppState.location.city, AppState.location.method);

    const [weatherResult, airResult] = await Promise.allSettled([
      fetchWeatherData(AppState.location.lat, AppState.location.lon),
      fetchAirQuality(AppState.location.lat, AppState.location.lon)
    ]);

    if (weatherResult.status === 'rejected') throw new Error('Météo indisponible');

    AppState.weather = weatherResult.value;
    AppState.airData = airResult.status === 'fulfilled' ? airResult.value : null;

    const pollenData = AppState.airData ? getPollenData(AppState.airData.pm25) : null;

    AppState.slotToday    = findBestTimeSlot(getForecastsForDay(AppState.weather.forecasts, 0));
    AppState.slotTomorrow = findBestTimeSlot(getForecastsForDay(AppState.weather.forecasts, 1));

    if (AppState.slotToday)    { AppState.slotToday.pollenData    = pollenData; AppState.slotToday.airData    = AppState.airData; }
    if (AppState.slotTomorrow) { AppState.slotTomorrow.pollenData = pollenData; AppState.slotTomorrow.airData = AppState.airData; }

    window._slots['cardToday']    = AppState.slotToday;
    window._slots['cardTomorrow'] = AppState.slotTomorrow;

    renderSlot('cardToday',    AppState.slotToday,    "Aujourd'hui");
    renderSlot('cardTomorrow', AppState.slotTomorrow, 'Demain');

    showLoading(false);
    showToast('✅ Données actualisées !');

  } catch (err) {
    showLoading(false);
    showError(err.message);
  }
}

window.refreshApp = refreshApp;
