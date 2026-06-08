import {
  CATEGORIES,
  countsTowardOverallBudget,
  DEFAULT_OVERALL_CATEGORIES,
  normalizeCategory,
  SOCIAL_CATEGORIES,
} from '../constants/categories';

export { DEFAULT_OVERALL_CATEGORIES, SOCIAL_CATEGORIES };

export const BUDGET_TYPE_OVERALL = 'overall';
export const BUDGET_TYPE_CATEGORY = 'category';
export const BUDGET_TYPE_GROUP = 'group';
export const BUDGET_PERIOD_BIWEEKLY = 'biweekly';

export const BUDGET_PERIOD_OPTIONS = [
  { key: 'week', label: 'Week' },
  { key: BUDGET_PERIOD_BIWEEKLY, label: 'Bi-Weekly' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

export const DEFAULT_BUDGET_TEMPLATES = [
  {
    name: 'Overall Spending',
    budgetType: BUDGET_TYPE_OVERALL,
    categories: DEFAULT_OVERALL_CATEGORIES,
  },
  {
    name: 'Social Life',
    budgetType: BUDGET_TYPE_GROUP,
    categories: SOCIAL_CATEGORIES,
  },
  {
    name: 'Eating Out',
    budgetType: BUDGET_TYPE_CATEGORY,
    categories: ['Eating Out'],
  },
];

export function getBudgetType(budget) {
  if (budget.budgetType) return budget.budgetType;
  if (budget.category === 'Overall') return BUDGET_TYPE_OVERALL;
  return BUDGET_TYPE_CATEGORY;
}

export function getBudgetName(budget) {
  if (budget.name) return budget.name;
  if (budget.category === 'Overall') return 'Overall Spending';
  return budget.category || 'Budget';
}

export function getBudgetCategories(budget) {
  if (budget.categories && budget.categories.length > 0) {
    return budget.categories;
  }
  if (getBudgetType(budget) === BUDGET_TYPE_OVERALL) {
    return DEFAULT_OVERALL_CATEGORIES;
  }
  if (budget.category && budget.category !== 'Overall') {
    return [budget.category];
  }
  return [];
}

export function budgetMatchesIdentifier(budget, identifier) {
  const name = getBudgetName(budget);
  if (name === identifier) return true;
  if (budget.category === identifier) return true;
  if (identifier === 'Overall' && getBudgetType(budget) === BUDGET_TYPE_OVERALL) return true;
  if (identifier === 'Overall Spending' && getBudgetType(budget) === BUDGET_TYPE_OVERALL) return true;
  return false;
}

export function categoryInBudget(budget, category) {
  const categories = getBudgetCategories(budget);
  if (categories.length > 0) {
    return categories.includes(category);
  }
  if (getBudgetType(budget) === BUDGET_TYPE_OVERALL) {
    return countsTowardOverallBudget(category);
  }
  return budget.category === category;
}

export function migrateBudget(budget) {
  const budgetType = getBudgetType(budget);
  const name = getBudgetName(budget);
  const categories = getBudgetCategories(budget).map(normalizeCategory);

  return {
    ...budget,
    name,
    budgetType,
    categories,
    category: budget.category ? normalizeCategory(budget.category) : budget.category,
  };
}

export function migrateBudgets(budgets) {
  return budgets.map(migrateBudget);
}

/** Remove the old college-era weekly $150 overall budget. */
export function stripLegacyCollegeBudgets(budgets) {
  return budgets.filter((budget) => {
    if (budget.id === '1763500587887') return false;

    const isLegacyOverall =
      budget.category === 'Overall' || getBudgetType(budget) === BUDGET_TYPE_OVERALL;

    return !(isLegacyOverall && budget.period === 'week' && budget.amount === 150 && budget.isRecurring);
  });
}

export function createDefaultBudgets() {
  const now = Date.now();
  return DEFAULT_BUDGET_TEMPLATES.map((template, index) => ({
    id: (now + index).toString(),
    name: template.name,
    budgetType: template.budgetType,
    categories: [...template.categories],
    amount: 0,
    period: 'month',
    periodKey: 'recurring',
    isRecurring: true,
  }));
}

function getWeekKey(date) {
  const year = date.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const jan1Day = jan1.getDay();
  const jan1MondayBased = (jan1Day + 6) % 7;
  const daysToFirstMonday = jan1MondayBased === 0 ? 0 : 7 - jan1MondayBased;
  const firstMonday = new Date(year, 0, 1 + daysToFirstMonday);
  firstMonday.setHours(0, 0, 0, 0);
  const daysSinceFirstMonday = Math.floor((date - firstMonday) / (1000 * 60 * 60 * 24));

  if (daysSinceFirstMonday < 0) {
    const prevYear = year - 1;
    const prevJan1 = new Date(prevYear, 0, 1);
    const prevJan1Day = prevJan1.getDay();
    const prevJan1MondayBased = (prevJan1Day + 6) % 7;
    const prevDaysToFirstMonday = prevJan1MondayBased === 0 ? 0 : 7 - prevJan1MondayBased;
    const prevFirstMonday = new Date(prevYear, 0, 1 + prevDaysToFirstMonday);
    prevFirstMonday.setHours(0, 0, 0, 0);
    const prevDaysSinceFirstMonday = Math.floor((date - prevFirstMonday) / (1000 * 60 * 60 * 24));
    const prevWeekNumber = Math.floor(prevDaysSinceFirstMonday / 7) + 1;
    return `${prevYear}-W${prevWeekNumber.toString().padStart(2, '0')}`;
  }

  const weekNumber = Math.floor(daysSinceFirstMonday / 7) + 1;
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
}

function getYearKey(date) {
  return date.getFullYear().toString();
}

/** Bi-weekly pay periods: 1st–15th (H1) and 16th–end of month (H2). */
export function getBiweeklyPeriodKey(date) {
  const monthKey = getMonthKey(date);
  const half = date.getDate() <= 15 ? 'H1' : 'H2';
  return `${monthKey}-${half}`;
}

export function parseBiweeklyPeriodKey(periodKey) {
  const match = periodKey.match(/^(\d{4})-(\d{2})-(H1|H2)$/);
  if (!match) return null;

  const year = parseInt(match[1]);
  const month = parseInt(match[2]) - 1;
  const half = match[3];

  return {
    year,
    month,
    half,
    startDate: new Date(year, month, half === 'H1' ? 1 : 16),
  };
}

/** Returns 0–1 for how far through the current bi-weekly half you are. */
export function getBiweeklyPeriodProgress(date = new Date()) {
  const day = date.getDate();

  if (day <= 15) {
    return day / 15;
  }

  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const daysInHalf = lastDay - 15;
  return (day - 15) / daysInHalf;
}

export function formatBiweeklyPeriodLabel(periodKey) {
  const parsed = parseBiweeklyPeriodKey(periodKey);
  if (!parsed) return periodKey;

  const monthLabel = new Date(parsed.year, parsed.month).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  if (parsed.half === 'H1') {
    return `${monthLabel}: 1st – 15th`;
  }

  const lastDay = new Date(parsed.year, parsed.month + 1, 0).getDate();
  return `${monthLabel}: 16th – ${lastDay}${getDaySuffix(lastDay)}`;
}

export function getPreviousBiweeklyPeriodKey(periodKey) {
  const parsed = parseBiweeklyPeriodKey(periodKey);
  if (!parsed) return periodKey;

  if (parsed.half === 'H1') {
    const prevMonth = new Date(parsed.year, parsed.month - 1, 1);
    return `${getMonthKey(prevMonth)}-H2`;
  }

  return `${getMonthKey(new Date(parsed.year, parsed.month, 1))}-H1`;
}

export function getNextBiweeklyPeriodKey(periodKey) {
  const parsed = parseBiweeklyPeriodKey(periodKey);
  if (!parsed) return periodKey;

  if (parsed.half === 'H2') {
    const nextMonth = new Date(parsed.year, parsed.month + 1, 1);
    return `${getMonthKey(nextMonth)}-H1`;
  }

  return `${getMonthKey(new Date(parsed.year, parsed.month, 1))}-H2`;
}

function getDaySuffix(day) {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

export function transactionMatchesBudgetPeriod(date, period, periodKey) {
  if (period === 'week') {
    return getWeekKey(date) === periodKey;
  }
  if (period === BUDGET_PERIOD_BIWEEKLY) {
    return getBiweeklyPeriodKey(date) === periodKey;
  }
  if (period === 'month') {
    return getMonthKey(date) === periodKey;
  }
  return getYearKey(date) === periodKey;
}

export function formatBudgetPeriod(budget) {
  if (budget.isRecurring) {
    if (budget.period === BUDGET_PERIOD_BIWEEKLY) {
      return 'Recurring Bi-Weekly (1st–15th & 16th–end)';
    }
    const periodLabel = BUDGET_PERIOD_OPTIONS.find((option) => option.key === budget.period)?.label;
    return `Recurring ${periodLabel || budget.period}`;
  }

  if (budget.period === 'week') {
    const [yearStr, weekStr] = budget.periodKey.split('-W');
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
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const startFormatted = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endFormatted = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `Week: ${startFormatted} - ${endFormatted}`;
  }

  if (budget.period === BUDGET_PERIOD_BIWEEKLY) {
    return formatBiweeklyPeriodLabel(budget.periodKey);
  }

  if (budget.period === 'month') {
    const [year, month] = budget.periodKey.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return `Month: ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  }

  return `Year: ${budget.periodKey}`;
}

export function getPeriodKeyForDate(period, date) {
  if (period === 'week') return getWeekKey(date);
  if (period === BUDGET_PERIOD_BIWEEKLY) return getBiweeklyPeriodKey(date);
  if (period === 'month') return getMonthKey(date);
  return getYearKey(date);
}

export function calculateBudgetSpending(budget, transactions, periodKeyOverride) {
  const periodKey =
    periodKeyOverride ||
    (budget.isRecurring
      ? getPeriodKeyForDate(budget.period, new Date())
      : budget.periodKey);

  const categories = getBudgetCategories(budget);
  const budgetType = getBudgetType(budget);

  const periodTransactions = transactions.filter((t) => {
    if (t.type !== 'expense') return false;
    const date = new Date(t.date);
    return transactionMatchesBudgetPeriod(date, budget.period, periodKey);
  }).filter((t) => {
    if (budgetType === BUDGET_TYPE_OVERALL) {
      return countsTowardOverallBudget(t.category);
    }

    if (categories.length > 0) {
      return categories.includes(t.category);
    }

    return t.category === budget.category;
  });

  return periodTransactions.reduce((sum, t) => sum + t.amount, 0);
}

export function findBudget(budgets, identifier, period, periodKey) {
  const exactMatch = budgets.find(
    (b) =>
      budgetMatchesIdentifier(b, identifier) &&
      b.period === period &&
      b.periodKey === periodKey
  );
  if (exactMatch) return migrateBudget(exactMatch);

  const recurringBudget = budgets.find(
    (b) =>
      budgetMatchesIdentifier(b, identifier) &&
      b.period === period &&
      b.isRecurring === true
  );
  return recurringBudget ? migrateBudget(recurringBudget) : null;
}

export function getBudgetsForCategory(budgets, category, period, periodKey) {
  return budgets
    .filter((b) => {
      if (b.period !== period) return false;
      if (b.isRecurring) {
        return categoryInBudget(b, category);
      }
      return b.periodKey === periodKey && categoryInBudget(b, category);
    })
    .map(migrateBudget);
}

export function getBudgetsForPeriodResolved(budgets, period, periodKey) {
  const periodBudgets = budgets.filter(
    (b) => b.period === period && b.periodKey === periodKey && !b.isRecurring
  );

  const recurringBudgets = budgets.filter(
    (b) => b.period === period && b.isRecurring === true
  );

  const combined = periodBudgets.map(migrateBudget);
  recurringBudgets.forEach((recurring) => {
    const name = getBudgetName(recurring);
    const exists = combined.some((b) => getBudgetName(b) === name);
    if (!exists) {
      combined.push(migrateBudget({ ...recurring, periodKey }));
    }
  });

  return combined;
}

export function calculateBudgetHealth(overallBudget, spending, date = new Date()) {
  if (!overallBudget || overallBudget.amount <= 0) {
    return null;
  }

  const remaining = overallBudget.amount - spending;
  let remainingDays;

  if (overallBudget.period === BUDGET_PERIOD_BIWEEKLY) {
    const day = date.getDate();
    if (day <= 15) {
      remainingDays = 15 - day + 1;
    } else {
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      remainingDays = endOfMonth.getDate() - day + 1;
    }
  } else {
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    remainingDays = Math.max(1, endOfMonth.getDate() - date.getDate() + 1);
  }

  const safeDailySpend = remaining / Math.max(1, remainingDays);

  return {
    budgetName: getBudgetName(overallBudget),
    spent: spending,
    budgetAmount: overallBudget.amount,
    remaining,
    remainingDays,
    safeDailySpend,
    percentage: (spending / overallBudget.amount) * 100,
  };
}

export function getSelectableBudgetCategories() {
  return CATEGORIES.filter(
    (cat) => cat !== 'Rent' && cat !== 'Savings' && !cat.startsWith('Investments')
  );
}
