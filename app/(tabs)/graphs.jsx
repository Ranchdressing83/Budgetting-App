import { useBudget } from '@/components/BudgetContext';
import { useTransactions } from '@/components/TransactionsContext';
import {
  CATEGORY_COLORS,
  getCategoryGroup,
  getGraphCategoryLabel,
  GROUP_COLORS,
} from '@/constants/categories';
import { COLORS } from '@/constants/colors';
import {
  BUDGET_PERIOD_BIWEEKLY,
  calculateBudgetSpending,
  formatBiweeklyPeriodLabel,
  getBiweeklyPeriodKey,
  getBudgetName,
  getNextBiweeklyPeriodKey,
  getPreviousBiweeklyPeriodKey,
  transactionMatchesBudgetPeriod,
} from '@/utils/budgetUtils';
import {
  calculateGroupPeriodSummary,
  calculateWealthBuildingBreakdown,
} from '@/utils/monthlySummaryUtils';
import {
  getNextMonthKey,
  getPreviousMonthKey,
} from '@/utils/insightsUtils';
import { formatCurrency } from '@/utils/scorecardUtils';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

// Helper function to group transactions by bi-weekly pay period (1st–15th & 16th–end)
function groupByBiweekly(transactions) {
  const grouped = {};

  transactions.forEach((transaction) => {
    const periodKey = getBiweeklyPeriodKey(new Date(transaction.date));

    if (!grouped[periodKey]) {
      grouped[periodKey] = { income: 0, expenses: 0 };
    }

    if (transaction.type === 'income') {
      grouped[periodKey].income += transaction.amount;
    } else {
      grouped[periodKey].expenses += transaction.amount;
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

// Helper function to group expenses by category (rolls up graph category groups)
function groupByCategory(transactions) {
  const grouped = {};
  
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((transaction) => {
      const category = getGraphCategoryLabel(transaction.category || 'Other');
      if (!grouped[category]) {
        grouped[category] = 0;
      }
      grouped[category] += transaction.amount;
    });
  
  return grouped;
}

function groupByExpenseGroup(transactions) {
  const grouped = {};

  transactions
    .filter((t) => t.type === 'expense')
    .forEach((transaction) => {
      const groupName = getCategoryGroup(transaction.category);
      if (!grouped[groupName]) {
        grouped[groupName] = 0;
      }
      grouped[groupName] += transaction.amount;
    });

  return grouped;
}

// Helper function to get expenses by category for a specific bi-weekly period
function getBiweeklyCategoryData(transactions, periodKey) {
  const periodExpenses = transactions.filter((t) => {
    if (t.type !== 'expense') return false;
    return transactionMatchesBudgetPeriod(new Date(t.date), BUDGET_PERIOD_BIWEEKLY, periodKey);
  });

  return groupByCategory(periodExpenses);
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

function getBiweeklyGroupData(transactions, periodKey) {
  const periodExpenses = transactions.filter((t) => {
    if (t.type !== 'expense') return false;
    return transactionMatchesBudgetPeriod(new Date(t.date), BUDGET_PERIOD_BIWEEKLY, periodKey);
  });

  return groupByExpenseGroup(periodExpenses);
}

function getMonthlyGroupData(transactions, monthKey) {
  const monthExpenses = transactions.filter((t) => {
    if (t.type !== 'expense') return false;
    const date = new Date(t.date);
    const tMonthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    return tMonthKey === monthKey;
  });

  return groupByExpenseGroup(monthExpenses);
}

function getYearlyGroupData(transactions, yearKey) {
  const yearExpenses = transactions.filter((t) => {
    if (t.type !== 'expense') return false;
    const date = new Date(t.date);
    return date.getFullYear().toString() === yearKey;
  });

  return groupByExpenseGroup(yearExpenses);
}


// Helper function to convert category data to pie chart format
// react-native-gifted-charts expects: [{ value, color, label, text }]
function preparePieChartData(sliceData, colorMap = CATEGORY_COLORS) {
  const entries = Object.entries(sliceData).filter(([_, amount]) => amount > 0);
  
  if (entries.length === 0) return null;
  
  const chartData = entries.map(([label, amount]) => {
    const color = colorMap[label] || COLORS.gray;
    
    return {
      value: parseFloat(amount.toFixed(2)),
      color: color, // Must be hex color string like '#FF4444'
      label,
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
      return transactionMatchesBudgetPeriod(new Date(t.date), period, periodKey);
    })
    .forEach((t) => {
      if (!categorySpending[t.category]) {
        categorySpending[t.category] = 0;
      }
      categorySpending[t.category] += t.amount;
    });

  // Process each budget - create one bar per budget
  budgets.forEach((budget) => {
    const spending = calculateBudgetSpending(budget, transactions, periodKey);
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
      label: getBudgetName(budget),
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

function PeriodSummaryRollup({ summary }) {
  const remainingColor = summary.remainingCash >= 0 ? COLORS.accent : COLORS.error;

  return (
    <View style={rollupStyles.container}>
      <Text style={rollupStyles.title}>Period Summary</Text>
      <View style={rollupStyles.row}>
        <Text style={rollupStyles.label}>Income</Text>
        <Text style={rollupStyles.value}>{formatCurrency(summary.income)}</Text>
      </View>
      <View style={rollupStyles.row}>
        <Text style={rollupStyles.label}>Lifestyle</Text>
        <Text style={rollupStyles.value}>{formatCurrency(summary.lifestyle)}</Text>
      </View>
      <View style={rollupStyles.row}>
        <Text style={rollupStyles.label}>Essentials</Text>
        <Text style={rollupStyles.value}>{formatCurrency(summary.essentials)}</Text>
      </View>
      <View style={rollupStyles.row}>
        <Text style={rollupStyles.label}>Wealth</Text>
        <Text style={rollupStyles.value}>{formatCurrency(summary.wealth)}</Text>
      </View>
      {summary.otherSpending > 0 && (
        <View style={rollupStyles.row}>
          <Text style={rollupStyles.label}>Other</Text>
          <Text style={rollupStyles.value}>{formatCurrency(summary.otherSpending)}</Text>
        </View>
      )}
      <View style={[rollupStyles.row, rollupStyles.totalRow]}>
        <Text style={rollupStyles.totalLabel}>Remaining Cash</Text>
        <Text style={[rollupStyles.totalValue, { color: remainingColor }]}>
          {formatCurrency(summary.remainingCash)}
        </Text>
      </View>
    </View>
  );
}

function WealthBuildingView({ transactions, period, periodKey }) {
  const { breakdown, total } = calculateWealthBuildingBreakdown(transactions, period, periodKey);
  const entries = Object.entries(breakdown);

  if (total <= 0) {
    return <Text style={styles.noExpensesText}>No wealth building activity this period</Text>;
  }

  return (
    <View style={rollupStyles.container}>
      <Text style={rollupStyles.title}>Wealth Building</Text>
      {entries.map(([category, amount]) => (
        <View key={category} style={rollupStyles.row}>
          <View style={rollupStyles.wealthLabelRow}>
            <View
              style={[
                styles.categoryColorDot,
                { backgroundColor: CATEGORY_COLORS[category] || COLORS.gray },
              ]}
            />
            <Text style={rollupStyles.label}>{category}</Text>
          </View>
          <Text style={rollupStyles.value}>{formatCurrency(amount)}</Text>
        </View>
      ))}
      <View style={[rollupStyles.row, rollupStyles.totalRow]}>
        <Text style={rollupStyles.totalLabel}>Total Wealth Building</Text>
        <Text style={[rollupStyles.totalValue, { color: COLORS.accent }]}>
          {formatCurrency(total)}
        </Text>
      </View>
    </View>
  );
}

function PeriodNavigator({ label, onPrevious, onNext, isCurrent, canGoNext = true }) {
  return (
    <View style={styles.periodNavigator}>
      <TouchableOpacity style={styles.navButton} onPress={onPrevious}>
        <Text style={styles.navButtonText}>← Previous</Text>
      </TouchableOpacity>
      <Text style={styles.navLabel}>{label}{isCurrent ? ' (Current)' : ''}</Text>
      <TouchableOpacity
        style={[styles.navButton, !canGoNext && styles.navButtonDisabled]}
        onPress={canGoNext ? onNext : undefined}
        disabled={!canGoNext}>
        <Text style={[styles.navButtonText, !canGoNext && styles.navButtonTextDisabled]}>
          Next →
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function GraphsScreen() {
  const router = useRouter();
  const { transactions } = useTransactions();
  const { getBudgetsForPeriod } = useBudget();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [chartGrouping, setChartGrouping] = useState('category');
  const [viewMode, setViewMode] = useState({ biweekly: 'pie', month: 'pie', year: 'pie' });

  const sliceColorMap = chartGrouping === 'groups' ? GROUP_COLORS : CATEGORY_COLORS;

  const renderChartGroupingToggle = () => (
    <View style={styles.chartGroupingToggle}>
      {[
        { key: 'category', label: 'Category' },
        { key: 'groups', label: 'Groups' },
      ].map(({ key, label }) => (
        <TouchableOpacity
          key={key}
          style={[
            styles.groupingButton,
            chartGrouping === key && styles.groupingButtonActive,
          ]}
          onPress={() => {
            setChartGrouping(key);
            setSelectedCategory(null);
            setSelectedPeriod(null);
          }}>
          <Text
            style={[
              styles.groupingButtonText,
              chartGrouping === key && styles.groupingButtonTextActive,
            ]}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderViewToggle = (periodKey, modes = ['pie', 'budget'], compact = false) => (
    <View style={[styles.viewModeToggle, compact && styles.viewModeToggleCompact]}>
      {modes.map((mode) => (
        <TouchableOpacity
          key={mode}
          style={[
            styles.toggleButton,
            compact && styles.toggleButtonCompact,
            viewMode[periodKey] === mode && styles.toggleButtonActive,
          ]}
          onPress={() => setViewMode({ ...viewMode, [periodKey]: mode })}>
          <Text
            style={[
              styles.toggleButtonText,
              compact && styles.toggleButtonTextCompact,
              viewMode[periodKey] === mode && styles.toggleButtonTextActive,
            ]}>
            {mode === 'pie' ? 'Pie' : mode === 'budget' ? 'Budget' : 'Wealth'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const biweeklyData = groupByBiweekly(transactions);
  const monthlyData = groupByMonth(transactions);
  const yearlyData = groupByYear(transactions);

  const getCurrentMonthKey = () => {
    const today = new Date();
    return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  const getCurrentYearKey = () => {
    return new Date().getFullYear().toString();
  };

  const currentBiweeklyKey = getBiweeklyPeriodKey(new Date());
  const currentMonthKey = getCurrentMonthKey();
  const currentYearKey = getCurrentYearKey();

  const [selectedBiweeklyKey, setSelectedBiweeklyKey] = useState(currentBiweeklyKey);
  const [selectedMonthKey, setSelectedMonthKey] = useState(currentMonthKey);

  const sortedBiweeks = useMemo(() => {
    const data = biweeklyData[selectedBiweeklyKey];
    return data
      ? [[selectedBiweeklyKey, data]]
      : [[selectedBiweeklyKey, { expenses: 0, income: 0, transactions: [] }]];
  }, [biweeklyData, selectedBiweeklyKey]);

  const sortedMonths = useMemo(() => {
    const data = monthlyData[selectedMonthKey];
    return data ? [[selectedMonthKey, data]] : [[selectedMonthKey, { expenses: 0, income: 0, transactions: [] }]];
  }, [monthlyData, selectedMonthKey]);

  const sortedYears = yearlyData[currentYearKey] ? [[currentYearKey, yearlyData[currentYearKey]]] : [];

  const formatMonth = (monthKey) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatYear = (yearKey) => {
    return yearKey;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/home')} activeOpacity={0.7}>
            <Image source={require('@/assets/images/logo.png')} style={styles.headerLogo} />
          </TouchableOpacity>
          <Text style={styles.title}>Spending Analysis</Text>
        </View>
        {renderChartGroupingToggle()}
      </View>

      {/* Bi-Weekly Summary */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Bi-Weekly Summary</Text>
          {sortedBiweeks.length > 0 && renderViewToggle('biweekly', ['pie', 'budget'])}
        </View>
        <PeriodNavigator
          label={formatBiweeklyPeriodLabel(selectedBiweeklyKey)}
          onPrevious={() => setSelectedBiweeklyKey(getPreviousBiweeklyPeriodKey(selectedBiweeklyKey))}
          onNext={() => setSelectedBiweeklyKey(getNextBiweeklyPeriodKey(selectedBiweeklyKey))}
          isCurrent={selectedBiweeklyKey === currentBiweeklyKey}
          canGoNext={selectedBiweeklyKey !== currentBiweeklyKey}
        />
          {sortedBiweeks.length === 0 ? (
              <Text style={styles.emptyText}>No data yet</Text>
            ) : (
              sortedBiweeks.map(([periodKey, data]) => {
                const biweeklySliceData =
                  chartGrouping === 'groups'
                    ? getBiweeklyGroupData(transactions, periodKey)
                    : getBiweeklyCategoryData(transactions, periodKey);
                const pieData = preparePieChartData(biweeklySliceData, sliceColorMap);
                const biweeklyBudgets = getBudgetsForPeriod(BUDGET_PERIOD_BIWEEKLY, periodKey);
                const budgetChartData = prepareBudgetChartData(
                  transactions,
                  biweeklyBudgets,
                  BUDGET_PERIOD_BIWEEKLY,
                  periodKey,
                );
                const periodSummary = calculateGroupPeriodSummary(
                  transactions,
                  BUDGET_PERIOD_BIWEEKLY,
                  periodKey,
                );
                const maxBudgetValue = biweeklyBudgets.length > 0 
                  ? Math.max(...biweeklyBudgets.map(b => b.amount)) * 1.2 
                  : 100;
                
                return (
                  <View key={periodKey} style={styles.summaryCard}>
                    <Text style={styles.periodLabel}>{formatBiweeklyPeriodLabel(periodKey)}</Text>
                    
                    {/* Pie Chart for Bi-Weekly Spending by Category */}
                    {viewMode.biweekly === 'pie' && (
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
                              {Object.entries(biweeklySliceData)
                                .filter(([_, amount]) => amount > 0)
                                .sort((a, b) => b[1] - a[1])
                                .map(([cat, amount]) => {
                                  const isSelected =
                                    selectedCategory === cat &&
                                    selectedPeriod === `biweekly-${periodKey}`;
                                  const categoryColor = sliceColorMap[cat] || '#C9CBCF';
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
                                          setSelectedPeriod(`biweekly-${periodKey}`);
                                        }
                                      }}>
                                      <View style={styles.categoryItemLeft}>
                                        <View
                                          style={[
                                            styles.categoryColorDot,
                                            { backgroundColor: sliceColorMap[cat] || '#C9CBCF' },
                                          ]}
                                        />
                                        <Text style={styles.categoryItemName}>{cat}</Text>
                                      </View>
                                      <Text style={styles.categoryItemAmount}>
                                        ${amount.toFixed(2)}
                                      </Text>
                                    </TouchableOpacity>
                                  );
                                })}
                            </View>

                            {/* Show selected category details */}
                            {selectedCategory && selectedPeriod === `biweekly-${periodKey}` && (
                              <View style={styles.categoryDetails}>
                                <Text style={styles.categoryDetailsTitle}>
                                  {selectedCategory} - {formatBiweeklyPeriodLabel(periodKey)}
                                </Text>
                                <Text style={styles.categoryDetailsAmount}>
                                  ${biweeklySliceData[selectedCategory].toFixed(2)}
                                </Text>
                                <Text style={styles.categoryDetailsPercent}>
                                  {(
                                    (biweeklySliceData[selectedCategory] / data.expenses) *
                                    100
                                  ).toFixed(1)}
                                  % of total expenses
                                </Text>
                              </View>
                            )}
                          </>
                        ) : (
                          <Text style={styles.noExpensesText}>No expenses this period</Text>
                        )}
                      </>
                    )}

                    {/* Budget Comparison Bar Chart */}
                    {viewMode.biweekly === 'budget' && (
                      <>
                        {budgetChartData ? (
                          <View style={styles.budgetChartContainer}>
                            <Text style={styles.budgetChartTitle}>Spending vs Budget</Text>
                            <HorizontalBudgetBars data={budgetChartData} maxBudget={maxBudgetValue} />
                          </View>
                        ) : (
                          <Text style={styles.noExpensesText}>No budget data for this period</Text>
                        )}
                      </>
                    )}

                <PeriodSummaryRollup summary={periodSummary} />
              </View>
            );
          })
        )}
      </View>

      {/* Monthly Summary */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Monthly Summary</Text>
          {sortedMonths.length > 0 && renderViewToggle('month', ['pie', 'budget'])}
        </View>
        <PeriodNavigator
          label={formatMonth(selectedMonthKey)}
          onPrevious={() => setSelectedMonthKey(getPreviousMonthKey(selectedMonthKey))}
          onNext={() => setSelectedMonthKey(getNextMonthKey(selectedMonthKey))}
          isCurrent={selectedMonthKey === currentMonthKey}
          canGoNext={selectedMonthKey !== currentMonthKey}
        />
        {sortedMonths.length === 0 ? (
          <Text style={styles.emptyText}>No data yet</Text>
        ) : (
          sortedMonths.map(([month, data]) => {
            const monthlySliceData =
              chartGrouping === 'groups'
                ? getMonthlyGroupData(transactions, month)
                : getMonthlyCategoryData(transactions, month);
            const pieData = preparePieChartData(monthlySliceData, sliceColorMap);
            const monthBudgets = getBudgetsForPeriod('month', month);
            const budgetChartData = prepareBudgetChartData(transactions, monthBudgets, 'month', month);
            const periodSummary = calculateGroupPeriodSummary(transactions, 'month', month);
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
                          {Object.entries(monthlySliceData)
                            .filter(([_, amount]) => amount > 0)
                            .sort((a, b) => b[1] - a[1])
                            .map(([cat, amount]) => {
                              const isSelected = selectedCategory === cat && selectedPeriod === `month-${month}`;
                              const categoryColor = sliceColorMap[cat] || '#C9CBCF';
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
                                        { backgroundColor: sliceColorMap[cat] || '#C9CBCF' },
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
                              ${monthlySliceData[selectedCategory].toFixed(2)}
                            </Text>
                            <Text style={styles.categoryDetailsPercent}>
                              {((monthlySliceData[selectedCategory] / data.expenses) * 100).toFixed(1)}% of total expenses
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

                <PeriodSummaryRollup summary={periodSummary} />
              </View>
            );
          })
        )}
      </View>

      {/* Yearly Summary */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Yearly Summary</Text>
          {sortedYears.length > 0 && renderViewToggle('year', ['pie', 'budget', 'wealth'], true)}
        </View>
        {sortedYears.length === 0 ? (
          <Text style={styles.emptyText}>No data yet</Text>
        ) : (
          sortedYears.map(([year, data]) => {
            const yearlySliceData =
              chartGrouping === 'groups'
                ? getYearlyGroupData(transactions, year)
                : getYearlyCategoryData(transactions, year);
            const pieData = preparePieChartData(yearlySliceData, sliceColorMap);
            const yearBudgets = getBudgetsForPeriod('year', year);
            const budgetChartData = prepareBudgetChartData(transactions, yearBudgets, 'year', year);
            const periodSummary = calculateGroupPeriodSummary(transactions, 'year', year);
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
                          {Object.entries(yearlySliceData)
                            .filter(([_, amount]) => amount > 0)
                            .sort((a, b) => b[1] - a[1])
                            .map(([cat, amount]) => {
                              const isSelected = selectedCategory === cat && selectedPeriod === `year-${year}`;
                              const categoryColor = sliceColorMap[cat] || '#C9CBCF';
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
                                        { backgroundColor: sliceColorMap[cat] || '#C9CBCF' },
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
                              ${yearlySliceData[selectedCategory].toFixed(2)}
                            </Text>
                            <Text style={styles.categoryDetailsPercent}>
                              {((yearlySliceData[selectedCategory] / data.expenses) * 100).toFixed(1)}% of total expenses
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

                {viewMode.year === 'wealth' && (
                  <WealthBuildingView transactions={transactions} period="year" periodKey={year} />
                )}

                <PeriodSummaryRollup summary={periodSummary} />
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
    backgroundColor: COLORS.pageBackground,
  },
  header: {
    backgroundColor: COLORS.tileBackground,
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primaryDark,
  },
  chartGroupingToggle: {
    flexDirection: 'row',
    marginTop: 16,
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 4,
  },
  groupingButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  groupingButtonActive: {
    backgroundColor: COLORS.tileBackground,
  },
  groupingButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
  },
  groupingButtonTextActive: {
    color: COLORS.primaryDark,
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
    gap: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.darkGray,
    flexShrink: 1,
  },
  periodNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    backgroundColor: COLORS.tileBackground,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  navButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  navButtonText: {
    fontSize: 13,
    color: COLORS.seaBlue,
    fontWeight: '600',
  },
  navButtonDisabled: {
    opacity: 0.35,
  },
  navButtonTextDisabled: {
    color: COLORS.gray,
  },
  navLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    color: COLORS.darkGray,
    fontWeight: '500',
    marginHorizontal: 8,
  },
  viewModeToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  viewModeToggleCompact: {
    gap: 4,
    flexShrink: 1,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: COLORS.gray,
  },
  toggleButtonCompact: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
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
  toggleButtonTextCompact: {
    fontSize: 11,
  },
  toggleButtonTextActive: {
    color: COLORS.white,
  },
  budgetChartContainer: {
    marginTop: 16,
    marginBottom: 16,
    alignItems: 'center',
    backgroundColor: COLORS.tileBackground,
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
    backgroundColor: COLORS.tileBackground,
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
    color: COLORS.accent,
  },
  negative: {
    color: COLORS.error,
  },
  categoryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.tileBackground,
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
    backgroundColor: COLORS.tileBackground,
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
    backgroundColor: COLORS.tileBackground,
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
    backgroundColor: COLORS.tileBackground,
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

const rollupStyles = StyleSheet.create({
  container: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: COLORS.darkGray,
    flex: 1,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
  wealthLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.darkGray,
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '700',
  },
});

