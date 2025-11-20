import { useBudget } from '@/components/BudgetContext';
import { useTransactions } from '@/components/TransactionsContext';
import { CATEGORY_COLORS } from '@/constants/categories';
import { COLORS } from '@/constants/colors';
import React, { useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

// Helper function to group transactions by week
// Returns an object where keys are week identifiers (e.g., "2024-W01")
// Weeks start on Monday and end on Sunday
function groupByWeek(transactions) {
  const grouped = {};
  
  transactions.forEach((transaction) => {
    const date = new Date(transaction.date);
    const year = date.getFullYear();
    
    // Find the first Monday of the year
    const jan1 = new Date(year, 0, 1);
    const jan1Day = jan1.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    // Convert to Monday-based: Monday = 0, Tuesday = 1, ..., Sunday = 6
    const jan1MondayBased = (jan1Day + 6) % 7;
    // Days to add to get to first Monday (if Jan 1 is not Monday)
    const daysToFirstMonday = jan1MondayBased === 0 ? 0 : 7 - jan1MondayBased;
    const firstMonday = new Date(year, 0, 1 + daysToFirstMonday);
    firstMonday.setHours(0, 0, 0, 0); // Start of Monday (midnight)
    
    // Calculate days from first Monday
    const daysSinceFirstMonday = Math.floor((date - firstMonday) / (1000 * 60 * 60 * 24));
    
    // If date is before first Monday, it belongs to previous year's last week
    if (daysSinceFirstMonday < 0) {
      const prevYear = year - 1;
      const prevJan1 = new Date(prevYear, 0, 1);
      const prevJan1Day = prevJan1.getDay();
      const prevJan1MondayBased = (prevJan1Day + 6) % 7;
      const prevDaysToFirstMonday = prevJan1MondayBased === 0 ? 0 : 7 - prevJan1MondayBased;
      const prevFirstMonday = new Date(prevYear, 0, 1 + prevDaysToFirstMonday);
      prevFirstMonday.setHours(0, 0, 0, 0); // Start of Monday (midnight)
      const prevDaysSinceFirstMonday = Math.floor((date - prevFirstMonday) / (1000 * 60 * 60 * 24));
      const prevWeekNumber = Math.floor(prevDaysSinceFirstMonday / 7) + 1;
      // Get last week number of previous year (approximate, could be 52 or 53)
      const lastWeekKey = `${prevYear}-W${prevWeekNumber.toString().padStart(2, '0')}`;
      if (!grouped[lastWeekKey]) {
        grouped[lastWeekKey] = { income: 0, expenses: 0 };
      }
      if (transaction.type === 'income') {
        grouped[lastWeekKey].income += transaction.amount;
      } else {
        grouped[lastWeekKey].expenses += transaction.amount;
      }
      return;
    }
    
    // Calculate week number (1-indexed)
    const weekNumber = Math.floor(daysSinceFirstMonday / 7) + 1;
    const weekKey = `${year}-W${weekNumber.toString().padStart(2, '0')}`;
    
    if (!grouped[weekKey]) {
      grouped[weekKey] = { income: 0, expenses: 0 };
    }
    
    if (transaction.type === 'income') {
      grouped[weekKey].income += transaction.amount;
    } else {
      grouped[weekKey].expenses += transaction.amount;
    }
  });
  
  return grouped;
}

// Helper function to group transactions by month
// Returns an object where keys are month identifiers (e.g., "2024-01")
function groupByMonth(transactions) {
  const grouped = {};
  
  transactions.forEach((transaction) => {
    const date = new Date(transaction.date);
    const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    
    if (!grouped[monthKey]) {
      grouped[monthKey] = { income: 0, expenses: 0 };
    }
    
    if (transaction.type === 'income') {
      grouped[monthKey].income += transaction.amount;
    } else {
      grouped[monthKey].expenses += transaction.amount;
    }
  });
  
  return grouped;
}

// Helper function to group transactions by year
// Returns an object where keys are year identifiers (e.g., "2024")
function groupByYear(transactions) {
  const grouped = {};
  
  transactions.forEach((transaction) => {
    const date = new Date(transaction.date);
    const yearKey = date.getFullYear().toString();
    
    if (!grouped[yearKey]) {
      grouped[yearKey] = { income: 0, expenses: 0 };
    }
    
    if (transaction.type === 'income') {
      grouped[yearKey].income += transaction.amount;
    } else {
      grouped[yearKey].expenses += transaction.amount;
    }
  });
  
  return grouped;
}

// Helper function to group expenses by category
function groupByCategory(transactions) {
  const grouped = {};
  
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((transaction) => {
      const category = transaction.category || 'Other';
      if (!grouped[category]) {
        grouped[category] = 0;
      }
      grouped[category] += transaction.amount;
    });
  
  return grouped;
}

// Helper function to get expenses by category for a specific week
function getWeeklyCategoryData(transactions, weekKey) {
  // Extract year and week number from weekKey (e.g., "2024-W01")
  const [yearStr, weekStr] = weekKey.split('-W');
  const year = parseInt(yearStr);
  const weekNumber = parseInt(weekStr);
  
  // Find the first Monday of the year
  const jan1 = new Date(year, 0, 1);
  const jan1Day = jan1.getDay();
  const jan1MondayBased = (jan1Day + 6) % 7;
  const daysToFirstMonday = jan1MondayBased === 0 ? 0 : 7 - jan1MondayBased;
  const firstMonday = new Date(year, 0, 1 + daysToFirstMonday);
  firstMonday.setHours(0, 0, 0, 0); // Start of Monday (midnight)
  
  // Calculate the start and end of the week
  const weekStart = new Date(firstMonday);
  weekStart.setDate(weekStart.getDate() + (weekNumber - 1) * 7);
  weekStart.setHours(0, 0, 0, 0); // Start of Monday (midnight)
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6); // Sunday (6 days after Monday)
  weekEnd.setHours(23, 59, 59, 999); // End of Sunday (just before midnight)
  
  const weekExpenses = transactions.filter((t) => {
    if (t.type !== 'expense') return false;
    const date = new Date(t.date);
    return date >= weekStart && date <= weekEnd;
  });
  
  return groupByCategory(weekExpenses);
}

