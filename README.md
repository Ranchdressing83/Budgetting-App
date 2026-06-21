# Personal Budgeting App

Personal budgeting application built with React Native and Expo. Track expenses, income, budgets, fixed costs, and wealth-building contributions with sync across your phone and laptop via Firebase.

## Features

- **Expense & income tracking** with categories
- **Budget management** for weekly, biweekly, monthly, and yearly periods
- **Fixed costs / subscriptions** with due-date tracking
- **Income schedules** for recurring paychecks
- **Wealth tracking** via Savings and Investment expense categories
- **Analytics & graphs** with pie charts and trend views
- **Search** transactions by category or description
- **Private cloud sync** across Expo mobile and Expo Web using Firebase Auth + Firestore

## Tech Stack

- React Native + Expo (~54)
- Expo Router
- Firebase Auth (email/password, single-user)
- Cloud Firestore (private per-user data)
- React Context API
- React Native Gifted Charts

## Firebase Setup (one time)

1. Create a [Firebase project](https://console.firebase.google.com/).
2. Enable **Authentication → Sign-in method → Email/Password**.
3. Create a **Firestore** database (production mode is fine).
4. Register a **Web app** in Project settings and copy the config values.
5. Deploy security rules so only you can access your data:

```bash
npm install -g firebase-tools
firebase login
firebase use --add   # select your project
firebase deploy --only firestore:rules
```

The rules in `firestore.rules` restrict each user's data to their own `users/{uid}` path.

6. Copy env template and fill in your Firebase web app config:

```bash
cp .env.example .env
```

7. Restart Expo after changing `.env`.

### First sign-in

On first launch, sign in with your email and password. Use **Create account** once to register your personal account. After that, sign in on each device with the same credentials.

If you previously used the local-only version, existing AsyncStorage data is uploaded to Firestore automatically on first login, then removed from the device.

## Getting Started (local development)

### Prerequisites

- Node.js 18+
- npm
- iOS Simulator, Android emulator, or Expo Go on your phone

### Installation

```bash
git clone https://github.com/Ranchdressing83/Budgetting-app.git
cd Budgetting-app
npm install
cp .env.example .env   # then edit with your Firebase config
```

### Run locally

```bash
npm start
```

Then:

- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan the QR code with Expo Go on your phone
- Press `w` for web browser

Or use:

```bash
npm run ios
npm run android
npm run web
```

## Deploy web (Expo static export + Firebase Hosting)

Build the static web app:

```bash
npx expo export --platform web
```

Deploy to Firebase Hosting:

```bash
firebase deploy --only hosting
```

Your app will be available at `https://<your-project-id>.web.app`.

## Build / install on phone

### Development (Expo Go)

1. Run `npm start`
2. Scan the QR code with Expo Go (iOS Camera or Android Expo Go app)
3. Sign in with your Firebase account

### Production builds (optional)

For a standalone app outside Expo Go, use [EAS Build](https://docs.expo.dev/build/introduction/):

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios
eas build --platform android
```

Ensure your `.env` values are available at build time (EAS secrets or `eas.json` env config).

## Data Storage

Firestore is the source of truth. Data is stored under:

```
users/{your-uid}/
  transactions/data
  budgets/data
  subscriptions/data
  incomeSchedules/data
```

Each document contains an `items` array (and `meta` for budgets). Real-time listeners keep phone and laptop in sync.

AsyncStorage is only used for Firebase Auth session persistence on mobile.

## Project Structure

```
budgeting-app/
├── app/
│   ├── (tabs)/          # Main screens (home, transactions, graphs, search)
│   └── _layout.tsx      # Auth gate + providers
├── components/
│   ├── AuthContext.jsx
│   ├── LoginScreen.jsx
│   ├── BudgetContext.jsx
│   ├── TransactionsContext.jsx
│   ├── SubscriptionsContext.jsx
│   └── IncomeScheduleContext.jsx
├── config/firebase.js
├── hooks/useFirestoreSync.js
├── lib/migration.js
├── firestore.rules
└── firebase.json
```

## Available Scripts

- `npm start` — Expo dev server
- `npm run ios` — iOS simulator
- `npm run android` — Android emulator
- `npm run web` — Web browser
- `npm run lint` — ESLint

## License

Private project — All rights reserved

## Author

Peter Ranchero
