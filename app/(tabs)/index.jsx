import { useBudget } from '@/components/BudgetContext';
import { useTransactions } from '@/components/TransactionsContext';
import { CATEGORIES, CATEGORY_COLORS } from '@/constants/categories';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Modal, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

// Helper to get period keys
const getCurrentWeekKey = (date) => {
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
    const prevDaysToFirstMonday = prevJan1MondayBased === 0 ? 0 : 7 - prevDaysToFirstMonday;
    const prevFirstMonday = new Date(prevYear, 0, 1 + prevDaysToFirstMonday);
    prevFirstMonday.setHours(0, 0, 0, 0);
    const prevDaysSinceFirstMonday = Math.floor((date - prevFirstMonday) / (1000 * 60 * 60 * 24));
    const prevWeekNumber = Math.floor(prevDaysSinceFirstMonday / 7) + 1;
    return `${prevYear}-W${prevWeekNumber.toString().padStart(2, '0')}`;
  }
  
  const weekNumber = Math.floor(daysSinceFirstMonday / 7) + 1;
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
};

const getCurrentMonthKey = (date) => {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
};

const getCurrentYearKey = (date) => {
  return date.getFullYear().toString();
};

export default function HomeScreen() {
  const { transactions, addTransaction, deleteTransaction, updateTransaction, getExpenses, getIncome } = useTransactions();
  const { getBudget, budgets, addBudget, updateBudget, deleteBudget } = useBudget();
  const router = useRouter();
  const [viewMode, setViewMode] = useState('expenses'); // 'expenses', 'budget', 'income'

  // Expenses state
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Eating Out');
  const [place, setPlace] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('Eating Out');
  const [editPlace, setEditPlace] = useState('');
  const [editDate, setEditDate] = useState(null);
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showEditCategoryDropdown, setShowEditCategoryDropdown] = useState(false);

  // Income state
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeCategory, setIncomeCategory] = useState('Salary');

  // Budget state
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetCategory, setBudgetCategory] = useState('Overall');
  const [budgetPeriod, setBudgetPeriod] = useState('month');
  const [selectedPeriodDate, setSelectedPeriodDate] = useState(new Date());
  const [showPeriodDatePicker, setShowPeriodDatePicker] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState(null);
  const [editBudgetAmount, setEditBudgetAmount] = useState('');
  const [editBudgetCategory, setEditBudgetCategory] = useState('Overall');
  const [editBudgetPeriod, setEditBudgetPeriod] = useState('month');
  const [editPeriodDate, setEditPeriodDate] = useState(new Date());
  const [showEditPeriodDatePicker, setShowEditPeriodDatePicker] = useState(false);
  const [showBudgetCategoryDropdown, setShowBudgetCategoryDropdown] = useState(false);
  const [showEditBudgetCategoryDropdown, setShowEditBudgetCategoryDropdown] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [editIsRecurring, setEditIsRecurring] = useState(false);

  const expenses = getExpenses();
  const income = getIncome();

  // Budget helper functions
  const getPeriodKey = (period, date) => {
    if (period === 'week') {
      return getCurrentWeekKey(date);
    } else if (period === 'month') {
      return getCurrentMonthKey(date);
    } else {
      return getCurrentYearKey(date);
    }
  };

  const formatPeriod = (budget) => {
    if (budget.isRecurring) {
      return `Recurring ${budget.period.charAt(0).toUpperCase() + budget.period.slice(1)}`;
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
    } else if (budget.period === 'month') {
      const [year, month] = budget.periodKey.split('-');
      const date = new Date(year, parseInt(month) - 1);
      return `Month: ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    } else {
      return `Year: ${budget.periodKey}`;
    }
  };

  // Calculate spending for each budget
  const budgetsWithSpending = useMemo(() => {
    const now = new Date();
    const currentWeekKey = getCurrentWeekKey(now);
    const currentMonthKey = getCurrentMonthKey(now);
    const currentYearKey = getCurrentYearKey(now);

    return budgets.map((budget) => {
      let spending = 0;
      
      // For recurring budgets, use current period key
      const periodKey = budget.isRecurring 
        ? (budget.period === 'week' ? currentWeekKey : budget.period === 'month' ? currentMonthKey : currentYearKey)
        : budget.periodKey;
      
      if (budget.category === 'Overall') {
        const periodTransactions = transactions.filter((t) => {
          if (t.type !== 'expense') return false;
          const date = new Date(t.date);
          if (budget.period === 'week') {
            const tWeekKey = getCurrentWeekKey(date);
            return tWeekKey === periodKey;
          } else if (budget.period === 'month') {
            const tMonthKey = getCurrentMonthKey(date);
            return tMonthKey === periodKey;
          } else {
            const tYearKey = getCurrentYearKey(date);
            return tYearKey === periodKey;
          }
        });
        spending = periodTransactions.reduce((sum, t) => sum + t.amount, 0);
      } else {
        const periodTransactions = transactions.filter((t) => {
          if (t.type !== 'expense' || t.category !== budget.category) return false;
          const date = new Date(t.date);
          if (budget.period === 'week') {
            const tWeekKey = getCurrentWeekKey(date);
            return tWeekKey === periodKey;
          } else if (budget.period === 'month') {
            const tMonthKey = getCurrentMonthKey(date);
            return tMonthKey === periodKey;
          } else {
            const tYearKey = getCurrentYearKey(date);
            return tYearKey === periodKey;
          }
        });
        spending = periodTransactions.reduce((sum, t) => sum + t.amount, 0);
      }

      return { ...budget, spending };
    });
  }, [budgets, transactions]);

  // Expenses handlers
  const checkBudgetAlerts = (expenseAmount, expenseCategory, expenseDate) => {
    const date = new Date(expenseDate);
    const weekKey = getCurrentWeekKey(date);
    const monthKey = getCurrentMonthKey(date);
    const yearKey = getCurrentYearKey(date);

    const overallWeekBudget = getBudget('Overall', 'week', weekKey);
    const overallMonthBudget = getBudget('Overall', 'month', monthKey);
    const overallYearBudget = getBudget('Overall', 'year', yearKey);
    const categoryWeekBudget = getBudget(expenseCategory, 'week', weekKey);
    const categoryMonthBudget = getBudget(expenseCategory, 'month', monthKey);
    const categoryYearBudget = getBudget(expenseCategory, 'year', yearKey);

    const budgetsToCheck = [
      overallWeekBudget,
      overallMonthBudget,
      overallYearBudget,
      categoryWeekBudget,
      categoryMonthBudget,
      categoryYearBudget,
    ].filter(Boolean);

    setTimeout(() => {
      budgetsToCheck.forEach((budget) => {
        let currentSpending = 0;
        const periodTransactions = transactions.filter((t) => {
          if (t.type !== 'expense') return false;
          const tDate = new Date(t.date);
          if (budget.category === 'Overall') {
            if (budget.period === 'week') {
              const tWeekKey = getCurrentWeekKey(tDate);
              return tWeekKey === budget.periodKey;
            } else if (budget.period === 'month') {
              const tMonthKey = getCurrentMonthKey(tDate);
              return tMonthKey === budget.periodKey;
            } else {
              const tYearKey = getCurrentYearKey(tDate);
              return tYearKey === budget.periodKey;
            }
          } else {
            if (t.category !== budget.category) return false;
            if (budget.period === 'week') {
              const tWeekKey = getCurrentWeekKey(tDate);
              return tWeekKey === budget.periodKey;
            } else if (budget.period === 'month') {
              const tMonthKey = getCurrentMonthKey(tDate);
              return tMonthKey === budget.periodKey;
            } else {
              const tYearKey = getCurrentYearKey(tDate);
              return tYearKey === budget.periodKey;
            }
          }
        });
        currentSpending = periodTransactions.reduce((sum, t) => sum + t.amount, 0);
        const percentage = (currentSpending / budget.amount) * 100;

        if (percentage >= 100) {
          Alert.alert(
            'Budget Exceeded!',
            `${budget.category === 'Overall' ? 'Overall' : budget.category} budget for ${budget.period} exceeded! You've spent ${percentage.toFixed(1)}% of your budget.`,
            [{ text: 'OK' }]
          );
        } else if (percentage >= 95 && percentage < 100) {
          Alert.alert(
            'Budget Warning',
            `You're at ${percentage.toFixed(1)}% of your ${budget.category === 'Overall' ? 'overall' : budget.category} ${budget.period} budget.`,
            [{ text: 'OK' }]
          );
        } else if (percentage >= 90 && percentage < 95) {
          Alert.alert(
            'Budget Alert',
            `You're at ${percentage.toFixed(1)}% of your ${budget.category === 'Overall' ? 'overall' : budget.category} ${budget.period} budget.`,
            [{ text: 'OK' }]
          );
        } else if (percentage >= 75 && percentage < 90) {
          Alert.alert(
            'Budget Notice',
            `You've reached ${percentage.toFixed(1)}% of your ${budget.category === 'Overall' ? 'overall' : budget.category} ${budget.period} budget.`,
            [{ text: 'OK' }]
          );
        } else if (percentage >= 50 && percentage < 75) {
          Alert.alert(
            'Budget Update',
            `You've reached ${percentage.toFixed(1)}% of your ${budget.category === 'Overall' ? 'overall' : budget.category} ${budget.period} budget.`,
            [{ text: 'OK' }]
          );
        }
      });
    }, 200);
  };

  const handleAddExpense = () => {
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    const expenseDate = selectedDate || new Date();
    addTransaction({
      type: 'expense',
      amount: numAmount,
      category,
      place: place.trim() || undefined,
      description: description.trim() || undefined,
      date: expenseDate.toISOString(),
    });

    checkBudgetAlerts(numAmount, category, expenseDate.toISOString());
    setAmount('');
    setCategory('Eating Out');
    setPlace('');
    setSelectedDate(null);
    setDescription('');
  };

  const handleEdit = (expense) => {
    setEditingId(expense.id);
    setEditAmount(expense.amount.toString());
    setEditCategory(expense.category);
    setEditPlace(expense.place || '');
    setEditDate(expense.date ? new Date(expense.date) : null);
    setEditDescription(expense.description || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditAmount('');
    setEditCategory('Eating Out');
    setEditPlace('');
    setEditDate(null);
    setEditDescription('');
  };

  const handleSaveEdit = () => {
    const numAmount = parseFloat(editAmount);
    if (!editAmount || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    const expenseDate = editDate || new Date();
    updateTransaction(editingId, {
      amount: numAmount,
      category: editCategory,
      place: editPlace.trim() || undefined,
      description: editDescription.trim() || undefined,
      date: expenseDate.toISOString(),
    });

    handleCancelEdit();
  };

  const handleDeleteExpense = (id) => {
    Alert.alert('Delete Expense', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteTransaction(id),
      },
    ]);
  };

  // Income handlers
  const handleAddIncome = () => {
    const numAmount = parseFloat(incomeAmount);
    if (!incomeAmount || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    addTransaction({
      type: 'income',
      amount: numAmount,
      category: incomeCategory,
      date: new Date().toISOString(),
    });

    setIncomeAmount('');
    setIncomeCategory('Salary');
  };

  const handleDeleteIncome = (id) => {
    Alert.alert('Delete Income', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteTransaction(id),
      },
    ]);
  };

  // Budget handlers
  const handleAddBudget = () => {
    const numAmount = parseFloat(budgetAmount);
    if (!budgetAmount || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid budget amount');
      return;
    }

    const periodKey = isRecurring ? 'recurring' : getPeriodKey(budgetPeriod, selectedPeriodDate);
    addBudget({
      amount: numAmount,
      category: budgetCategory,
      period: budgetPeriod,
      periodKey: periodKey,
      isRecurring: isRecurring,
    });

    setBudgetAmount('');
    setBudgetCategory('Overall');
    setBudgetPeriod('month');
    setSelectedPeriodDate(new Date());
    setIsRecurring(false);
  };

  const handleEditBudget = (budget) => {
    setEditingBudgetId(budget.id);
    setEditBudgetAmount(budget.amount.toString());
    setEditBudgetCategory(budget.category);
    setEditBudgetPeriod(budget.period);
    setEditIsRecurring(budget.isRecurring || false);
    if (budget.isRecurring) {
      setEditPeriodDate(new Date());
    } else if (budget.period === 'week') {
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
      setEditPeriodDate(weekStart);
    } else if (budget.period === 'month') {
      const [year, month] = budget.periodKey.split('-');
      setEditPeriodDate(new Date(year, parseInt(month) - 1, 1));
    } else {
      setEditPeriodDate(new Date(parseInt(budget.periodKey), 0, 1));
    }
  };

  const handleCancelEditBudget = () => {
    setEditingBudgetId(null);
    setEditBudgetAmount('');
    setEditBudgetCategory('Overall');
    setEditBudgetPeriod('month');
    setEditPeriodDate(new Date());
    setEditIsRecurring(false);
  };

  const handleSaveEditBudget = () => {
    const numAmount = parseFloat(editBudgetAmount);
    if (!editBudgetAmount || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid budget amount');
      return;
    }

    const periodKey = editIsRecurring ? 'recurring' : getPeriodKey(editBudgetPeriod, editPeriodDate);
    updateBudget(editingBudgetId, {
      amount: numAmount,
      category: editBudgetCategory,
      period: editBudgetPeriod,
      periodKey: periodKey,
      isRecurring: editIsRecurring,
    });

    handleCancelEditBudget();
  };

  const handleDeleteBudget = (id) => {
    Alert.alert('Delete Budget', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteBudget(id),
      },
    ]);
  };

  const formatDateDisplay = (date) => {
    if (!date) return 'Today';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);
    if (dateToCheck.getTime() === today.getTime()) {
      return 'Today';
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderExpensesView = () => (
    <>
      <View style={styles.form}>
        <Text style={styles.label}>Amount</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Category</Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowCategoryDropdown(true)}>
          <Text style={[styles.dropdownButtonText, { color: category ? '#333' : '#999' }]}>
            {category || 'Select Category'}
          </Text>
          <View
            style={[
              styles.categoryColorIndicator,
              { backgroundColor: CATEGORY_COLORS[category] || '#9E9E9E' },
            ]}
          />
        </TouchableOpacity>

        <Modal
          visible={showCategoryDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowCategoryDropdown(false)}>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowCategoryDropdown(false)}>
            <View style={styles.dropdownMenu} onStartShouldSetResponder={() => true}>
              <ScrollView style={styles.dropdownScrollView}>
                {CATEGORIES.map((cat) => {
                  const isSelected = category === cat;
                  const categoryColor = CATEGORY_COLORS[cat] || '#9E9E9E';
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.dropdownItem,
                        isSelected && {
                          backgroundColor: categoryColor + '20',
                          borderLeftWidth: 4,
                          borderLeftColor: categoryColor,
                        },
                      ]}
                      onPress={() => {
                        setCategory(cat);
                        setShowCategoryDropdown(false);
                      }}>
                      <View style={styles.dropdownItemLeft}>
                        <View
                          style={[
                            styles.categoryColorDot,
                            { backgroundColor: categoryColor },
                          ]}
                        />
                        <Text style={[styles.dropdownItemText, isSelected && { fontWeight: '600' }]}>
                          {cat}
                        </Text>
                      </View>
                      {isSelected && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        <Text style={styles.label}>Place of Purchase (Optional)</Text>
        <TextInput
          style={styles.input}
          value={place}
          onChangeText={setPlace}
          placeholder="e.g., Walmart, Amazon, Gas Station"
          autoCapitalize="words"
        />

        <Text style={styles.label}>Date (Optional)</Text>
        <View style={styles.dateSection}>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateButtonText}>
              {selectedDate ? formatDateDisplay(selectedDate) : 'Today'}
            </Text>
          </TouchableOpacity>
          {selectedDate && (
            <TouchableOpacity
              style={styles.clearDateButton}
              onPress={() => setSelectedDate(null)}>
              <Text style={styles.clearDateText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
        {showDatePicker && (
          <View style={styles.datePickerContainer}>
            <View style={styles.datePickerWrapper}>
              <View style={styles.datePickerHeader}>
                <Text style={styles.datePickerHeaderText}>Select Date</Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(false)}
                  style={styles.datePickerDoneButton}>
                  <Text style={styles.datePickerDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => {
                  if (Platform.OS === 'android') {
                    setShowDatePicker(false);
                  }
                  if (date) {
                    setSelectedDate(date);
                  }
                }}
                maximumDate={new Date()}
                style={styles.datePicker}
              />
            </View>
          </View>
        )}

        <Text style={styles.label}>Description (Optional)</Text>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder="e.g., Lunch with team, Birthday gift, etc."
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity style={styles.addButton} onPress={handleAddExpense}>
          <Text style={styles.addButtonText}>Add Expense</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Recent Expenses</Text>
      </View>

      <View style={styles.list}>
        {expenses.length === 0 ? (
          <Text style={styles.emptyText}>No expenses yet. Add one above!</Text>
        ) : (
          expenses
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map((expense) => (
              <View key={expense.id}>
                {editingId === expense.id ? (
                  <View style={styles.editForm}>
                    <Text style={styles.editFormTitle}>Edit Expense</Text>
                    
                    <Text style={styles.label}>Amount</Text>
                    <TextInput
                      style={styles.input}
                      value={editAmount}
                      onChangeText={setEditAmount}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                    />

                    <Text style={styles.label}>Category</Text>
                    <TouchableOpacity
                      style={styles.dropdownButton}
                      onPress={() => setShowEditCategoryDropdown(true)}>
                      <Text style={[styles.dropdownButtonText, { color: editCategory ? '#333' : '#999' }]}>
                        {editCategory || 'Select Category'}
                      </Text>
                      <View
                        style={[
                          styles.categoryColorIndicator,
                          { backgroundColor: CATEGORY_COLORS[editCategory] || '#9E9E9E' },
                        ]}
                      />
                    </TouchableOpacity>

                    <Modal
                      visible={showEditCategoryDropdown}
                      transparent={true}
                      animationType="fade"
                      onRequestClose={() => setShowEditCategoryDropdown(false)}>
                      <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowEditCategoryDropdown(false)}>
                        <View style={styles.dropdownMenu} onStartShouldSetResponder={() => true}>
                          <ScrollView style={styles.dropdownScrollView}>
                            {CATEGORIES.map((cat) => {
                              const isSelected = editCategory === cat;
                              const categoryColor = CATEGORY_COLORS[cat] || '#9E9E9E';
                              return (
                                <TouchableOpacity
                                  key={cat}
                                  style={[
                                    styles.dropdownItem,
                                    isSelected && {
                                      backgroundColor: categoryColor + '20',
                                      borderLeftWidth: 4,
                                      borderLeftColor: categoryColor,
                                    },
                                  ]}
                                  onPress={() => {
                                    setEditCategory(cat);
                                    setShowEditCategoryDropdown(false);
                                  }}>
                                  <View style={styles.dropdownItemLeft}>
                                    <View
                                      style={[
                                        styles.categoryColorDot,
                                        { backgroundColor: categoryColor },
                                      ]}
                                    />
                                    <Text style={[styles.dropdownItemText, isSelected && { fontWeight: '600' }]}>
                                      {cat}
                                    </Text>
                                  </View>
                                  {isSelected && (
                                    <Text style={styles.checkmark}>✓</Text>
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        </View>
                      </TouchableOpacity>
                    </Modal>

                    <Text style={styles.label}>Place of Purchase (Optional)</Text>
                    <TextInput
                      style={styles.input}
                      value={editPlace}
                      onChangeText={setEditPlace}
                      placeholder="e.g., Walmart, Amazon, Gas Station"
                      autoCapitalize="words"
                    />

                    <Text style={styles.label}>Date (Optional)</Text>
                    <View style={styles.dateSection}>
                      <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowEditDatePicker(true)}>
                        <Text style={styles.dateButtonText}>
                          {editDate ? formatDateDisplay(editDate) : 'Today'}
                        </Text>
                      </TouchableOpacity>
                      {editDate && (
                        <TouchableOpacity
                          style={styles.clearDateButton}
                          onPress={() => setEditDate(null)}>
                          <Text style={styles.clearDateText}>Clear</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {showEditDatePicker && (
                      <View style={styles.datePickerContainer}>
                        <View style={styles.datePickerWrapper}>
                          <View style={styles.datePickerHeader}>
                            <Text style={styles.datePickerHeaderText}>Select Date</Text>
                            <TouchableOpacity
                              onPress={() => setShowEditDatePicker(false)}
                              style={styles.datePickerDoneButton}>
                              <Text style={styles.datePickerDoneText}>Done</Text>
                            </TouchableOpacity>
                          </View>
                          <DateTimePicker
                            value={editDate || new Date()}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(event, date) => {
                              if (Platform.OS === 'android') {
                                setShowEditDatePicker(false);
                              }
                              if (date) {
                                setEditDate(date);
                              }
                            }}
                            maximumDate={new Date()}
                            style={styles.datePicker}
                          />
                        </View>
                      </View>
                    )}

                    <Text style={styles.label}>Description (Optional)</Text>
                    <TextInput
                      style={styles.input}
                      value={editDescription}
                      onChangeText={setEditDescription}
                      placeholder="e.g., Lunch with team, Birthday gift, etc."
                      multiline
                      numberOfLines={3}
                    />

                    <View style={styles.editButtons}>
                      <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEdit}>
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.saveButton} onPress={handleSaveEdit}>
                        <Text style={styles.saveButtonText}>Save</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.expenseItem}>
                    <View style={styles.expenseInfo}>
                      <Text style={styles.expenseCategory}>{expense.category}</Text>
                      {expense.place && (
                        <Text style={styles.expensePlace}>{expense.place}</Text>
                      )}
                      {expense.description && (
                        <Text style={styles.expenseDescription}>{expense.description}</Text>
                      )}
                      <Text style={styles.expenseDate}>{formatDate(expense.date)}</Text>
                    </View>
                    <View style={styles.expenseRight}>
                      <Text style={styles.expenseAmount}>${expense.amount.toFixed(2)}</Text>
                      <View style={styles.expenseActions}>
                        <TouchableOpacity onPress={() => handleEdit(expense)}>
                          <Text style={styles.editButton}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteExpense(expense.id)}>
                          <Text style={styles.deleteButton}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            ))
        )}
      </View>
    </>
  );

  const renderIncomeView = () => (
    <>
      <View style={styles.form}>
        <Text style={styles.label}>Amount</Text>
        <TextInput
          style={styles.input}
          value={incomeAmount}
          onChangeText={setIncomeAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Category</Text>
        <TextInput
          style={styles.input}
          value={incomeCategory}
          onChangeText={setIncomeCategory}
          placeholder="Salary, Freelance, etc."
        />

        <TouchableOpacity style={styles.addButton} onPress={handleAddIncome}>
          <Text style={styles.addButtonText}>Add Income</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Income History</Text>
        <Text style={styles.totalText}>Total: ${income.reduce((sum, i) => sum + i.amount, 0).toFixed(2)}</Text>
      </View>

      <View style={styles.list}>
        {income.length === 0 ? (
          <Text style={styles.emptyText}>No income entries yet. Add one above!</Text>
        ) : (
          income
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map((entry) => (
              <View key={entry.id} style={styles.incomeItem}>
                <View style={styles.incomeInfo}>
                  <Text style={styles.incomeCategory}>{entry.category}</Text>
                  <Text style={styles.incomeDate}>{formatDate(entry.date)}</Text>
                </View>
                <View style={styles.incomeRight}>
                  <Text style={styles.incomeAmount}>${entry.amount.toFixed(2)}</Text>
                  <TouchableOpacity onPress={() => handleDeleteIncome(entry.id)}>
                    <Text style={styles.deleteButton}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
        )}
      </View>
    </>
  );

  const renderBudgetView = () => (
    <>
      {editingBudgetId === null ? (
        <View style={styles.form}>
          <Text style={styles.formTitle}>Add Budget</Text>

          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={styles.input}
            value={budgetAmount}
            onChangeText={setBudgetAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Category</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowBudgetCategoryDropdown(true)}>
            <Text style={[styles.dropdownButtonText, { color: budgetCategory ? '#333' : '#999' }]}>
              {budgetCategory || 'Select Category'}
            </Text>
            <View
              style={[
                styles.categoryColorIndicator,
                { backgroundColor: budgetCategory === 'Overall' ? '#4CAF50' : (CATEGORY_COLORS[budgetCategory] || '#9E9E9E') },
              ]}
            />
          </TouchableOpacity>

          <Modal
            visible={showBudgetCategoryDropdown}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowBudgetCategoryDropdown(false)}>
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowBudgetCategoryDropdown(false)}>
              <View style={styles.dropdownMenu} onStartShouldSetResponder={() => true}>
                <ScrollView style={styles.dropdownScrollView}>
                  <TouchableOpacity
                    style={[
                      styles.dropdownItem,
                      budgetCategory === 'Overall' && {
                        backgroundColor: '#4CAF5020',
                        borderLeftWidth: 4,
                        borderLeftColor: '#4CAF50',
                      },
                    ]}
                    onPress={() => {
                      setBudgetCategory('Overall');
                      setShowBudgetCategoryDropdown(false);
                    }}>
                    <View style={styles.dropdownItemLeft}>
                      <View
                        style={[
                          styles.categoryColorDot,
                          { backgroundColor: '#4CAF50' },
                        ]}
                      />
                      <Text style={[styles.dropdownItemText, budgetCategory === 'Overall' && { fontWeight: '600' }]}>
                        Overall
                      </Text>
                    </View>
                    {budgetCategory === 'Overall' && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                  {CATEGORIES.map((cat) => {
                    const isSelected = budgetCategory === cat;
                    const categoryColor = CATEGORY_COLORS[cat] || '#9E9E9E';
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.dropdownItem,
                          isSelected && {
                            backgroundColor: categoryColor + '20',
                            borderLeftWidth: 4,
                            borderLeftColor: categoryColor,
                          },
                        ]}
                        onPress={() => {
                          setBudgetCategory(cat);
                          setShowBudgetCategoryDropdown(false);
                        }}>
                        <View style={styles.dropdownItemLeft}>
                          <View
                            style={[
                              styles.categoryColorDot,
                              { backgroundColor: categoryColor },
                            ]}
                          />
                          <Text style={[styles.dropdownItemText, isSelected && { fontWeight: '600' }]}>
                            {cat}
                          </Text>
                        </View>
                        {isSelected && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>

          <Text style={styles.label}>Period</Text>
          <View style={styles.periodContainer}>
            {['week', 'month', 'year'].map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodButton,
                  budgetPeriod === period && styles.periodButtonActive,
                ]}
                onPress={() => setBudgetPeriod(period)}>
                <Text style={[styles.periodText, budgetPeriod === period && styles.periodTextActive]}>
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.recurringContainer}>
            <Text style={styles.label}>Recurring Budget</Text>
            <Text style={styles.recurringDescription}>
              Automatically applies to all future {budgetPeriod}s
            </Text>
            <View style={styles.switchContainer}>
              <Switch
                value={isRecurring}
                onValueChange={setIsRecurring}
                trackColor={{ false: '#e0e0e0', true: '#4CAF50' }}
                thumbColor={isRecurring ? '#fff' : '#f4f3f4'}
              />
              <Text style={styles.switchLabel}>
                {isRecurring ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>

          {!isRecurring && (
            <>
              <Text style={styles.label}>Select {budgetPeriod === 'week' ? 'Week' : budgetPeriod === 'month' ? 'Month' : 'Year'}</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowPeriodDatePicker(true)}>
                <Text style={styles.dateButtonText}>
                  {budgetPeriod === 'week'
                    ? selectedPeriodDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : budgetPeriod === 'month'
                    ? selectedPeriodDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                    : selectedPeriodDate.getFullYear().toString()}
                </Text>
              </TouchableOpacity>
            </>
          )}
          {showPeriodDatePicker && !isRecurring && (
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerWrapper}>
                <View style={styles.datePickerHeader}>
                  <Text style={styles.datePickerHeaderText}>Select {budgetPeriod === 'week' ? 'Week' : budgetPeriod === 'month' ? 'Month' : 'Year'}</Text>
                  <TouchableOpacity
                    onPress={() => setShowPeriodDatePicker(false)}
                    style={styles.datePickerDoneButton}>
                    <Text style={styles.datePickerDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={selectedPeriodDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    if (Platform.OS === 'android') {
                      setShowPeriodDatePicker(false);
                    }
                    if (date) {
                      setSelectedPeriodDate(date);
                    }
                  }}
                  style={styles.datePicker}
                />
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.addButton} onPress={handleAddBudget}>
            <Text style={styles.addButtonText}>Add Budget</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={styles.formTitle}>Edit Budget</Text>

          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={styles.input}
            value={editBudgetAmount}
            onChangeText={setEditBudgetAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Category</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowEditBudgetCategoryDropdown(true)}>
            <Text style={[styles.dropdownButtonText, { color: editBudgetCategory ? '#333' : '#999' }]}>
              {editBudgetCategory || 'Select Category'}
            </Text>
            <View
              style={[
                styles.categoryColorIndicator,
                { backgroundColor: editBudgetCategory === 'Overall' ? '#4CAF50' : (CATEGORY_COLORS[editBudgetCategory] || '#9E9E9E') },
              ]}
            />
          </TouchableOpacity>

          <Modal
            visible={showEditBudgetCategoryDropdown}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowEditBudgetCategoryDropdown(false)}>
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowEditBudgetCategoryDropdown(false)}>
              <View style={styles.dropdownMenu} onStartShouldSetResponder={() => true}>
                <ScrollView style={styles.dropdownScrollView}>
                  <TouchableOpacity
                    style={[
                      styles.dropdownItem,
                      editBudgetCategory === 'Overall' && {
                        backgroundColor: '#4CAF5020',
                        borderLeftWidth: 4,
                        borderLeftColor: '#4CAF50',
                      },
                    ]}
                    onPress={() => {
                      setEditBudgetCategory('Overall');
                      setShowEditBudgetCategoryDropdown(false);
                    }}>
                    <View style={styles.dropdownItemLeft}>
                      <View
                        style={[
                          styles.categoryColorDot,
                          { backgroundColor: '#4CAF50' },
                        ]}
                      />
                      <Text style={[styles.dropdownItemText, editBudgetCategory === 'Overall' && { fontWeight: '600' }]}>
                        Overall
                      </Text>
                    </View>
                    {editBudgetCategory === 'Overall' && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                  {CATEGORIES.map((cat) => {
                    const isSelected = editBudgetCategory === cat;
                    const categoryColor = CATEGORY_COLORS[cat] || '#9E9E9E';
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.dropdownItem,
                          isSelected && {
                            backgroundColor: categoryColor + '20',
                            borderLeftWidth: 4,
                            borderLeftColor: categoryColor,
                          },
                        ]}
                        onPress={() => {
                          setEditBudgetCategory(cat);
                          setShowEditBudgetCategoryDropdown(false);
                        }}>
                        <View style={styles.dropdownItemLeft}>
                          <View
                            style={[
                              styles.categoryColorDot,
                              { backgroundColor: categoryColor },
                            ]}
                          />
                          <Text style={[styles.dropdownItemText, isSelected && { fontWeight: '600' }]}>
                            {cat}
                          </Text>
                        </View>
                        {isSelected && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>

          <Text style={styles.label}>Period</Text>
          <View style={styles.periodContainer}>
            {['week', 'month', 'year'].map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodButton,
                  editBudgetPeriod === period && styles.periodButtonActive,
                ]}
                onPress={() => setEditBudgetPeriod(period)}>
                <Text style={[styles.periodText, editBudgetPeriod === period && styles.periodTextActive]}>
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.recurringContainer}>
            <Text style={styles.label}>Recurring Budget</Text>
            <Text style={styles.recurringDescription}>
              Automatically applies to all future {editBudgetPeriod}s
            </Text>
            <View style={styles.switchContainer}>
              <Switch
                value={editIsRecurring}
                onValueChange={setEditIsRecurring}
                trackColor={{ false: '#e0e0e0', true: '#4CAF50' }}
                thumbColor={editIsRecurring ? '#fff' : '#f4f3f4'}
              />
              <Text style={styles.switchLabel}>
                {editIsRecurring ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>

          {!editIsRecurring && (
            <>
              <Text style={styles.label}>Select {editBudgetPeriod === 'week' ? 'Week' : editBudgetPeriod === 'month' ? 'Month' : 'Year'}</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEditPeriodDatePicker(true)}>
                <Text style={styles.dateButtonText}>
                  {editBudgetPeriod === 'week'
                    ? editPeriodDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : editBudgetPeriod === 'month'
                    ? editPeriodDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                    : editPeriodDate.getFullYear().toString()}
                </Text>
              </TouchableOpacity>
            </>
          )}
          {showEditPeriodDatePicker && !editIsRecurring && (
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerWrapper}>
                <View style={styles.datePickerHeader}>
                  <Text style={styles.datePickerHeaderText}>Select {editBudgetPeriod === 'week' ? 'Week' : editBudgetPeriod === 'month' ? 'Month' : 'Year'}</Text>
                  <TouchableOpacity
                    onPress={() => setShowEditPeriodDatePicker(false)}
                    style={styles.datePickerDoneButton}>
                    <Text style={styles.datePickerDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={editPeriodDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    if (Platform.OS === 'android') {
                      setShowEditPeriodDatePicker(false);
                    }
                    if (date) {
                      setEditPeriodDate(date);
                    }
                  }}
                  style={styles.datePicker}
                />
              </View>
            </View>
          )}

          <View style={styles.editButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEditBudget}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveEditBudget}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Budgets</Text>
        {budgetsWithSpending.length === 0 ? (
          <Text style={styles.emptyText}>No budgets yet. Add one above!</Text>
        ) : (
          budgetsWithSpending.map((budget) => {
            return (
              <View key={budget.id} style={styles.budgetCard}>
                <View style={styles.budgetHeader}>
                  <View>
                    <Text style={styles.budgetCategory}>
                      {budget.category === 'Overall' ? 'Overall Budget' : budget.category}
                    </Text>
                    <Text style={styles.budgetPeriod}>{formatPeriod(budget)}</Text>
                  </View>
                  <View style={styles.budgetActions}>
                    <TouchableOpacity onPress={() => handleEditBudget(budget)}>
                      <Text style={styles.editButton}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteBudget(budget.id)}>
                      <Text style={styles.deleteButton}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.budgetAmounts}>
                  <Text style={styles.budgetSpent}>
                    Spent: ${budget.spending.toFixed(2)}
                  </Text>
                  <Text style={styles.budgetTotal}>
                    Budget: ${budget.amount.toFixed(2)}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.goToGraphsButton}
          onPress={() => router.push('/(tabs)/graphs')}>
          <Text style={styles.goToGraphsButtonText}>Go to Graphs</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const getViewTitle = () => {
    if (viewMode === 'expenses') return 'Expenses';
    if (viewMode === 'income') return 'Income';
    if (viewMode === 'budget') return 'Budget';
    return 'Home';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{getViewTitle()}</Text>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewToggleButton, viewMode === 'expenses' && styles.viewToggleButtonActive]}
            onPress={() => setViewMode('expenses')}>
            <Text style={[styles.viewToggleButtonText, viewMode === 'expenses' && styles.viewToggleButtonTextActive]}>
              Expenses
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleButton, viewMode === 'budget' && styles.viewToggleButtonActive]}
            onPress={() => setViewMode('budget')}>
            <Text style={[styles.viewToggleButtonText, viewMode === 'budget' && styles.viewToggleButtonTextActive]}>
              Budget
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleButton, viewMode === 'income' && styles.viewToggleButtonActive]}
            onPress={() => setViewMode('income')}>
            <Text style={[styles.viewToggleButtonText, viewMode === 'income' && styles.viewToggleButtonTextActive]}>
              Income
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {viewMode === 'expenses' && renderExpensesView()}
        {viewMode === 'income' && renderIncomeView()}
        {viewMode === 'budget' && renderBudgetView()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  viewToggle: {
    flexDirection: 'row',
    gap: 6,
  },
  viewToggleButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#e0e0e0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  viewToggleButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  viewToggleButtonText: {
    color: '#666',
    fontSize: 11,
    fontWeight: '600',
  },
  viewToggleButtonTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  form: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  dropdownButtonText: {
    fontSize: 16,
    flex: 1,
  },
  categoryColorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownMenu: {
    backgroundColor: '#fff',
    borderRadius: 8,
    width: '80%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  dropdownScrollView: {
    maxHeight: 400,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  checkmark: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  dateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  dateButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  clearDateButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  clearDateText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  datePickerContainer: {
    width: '100%',
    marginTop: 8,
    marginBottom: 20,
  },
  datePickerWrapper: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
    width: '100%',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  datePickerHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  datePickerDoneButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#4CAF50',
    borderRadius: 6,
  },
  datePickerDoneText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  datePicker: {
    width: '100%',
    alignSelf: 'center',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  listTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  totalText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#d32f2f',
  },
  list: {
    paddingBottom: 20,
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  expenseInfo: {
    flex: 1,
  },
  expenseCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  expensePlace: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 2,
  },
  expenseDescription: {
    fontSize: 14,
    color: '#555',
    marginBottom: 2,
  },
  expenseDate: {
    fontSize: 14,
    color: '#999',
  },
  expenseRight: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 4,
  },
  expenseActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  editButton: {
    fontSize: 14,
    color: '#2196F3',
  },
  deleteButton: {
    fontSize: 14,
    color: '#d32f2f',
  },
  editForm: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    borderTopWidth: 2,
    borderTopColor: '#2196F3',
  },
  editFormTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
    fontSize: 16,
  },
  incomeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  incomeInfo: {
    flex: 1,
  },
  incomeCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  incomeDate: {
    fontSize: 14,
    color: '#999',
  },
  incomeRight: {
    alignItems: 'flex-end',
  },
  incomeAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  budgetCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  budgetCategory: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  budgetPeriod: {
    fontSize: 14,
    color: '#666',
  },
  budgetActions: {
    flexDirection: 'row',
    gap: 12,
  },
  budgetAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  budgetSpent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  budgetTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  goToGraphsButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  goToGraphsButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  periodContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  periodButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  periodButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  periodText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  periodTextActive: {
    color: '#fff',
  },
  recurringContainer: {
    marginBottom: 20,
  },
  recurringDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    marginTop: 4,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});
