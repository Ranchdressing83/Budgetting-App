# Personal Budgeting App

A beautiful, personal budgeting application built with React Native and Expo. Track your expenses, manage budgets, and visualize your spending patterns with an intuitive interface featuring a forest green color scheme with sea blue and purple accents.

## Features

- **Expense Tracking**: Add, edit, and delete expenses with categories
- **Income Tracking**: Record and manage your income sources
- **Budget Management**: Set weekly, monthly, or yearly budgets by category
- **Analytics & Graphs**: Visualize your spending with pie charts and trend analysis
- **Search Functionality**: Quickly find transactions by category or description
- **Category Management**: Organize expenses into predefined categories
- **Period Views**: View your finances by week, month, or year
- **Budget Alerts**: Track your spending against budgets with visual indicators

## Tech Stack

- **React Native** - Mobile app framework
- **Expo** - Development platform and tooling
- **Expo Router** - File-based routing
- **React Native Gifted Charts** - Data visualization
- **AsyncStorage** - Local data persistence
- **React Context API** - State management

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Expo CLI (optional, but recommended)
- iOS Simulator (for Mac) or Android Emulator, or Expo Go app on your phone

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Ranchdressing83/Budgetting-app.git
cd Budgetting-app
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Run on your preferred platform:
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan the QR code with Expo Go app on your phone

## Available Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Run on Android emulator
- `npm run ios` - Run on iOS simulator
- `npm run web` - Run in web browser
- `npm run lint` - Run ESLint

## Project Structure

```
budgeting-app/
├── app/
│   ├── (tabs)/
│   │   ├── index.jsx      # Main expense/income tracking screen
│   │   ├── graphs.jsx     # Analytics and visualization
│   │   └── search.jsx     # Transaction search
│   └── _layout.tsx        # Root layout
├── components/
│   ├── BudgetContext.jsx      # Budget state management
│   └── TransactionsContext.jsx # Transaction state management
├── constants/
│   ├── colors.js          # Color palette definitions
│   └── categories.js      # Expense categories and colors
└── assets/                # Images and static assets
```

## Color Scheme

The app features a personal, nature-inspired color palette:
- **Forest Green** (`#2D5016`) - Primary color
- **Sea Blue** (`#4A90A4`) - Accent color
- **Purple** (`#7B68EE`) - Secondary accent

## Data Storage

All data is stored locally on your device using AsyncStorage. No data is sent to external servers, ensuring your financial information remains private.

## Categories

The app includes predefined categories:
- Eating Out
- Groceries
- Alcohol
- Uber
- Gambling
- Car
- Home Essentials
- Clothing
- Events
- Travel
- Rent
- Misc.

## Contributing

This is a personal project, but suggestions and feedback are welcome!

## License

Private project - All rights reserved

## Author

Peter Ranchero

---

Built with ❤️ using React Native and Expo
