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

### Fáza 1 (Týždeň 1-2): Základný Setup
- React Native + Expo setup
- Firebase projekt
- Screen 1: Mapa + pridať miesto
- GeoNames API integrácia

### Fáza 2 (Týždeň 3): Zoznam Miest
- Screen 2: Zoznam miest
- Filtrovanie, sorťovanie
- Editovať, zmazať, detail

### Fáza 3 (Týždeň 4): Heat Mapa + Štatistiky
- Screen 3: Heat mapa
- Screen 4: Štatistiky

### Fáza 4 (Týždeň 5): Profil + Reklamy
- Screen 5: Profil
- Google AdMob
- Premium paywall

### Fáza 5 (Týždeň 6): Testing + Publikácia
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

## 🚀 Getting Started

```bash
npm install -g expo-cli
git clone https://github.com/Mirqo1/TravelLog.git
cd TravelLog
npm install
npm start
```

Potom naskenuj QR kód s Expo Go app.

---

## 📚 Resources

- React Native: https://reactnative.dev
- Expo: https://docs.expo.dev
- Firebase: https://firebase.google.com/docs
- GeoNames API: https://www.geonames.org/export/web-services.html

---

## 📞 Development Notes for Copilot/Agent

**IMPORTANT - Key Reminders:**

### FREE Features
- ✅ Logovanie miest
- ✅ Heat mapa na svetovej mape
- ✅ Zoznam miest
- ✅ Štatistiky
- ✅ Profil + Odhlásenie
- ✅ Autentifikácia (email + Google)
- ✅ Reklamy (banner dole + medzi položkami)
- ❌ ŽIADNE fotky

### PREMIUM Features
- ✅ Všetko z FREE
- ✅ Fotografie k miestam
- ✅ Detailný denník
- ✅ Zdieľanie s priateľmi
- ✅ Export mapy
- ✅ Vlastné štítky
- ❌ BEZ REKLÁM

### Critical Implementation Details
- ❌ **Editovať = len svoju poznámku + dátum** (NE samotnú definíciu miesta!)
- ❌ **Zmazať = len svoju návštevu** (NE miesto z databázy!)
- ✅ **Heat mapa = interaktívna** (klik na krajinu = detaily)
- ✅ **Žiadny custom server** - Firebase all the way
- ✅ **Reklamy iba v FREE verzii**
- ✅ **GeoNames API** pre databázu miest

### UI/UX Guidelines
- Bottom navigation s 5 tabikami
- Clean, modern design
- Reklamy nie extrémne (1-2 na obrazovku)
- Heat mapa s legendou

---

## 👤 Creator Info

**User:** Mirqo1
**Start Date:** September 2, 2026
**Available Time:** ~10 hours/week
**Status:** 🟡 In Planning Phase → Ready for Development

---

**License:** MIT
**GitHub:** https://github.com/Mirqo1/TravelLog