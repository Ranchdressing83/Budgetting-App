import { INVESTMENT_CATEGORIES } from '../constants/categories';
import {
  BUDGET_PERIOD_BIWEEKLY,
  calculateBudgetSpending,
  findBudget,
  formatBiweeklyPeriodLabel,
  getBiweeklyPeriodKey,
  getBiweeklyPeriodProgress,
  transactionMatchesBudgetPeriod,
} from './budgetUtils';
import { getMonthKey } from './insightsUtils';
import { calculatePeriodSummary } from './monthlySummaryUtils';

function calculateBudgetGrade(spending, overallBudgetAmount, periodProgress = null) {
  if (!overallBudgetAmount || overallBudgetAmount <= 0) return null;

  const budgetProgress = (spending / overallBudgetAmount) * 100;

  if (periodProgress != null) {
    const timeProgress = periodProgress * 100;
    const paceDelta = budgetProgress - timeProgress;

    if (paceDelta <= -25) return 'A';
    if (paceDelta <= 0) return 'B';
    if (paceDelta <= 10) return 'D';
    return 'F';
  }

  if (budgetProgress <= 75) return 'A';
  if (budgetProgress <= 90) return 'B';
  if (budgetProgress <= 100) return 'C';
  if (budgetProgress <= 110) return 'D';
  return 'F';
}

export function formatPaceLabel(paceDelta) {
  if (paceDelta == null) return null;

  const rounded = Math.round(Math.abs(paceDelta));
  if (rounded <= 2) return 'On pace';
  if (paceDelta < 0) return `${rounded}% under pace`;
  return `${rounded}% ahead of pace`;
}

export function calculateBiweeklyScorecard(transactions, budgets, date = new Date()) {
  const periodKey = getBiweeklyPeriodKey(date);

  const periodTransactions = transactions.filter((t) =>
    transactionMatchesBudgetPeriod(new Date(t.date), BUDGET_PERIOD_BIWEEKLY, periodKey)
  );

  const income = periodTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = periodTransactions.filter((t) => t.type === 'expense');
  const summary = calculatePeriodSummary(transactions, BUDGET_PERIOD_BIWEEKLY, periodKey);

  const savings = expenses
    .filter((t) => t.category === 'Savings')
    .reduce((sum, t) => sum + t.amount, 0);

  const investmentBreakdown = INVESTMENT_CATEGORIES.reduce((acc, category) => {
    acc[category] = expenses
      .filter((t) => t.category === category)
      .reduce((sum, t) => sum + t.amount, 0);
    return acc;
  }, {});

  const investments = Object.values(investmentBreakdown).reduce((sum, amount) => sum + amount, 0);
  const wealthContributions = savings + investments;
  const netCashFlow = income - summary.totalExpenses;

  const overallBudget =
    findBudget(budgets, 'Overall Spending', BUDGET_PERIOD_BIWEEKLY, periodKey) ||
    findBudget(budgets, 'Overall', BUDGET_PERIOD_BIWEEKLY, periodKey);

  const overallSpending = overallBudget
    ? calculateBudgetSpending(overallBudget, transactions, periodKey)
    : summary.lifestyleSpending;

  const availableSpendingRemaining = overallBudget
    ? overallBudget.amount - overallSpending
    : null;

  const periodProgress = getBiweeklyPeriodProgress(date);

  const budgetGrade = overallBudget
    ? calculateBudgetGrade(overallSpending, overallBudget.amount, periodProgress)
    : null;

  const paceDelta = overallBudget
    ? (overallSpending / overallBudget.amount) * 100 - periodProgress * 100
    : null;

  const periodLabel = formatBiweeklyPeriodLabel(periodKey);

  return {
    periodKey,
    periodLabel,
    monthLabel: periodLabel,
    income,
    fixedCosts: summary.fixedCosts,
    spending: summary.lifestyleSpending,
    savings,
    investments,
    investmentBreakdown,
    wealthContributions,
    netCashFlow,
    savingsRate: income > 0 ? (wealthContributions / income) * 100 : null,
    budgetGrade,
    paceDelta,
    overallBudgetAmount: overallBudget?.amount ?? null,
    overallSpending,
    availableSpendingRemaining,
  };
}

export function calculateMonthlyScorecard(transactions, budgets, date = new Date()) {
  const monthKey = getMonthKey(date);

  const monthTransactions = transactions.filter(
    (t) => getMonthKey(new Date(t.date)) === monthKey
  );

  const income = monthTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = monthTransactions.filter((t) => t.type === 'expense');

  const savings = expenses
    .filter((t) => t.category === 'Savings')
    .reduce((sum, t) => sum + t.amount, 0);

  const investmentBreakdown = INVESTMENT_CATEGORIES.reduce((acc, category) => {
    acc[category] = expenses
      .filter((t) => t.category === category)
      .reduce((sum, t) => sum + t.amount, 0);
    return acc;
  }, {});

  const investments = Object.values(investmentBreakdown).reduce((sum, amount) => sum + amount, 0);
  const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
  const spending = totalExpenses - savings - investments;
  const wealthContributions = savings + investments;
  const netCashFlow = income - totalExpenses;

  const overallBudget =
    findBudget(budgets, 'Overall Spending', 'month', monthKey) ||
    findBudget(budgets, 'Overall', 'month', monthKey);

  const overallSpending = overallBudget
    ? calculateBudgetSpending(overallBudget, transactions, monthKey)
    : spending;

  const availableSpendingRemaining = overallBudget
    ? overallBudget.amount - overallSpending
    : null;

  const budgetGrade = overallBudget
    ? calculateBudgetGrade(overallSpending, overallBudget.amount)
    : null;

  return {
    monthKey,
    monthLabel: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    income,
    spending,
    savings,
    investments,
    investmentBreakdown,
    wealthContributions,
    netCashFlow,
    savingsRate: income > 0 ? (wealthContributions / income) * 100 : null,
    budgetGrade,
    overallBudgetAmount: overallBudget?.amount ?? null,
    overallSpending,
    availableSpendingRemaining,
  };
}

export function formatCurrency(amount) {
  const prefix = amount >= 0 ? '$' : '-$';
  return `${prefix}${Math.abs(amount).toFixed(2)}`;
}

export function formatSignedCurrency(amount) {
  const prefix = amount >= 0 ? '+$' : '-$';
  return `${prefix}${Math.abs(amount).toFixed(2)}`;
}
