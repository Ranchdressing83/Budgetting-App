import { INVESTMENT_CATEGORIES, SOCIAL_CATEGORIES } from '../constants/categories';
import {
  calculateBudgetSpending,
  getBiweeklyPeriodKey,
  getBudgetName,
} from './budgetUtils';

// Helper functions for generating insights from transactions and budgets

const DAY_MS = 24 * 60 * 60 * 1000;

function getMondayUtcOfWeek(year, week) {
  const jan1Day = new Date(Date.UTC(year, 0, 1)).getUTCDay();
  const jan1MondayBased = (jan1Day + 6) % 7;
  const daysToFirstMonday = jan1MondayBased === 0 ? 0 : 7 - jan1MondayBased;
  return Date.UTC(year, 0, 1 + daysToFirstMonday + (week - 1) * 7);
}

function getWeekKeyFromParts(year, month, day) {
  const utcDate = Date.UTC(year, month, day);

  const jan1Day = new Date(Date.UTC(year, 0, 1)).getUTCDay();
  const jan1MondayBased = (jan1Day + 6) % 7;
  const daysToFirstMonday = jan1MondayBased === 0 ? 0 : 7 - jan1MondayBased;
  const firstMondayUtc = Date.UTC(year, 0, 1 + daysToFirstMonday);
  const daysSinceFirstMonday = Math.floor((utcDate - firstMondayUtc) / DAY_MS);

  if (daysSinceFirstMonday < 0) {
    const prevYear = year - 1;
    const prevJan1Day = new Date(Date.UTC(prevYear, 0, 1)).getUTCDay();
    const prevJan1MondayBased = (prevJan1Day + 6) % 7;
    const prevDaysToFirstMonday = prevJan1MondayBased === 0 ? 0 : 7 - prevJan1MondayBased;
    const prevFirstMondayUtc = Date.UTC(prevYear, 0, 1 + prevDaysToFirstMonday);
    const prevDaysSinceFirstMonday = Math.floor((utcDate - prevFirstMondayUtc) / DAY_MS);
    const prevWeekNumber = Math.floor(prevDaysSinceFirstMonday / 7) + 1;
    return `${prevYear}-W${prevWeekNumber.toString().padStart(2, '0')}`;
  }

  const weekNumber = Math.floor(daysSinceFirstMonday / 7) + 1;
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}

