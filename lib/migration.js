import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  transactions: '@budgeting_app_transactions',
  budgets: '@budgeting_app_budgets',
  subscriptions: '@budgeting_app_subscriptions',
  incomeSchedules: '@budgeting_app_income_schedules',
};

const BUDGET_META_KEYS = {
  defaultsSeeded: '@budgeting_app_defaults_seeded',
  collegeBudgetsRemoved: '@budgeting_app_college_budgets_removed',
};

async function readJson(key) {
  const stored = await AsyncStorage.getItem(key);
  if (!stored) {
    return null;
  }
  return JSON.parse(stored);
}

export async function migrateCollection(collectionName) {
  const storageKey = STORAGE_KEYS[collectionName];
  if (!storageKey) {
    return null;
  }

  const items = await readJson(storageKey);
  if (!items || !Array.isArray(items) || items.length === 0) {
    if (collectionName !== 'budgets') {
      return null;
    }
  }

  const result = {
    items: items || [],
    meta: {},
  };

  if (collectionName === 'budgets') {
    const defaultsSeeded = await AsyncStorage.getItem(BUDGET_META_KEYS.defaultsSeeded);
    const collegeBudgetsRemoved = await AsyncStorage.getItem(
      BUDGET_META_KEYS.collegeBudgetsRemoved
    );

    result.meta = {
      defaultsSeeded: defaultsSeeded === 'true',
      collegeBudgetsRemoved: collegeBudgetsRemoved === 'true',
    };
  }

  await clearLocalCollection(collectionName);
  return result;
}

export async function clearLocalCollection(collectionName) {
  const storageKey = STORAGE_KEYS[collectionName];
  if (storageKey) {
    await AsyncStorage.removeItem(storageKey);
  }

  if (collectionName === 'budgets') {
    await AsyncStorage.multiRemove(Object.values(BUDGET_META_KEYS));
  }
}
