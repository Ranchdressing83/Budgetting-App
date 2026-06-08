import {
  countsTowardOverallBudget,
  getCategoryGroup,
  INVESTMENT_CATEGORIES,
  WEALTH_BUILDING_CATEGORIES,
} from '../constants/categories';
import { getBiweeklyPeriodKey } from './budgetUtils';
import { getMonthKey } from './insightsUtils';

export { WEALTH_BUILDING_CATEGORIES };

export function isWealthBuildingCategory(category) {
  return WEALTH_BUILDING_CATEGORIES.includes(category);
}

export function isFixedCostExpense(transaction) {
  if (transaction.type !== 'expense') return false;
  return Boolean(transaction.subscriptionId) || transaction.category === 'Rent';
}

function filterTransactionsForPeriod(transactions, period, periodKey) {
  return transactions.filter((t) => {
    const date = new Date(t.date);

    if (period === 'week') {
      const [yearStr, weekStr] = periodKey.split('-W');
      const year = parseInt(yearStr);
      const weekNumber = parseInt(weekStr);
      const jan1 = new Date(year, 0, 1);
      const jan1Day = jan1.getDay();
      const jan1MondayBased = (jan1Day + 6) % 7;
      const daysToFirstMonday = jan1MondayBased === 0 ? 0 : 7 - jan1MondayBased;
      const firstMonday = new Date(year, 0, 1 + daysToFirstMonday);
      firstMonday.setHours(0, 0, 0, 0);
      const weekStart = new Date(firstMonday);
      weekStart.setDate(weekStart.getDate() + (weekNumber - 1) * 7);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      return date >= weekStart && date <= weekEnd;
    }

    if (period === 'month') {
      return getMonthKey(date) === periodKey;
    }

    if (period === 'biweekly') {
      return getBiweeklyPeriodKey(date) === periodKey;
    }

    return date.getFullYear().toString() === periodKey;
  });
}

function classifyExpense(expense) {
  if (isWealthBuildingCategory(expense.category)) return 'wealth';
  if (isFixedCostExpense(expense)) return 'fixed';
  if (countsTowardOverallBudget(expense.category)) return 'lifestyle';
  return 'other';
}

export function calculateGroupPeriodSummary(transactions, period, periodKey) {
  const periodTransactions = filterTransactionsForPeriod(transactions, period, periodKey);
  const income = periodTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = periodTransactions.filter((t) => t.type === 'expense');
  let lifestyle = 0;
  let essentials = 0;
  let wealth = 0;
  let otherSpending = 0;

  expenses.forEach((expense) => {
    const group = getCategoryGroup(expense.category);
    if (group === 'Lifestyle') lifestyle += expense.amount;
    else if (group === 'Essentials') essentials += expense.amount;
    else if (group === 'Wealth') wealth += expense.amount;
    else otherSpending += expense.amount;
  });

  const totalExpenses = lifestyle + essentials + wealth + otherSpending;
  const remainingCash = income - totalExpenses;

  return {
    income,
    lifestyle,
    essentials,
    wealth,
    otherSpending,
    remainingCash,
    totalExpenses,
  };
}

export function calculatePeriodSummary(transactions, period, periodKey) {
  const periodTransactions = filterTransactionsForPeriod(transactions, period, periodKey);
  const income = periodTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = periodTransactions.filter((t) => t.type === 'expense');
  let fixedCosts = 0;
  let lifestyleSpending = 0;
  let wealthBuilding = 0;
  let otherSpending = 0;

  expenses.forEach((expense) => {
    const bucket = classifyExpense(expense);
    if (bucket === 'wealth') wealthBuilding += expense.amount;
    else if (bucket === 'fixed') fixedCosts += expense.amount;
    else if (bucket === 'lifestyle') lifestyleSpending += expense.amount;
    else otherSpending += expense.amount;
  });

  const totalExpenses = fixedCosts + lifestyleSpending + wealthBuilding + otherSpending;
  const remainingCash = income - totalExpenses;

  return {
    income,
    fixedCosts,
    lifestyleSpending,
    wealthBuilding,
    otherSpending,
    remainingCash,
    totalExpenses,
  };
}

export function calculateWealthBuildingBreakdown(transactions, period, periodKey) {
  const periodTransactions = filterTransactionsForPeriod(transactions, period, periodKey);
  const expenses = periodTransactions.filter((t) => t.type === 'expense');

  const breakdown = WEALTH_BUILDING_CATEGORIES.reduce((acc, category) => {
    acc[category] = expenses
      .filter((t) => t.category === category)
      .reduce((sum, t) => sum + t.amount, 0);
    return acc;
  }, {});

  const total = Object.values(breakdown).reduce((sum, amount) => sum + amount, 0);

  return { breakdown, total };
}
