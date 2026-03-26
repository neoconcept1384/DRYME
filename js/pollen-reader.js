/* ============================================================
   DRYME — Lecture de l'indice pollen depuis pollen.json
   À intégrer dans weather.js
   ============================================================ */

/**
 * Récupère l'indice pollen depuis le fichier pollen.json local
 * généré chaque jour par GitHub Actions
 *
 * @param {string} codeInsee - Code INSEE de la commune
 * @param {number} dayOffset - 0 = aujourd'hui, 1 = demain, 2 = après-demain
 * @returns {Promise<Object|null>} Données pollen ou null
 */
async function fetchPollenAtmo(codeInsee, dayOffset = 0) {
  try {
    // Charger pollen.json (mis en cache par le navigateur)
    const resp = await fetch('/data/pollen.json');
    if (!resp.ok) throw new Error('pollen.json non disponible');

    const json = await resp.json();

    // Calculer la date cible
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    const dateStr = date.toISOString().split('T')[0];

    // Chercher la commune dans l'index
    const key   = `${codeInsee}_${dateStr}`;
    const entry = json.data[key];

    if (!entry) return null;

    return {
      indice:    entry.indice,      // 0-6
      label:     entry.label,       // "Très faible", "Faible"...
      couleur:   entry.couleur,     // "#50CCAA"
      alerte:    entry.alerte,
      taxons:    entry.taxons,
      commune:   entry.commune,
      pollenResp:entry.pollenResp,
      // Compatibilité avec l'interface existante
      level:     entry.indice,
      text:      entry.label,
      color:     entry.couleur,
      emoji:     getPollenEmoji(entry.indice),
      dashOffset:getPollenDashOffset(entry.indice),
    };

  } catch (err) {
    console.warn('⚠️ Pollen Atmo non disponible:', err.message);
    return null;
  }
}

/**
 * Convertit le code INSEE depuis les coordonnées GPS
 * Via l'API gouvernementale française (gratuite, sans clé)
 *
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<string|null>} Code INSEE ou null
 */
async function getCodeInsee(lat, lon) {
  try {
    const url  = `https://geo.api.gouv.fr/communes?lat=${lat}&lon=${lon}&fields=code&format=json&geometry=mairie`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data && data.length > 0) return data[0].code;
  } catch (err) {
    console.warn('⚠️ Code INSEE non récupéré:', err.message);
  }
  return null;
}

/** Emoji selon le niveau pollen */
function getPollenEmoji(level) {
  const map = { 0:'❓', 1:'🟢', 2:'🟢', 3:'🟡', 4:'🔴', 5:'🔴', 6:'🟣' };
  return map[level] || '❓';
}

/** dashOffset SVG selon le niveau (0=vide, 176=plein) */
function getPollenDashOffset(level) {
  // 6 niveaux → offset de 176 (vide) à 0 (plein)
  const offsets = { 0:176, 1:147, 2:118, 3:88, 4:59, 5:29, 6:0 };
  return offsets[level] ?? 176;
}

/** Labels et couleurs officiels Atmo France */
const POLLEN_LEVELS = {
  0: { label:'Indisponible',      color:'#DDDDDD', bg:'rgba(221,221,221,.15)' },
  1: { label:'Très faible',       color:'#50F0E6', bg:'rgba(80,240,230,.15)'  },
  2: { label:'Faible',            color:'#50CCAA', bg:'rgba(80,204,170,.15)'  },
  3: { label:'Modéré',            color:'#c8b800', bg:'rgba(200,184,0,.15)'   },
  4: { label:'Élevé',             color:'#FF5050', bg:'rgba(255,80,80,.15)'   },
  5: { label:'Très élevé',        color:'#960032', bg:'rgba(150,0,50,.15)'    },
  6: { label:'Extrêmement élevé', color:'#872181', bg:'rgba(135,33,129,.15)'  },
};

// Export global
window.fetchPollenAtmo = fetchPollenAtmo;
window.getCodeInsee    = getCodeInsee;
window.POLLEN_LEVELS   = POLLEN_LEVELS;
