#!/usr/bin/env node
/* ============================================================
   DRYME — Script de récupération quotidienne de l'indice pollen
   Source : Atmo France / AASQA (licence ODbL)
   Exécuté automatiquement chaque jour à 12h30 via GitHub Actions
   ============================================================ */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const API_BASE = 'admindata.atmo-france.org';
const USERNAME = process.env.ATMO_USERNAME;
const PASSWORD = process.env.ATMO_PASSWORD;

if (!USERNAME || !PASSWORD) {
  console.error('❌ Variables ATMO_USERNAME et ATMO_PASSWORD manquantes');
  process.exit(1);
}

/* ── Utilitaire requête HTTPS ── */
function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

/* ── Étape 1 : Obtenir le token JWT ── */
async function getToken() {
  console.log('🔑 Connexion à Atmo Data...');

  const body = JSON.stringify({ username: USERNAME, password: PASSWORD });

  const res = await request({
    hostname: API_BASE,
    path:     '/api/login',
    method:   'POST',
    headers:  {
      'Content-Type':   'application/json',
      'Content-Length': Buffer.byteLength(body),
      'Accept':         'application/json',
    }
  }, body);

  if (res.status !== 200 || !res.body.token) {
    throw new Error(`Login échoué (${res.status}): ${JSON.stringify(res.body)}`);
  }

  console.log('✅ Token obtenu');
  return res.body.token;
}

/* ── Étape 2 : Récupérer l'indice pollen ── */
async function fetchPollen(token) {
  // Dates : aujourd'hui + J+1 + J+2
  const today    = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const dayAfter = new Date(today); dayAfter.setDate(today.getDate() + 2);

  const fmt = d => d.toISOString().split('T')[0];

  console.log(`📅 Récupération pollen du ${fmt(today)} au ${fmt(dayAfter)}...`);

  // Récupérer toutes les communes de France pour J, J+1, J+2
  // On filtre with_geom=false pour garder un fichier léger
  const params = new URLSearchParams({
    format:           'geojson',
    date:             fmt(dayAfter),      // date max
    date_historique:  fmt(today),         // date min
    with_geom:        'false',
  });

  const res = await request({
    hostname: API_BASE,
    path:     `/api/v2/data/indices/pollens?${params}`,
    method:   'GET',
    headers:  {
      'Accept':        'application/json',
      'Authorization': `Bearer ${token}`,
    }
  });

  if (res.status !== 200) {
    throw new Error(`Erreur pollen (${res.status}): ${JSON.stringify(res.body)}`);
  }

  const features = res.body.features || [];
  console.log(`✅ ${features.length} entrées reçues`);

  return features;
}

/* ── Étape 3 : Transformer et sauvegarder ── */
function buildOutput(features) {
  // Indexer par code_zone + date_ech pour accès rapide côté client
  const index = {};

  features.forEach(f => {
    const p    = f.properties;
    const key  = `${p.code_zone}_${p.date_ech?.split('T')[0]}`;

    index[key] = {
      commune:    p.lib_zone,
      codeInsee:  p.code_zone,
      date:       p.date_ech?.split('T')[0],
      indice:     p.code_qual,      // 0-6
      label:      p.lib_qual,       // "Très faible", "Faible", etc.
      couleur:    p.coul_qual,      // code hex
      alerte:     p.alerte || false,
      pollenResp: p.pollen_resp || '',
      taxons: {
        aulne:     { indice: p.code_aul,  conc: p.conc_aul  },
        bouleau:   { indice: p.code_boul, conc: p.conc_boul },
        olivier:   { indice: p.code_oliv, conc: p.conc_oliv },
        graminees: { indice: p.code_gram, conc: p.conc_gram },
        armoise:   { indice: p.code_arm,  conc: p.conc_arm  },
        ambroisie: { indice: p.code_ambr, conc: p.conc_ambr },
      }
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    source:      'Atmo France / AASQA — Licence ODbL',
    notice:      'https://www.atmo-france.org',
    count:       Object.keys(index).length,
    data:        index
  };
}

/* ── Main ── */
async function main() {
  try {
    const token    = await getToken();
    const features = await fetchPollen(token);
    const output   = buildOutput(features);

    // Sauvegarder dans /data/pollen.json à la racine du repo
    const outPath = path.join(process.cwd(), 'data', 'pollen.json');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');

    console.log(`💾 Sauvegardé : ${outPath}`);
    console.log(`📊 ${output.count} entrées (communes × jours)`);
    console.log('🌼 Terminé avec succès !');

  } catch (err) {
    console.error('❌ Erreur :', err.message);
    process.exit(1);
  }
}

main();