// Helper function to get expenses by category for a specific month
function getMonthlyCategoryData(transactions, monthKey) {
  const monthExpenses = transactions.filter((t) => {
    if (t.type !== 'expense') return false;
    const date = new Date(t.date);
    const tMonthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    return tMonthKey === monthKey;
  });
  
  return groupByCategory(monthExpenses);
}

// Helper function to get expenses by category for a specific year
function getYearlyCategoryData(transactions, yearKey) {
  const yearExpenses = transactions.filter((t) => {
    if (t.type !== 'expense') return false;
    const date = new Date(t.date);
    return date.getFullYear().toString() === yearKey;
  });
  
  return groupByCategory(yearExpenses);
}


// Helper function to convert category data to pie chart format
// react-native-gifted-charts expects: [{ value, color, label, text }]
function preparePieChartData(categoryData) {
  const entries = Object.entries(categoryData).filter(([_, amount]) => amount > 0);
  
  if (entries.length === 0) return null;
  
  const chartData = entries.map(([category, amount]) => {
    // Get the color for this category - ensure exact match
    const categoryColor = CATEGORY_COLORS[category];
    const color = categoryColor || COLORS.gray;
    
    return {
      value: parseFloat(amount.toFixed(2)),
      color: color, // Must be hex color string like '#FF4444'
      label: category,
      text: `$${amount.toFixed(2)}`,
    };
  });
  
  // Sort by amount (descending) to ensure consistent ordering
  chartData.sort((a, b) => b.value - a.value);
  
  return chartData;
}

