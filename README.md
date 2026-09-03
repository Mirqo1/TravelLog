# TravelLog - Travel Logging & Visualization App

## 📋 Project Overview

**TravelLog** je mobilná aplikácia na logovanie navštívených miest po celom svete. Používatelia si zaznamenávajú mestá, dediny, hrady a iné zaujímavé body. Aplikácia zobrazuje interaktívnu mapu sveta s heat mapou krajín podľa počtu navštívených miest.

### Key Concept
Užívateľ klikne na miesto, ktoré navštívil → aplikácia zobrazí mapu sveta s farebným rozlíšením krajín (heat mapa) podľa počtu navštívených miest.

---

## 🎯 Business Model

### FREE Plan (s reklamami)
- ✅ Logovanie miest bez limitu
- ✅ Svetová mapa s heat mapou
- ✅ Zoznam miest (bez fotiek)
- ✅ Štatistiky
- ✅ Profil
- ❌ Bez fotiek
- ❌ Bez denníka
- ❌ Bez zdieľania
- ❌ Bez exportu
- 🟡 Reklamy: Banner na spodku + medzi položkami v zozname (bez extrému)

### PREMIUM Plan ($2.99/mesiac)
- ✅ Všetko z Free
- ✅ Fotografie k miestam (max 5-10 na miesto)
- ✅ Detailný denník (dlhšie poznámky)
- ✅ Zdieľanie s priateľmi (link/QR kód)
- ✅ Export mapy ako PDF
- ✅ Vlastné štítky/kategórie
- ❌ BEZ REKLÁM

---

## 🏗️ Architecture & Tech Stack

### Frontend
- **Framework:** React Native (Expo)
- **Maps:** React Native Maps / Leaflet
- **UI:** Native components + custom design

### Backend (Serverless)
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth (email + heslo + Google Sign-In)
- **Storage:** Firebase Storage (fotky, dáta)
- **Hosting:** Firebase Hosting

### External Services
- **Google AdMob:** Reklamy (Free verzia)
- **GeoNames API:** Databáza všetkých miest sveta

### No Custom Server Needed!
- Všetko je serverless na Firebase
- GitHub → Build Pipeline → App Store/Play Store

---

## 📱 User Interface - 5 Hlavných Obrazoviek

### Screen 1: Mapa & Pridať Miesto
- Interaktívna mapa sveta
- Tlačidlo "+" na pridanie nového miesta
- Search bar na vyhľadávanie miesta
- Bottom navigation (5 tabiček): Mapa, Zoznam, Heat Mapa, Štatistiky, Profil
- **Ako sa pridá miesto:** Klik na mapu alebo vyhľadaj podľa názvu

### Screen 2: Zoznam Miest
- Zoznam všetkých navštívených miest
- Informácie: Názov, Typ, Krajina, Dátum
- Filtrovanie (typ, krajina, dátum)
- Sorťovanie (dátum, názov, krajina)
- Akcie: Detail, Editovať (len svoju poznámku/dátum), Zmazať (len svoju návštevu)
- AdMob banner dole + medzi položkami (Free)

### Screen 3: Svetová Mapa (Heat Mapa)
- Interaktívna svetová mapa
- Heat mapa: Odtiene jednej farby (svetlá = málo, tmavá = veľa)
- Klik na krajinu → počet miest + zoznam
- Legenda so farbami
- Žiadne reklamy

### Screen 4: Štatistiky
- Celkový počet miest
- Počet krajín
- Rozdelenie podľa typu (graf)
- Posledne navštívené
- Krajina s max. počtom
- Trend mesačne (graf)

### Screen 5: Profil
- Meno, Email, Fotka profilu (neskôr)
- Verzia: Free / Premium
- Odhlásenie
- Odkaz na Premium

---

## 🔐 Autentifikácia

- Email + Heslo (registrácia + prihlásenie)
- Google Sign-In
- Firebase Authentication

---

## 📊 Konkurencia & Diferenciácia