function getWeekKeyFromUtcMs(utcMs) {
  const date = new Date(utcMs);
  return getWeekKeyFromParts(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

// Get week key for a given date (weeks start on Monday)
export function getWeekKey(date) {
  return getWeekKeyFromParts(date.getFullYear(), date.getMonth(), date.getDate());
}

// Get month key for a given date
export function getMonthKey(date) {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
}

// Group transactions by week
export function groupByWeek(transactions) {
  const grouped = {};
  transactions.forEach((transaction) => {
    const date = new Date(transaction.date);
    const weekKey = getWeekKey(date);
    if (!grouped[weekKey]) {
      grouped[weekKey] = [];
    }
    grouped[weekKey].push(transaction);
  });
  return grouped;
}

// Group transactions by month
export function groupByMonth(transactions) {
  const grouped = {};
  transactions.forEach((transaction) => {
    const date = new Date(transaction.date);
    const monthKey = getMonthKey(date);
    if (!grouped[monthKey]) {
      grouped[monthKey] = [];
    }
    grouped[monthKey].push(transaction);
  });
  return grouped;
}

// Calculate total spending for a set of transactions
export function calculateTotalSpending(transactions) {
  return transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
}

// Calculate spending by category for a set of transactions
export function calculateCategoryTotals(transactions) {
  const totals = {};
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((transaction) => {
      const category = transaction.category || 'Other';
      if (!totals[category]) {
        totals[category] = 0;
      }
      totals[category] += transaction.amount;
    });
  return totals;
}

// Get previous week key
export function getPreviousWeekKey(currentWeekKey) {
  const [yearStr, weekStr] = currentWeekKey.split('-W');
  const prevMondayUtc = getMondayUtcOfWeek(parseInt(yearStr), parseInt(weekStr)) - 7 * DAY_MS;
  return getWeekKeyFromUtcMs(prevMondayUtc);
}

// Get previous month key
export function getPreviousMonthKey(currentMonthKey) {
  const [yearStr, monthStr] = currentMonthKey.split('-');
  let year = parseInt(yearStr);
  let month = parseInt(monthStr);

  if (month === 1) {
    year -= 1;
    month = 12;
  } else {
    month -= 1;
  }

  return `${year}-${month.toString().padStart(2, '0')}`;
}

export function getNextMonthKey(currentMonthKey) {
  const [yearStr, monthStr] = currentMonthKey.split('-');
  let year = parseInt(yearStr);
  let month = parseInt(monthStr);

  if (month === 12) {
    year += 1;
    month = 1;
  } else {
    month += 1;
  }

  return `${year}-${month.toString().padStart(2, '0')}`;
}

export function getNextWeekKey(currentWeekKey) {
  const [yearStr, weekStr] = currentWeekKey.split('-W');
  const nextMondayUtc = getMondayUtcOfWeek(parseInt(yearStr), parseInt(weekStr)) + 7 * DAY_MS;
  return getWeekKeyFromUtcMs(nextMondayUtc);
}

function getBudgetMonthlySpending(budget, transactions, monthKey) {
  return calculateBudgetSpending(budget, transactions, monthKey);
}

export function calculateSocialSpending(transactions, date = new Date()) {
  const monthKey = getMonthKey(date);
  const monthExpenses = transactions.filter((t) => {
    if (t.type !== 'expense') return false;
    return getMonthKey(new Date(t.date)) === monthKey;
  });

  const socialExpenses = monthExpenses.filter((t) => SOCIAL_CATEGORIES.includes(t.category));
  const monthlySocialSpend = socialExpenses.reduce((sum, t) => sum + t.amount, 0);

  const socialDaysSet = new Set();
  socialExpenses.forEach((t) => {
    const dayKey = new Date(t.date).toDateString();
    socialDaysSet.add(dayKey);
  });

  const socialDays = socialDaysSet.size;
  const averageCostPerSocialDay = socialDays > 0 ? monthlySocialSpend / socialDays : 0;

  return {
    monthKey,
    monthLabel: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    monthlySocialSpend,
    socialDays,
    averageCostPerSocialDay,
  };
}

// Main function to generate insights
export function generateInsights(transactions, budgets) {
  const insights = [];
  const expenses = transactions.filter((t) => t.type === 'expense');
  
  if (expenses.length === 0) {
    return insights;
  }
  
  const today = new Date();
  const currentWeekKey = getWeekKey(today);
  const currentMonthKey = getMonthKey(today);
  
  const weeklyGrouped = groupByWeek(expenses);
  const monthlyGrouped = groupByMonth(expenses);
  
  // ===== WEEKLY COMPARISON INSIGHTS =====
  const currentWeekSpending = calculateTotalSpending(weeklyGrouped[currentWeekKey] || []);
  const previousWeekKey = getPreviousWeekKey(currentWeekKey);
  const previousWeekSpending = calculateTotalSpending(weeklyGrouped[previousWeekKey] || []);
  
  if (previousWeekSpending > 0 && currentWeekSpending > 0) {
    const weeklyChange = ((currentWeekSpending - previousWeekSpending) / previousWeekSpending) * 100;
    const changeDirection = weeklyChange >= 0 ? 'more' : 'less';
    const absChange = Math.abs(weeklyChange);
    
    insights.push({
      type: 'weekly',
      title: 'Weekly Spending Comparison',
      message: `You spent ${absChange.toFixed(0)}% ${changeDirection} this week compared to last week ($${currentWeekSpending.toFixed(2)} vs $${previousWeekSpending.toFixed(2)}).`,
    });
  }
  
  // Biggest category this week
  if (currentWeekSpending > 0) {
    const currentWeekCategories = calculateCategoryTotals(weeklyGrouped[currentWeekKey] || []);
    const biggestCategory = Object.entries(currentWeekCategories).reduce((a, b) => 
      a[1] > b[1] ? a : b
    );
    
    if (biggestCategory) {
      insights.push({
        type: 'weekly',
        title: 'Biggest Category This Week',
        message: `Your biggest category this week was ${biggestCategory[0]} with $${biggestCategory[1].toFixed(2)} spent.`,
      });
    }
  }
  
  // Categories with largest increases/decreases week-over-week
  if (previousWeekSpending > 0 && currentWeekSpending > 0) {
    const currentWeekCategories = calculateCategoryTotals(weeklyGrouped[currentWeekKey] || []);
    const previousWeekCategories = calculateCategoryTotals(weeklyGrouped[previousWeekKey] || []);
    
    const categoryChanges = [];
    Object.keys({ ...currentWeekCategories, ...previousWeekCategories }).forEach((category) => {
      const current = currentWeekCategories[category] || 0;
      const previous = previousWeekCategories[category] || 0;
      if (previous > 0 || current > 0) {
        const change = current - previous;
        const percentChange = previous > 0 ? ((change / previous) * 100) : 0;
        if (Math.abs(change) > 5 || Math.abs(percentChange) > 10) {
          categoryChanges.push({ category, change, percentChange, current, previous });
        }
      }
    });
    
    // Find largest increase
    const largestIncrease = categoryChanges
      .filter((c) => c.change > 0)
      .sort((a, b) => b.change - a.change)[0];
    
    if (largestIncrease) {
      insights.push({
        type: 'weekly',
        title: 'Category Increase This Week',
        message: `Your ${largestIncrease.category} spending increased by $${largestIncrease.change.toFixed(2)} this week compared to last week.`,
      });
    }
    
    // Find largest decrease
    const largestDecrease = categoryChanges
      .filter((c) => c.change < 0)
      .sort((a, b) => a.change - b.change)[0];
    
    if (largestDecrease) {
      insights.push({
        type: 'weekly',
        title: 'Category Decrease This Week',
        message: `Your ${largestDecrease.category} spending decreased by $${Math.abs(largestDecrease.change).toFixed(2)} this week compared to last week.`,
      });
    }
  }
  
  // ===== MONTHLY COMPARISON INSIGHTS =====
  const currentMonthSpending = calculateTotalSpending(monthlyGrouped[currentMonthKey] || []);
  const previousMonthKey = getPreviousMonthKey(currentMonthKey);
  const previousMonthSpending = calculateTotalSpending(monthlyGrouped[previousMonthKey] || []);
  
  if (previousMonthSpending > 0 && currentMonthSpending > 0) {
    const monthlyChange = ((currentMonthSpending - previousMonthSpending) / previousMonthSpending) * 100;
    const changeDirection = monthlyChange >= 0 ? 'more' : 'less';
    const absChange = Math.abs(monthlyChange);
    
    insights.push({
      type: 'monthly',
      title: 'Monthly Spending Comparison',
      message: `You spent ${absChange.toFixed(0)}% ${changeDirection} this month compared to last month ($${currentMonthSpending.toFixed(2)} vs $${previousMonthSpending.toFixed(2)}).`,
    });
  }
  
  // Biggest category this month
  if (currentMonthSpending > 0) {
    const currentMonthCategories = calculateCategoryTotals(monthlyGrouped[currentMonthKey] || []);
    const biggestCategory = Object.entries(currentMonthCategories).reduce((a, b) => 
      a[1] > b[1] ? a : b
    );
    
    if (biggestCategory) {
      insights.push({
        type: 'monthly',
        title: 'Biggest Category This Month',
        message: `Your biggest category this month was ${biggestCategory[0]} with $${biggestCategory[1].toFixed(2)} spent.`,
      });
    }
  }
  
  // Categories with large increases/decreases month-over-month
  if (previousMonthSpending > 0 && currentMonthSpending > 0) {
    const currentMonthCategories = calculateCategoryTotals(monthlyGrouped[currentMonthKey] || []);
    const previousMonthCategories = calculateCategoryTotals(monthlyGrouped[previousMonthKey] || []);
    
    const categoryChanges = [];
    Object.keys({ ...currentMonthCategories, ...previousMonthCategories }).forEach((category) => {
      const current = currentMonthCategories[category] || 0;
      const previous = previousMonthCategories[category] || 0;
      if (previous > 0 || current > 0) {
        const change = current - previous;
        const percentChange = previous > 0 ? ((change / previous) * 100) : 0;
        if (Math.abs(change) > 10 || Math.abs(percentChange) > 15) {
          categoryChanges.push({ category, change, percentChange, current, previous });
        }
      }
    });
    
    // Find largest increase
    const largestIncrease = categoryChanges
      .filter((c) => c.change > 0)
      .sort((a, b) => b.change - a.change)[0];
    
    if (largestIncrease) {
      insights.push({
        type: 'monthly',
        title: 'Category Increase This Month',
        message: `Your ${largestIncrease.category} spending increased by $${largestIncrease.change.toFixed(2)} (${Math.abs(largestIncrease.percentChange).toFixed(0)}%) this month compared to last month.`,
      });
    }
    
    // Find largest decrease
    const largestDecrease = categoryChanges
      .filter((c) => c.change < 0)
      .sort((a, b) => a.change - b.change)[0];
    
    if (largestDecrease) {
      insights.push({
        type: 'monthly',
        title: 'Category Decrease This Month',
        message: `Your ${largestDecrease.category} spending decreased by $${Math.abs(largestDecrease.change).toFixed(2)} (${Math.abs(largestDecrease.percentChange).toFixed(0)}%) this month compared to last month.`,
      });
    }
  }
  
  // ===== CATEGORY TREND INSIGHTS =====
  const allCategories = new Set();
  expenses.forEach((t) => {
    if (t.category) allCategories.add(t.category);
  });
  
  allCategories.forEach((category) => {
    // Week-over-week comparison
    const currentWeekCatTotal = (calculateCategoryTotals(weeklyGrouped[currentWeekKey] || []))[category] || 0;
    const previousWeekCatTotal = (calculateCategoryTotals(weeklyGrouped[previousWeekKey] || []))[category] || 0;
    
    if (previousWeekCatTotal > 0 && currentWeekCatTotal > 0) {
      const weekChange = currentWeekCatTotal - previousWeekCatTotal;
      const weekPercentChange = ((weekChange / previousWeekCatTotal) * 100);
      
      if (Math.abs(weekPercentChange) > 10) {
        const direction = weekChange > 0 ? 'more' : 'less';
        insights.push({
          type: 'category',
          title: `${category} Weekly Trend`,
          message: `You spent ${Math.abs(weekPercentChange).toFixed(0)}% ${direction} on ${category} this week compared to last week ($${currentWeekCatTotal.toFixed(2)} vs $${previousWeekCatTotal.toFixed(2)}).`,
        });
      }
    } else if (currentWeekCatTotal > 0 && previousWeekCatTotal === 0) {
      insights.push({
        type: 'category',
        title: `${category} Weekly Trend`,
        message: `You spent $${currentWeekCatTotal.toFixed(2)} on ${category} this week, but nothing last week.`,
      });
    }
    
    // Month-over-month comparison
    const currentMonthCatTotal = (calculateCategoryTotals(monthlyGrouped[currentMonthKey] || []))[category] || 0;
    const previousMonthCatTotal = (calculateCategoryTotals(monthlyGrouped[previousMonthKey] || []))[category] || 0;
    
    if (previousMonthCatTotal > 0 && currentMonthCatTotal > 0) {
      const monthChange = currentMonthCatTotal - previousMonthCatTotal;
      const monthPercentChange = ((monthChange / previousMonthCatTotal) * 100);
      
      if (Math.abs(monthPercentChange) > 15) {
        const direction = monthChange > 0 ? 'more' : 'less';
        insights.push({
          type: 'category',
          title: `${category} Monthly Trend`,
          message: `You spent ${Math.abs(monthPercentChange).toFixed(0)}% ${direction} on ${category} this month compared to last month ($${currentMonthCatTotal.toFixed(2)} vs $${previousMonthCatTotal.toFixed(2)}).`,
        });
      }
    } else if (currentMonthCatTotal > 0 && previousMonthCatTotal === 0) {
      insights.push({
        type: 'category',
        title: `${category} Monthly Trend`,
        message: `You spent $${currentMonthCatTotal.toFixed(2)} on ${category} this month, but nothing last month.`,
      });
    }
  });
  
  // ===== BUDGET-RELATED INSIGHTS =====
  if (budgets && budgets.length > 0) {
    const today = new Date();
    const currentWeekKey = getWeekKey(today);
    const currentMonthKey = getMonthKey(today);
    
    // Get last 3 months for trend analysis
    const months = [currentMonthKey];
    let tempMonthKey = currentMonthKey;
    for (let i = 0; i < 2; i++) {
      tempMonthKey = getPreviousMonthKey(tempMonthKey);
      months.push(tempMonthKey);
    }
    
    // Analyze each budget
    budgets.forEach((budget) => {
      if (budget.isRecurring || budget.period === 'month' || budget.period === 'biweekly') {
        const budgetLabel = getBudgetName(budget);
        const budgetAmount = budget.amount;

        if (budgetAmount <= 0) return;

        if (budget.period === 'biweekly') {
          const currentSpending = calculateBudgetSpending(
            budget,
            expenses,
            getBiweeklyPeriodKey(new Date())
          );

          if (currentSpending > budgetAmount) {
            insights.push({
              type: 'budget',
              title: 'Budget Alert',
              message: `You've gone over your ${budgetLabel} bi-weekly budget this period ($${currentSpending.toFixed(2)} of $${budgetAmount.toFixed(2)}).`,
            });
          } else if (currentSpending > 0 && currentSpending < budgetAmount * 0.5) {
            insights.push({
              type: 'budget',
              title: 'Budget Opportunity',
              message: `Your ${budgetLabel} spending is well under budget this bi-weekly period ($${currentSpending.toFixed(2)} of $${budgetAmount.toFixed(2)}).`,
            });
          }
          return;
        }

        const monthlySpending = months.map((monthKey) =>
          getBudgetMonthlySpending(budget, expenses, monthKey)
        );

        const overBudgetMonths = monthlySpending.filter((spending) => spending > budgetAmount).length;
        if (overBudgetMonths >= 2) {
          insights.push({
            type: 'budget',
            title: 'Budget Alert',
            message: `You've gone over your ${budgetLabel} budget ${overBudgetMonths} months in a row.`,
          });
        }

        const currentSpending = monthlySpending[0];
        if (currentSpending > 0 && currentSpending < budgetAmount * 0.5) {
          insights.push({
            type: 'budget',
            title: 'Budget Opportunity',
            message: `Your ${budgetLabel} spending is well under budget this month ($${currentSpending.toFixed(2)} of $${budgetAmount.toFixed(2)}).`,
          });
        }

        if (monthlySpending.length === 3 &&
            monthlySpending[0] > monthlySpending[1] &&
            monthlySpending[1] > monthlySpending[2] &&
            monthlySpending[0] > 0 && monthlySpending[1] > 0 && monthlySpending[2] > 0) {
          insights.push({
            type: 'budget',
            title: 'Spending Trend',
            message: `${budgetLabel} spending has increased for 3 straight months.`,
          });
        }

        if (monthlySpending.length === 3 &&
            monthlySpending[0] < monthlySpending[1] &&
            monthlySpending[1] < monthlySpending[2] &&
            monthlySpending[0] > 0 && monthlySpending[1] > 0 && monthlySpending[2] > 0) {
          insights.push({
            type: 'budget',
            title: 'Spending Trend',
            message: `${budgetLabel} spending has decreased for 3 straight months.`,
          });
        }
      }
    });
  }

  // ===== INVESTMENT INSIGHTS =====
  const currentMonthExpenses = monthlyGrouped[currentMonthKey] || [];
  const currentMonthCategories = calculateCategoryTotals(currentMonthExpenses);
  const investmentBreakdown = INVESTMENT_CATEGORIES.map((cat) => ({
    category: cat,
    total: currentMonthCategories[cat] || 0,
  })).filter((item) => item.total > 0);

  const investmentTotal = investmentBreakdown.reduce((sum, item) => sum + item.total, 0);

    if (investmentTotal > 0) {
    const breakdownText = investmentBreakdown
      .map((item) => {
        const label = item.category.replace('Investments - ', '').toLowerCase();
        return `$${item.total.toFixed(2)} ${label}`;
      })
      .join(', ');

    insights.push({
      type: 'monthly',
      title: 'Wealth Building',
      message: `You contributed $${investmentTotal.toFixed(2)} to investments this month (${breakdownText}).`,
    });
  }

  const savingsTotal = currentMonthCategories['Savings'] || 0;
  if (savingsTotal > 0) {
    insights.push({
      type: 'monthly',
      title: 'Wealth Building',
      message: `You saved $${savingsTotal.toFixed(2)} this month.`,
    });
  }

  // ===== SOCIAL SPENDING INSIGHTS =====
  const social = calculateSocialSpending(transactions, today);
  if (social.monthlySocialSpend > 0) {
    insights.unshift({
      type: 'social',
      title: 'Social Life Spending',
      message: `Social spending: $${social.monthlySocialSpend.toFixed(2)} across ${social.socialDays} social day${social.socialDays === 1 ? '' : 's'} (avg $${social.averageCostPerSocialDay.toFixed(0)}/night).`,
    });
  }

  return insights;
}

