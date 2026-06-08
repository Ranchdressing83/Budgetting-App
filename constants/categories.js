// Expense categories - shared across the app
export const CATEGORIES = [
  'Eating Out',
  'Groceries',
  'Alcohol',
  'Transit',
  'Misc.',
  'Uber',
  'Gambling',
  'Car',
  'Home Essentials',
  'Clothing',
  'Events',
  'Travel',
  'Rent',
  'Utilities',
  'Savings',
  'Investments - Brokerage',
  'Investments - Company Stock',
];

export const INVESTMENT_CATEGORIES = [
  'Investments - Brokerage',
  'Investments - Company Stock',
];

export const WEALTH_BUILDING_CATEGORIES = [
  'Savings',
  ...INVESTMENT_CATEGORIES,
];

export const SOCIAL_CATEGORIES = ['Alcohol', 'Uber', 'Events'];

export const DEFAULT_OVERALL_CATEGORIES = [
  'Eating Out',
  'Alcohol',
  'Uber',
  'Events',
  'Clothing',
  'Home Essentials',
  'Misc.',
  'Groceries',
];

export const LIFESTYLE_GROUP_CATEGORIES = [
  'Eating Out',
  'Alcohol',
  'Uber',
  'Events',
  'Clothing',
  'Gambling',
  'Misc.',
  'Travel',
];

export const ESSENTIALS_GROUP_CATEGORIES = [
  'Groceries',
  'Transit',
  'Home Essentials',
  'Utilities',
  'Rent',
];

export const WEALTH_GROUP_CATEGORIES = [...WEALTH_BUILDING_CATEGORIES];

// Migrate legacy category names from older app versions
export const LEGACY_CATEGORY_MAP = {
  'Investments - Index Funds': 'Investments - Brokerage',
};

export function normalizeCategory(category) {
  return LEGACY_CATEGORY_MAP[category] || category;
}

export const CATEGORY_GROUPS = [
  { name: 'Lifestyle', categories: LIFESTYLE_GROUP_CATEGORIES },
  { name: 'Essentials', categories: ESSENTIALS_GROUP_CATEGORIES },
  { name: 'Wealth', categories: WEALTH_GROUP_CATEGORIES },
];

export const GROUP_COLORS = {
  Lifestyle: '#fc0808',
  Essentials: '#8B9BA8',
  Wealth: '#1B4332',
  Other: '#8B9BA8',
};

export function getCategoryGroup(category) {
  const normalized = normalizeCategory(category);
  for (const group of CATEGORY_GROUPS) {
    if (group.categories.includes(normalized)) return group.name;
  }
  return 'Other';
}

// Lifestyle/discretionary categories excluded from Overall Spending budget
export const OVERALL_BUDGET_EXCLUDED_CATEGORIES = [
  'Rent',
  ...WEALTH_BUILDING_CATEGORIES,
  'Travel',
];

export function countsTowardOverallBudget(category) {
  return !OVERALL_BUDGET_EXCLUDED_CATEGORIES.includes(category);
}

export function isWealthBuildingCategory(category) {
  return WEALTH_BUILDING_CATEGORIES.includes(category);
}

// Category colors - shared across the app
// Using forest green, sea blue, and purple accents with complementary colors
export const CATEGORY_COLORS = {
  'Eating Out': '#fc0808',       // Red
  'Groceries': '#2D5016',        // Forest green
  'Alcohol': '#4A90A4',          // Sea blue
  'Uber': '#FFC107',             // Yellow
  'Transit': '#90EE90',          // Light green
  'Gambling': '#FF9800',         // Orange
  'Car': '#5B9BD5',              // Light sea blue
  'Home Essentials': '#eb34d8',  // Pink
  'Clothing': '#0ee6d4',         // Teal
  'Events': '#c934eb',           // Purple
  'Travel': '#0839fc',           // Ocean Blue
  'Rent': '#4A5568',             // Dark gray
  'Utilities': '#4A5568',        // Dark gray (same as Rent)
  'Savings': '#FFFFFF',          // White
  'Investments - Brokerage': '#1B4332',   // Deep green
  'Investments - Company Stock': '#40916C', // Medium green
  'Misc.': '#8B9BA8',            // Gray
};