// Helper function to prepare budget comparison bar chart data
function prepareBudgetChartData(transactions, budgets, period, periodKey) {
  if (!budgets || budgets.length === 0) return null;
  
  const chartData = [];
  
  // Calculate spending for each category in the period
  const categorySpending = {};
  transactions
    .filter((t) => {
      if (t.type !== 'expense') return false;
      const date = new Date(t.date);
      if (period === 'week') {
        const year = date.getFullYear();
        const jan1 = new Date(year, 0, 1);
        const jan1Day = jan1.getDay();
        const jan1MondayBased = (jan1Day + 6) % 7;
        const daysToFirstMonday = jan1MondayBased === 0 ? 0 : 7 - jan1MondayBased;
        const firstMonday = new Date(year, 0, 1 + daysToFirstMonday);
        firstMonday.setHours(0, 0, 0, 0);
        const daysSinceFirstMonday = Math.floor((date - firstMonday) / (1000 * 60 * 60 * 24));
        let weekNumber;
        if (daysSinceFirstMonday < 0) {
          const prevYear = year - 1;
          const prevJan1 = new Date(prevYear, 0, 1);
          const prevJan1Day = prevJan1.getDay();
          const prevJan1MondayBased = (prevJan1Day + 6) % 7;
          const prevDaysToFirstMonday = prevJan1MondayBased === 0 ? 0 : 7 - prevJan1MondayBased;
          const prevFirstMonday = new Date(prevYear, 0, 1 + prevDaysToFirstMonday);
          prevFirstMonday.setHours(0, 0, 0, 0);
          const prevDaysSinceFirstMonday = Math.floor((date - prevFirstMonday) / (1000 * 60 * 60 * 24));
          weekNumber = Math.floor(prevDaysSinceFirstMonday / 7) + 1;
          const tWeekKey = `${prevYear}-W${weekNumber.toString().padStart(2, '0')}`;
          return tWeekKey === periodKey;
        } else {
          weekNumber = Math.floor(daysSinceFirstMonday / 7) + 1;
          const tWeekKey = `${year}-W${weekNumber.toString().padStart(2, '0')}`;
          return tWeekKey === periodKey;
        }
      } else if (period === 'month') {
        const tMonthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        return tMonthKey === periodKey;
      } else {
        return date.getFullYear().toString() === periodKey;
      }
    })
    .forEach((t) => {
      if (!categorySpending[t.category]) {
        categorySpending[t.category] = 0;
      }
      categorySpending[t.category] += t.amount;
    });

  // Process each budget - create one bar per budget
  budgets.forEach((budget) => {
    let spending = 0;
    
    if (budget.category === 'Overall') {
      // Calculate total spending for overall budget
      spending = Object.values(categorySpending).reduce((sum, val) => sum + val, 0);
    } else {
      // Get spending for this specific category
      spending = categorySpending[budget.category] || 0;
    }
    
    // Calculate percentage of budget used
    const percentage = budget.amount > 0 ? (spending / budget.amount) * 100 : 0;
    
    // Color code based on percentage: forest green < 75%, yellow 75-90%, orange 90-100%, red >= 100%
    let finalColor = COLORS.forestGreen; // forest green
    if (percentage >= 100) {
      finalColor = COLORS.error; // red
    } else if (percentage >= 90) {
      finalColor = COLORS.warning; // orange
    } else if (percentage >= 75) {
      finalColor = '#FFC107'; // yellow
    }
    
    chartData.push({
      label: budget.category === 'Overall' ? 'Overall' : budget.category,
      spending: spending,
      budget: budget.amount,
      percentage: percentage,
      color: finalColor,
    });
  });

  return chartData.length > 0 ? chartData : null;
}

// Screen width for chart sizing
const screenWidth = Dimensions.get('window').width;

