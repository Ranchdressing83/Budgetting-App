// Helper functions for generating insights from transactions and budgets

// Get week key for a given date (weeks start on Monday)
export function getWeekKey(date) {
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
  const year = parseInt(yearStr);
  const week = parseInt(weekStr);
  
  // Calculate the date of the current week's Monday
  const jan1 = new Date(year, 0, 1);
  const jan1Day = jan1.getDay();
  const jan1MondayBased = (jan1Day + 6) % 7;
  const daysToFirstMonday = jan1MondayBased === 0 ? 0 : 7 - jan1MondayBased;
  const firstMonday = new Date(year, 0, 1 + daysToFirstMonday);
  firstMonday.setHours(0, 0, 0, 0);
  
  // Get the Monday of the current week
  const currentWeekMonday = new Date(firstMonday);
  currentWeekMonday.setDate(firstMonday.getDate() + (week - 1) * 7);
  
  // Get the previous week's Monday (7 days earlier)
  const previousWeekMonday = new Date(currentWeekMonday);
  previousWeekMonday.setDate(currentWeekMonday.getDate() - 7);
  
  // Calculate the week key for the previous week
  return getWeekKey(previousWeekMonday);
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
      if (budget.isRecurring || budget.period === 'month') {
        const budgetCategory = budget.category;
        const budgetAmount = budget.amount;
        
        // Check last 3 months for trends
        const monthlySpending = months.map((monthKey) => {
          const monthExpenses = monthlyGrouped[monthKey] || [];
          if (budgetCategory === 'Overall') {
            return calculateTotalSpending(monthExpenses);
          } else {
            const categoryTotals = calculateCategoryTotals(monthExpenses);
            return categoryTotals[budgetCategory] || 0;
          }
        });
        
        // Check if consistently over budget (2+ months)
        const overBudgetMonths = monthlySpending.filter((spending) => spending > budgetAmount).length;
        if (overBudgetMonths >= 2) {
          insights.push({
            type: 'budget',
            title: 'Budget Alert',
            message: `You've gone over your ${budgetCategory} budget ${overBudgetMonths} months in a row.`,
          });
        }
        
        // Check if far under budget (spending < 50% of budget)
        const currentSpending = monthlySpending[0];
        if (currentSpending > 0 && currentSpending < budgetAmount * 0.5) {
          insights.push({
            type: 'budget',
            title: 'Budget Opportunity',
            message: `Your ${budgetCategory} spending is well under budget this month ($${currentSpending.toFixed(2)} of $${budgetAmount.toFixed(2)}).`,
          });
        }
        
        // Check for trend (3 months of increase)
        if (monthlySpending.length === 3 && 
            monthlySpending[0] > monthlySpending[1] && 
            monthlySpending[1] > monthlySpending[2] &&
            monthlySpending[0] > 0 && monthlySpending[1] > 0 && monthlySpending[2] > 0) {
          insights.push({
            type: 'budget',
            title: 'Spending Trend',
            message: `${budgetCategory} spending has increased for 3 straight months.`,
          });
        }
        
        // Check for trend (3 months of decrease)
        if (monthlySpending.length === 3 && 
            monthlySpending[0] < monthlySpending[1] && 
            monthlySpending[1] < monthlySpending[2] &&
            monthlySpending[0] > 0 && monthlySpending[1] > 0 && monthlySpending[2] > 0) {
          insights.push({
            type: 'budget',
            title: 'Spending Trend',
            message: `${budgetCategory} spending has decreased for 3 straight months.`,
          });
        }
      }
    });
  }
  
  return insights;
}

