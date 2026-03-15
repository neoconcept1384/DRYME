# DRYME 🌤️ — Séchez malin, économisez l'énergie

Application web (PWA) qui recommande le meilleur créneau de séchage du linge en extérieur, basé sur météo, pollen et qualité de l'air.

## 🗂️ Structure du projet

```
dryme-web/
├── index.html                     → Landing page
├── app.html                       → Application principale
├── comment-ca-marche.html         → Guide utilisateur
├── a-propos.html                  → À propos
├── mentions-legales.html          → Mentions légales
├── politique-confidentialite.html → RGPD
├── contact.html                   → Formulaire contact
│
├── css/
│   ├── style.css       → Variables, reset, base
│   ├── responsive.css  → Media queries Mobile First
│   ├── dark-mode.css   → Mode sombre
│   ├── landing.css     → Styles landing page
│   └── components.css  → Composants réutilisables
│
├── js/
│   ├── app.js          → Logique principale (point d'entrée)
│   ├── weather.js      → Service OpenWeatherMap
│   ├── calculator.js   → Algorithme score 0-100
│   ├── ui.js           → Rendu DOM
│   ├── location.js     → Géolocalisation + cache
│   ├── dark-mode.js    → Toggle dark mode
│   ├── ads.js          → Google AdSense
│   └── share.js        → Web Share API
│
├── manifest.json → PWA manifest
├── sw.js         → Service Worker
├── robots.txt    → SEO
└── sitemap.xml   → Plan du site
```

## 🚀 Démarrage rapide

### 1. Obtenir une clé API OpenWeatherMap

1. Créer un compte sur [openweathermap.org](https://openweathermap.org/api)
2. S'abonner au plan gratuit (1 000 appels/jour)
3. Copier votre clé API

### 2. Configurer la clé API

Dans `js/weather.js`, remplacer :
```javascript
const WEATHER_API_KEY = 'VOTRE_CLE_API_ICI';
```

### 3. Déployer

DRYME est un site statique — déployez le dossier sur n'importe quel hébergeur :

- **Netlify** : glisser-déposer le dossier
- **Vercel** : `vercel --prod`
- **GitHub Pages** : push + activer Pages
- **Hébergement mutualisé** : FTP vers `public_html/`

> ⚠️ HTTPS obligatoire pour la géolocalisation et le Service Worker.

## 🧮 Algorithme de scoring

| Critère       | Points max | Description                        |
|---------------|------------|------------------------------------|
| Température   | 30 pts     | Idéal 15–25°C                      |
| Humidité      | 25 pts     | Décroissant (25 − humidité × 0.25) |
| Vent          | 25 pts     | Idéal 8–20 km/h                    |
| Ensoleillement| 20 pts     | Proportionnel au dégagement        |
| Pénalités     | −∞         | Pluie, grand froid, humidité ++    |

## 💰 Monétisation AdSense

Dans `js/ads.js`, configurer :
```javascript
const adConfig = {
  client: 'ca-pub-VOTRE_ID',
  enabled: true   // passer à true après approbation AdSense
};
```

**4 emplacements publicitaires :**
1. Bannière top (responsive : 320×50 / 728×90 / 970×90)
2. Rectangle middle entre les cartes (300×250)
3. Bannière bottom (responsive)
4. Sidebar sticky desktop (300×600)

## 🌐 Technologies

- **Zéro framework** — Vanilla JS ES2020+
- **PWA** — Service Worker + Web App Manifest
- **CSS** — Variables custom, Mobile First
- **APIs** — OpenWeatherMap Forecast + Air Pollution
- **Fonts** — Bricolage Grotesque + DM Sans (Google Fonts)

## 📊 APIs utilisées

| API | Endpoint | Quota gratuit |
|-----|----------|---------------|
| OWM Forecast | `/forecast?cnt=16` | 1000 req/jour |
| OWM Air Pollution | `/air_pollution` | 1000 req/jour |
| OWM Geo Reverse | `/geo/1.0/reverse` | 1000 req/jour |

## 📧 Contact

`maison.alerte.domotique@gmail.com`

---

© 2025 DRYME — Tous droits réservés