// Component to render horizontal progress bars
function HorizontalBudgetBars({ data, maxBudget }) {
  const barWidth = screenWidth - 100;
  
  return (
    <View style={{ marginTop: 8 }}>
      {data.map((item, index) => (
        <View key={index} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ fontSize: 11, color: COLORS.darkGray, flex: 1, flexShrink: 1 }}>
              {item.label}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8, flexShrink: 0 }}>
              <Text style={{ fontSize: 11, color: COLORS.darkGray, fontWeight: '600' }}>
                ${item.spending.toFixed(0)}
              </Text>
              <Text style={{ fontSize: 10, color: COLORS.gray, marginLeft: 4 }}>
                / ${item.budget.toFixed(0)}
              </Text>
              <Text style={{ 
                fontSize: 10, 
                color: item.percentage >= 100 ? COLORS.error
                  : item.percentage >= 90 ? COLORS.warning
                  : item.percentage >= 75 ? '#FFC107' 
                  : COLORS.forestGreen, 
                fontWeight: '600',
                marginLeft: 6
              }}>
                {item.percentage.toFixed(0)}%
              </Text>
            </View>
          </View>
          <View style={{ 
            width: barWidth, 
            height: 24, 
            backgroundColor: COLORS.lightGray, 
            borderRadius: 12,
            overflow: 'hidden'
          }}>
            <View style={{
              width: `${Math.min(item.percentage, 100)}%`,
              height: '100%',
              backgroundColor: item.color,
              borderRadius: 12,
            }} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function GraphsScreen() {
  const { transactions } = useTransactions();
  const { getBudget, getBudgetsForPeriod } = useBudget();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [viewMode, setViewMode] = useState({ week: 'pie', month: 'pie', year: 'pie' }); // 'pie' or 'budget'

  const weeklyData = groupByWeek(transactions);
  const monthlyData = groupByMonth(transactions);
  const yearlyData = groupByYear(transactions);

  // Get current week key (weeks start on Monday, end on Sunday)
  const getCurrentWeekKey = () => {
    const today = new Date();
    const year = today.getFullYear();
    
    // Find the first Monday of the year
    const jan1 = new Date(year, 0, 1);
    const jan1Day = jan1.getDay();
    const jan1MondayBased = (jan1Day + 6) % 7;
    const daysToFirstMonday = jan1MondayBased === 0 ? 0 : 7 - jan1MondayBased;
    const firstMonday = new Date(year, 0, 1 + daysToFirstMonday);
    firstMonday.setHours(0, 0, 0, 0); // Start of Monday (midnight)
    
    // Calculate days from first Monday
    const daysSinceFirstMonday = Math.floor((today - firstMonday) / (1000 * 60 * 60 * 24));
    
    // If today is before first Monday, use previous year's last week
    if (daysSinceFirstMonday < 0) {
      const prevYear = year - 1;
      const prevJan1 = new Date(prevYear, 0, 1);
      const prevJan1Day = prevJan1.getDay();
      const prevJan1MondayBased = (prevJan1Day + 6) % 7;
      const prevDaysToFirstMonday = prevJan1MondayBased === 0 ? 0 : 7 - prevJan1MondayBased;
      const prevFirstMonday = new Date(prevYear, 0, 1 + prevDaysToFirstMonday);
      prevFirstMonday.setHours(0, 0, 0, 0); // Start of Monday (midnight)
      const prevDaysSinceFirstMonday = Math.floor((today - prevFirstMonday) / (1000 * 60 * 60 * 24));
      const prevWeekNumber = Math.floor(prevDaysSinceFirstMonday / 7) + 1;
      return `${prevYear}-W${prevWeekNumber.toString().padStart(2, '0')}`;
    }
    
    // Calculate week number (1-indexed)
    const weekNumber = Math.floor(daysSinceFirstMonday / 7) + 1;
    return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
  };

  // Get current month key
  const getCurrentMonthKey = () => {
    const today = new Date();
    return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  // Get current year key
  const getCurrentYearKey = () => {
    return new Date().getFullYear().toString();
  };

  const currentWeekKey = getCurrentWeekKey();
  const currentMonthKey = getCurrentMonthKey();
  const currentYearKey = getCurrentYearKey();
  
  const sortedWeeks = weeklyData[currentWeekKey] ? [[currentWeekKey, weeklyData[currentWeekKey]]] : [];
  const sortedMonths = monthlyData[currentMonthKey] ? [[currentMonthKey, monthlyData[currentMonthKey]]] : [];
  const sortedYears = yearlyData[currentYearKey] ? [[currentYearKey, yearlyData[currentYearKey]]] : [];

  const formatMonth = (monthKey) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatWeek = (weekKey) => {
    // Extract year and week number from weekKey (e.g., "2024-W01")
    const [yearStr, weekStr] = weekKey.split('-W');
    const year = parseInt(yearStr);
    const weekNumber = parseInt(weekStr);
    
    // Find the first Monday of the year
    const jan1 = new Date(year, 0, 1);
    const jan1Day = jan1.getDay();
    const jan1MondayBased = (jan1Day + 6) % 7;
    const daysToFirstMonday = jan1MondayBased === 0 ? 0 : 7 - jan1MondayBased;
    const firstMonday = new Date(year, 0, 1 + daysToFirstMonday);
    firstMonday.setHours(0, 0, 0, 0);
    
    // Calculate the start and end of the week
    const weekStart = new Date(firstMonday);
    weekStart.setDate(weekStart.getDate() + (weekNumber - 1) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // Sunday
    
    // Format dates
    const startFormatted = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endFormatted = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    return `from ${startFormatted} to ${endFormatted}`;
  };

  const formatYear = (yearKey) => {
    return yearKey;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Spending Analysis</Text>
      </View>

      {/* Weekly Summary */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Weekly Summary</Text>
          {sortedWeeks.length > 0 && (
            <View style={styles.viewModeToggle}>
              <TouchableOpacity
                style={[styles.toggleButton, viewMode.week === 'pie' && styles.toggleButtonActive]}
                onPress={() => setViewMode({ ...viewMode, week: 'pie' })}>
                <Text style={[styles.toggleButtonText, viewMode.week === 'pie' && styles.toggleButtonTextActive]}>
                  Pie
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, viewMode.week === 'budget' && styles.toggleButtonActive]}
                onPress={() => setViewMode({ ...viewMode, week: 'budget' })}>
                <Text style={[styles.toggleButtonText, viewMode.week === 'budget' && styles.toggleButtonTextActive]}>
                  Budget
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
          {sortedWeeks.length === 0 ? (
              <Text style={styles.emptyText}>No data yet</Text>
            ) : (
              sortedWeeks.map(([week, data]) => {
                const weeklyCategoryData = getWeeklyCategoryData(transactions, week);
                const pieData = preparePieChartData(weeklyCategoryData);
                const weekBudgets = getBudgetsForPeriod('week', week);
                const budgetChartData = prepareBudgetChartData(transactions, weekBudgets, 'week', week);
                const maxBudgetValue = weekBudgets.length > 0 
                  ? Math.max(...weekBudgets.map(b => b.amount)) * 1.2 
                  : 100;
                
                return (
                  <View key={week} style={styles.summaryCard}>
                    <Text style={styles.periodLabel}>{formatWeek(week)}</Text>
                    
                    {/* Pie Chart for Weekly Spending by Category */}
                    {viewMode.week === 'pie' && (
                      <>
                        {pieData && data.expenses > 0 ? (
                          <View style={styles.chartContainer}>
                            <PieChart
                              data={pieData}
                              radius={90}
                              textColor="#333"
                              textSize={12}
                              showText={false}
                              focusOnPress={true}
                              showValuesAsLabels={false}
                              labelsPosition="outward"
                              innerRadius={0}
                              innerCircleColor="#fff"
                              donut={false}
                              centerLabelComponent={() => (
                                <View style={styles.centerLabel}>
                                  <Text style={styles.centerLabelText}>Total</Text>
                                  <Text style={styles.centerLabelAmount}>
                                    ${data.expenses.toFixed(2)}
                                  </Text>
                                </View>
                              )}
                            />
                          </View>
                        ) : (
                          <Text style={styles.noExpensesText}>No expenses this week</Text>
                        )}
                      </>
                    )}

                    {/* Budget Comparison Bar Chart */}
                    {viewMode.week === 'budget' && (
                      <>
                        {budgetChartData ? (
                          <View style={styles.budgetChartContainer}>
                            <Text style={styles.budgetChartTitle}>Spending vs Budget</Text>
                            <HorizontalBudgetBars data={budgetChartData} maxBudget={maxBudgetValue} />
                          </View>
                        ) : (
                          <Text style={styles.noExpensesText}>No budget data for this week</Text>
                        )}
                      </>
                    )}
                
                <View style={styles.summaryRow}>
                  <Text style={styles.label}>Income:</Text>
                  <Text style={styles.incomeAmount}>${data.income.toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.label}>Expenses:</Text>
                  <Text style={styles.expenseAmount}>${data.expenses.toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.label}>Net:</Text>
                  <Text style={[styles.netAmount, data.income - data.expenses >= 0 ? styles.positive : styles.negative]}>
                    ${(data.income - data.expenses).toFixed(2)}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Monthly Summary */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Monthly Summary</Text>
          {sortedMonths.length > 0 && (
            <View style={styles.viewModeToggle}>
              <TouchableOpacity
                style={[styles.toggleButton, viewMode.month === 'pie' && styles.toggleButtonActive]}
                onPress={() => setViewMode({ ...viewMode, month: 'pie' })}>
                <Text style={[styles.toggleButtonText, viewMode.month === 'pie' && styles.toggleButtonTextActive]}>
                  Pie
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, viewMode.month === 'budget' && styles.toggleButtonActive]}
                onPress={() => setViewMode({ ...viewMode, month: 'budget' })}>
                <Text style={[styles.toggleButtonText, viewMode.month === 'budget' && styles.toggleButtonTextActive]}>
                  Budget
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {sortedMonths.length === 0 ? (
          <Text style={styles.emptyText}>No data yet</Text>
        ) : (
          sortedMonths.map(([month, data]) => {
            const monthlyCategoryData = getMonthlyCategoryData(transactions, month);
            const pieData = preparePieChartData(monthlyCategoryData);
            const monthBudgets = getBudgetsForPeriod('month', month);
            const budgetChartData = prepareBudgetChartData(transactions, monthBudgets, 'month', month);
            const maxBudgetValue = monthBudgets.length > 0 
              ? Math.max(...monthBudgets.map(b => b.amount)) * 1.2 
              : 100;
            
            return (
              <View key={month} style={styles.summaryCard}>
                <Text style={styles.periodLabel}>{formatMonth(month)}</Text>
                
                {/* Pie Chart for Monthly Spending by Category */}
                {viewMode.month === 'pie' && (
                  <>
                    {pieData && data.expenses > 0 ? (
                      <>
                        <View style={styles.chartContainer}>
                          <PieChart
                            data={pieData}
                            radius={90}
                            textColor="#333"
                            textSize={12}
                            showText={false}
                            focusOnPress={true}
                            showValuesAsLabels={false}
                            labelsPosition="outward"
                            innerRadius={0}
                            innerCircleColor="#fff"
                            donut={false}
                            centerLabelComponent={() => (
                              <View style={styles.centerLabel}>
                                <Text style={styles.centerLabelText}>Total</Text>
                                <Text style={styles.centerLabelAmount}>
                                  ${data.expenses.toFixed(2)}
                                </Text>
                              </View>
                            )}
                          />
                        </View>
                        
                        {/* Category Breakdown - Clickable */}
                        <View style={styles.categoryBreakdown}>
                          {Object.entries(monthlyCategoryData)
                            .filter(([_, amount]) => amount > 0)
                            .sort((a, b) => b[1] - a[1])
                            .map(([cat, amount]) => {
                              const isSelected = selectedCategory === cat && selectedPeriod === `month-${month}`;
                              const categoryColor = CATEGORY_COLORS[cat] || '#C9CBCF';
                              // Convert hex to rgba for opacity
                              const hexToRgba = (hex, opacity) => {
                                const r = parseInt(hex.slice(1, 3), 16);
                                const g = parseInt(hex.slice(3, 5), 16);
                                const b = parseInt(hex.slice(5, 7), 16);
                                return `rgba(${r}, ${g}, ${b}, ${opacity})`;
                              };
                              return (
                                <TouchableOpacity
                                  key={cat}
                                  style={[
                                    styles.categoryItem,
                                    isSelected && {
                                      backgroundColor: hexToRgba(categoryColor, 0.2),
                                      borderColor: categoryColor,
                                      borderWidth: 2,
                                    },
                                  ]}
                                  onPress={() => {
                                    if (isSelected) {
                                      setSelectedCategory(null);
                                      setSelectedPeriod(null);
                                    } else {
                                      setSelectedCategory(cat);
                                      setSelectedPeriod(`month-${month}`);
                                    }
                                  }}>
                                  <View style={styles.categoryItemLeft}>
                                    <View
                                      style={[
                                        styles.categoryColorDot,
                                        { backgroundColor: CATEGORY_COLORS[cat] || '#C9CBCF' },
                                      ]}
                                    />
                                    <Text style={styles.categoryItemName}>{cat}</Text>
                                  </View>
                                  <Text style={styles.categoryItemAmount}>${amount.toFixed(2)}</Text>
                                </TouchableOpacity>
                              );
                            })}
                        </View>
                        
                        {/* Show selected category details */}
                        {selectedCategory && selectedPeriod === `month-${month}` && (
                          <View style={styles.categoryDetails}>
                            <Text style={styles.categoryDetailsTitle}>
                              {selectedCategory} - {formatMonth(month)}
                            </Text>
                            <Text style={styles.categoryDetailsAmount}>
                              ${monthlyCategoryData[selectedCategory].toFixed(2)}
                            </Text>
                            <Text style={styles.categoryDetailsPercent}>
                              {((monthlyCategoryData[selectedCategory] / data.expenses) * 100).toFixed(1)}% of total expenses
                            </Text>
                          </View>
                        )}
                      </>
                    ) : (
                      <Text style={styles.noExpensesText}>No expenses this month</Text>
                    )}
                  </>
                )}

                {/* Budget Comparison Bar Chart */}
                {viewMode.month === 'budget' && (
                  <>
                    {budgetChartData ? (
                      <View style={styles.budgetChartContainer}>
                        <Text style={styles.budgetChartTitle}>Spending vs Budget</Text>
                        <HorizontalBudgetBars data={budgetChartData} maxBudget={maxBudgetValue} />
                      </View>
                    ) : (
                      <Text style={styles.noExpensesText}>No budget data for this month</Text>
                    )}
                  </>
                )}
                
                <View style={styles.summaryRow}>
                  <Text style={styles.label}>Income:</Text>
                  <Text style={styles.incomeAmount}>${data.income.toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.label}>Expenses:</Text>
                  <Text style={styles.expenseAmount}>${data.expenses.toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.label}>Net:</Text>
                  <Text style={[styles.netAmount, data.income - data.expenses >= 0 ? styles.positive : styles.negative]}>
                    ${(data.income - data.expenses).toFixed(2)}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Yearly Summary */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Yearly Summary</Text>
          {sortedYears.length > 0 && (
            <View style={styles.viewModeToggle}>
              <TouchableOpacity
                style={[styles.toggleButton, viewMode.year === 'pie' && styles.toggleButtonActive]}
                onPress={() => setViewMode({ ...viewMode, year: 'pie' })}>
                <Text style={[styles.toggleButtonText, viewMode.year === 'pie' && styles.toggleButtonTextActive]}>
                  Pie
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, viewMode.year === 'budget' && styles.toggleButtonActive]}
                onPress={() => setViewMode({ ...viewMode, year: 'budget' })}>
                <Text style={[styles.toggleButtonText, viewMode.year === 'budget' && styles.toggleButtonTextActive]}>
                  Budget
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {sortedYears.length === 0 ? (
          <Text style={styles.emptyText}>No data yet</Text>
        ) : (
          sortedYears.map(([year, data]) => {
            const yearlyCategoryData = getYearlyCategoryData(transactions, year);
            const pieData = preparePieChartData(yearlyCategoryData);
            const yearBudgets = getBudgetsForPeriod('year', year);
            const budgetChartData = prepareBudgetChartData(transactions, yearBudgets, 'year', year);
            const maxBudgetValue = yearBudgets.length > 0 
              ? Math.max(...yearBudgets.map(b => b.amount)) * 1.2 
              : 100;
            
            return (
              <View key={year} style={styles.summaryCard}>
                <Text style={styles.periodLabel}>{formatYear(year)}</Text>
                
                {/* Pie Chart for Yearly Spending by Category */}
                {viewMode.year === 'pie' && (
                  <>
                    {pieData && data.expenses > 0 ? (
                      <>
                        <View style={styles.chartContainer}>
                          <PieChart
                            data={pieData}
                            radius={90}
                            textColor="#333"
                            textSize={12}
                            showText={false}
                            focusOnPress={true}
                            showValuesAsLabels={false}
                            labelsPosition="outward"
                            innerRadius={0}
                            innerCircleColor="#fff"
                            donut={false}
                            centerLabelComponent={() => (
                              <View style={styles.centerLabel}>
                                <Text style={styles.centerLabelText}>Total</Text>
                                <Text style={styles.centerLabelAmount}>
                                  ${data.expenses.toFixed(2)}
                                </Text>
                              </View>
                            )}
                          />
                        </View>
                        
                        {/* Category Breakdown - Clickable */}
                        <View style={styles.categoryBreakdown}>
                          {Object.entries(yearlyCategoryData)
                            .filter(([_, amount]) => amount > 0)
                            .sort((a, b) => b[1] - a[1])
                            .map(([cat, amount]) => {
                              const isSelected = selectedCategory === cat && selectedPeriod === `year-${year}`;
                              const categoryColor = CATEGORY_COLORS[cat] || '#C9CBCF';
                              // Convert hex to rgba for opacity
                              const hexToRgba = (hex, opacity) => {
                                const r = parseInt(hex.slice(1, 3), 16);
                                const g = parseInt(hex.slice(3, 5), 16);
                                const b = parseInt(hex.slice(5, 7), 16);
                                return `rgba(${r}, ${g}, ${b}, ${opacity})`;
                              };
                              return (
                                <TouchableOpacity
                                  key={cat}
                                  style={[
                                    styles.categoryItem,
                                    isSelected && {
                                      backgroundColor: hexToRgba(categoryColor, 0.2),
                                      borderColor: categoryColor,
                                      borderWidth: 2,
                                    },
                                  ]}
                                  onPress={() => {
                                    if (isSelected) {
                                      setSelectedCategory(null);
                                      setSelectedPeriod(null);
                                    } else {
                                      setSelectedCategory(cat);
                                      setSelectedPeriod(`year-${year}`);
                                    }
                                  }}>
                                  <View style={styles.categoryItemLeft}>
                                    <View
                                      style={[
                                        styles.categoryColorDot,
                                        { backgroundColor: CATEGORY_COLORS[cat] || '#C9CBCF' },
                                      ]}
                                    />
                                    <Text style={styles.categoryItemName}>{cat}</Text>
                                  </View>
                                  <Text style={styles.categoryItemAmount}>${amount.toFixed(2)}</Text>
                                </TouchableOpacity>
                              );
                            })}
                        </View>
                        
                        {/* Show selected category details */}
                        {selectedCategory && selectedPeriod === `year-${year}` && (
                          <View style={styles.categoryDetails}>
                            <Text style={styles.categoryDetailsTitle}>
                              {selectedCategory} - {formatYear(year)}
                            </Text>
                            <Text style={styles.categoryDetailsAmount}>
                              ${yearlyCategoryData[selectedCategory].toFixed(2)}
                            </Text>
                            <Text style={styles.categoryDetailsPercent}>
                              {((yearlyCategoryData[selectedCategory] / data.expenses) * 100).toFixed(1)}% of total expenses
                            </Text>
                          </View>
                        )}
                      </>
                    ) : (
                      <Text style={styles.noExpensesText}>No expenses this year</Text>
                    )}
                  </>
                )}

                {/* Budget Comparison Bar Chart */}
                {viewMode.year === 'budget' && (
                  <>
                    {budgetChartData ? (
                      <View style={styles.budgetChartContainer}>
                        <Text style={styles.budgetChartTitle}>Spending vs Budget</Text>
                        <HorizontalBudgetBars data={budgetChartData} maxBudget={maxBudgetValue} />
                      </View>
                    ) : (
                      <Text style={styles.noExpensesText}>No budget data for this year</Text>
                    )}
                  </>
                )}
                
                <View style={styles.summaryRow}>
                  <Text style={styles.label}>Income:</Text>
                  <Text style={styles.incomeAmount}>${data.income.toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.label}>Expenses:</Text>
                  <Text style={styles.expenseAmount}>${data.expenses.toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.label}>Net:</Text>
                  <Text style={[styles.netAmount, data.income - data.expenses >= 0 ? styles.positive : styles.negative]}>
                    ${(data.income - data.expenses).toFixed(2)}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.offWhite,
  },
  header: {
    backgroundColor: COLORS.white,
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.forestGreen,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },
  viewModeToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: COLORS.gray,
  },
  toggleButtonActive: {
    backgroundColor: COLORS.seaBlue,
    borderColor: COLORS.seaBlue,
  },
  toggleButtonText: {
    color: COLORS.gray,
    fontSize: 14,
    fontWeight: '600',
  },
  toggleButtonTextActive: {
    color: COLORS.white,
  },
  budgetChartContainer: {
    marginTop: 16,
    marginBottom: 16,
    alignItems: 'center',
    backgroundColor: COLORS.offWhite,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 10,
  },
  budgetChartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  periodLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: COLORS.gray,
  },
  incomeAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.seaBlue,
  },
  expenseAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.error,
  },
  netAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  positive: {
    color: COLORS.forestGreen,
  },
  negative: {
    color: COLORS.error,
  },
  categoryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.error,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.gray,
    marginTop: 20,
    fontSize: 16,
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 16,
    backgroundColor: COLORS.offWhite,
    borderRadius: 8,
    paddingVertical: 10,
  },
  noExpensesText: {
    textAlign: 'center',
    color: COLORS.gray,
    fontStyle: 'italic',
    marginVertical: 16,
    fontSize: 14,
  },
  categoryBreakdown: {
    marginTop: 12,
    marginBottom: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginBottom: 6,
    borderRadius: 8,
    backgroundColor: COLORS.offWhite,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  pieChart: {
    marginVertical: 8,
  },
  centerLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabelText: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '600',
  },
  centerLabelAmount: {
    fontSize: 16,
    color: COLORS.error,
    fontWeight: 'bold',
    marginTop: 4,
  },
  categoryItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkGray,
    flex: 1,
  },
  categoryItemAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.error,
  },
  categoryDetails: {
    marginTop: 12,
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.purple,
  },
  categoryDetailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.darkGray,
    marginBottom: 8,
  },
  categoryDetailsAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.error,
    marginBottom: 4,
  },
  categoryDetailsPercent: {
    fontSize: 14,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
});