### Existujúce Aplikácie
- **Been** (mŕtva od 2021) - len mestá, bez fotiek, bez sociálneho aspektu
- **Visited** (len krajiny) - príliš jednoduchá
- **Wanderlog** (zameraná na plány) - nie na logovanie spomienok
- **Google Maps** (tracking) - nie na komunitu

### Tvoja Výhoda
- ✅ Všetko na jednom mieste (mestá + hrady + pamiaky)
- ✅ Heat mapa podľa počtu miest
- ✅ Fotky + denník = emotívna väzba
- ✅ Moderný design (2024+)
- ✅ Sociálny aspekt (zdieľanie)
- ✅ Lacný freemium ($2.99 vs. $6+ konkurencia)
- ✅ Jednoduchý UX (nie chaotický)

---

## 📅 Development Timeline (MVP)

### ✅ Fáza 1 (HOTOVO!) - Základný Setup
**Status:** Completed - September 2, 2026

**Čo bolo urobené:**
- ✅ Expo React Native project bootstrap
- ✅ Project structure created (screens, components, services, context)
- ✅ Firebase integration:
  - `firebaseConfig.js` - Firebase initialization
  - `authService.js` - Email/Password + Google Sign-In
  - `placesService.js` - Firestore CRUD operations (add, edit, delete, list)
  - `firestore.rules` - Security rules (user scoped data)
- ✅ GeoNames API integration (`geonamesService.js`)
- ✅ Bottom Tab Navigation (5 screens):
  - Mapa
  - Zoznam
  - Heat Mapa
  - Štatistiky
  - Profil
- ✅ Authentication flow:
  - Email + Password registration/login
  - Google Sign-In
  - Sign-out
  - User persistence via AuthContext
- ✅ Placeholder screen implementations (functional shells)
- ✅ Environment configuration (.env.example)
- ✅ Data models (User, Place, PlaceType)
- ✅ Pull Request #1 created: "Bootstrap TravelLog Expo app with Firebase services, auth flow, and 5-screen tab shell"

**Pull Request:** https://github.com/Mirqo1/TravelLog/pull/1

**Next Steps for Fáza 1 (PC):**
1. Review PR #1
2. Approve or request changes
3. Merge to main
4. Clone repo locally
5. Setup Firebase project (https://firebase.google.com)
6. Setup GeoNames account (https://www.geonames.org)
7. Create `.env` file with credentials
8. Run `npm install && npm start`
9. Test in Expo Go app

---

### 📋 Fáza 2 (Týždeň 3): Zoznam Miest
- Screen 2: Zoznam miest
- Filtrovanie, sorťovanie
- Editovať, zmazať, detail

### 📋 Fáza 3 (Týždeň 4): Heat Mapa + Štatistiky
- Screen 3: Heat mapa
- Screen 4: Štatistiky

### 📋 Fáza 4 (Týždeň 5): Profil + Reklamy
- Screen 5: Profil
- Google AdMob
- Premium paywall

### 📋 Fáza 5 (Týždeň 6): Testing + Publikácia
- Testing
- Bug fixing
- Publikácia na App Store + Play Store

---

## 🧪 Testing Strategy

### Local Development
- Android Emulator
- iOS Simulator

### Physical Device Testing
- Expo Go app (quick testing)
- USB debugging

### Beta Testing (Pred publikáciou)
- Google Play Internal Testing
- TestFlight (iOS)

---

## 📦 Deployment

- **GitHub:** Code repository
- **Build Pipeline:** GitHub Actions / EAS Build
- **Google Play:** Nahraješ .aab
- **App Store:** Nahraješ .ipa

---

## 💰 Costs (MVP)

- Firebase: $0
- Google Play: $25 (jednorazovo)
- App Store: $99/rok
- GitHub: $0
- **Spolu: ~$125/rok**

---

## 🚀 Getting Started (PC Setup)

### Prerequisites
- Node.js 16+ installed
- npm or yarn
- GitHub account (máš)
- Google account (máš)

### Setup Steps

```bash
# 1. Clone repo
git clone https://github.com/Mirqo1/TravelLog.git
cd TravelLog

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# Edit .env with your Firebase and GeoNames credentials

# 4. Start development server
npm start

# 5. Scan QR code with Expo Go app