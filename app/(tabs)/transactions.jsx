import { useBudget } from '@/components/BudgetContext';
import BudgetHealthWidget from '@/components/BudgetHealthWidget';
import { useIncomeSchedules } from '@/components/IncomeScheduleContext';
import { useSubscriptions } from '@/components/SubscriptionsContext';
import { useTransactions } from '@/components/TransactionsContext';
import { CATEGORIES, CATEGORY_COLORS } from '@/constants/categories';
import {
  BUDGET_PERIOD_BIWEEKLY,
  BUDGET_PERIOD_OPTIONS,
  calculateBudgetHealth,
  calculateBudgetSpending,
  findBudget,
  formatBiweeklyPeriodLabel,
  formatBudgetPeriod,
  getBiweeklyPeriodKey,
  getBudgetName,
  getBudgetsForCategory,
  getBudgetType,
  getPeriodKeyForDate,
  getSelectableBudgetCategories,
  parseBiweeklyPeriodKey,
  BUDGET_TYPE_OVERALL,
  BUDGET_TYPE_CATEGORY,
  BUDGET_TYPE_GROUP,
  DEFAULT_OVERALL_CATEGORIES,
} from '@/utils/budgetUtils';
import {
  formatPayDayList,
  getPayDatesForMonth,
  parsePayDays,
} from '@/utils/incomeScheduleUtils';
import {
  formatSubscriptionDueRule,
  formatFixedCostFrequency,
  FIXED_COST_FREQUENCIES,
  getSubscriptionDueStatus,
  getSubscriptionPeriodKey,
  isSubscriptionPaid,
  parseDueDay,
  parseDueMonth,
} from '@/utils/subscriptionUtils';
import { confirmDelete } from '@/utils/confirmAlert';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Modal, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

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

export default function TransactionsScreen() {
  const { transactions, addTransaction, deleteTransaction, updateTransaction, syncScheduledIncome, removeScheduledIncome, getExpenses, getIncome } = useTransactions();
  const { budgets, addBudget, updateBudget, deleteBudget } = useBudget();
  const { subscriptions, addSubscription, updateSubscription, deleteSubscription } = useSubscriptions();
  const { incomeSchedules, addIncomeSchedule, updateIncomeSchedule, deleteIncomeSchedule } = useIncomeSchedules();
  const router = useRouter();
  const [viewMode, setViewMode] = useState('expenses'); // 'expenses', 'subscriptions', 'budget', 'income'

  // Expenses state
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Eating Out(Solo)');
  const [place, setPlace] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('Eating Out(Solo)');
  const [editPlace, setEditPlace] = useState('');
  const [editDate, setEditDate] = useState(null);
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showEditCategoryDropdown, setShowEditCategoryDropdown] = useState(false);

  // Income state
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeCategory, setIncomeCategory] = useState('Salary');
  const [salaryAmount, setSalaryAmount] = useState('');
  const [salaryCategory, setSalaryCategory] = useState('Salary');
  const [salaryPayDays, setSalaryPayDays] = useState(['1', '15']);
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [showSalaryForm, setShowSalaryForm] = useState(true);

  // Subscription state
  const [subscriptionAmount, setSubscriptionAmount] = useState('');
  const [subscriptionCategory, setSubscriptionCategory] = useState('Eating Out(Solo)');
  const [subscriptionName, setSubscriptionName] = useState('');
  const [subscriptionFrequency, setSubscriptionFrequency] = useState('monthly');
  const [subscriptionDueDay, setSubscriptionDueDay] = useState('1');
  const [subscriptionDueMonth, setSubscriptionDueMonth] = useState('1');
  const [subscriptionDueDayOfWeek, setSubscriptionDueDayOfWeek] = useState('1');
  const [editingSubscriptionId, setEditingSubscriptionId] = useState(null);
  const [editSubscriptionAmount, setEditSubscriptionAmount] = useState('');
  const [editSubscriptionCategory, setEditSubscriptionCategory] = useState('Eating Out(Solo)');
  const [editSubscriptionName, setEditSubscriptionName] = useState('');
  const [editSubscriptionFrequency, setEditSubscriptionFrequency] = useState('monthly');
  const [editSubscriptionDueDay, setEditSubscriptionDueDay] = useState('1');
  const [editSubscriptionDueMonth, setEditSubscriptionDueMonth] = useState('1');
  const [editSubscriptionDueDayOfWeek, setEditSubscriptionDueDayOfWeek] = useState('1');
  const [showSubscriptionCategoryDropdown, setShowSubscriptionCategoryDropdown] = useState(false);
  const [showEditSubscriptionCategoryDropdown, setShowEditSubscriptionCategoryDropdown] = useState(false);

  // Budget state
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetType, setBudgetType] = useState(BUDGET_TYPE_CATEGORY);
  const [budgetName, setBudgetName] = useState('');
  const [budgetCategories, setBudgetCategories] = useState(['Eating Out(Solo)']);
  const [budgetPeriod, setBudgetPeriod] = useState('month');
  const [selectedPeriodDate, setSelectedPeriodDate] = useState(new Date());
  const [showPeriodDatePicker, setShowPeriodDatePicker] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState(null);
  const [editBudgetAmount, setEditBudgetAmount] = useState('');
  const [editBudgetType, setEditBudgetType] = useState(BUDGET_TYPE_CATEGORY);
  const [editBudgetName, setEditBudgetName] = useState('');
  const [editBudgetCategories, setEditBudgetCategories] = useState(['Eating Out(Solo)']);
  const [editBudgetPeriod, setEditBudgetPeriod] = useState('month');
  const [editPeriodDate, setEditPeriodDate] = useState(new Date());
  const [showEditPeriodDatePicker, setShowEditPeriodDatePicker] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [editIsRecurring, setEditIsRecurring] = useState(false);

  const scrollViewRef = useRef(null);
  const contentRef = useRef(null);
  const editFormRef = useRef(null);
  const scrollToEditPending = useRef(false);

  const requestScrollToEdit = () => {
    scrollToEditPending.current = true;
  };

  const scrollToEditForm = () => {
    if (!scrollViewRef.current || !contentRef.current || !editFormRef.current) return;
    editFormRef.current.measureLayout(
      contentRef.current,
      (_x, y) => {
        scrollViewRef.current?.scrollTo({ y: Math.max(0, y), animated: true });
      },
      () => {}
    );
  };

  useEffect(() => {
    if (!scrollToEditPending.current) return;
    scrollToEditPending.current = false;
    const timer = setTimeout(scrollToEditForm, 100);
    return () => clearTimeout(timer);
  }, [editingId, editingBudgetId, editingSubscriptionId, editingScheduleId]);

  const expenses = getExpenses();
  const income = getIncome();

  // Budget helper functions
  const getPeriodKey = (period, date) => getPeriodKeyForDate(period, date);

  const formatPeriod = (budget) => formatBudgetPeriod(budget);

  const getPeriodSelectionLabel = (period) => {
    if (period === 'week') return 'Week';
    if (period === BUDGET_PERIOD_BIWEEKLY) return 'Bi-Weekly Period';
    if (period === 'month') return 'Month';
    return 'Year';
  };

  const formatSelectedPeriodDate = (period, date) => {
    if (period === 'week') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    if (period === BUDGET_PERIOD_BIWEEKLY) {
      return formatBiweeklyPeriodLabel(getBiweeklyPeriodKey(date));
    }
    if (period === 'month') {
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return date.getFullYear().toString();
  };

  const getRecurringDescription = (period) => {
    if (period === BUDGET_PERIOD_BIWEEKLY) {
      return 'Automatically applies to every bi-weekly period (1st–15th and 16th–end of each month)';
    }
    return `Automatically applies to all future ${period}s`;
  };

  // Calculate spending for each budget
  const budgetsWithSpending = useMemo(() => {
    const now = new Date();

    return budgets.map((budget) => {
      const periodKey = budget.isRecurring
        ? getPeriodKeyForDate(budget.period, now)
        : budget.periodKey;

      const spending = calculateBudgetSpending(budget, transactions, periodKey);
      return { ...budget, spending };
    });
  }, [budgets, transactions]);

  const budgetHealth = useMemo(() => {
    const now = new Date();
    const monthKey = getCurrentMonthKey(now);
    const biweeklyKey = getBiweeklyPeriodKey(now);
    const overallBudget =
      findBudget(budgets, 'Overall Spending', 'month', monthKey) ||
      findBudget(budgets, 'Overall', 'month', monthKey) ||
      findBudget(budgets, 'Overall Spending', BUDGET_PERIOD_BIWEEKLY, biweeklyKey) ||
      findBudget(budgets, 'Overall', BUDGET_PERIOD_BIWEEKLY, biweeklyKey);

    if (!overallBudget) return null;

    const periodKey =
      overallBudget.period === BUDGET_PERIOD_BIWEEKLY ? biweeklyKey : monthKey;
    const spending = calculateBudgetSpending(overallBudget, transactions, periodKey);
    return calculateBudgetHealth(overallBudget, spending, now);
  }, [budgets, transactions]);

  const primarySalarySchedule = incomeSchedules[0] || null;

  const upcomingPayDates = useMemo(() => {
    if (!primarySalarySchedule) return [];
    const now = new Date();
    return getPayDatesForMonth(
      primarySalarySchedule.payDays,
      now.getFullYear(),
      now.getMonth()
    );
  }, [primarySalarySchedule]);

  useEffect(() => {
    if (primarySalarySchedule) {
      setShowSalaryForm(false);
    }
  }, [primarySalarySchedule]);

  useEffect(() => {
    incomeSchedules.forEach((schedule) => {
      syncScheduledIncome(schedule);
    });
  }, [incomeSchedules, syncScheduledIncome]);

  // Expenses handlers
  const checkBudgetAlerts = (expenseAmount, expenseCategory, expenseDate) => {
    const date = new Date(expenseDate);
    const weekKey = getCurrentWeekKey(date);
    const biweeklyKey = getBiweeklyPeriodKey(date);
    const monthKey = getCurrentMonthKey(date);
    const yearKey = getCurrentYearKey(date);

    const budgetsToCheck = [
      ...getBudgetsForCategory(budgets, expenseCategory, 'week', weekKey),
      ...getBudgetsForCategory(budgets, expenseCategory, BUDGET_PERIOD_BIWEEKLY, biweeklyKey),
      ...getBudgetsForCategory(budgets, expenseCategory, 'month', monthKey),
      ...getBudgetsForCategory(budgets, expenseCategory, 'year', yearKey),
    ].filter((budget, index, self) =>
      index === self.findIndex((b) => b.id === budget.id) && budget.amount > 0
    );

    setTimeout(() => {
      budgetsToCheck.forEach((budget) => {
        const periodKey = getPeriodKeyForDate(budget.period, date);
        const currentSpending = calculateBudgetSpending(budget, transactions, periodKey);
        const percentage = (currentSpending / budget.amount) * 100;
        const budgetLabel = getBudgetName(budget);

        if (percentage >= 100) {
          Alert.alert(
            'Budget Exceeded!',
            `${budgetLabel} budget for ${budget.period} exceeded! You've spent ${percentage.toFixed(1)}% of your budget.`,
            [{ text: 'OK' }]
          );
        } else if (percentage >= 95 && percentage < 100) {
          Alert.alert(
            'Budget Warning',
            `You're at ${percentage.toFixed(1)}% of your ${budgetLabel} ${budget.period} budget.`,
            [{ text: 'OK' }]
          );
        } else if (percentage >= 90 && percentage < 95) {
          Alert.alert(
            'Budget Alert',
            `You're at ${percentage.toFixed(1)}% of your ${budgetLabel} ${budget.period} budget.`,
            [{ text: 'OK' }]
          );
        } else if (percentage >= 75 && percentage < 90) {
          Alert.alert(
            'Budget Notice',
            `You've reached ${percentage.toFixed(1)}% of your ${budgetLabel} ${budget.period} budget.`,
            [{ text: 'OK' }]
          );
        } else if (percentage >= 50 && percentage < 75) {
          Alert.alert(
            'Budget Update',
            `You've reached ${percentage.toFixed(1)}% of your ${budgetLabel} ${budget.period} budget.`,
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
    setCategory('Eating Out(Solo)');
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
    requestScrollToEdit();
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditAmount('');
    setEditCategory('Eating Out(Solo)');
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
    confirmDelete('Delete Expense', 'Are you sure?', () => deleteTransaction(id));
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
    confirmDelete('Delete Income', 'Are you sure?', () => deleteTransaction(id));
  };

  const resetSalaryForm = () => {
    setSalaryAmount('');
    setSalaryCategory('Salary');
    setSalaryPayDays(['1', '15']);
    setEditingScheduleId(null);
  };

  const populateSalaryForm = (schedule) => {
    setSalaryAmount(schedule.amount.toString());
    setSalaryCategory(schedule.category);
    setSalaryPayDays(schedule.payDays.map(String));
    setEditingScheduleId(schedule.id);
    setShowSalaryForm(true);
    requestScrollToEdit();
  };

  const handleAddPayDay = () => {
    setSalaryPayDays((prev) => [...prev, '']);
  };

  const handleRemovePayDay = (index) => {
    setSalaryPayDays((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleUpdatePayDay = (index, value) => {
    setSalaryPayDays((prev) => prev.map((day, i) => (i === index ? value.replace(/[^0-9]/g, '') : day)));
  };

  const handleSaveSalarySchedule = () => {
    const numAmount = parseFloat(salaryAmount);
    if (!salaryAmount || Number.isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid paycheck amount');
      return;
    }

    const payDays = parsePayDays(salaryPayDays);
    if (payDays.length === 0) {
      Alert.alert('Invalid Pay Days', 'Add at least one pay day between 1 and 31');
      return;
    }

    const scheduleData = {
      category: salaryCategory.trim() || 'Salary',
      amount: numAmount,
      payDays,
    };

    let schedule;
    if (editingScheduleId) {
      updateIncomeSchedule(editingScheduleId, scheduleData);
      schedule = { id: editingScheduleId, ...scheduleData };
    } else {
      schedule = addIncomeSchedule(scheduleData);
    }

    syncScheduledIncome(schedule);
    resetSalaryForm();
    setShowSalaryForm(false);
  };

  const handleDeleteSalarySchedule = () => {
    if (!primarySalarySchedule) return;

    confirmDelete(
      'Delete Salary Schedule',
      'This removes your schedule and its scheduled paycheck entries.',
      () => {
        removeScheduledIncome(primarySalarySchedule.id);
        deleteIncomeSchedule(primarySalarySchedule.id);
        resetSalaryForm();
        setShowSalaryForm(true);
      }
    );
  };

  const handleSyncPaychecks = () => {
    if (!primarySalarySchedule) return;
    syncScheduledIncome(primarySalarySchedule);
    Alert.alert('Paychecks Synced', "This month's scheduled paychecks are up to date.");
  };

  // Subscription handlers
  const buildSubscriptionDueFields = (frequency, dueDay, dueMonth, dueDayOfWeek) => {
    if (frequency === 'monthly' || frequency === 'yearly') {
      const parsedDueDay = parseDueDay(dueDay);
      if (!parsedDueDay) return null;
      const fields = { dueDay: parsedDueDay };
      if (frequency === 'yearly') {
        const parsedDueMonth = parseDueMonth(dueMonth);
        if (!parsedDueMonth) return null;
        fields.dueMonth = parsedDueMonth;
      }
      return fields;
    }
    if (frequency === 'weekly') {
      const day = parseInt(dueDayOfWeek, 10);
      if (Number.isNaN(day) || day < 0 || day > 6) return null;
      return { dueDayOfWeek: day };
    }
    if (frequency === 'biweekly') {
      return {};
    }
    return {};
  };

  const resetSubscriptionForm = () => {
    setSubscriptionAmount('');
    setSubscriptionName('');
    setSubscriptionCategory('Eating Out(Solo)');
    setSubscriptionFrequency('monthly');
    setSubscriptionDueDay('1');
    setSubscriptionDueMonth('1');
    setSubscriptionDueDayOfWeek('1');
  };

  const handleAddSubscription = () => {
    const numAmount = parseFloat(subscriptionAmount);
    if (!subscriptionAmount || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }
    if (!subscriptionName.trim()) {
      Alert.alert('Invalid Name', 'Please enter a fixed cost name');
      return;
    }

    const dueFields = buildSubscriptionDueFields(
      subscriptionFrequency,
      subscriptionDueDay,
      subscriptionDueMonth,
      subscriptionDueDayOfWeek
    );
    if (dueFields === null) {
      Alert.alert('Invalid Due Date', 'Please enter a valid due day or month');
      return;
    }

    addSubscription({
      name: subscriptionName.trim(),
      amount: numAmount,
      category: subscriptionCategory,
      frequency: subscriptionFrequency,
      lastPaidPeriodKey: null,
      ...dueFields,
    });

    resetSubscriptionForm();
  };

  const handleEditSubscription = (subscription) => {
    setEditingSubscriptionId(subscription.id);
    setEditSubscriptionAmount(subscription.amount.toString());
    setEditSubscriptionCategory(subscription.category);
    setEditSubscriptionName(subscription.name);
    setEditSubscriptionFrequency(subscription.frequency);
    setEditSubscriptionDueDay(String(subscription.dueDay ?? 1));
    setEditSubscriptionDueMonth(String(subscription.dueMonth ?? 1));
    setEditSubscriptionDueDayOfWeek(String(subscription.dueDayOfWeek ?? 1));
    requestScrollToEdit();
  };

  const handleCancelEditSubscription = () => {
    setEditingSubscriptionId(null);
    setEditSubscriptionAmount('');
    setEditSubscriptionCategory('Eating Out(Solo)');
    setEditSubscriptionName('');
    setEditSubscriptionFrequency('monthly');
    setEditSubscriptionDueDay('1');
    setEditSubscriptionDueMonth('1');
    setEditSubscriptionDueDayOfWeek('1');
  };

  const handleSaveEditSubscription = () => {
    const numAmount = parseFloat(editSubscriptionAmount);
    if (!editSubscriptionAmount || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }
    if (!editSubscriptionName.trim()) {
      Alert.alert('Invalid Name', 'Please enter a fixed cost name');
      return;
    }

    const dueFields = buildSubscriptionDueFields(
      editSubscriptionFrequency,
      editSubscriptionDueDay,
      editSubscriptionDueMonth,
      editSubscriptionDueDayOfWeek
    );
    if (dueFields === null) {
      Alert.alert('Invalid Due Date', 'Please enter a valid due day or month');
      return;
    }

    updateSubscription(editingSubscriptionId, {
      name: editSubscriptionName.trim(),
      amount: numAmount,
      category: editSubscriptionCategory,
      frequency: editSubscriptionFrequency,
      ...dueFields,
    });

    handleCancelEditSubscription();
  };

  const handleMarkSubscriptionPaid = (subscription) => {
    if (isSubscriptionPaid(subscription)) {
      Alert.alert('Already Paid', 'This fixed cost is already marked paid for the current period.');
      return;
    }

    const periodKey = getSubscriptionPeriodKey(subscription);
    const existingExpense = transactions.find(
      (t) =>
        t.type === 'expense' &&
        t.subscriptionId === subscription.id &&
        t.subscriptionPeriodKey === periodKey
    );

    updateSubscription(subscription.id, { lastPaidPeriodKey: periodKey });

    if (!existingExpense) {
      addTransaction({
        type: 'expense',
        amount: subscription.amount,
        category: subscription.category,
        place: subscription.name,
        date: new Date().toISOString(),
        subscriptionId: subscription.id,
        subscriptionPeriodKey: periodKey,
      });
    }
  };

  const handleUnmarkSubscriptionPaid = (subscription) => {
    Alert.alert(
      'Unmark Paid',
      'Remove the paid status for this period? The logged expense will not be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unmark',
          onPress: () => updateSubscription(subscription.id, { lastPaidPeriodKey: null }),
        },
      ]
    );
  };

  const handleDeleteSubscription = (id) => {
    confirmDelete('Delete Fixed Cost', 'Are you sure?', () => deleteSubscription(id));
  };

  // Budget handlers
  const buildBudgetPayload = (type, name, categories, amount, period, periodKey, recurring) => {
    const resolvedName =
      type === BUDGET_TYPE_OVERALL
        ? 'Overall Spending'
        : type === BUDGET_TYPE_CATEGORY
          ? categories[0]
          : name.trim();

    if (!resolvedName) {
      Alert.alert('Missing Name', 'Please enter a budget name');
      return null;
    }

    if (categories.length === 0) {
      Alert.alert('Missing Categories', 'Please select at least one category');
      return null;
    }

    return {
      name: resolvedName,
      budgetType: type,
      categories:
        type === BUDGET_TYPE_OVERALL ? [...DEFAULT_OVERALL_CATEGORIES] : [...categories],
      amount,
      period,
      periodKey,
      isRecurring: recurring,
      category: type === BUDGET_TYPE_OVERALL ? 'Overall' : categories[0],
    };
  };

  const toggleBudgetCategory = (category, selected, setSelected) => {
    if (selected.includes(category)) {
      setSelected(selected.filter((cat) => cat !== category));
    } else {
      setSelected([...selected, category]);
    }
  };

  const handleAddBudget = () => {
    const numAmount = parseFloat(budgetAmount);
    if (!budgetAmount || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid budget amount');
      return;
    }

    const periodKey = isRecurring ? 'recurring' : getPeriodKey(budgetPeriod, selectedPeriodDate);
    const payload = buildBudgetPayload(
      budgetType,
      budgetName,
      budgetCategories,
      numAmount,
      budgetPeriod,
      periodKey,
      isRecurring
    );
    if (!payload) return;

    addBudget(payload);

    setBudgetAmount('');
    setBudgetType(BUDGET_TYPE_CATEGORY);
    setBudgetName('');
    setBudgetCategories(['Eating Out(Solo)']);
    setBudgetPeriod('month');
    setSelectedPeriodDate(new Date());
    setIsRecurring(false);
  };

  const handleEditBudget = (budget) => {
    setEditingBudgetId(budget.id);
    setEditBudgetAmount(budget.amount.toString());
    setEditBudgetType(getBudgetType(budget));
    setEditBudgetName(getBudgetName(budget));
    setEditBudgetCategories(budget.categories?.length ? [...budget.categories] : [budget.category].filter(Boolean));
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
    } else if (budget.period === BUDGET_PERIOD_BIWEEKLY) {
      const parsed = parseBiweeklyPeriodKey(budget.periodKey);
      setEditPeriodDate(parsed?.startDate || new Date());
    } else {
      setEditPeriodDate(new Date(parseInt(budget.periodKey), 0, 1));
    }
    requestScrollToEdit();
  };

  const handleCancelEditBudget = () => {
    setEditingBudgetId(null);
    setEditBudgetAmount('');
    setEditBudgetType(BUDGET_TYPE_CATEGORY);
    setEditBudgetName('');
    setEditBudgetCategories(['Eating Out(Solo)']);
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
    const payload = buildBudgetPayload(
      editBudgetType,
      editBudgetName,
      editBudgetCategories,
      numAmount,
      editBudgetPeriod,
      periodKey,
      editIsRecurring
    );
    if (!payload) return;

    updateBudget(editingBudgetId, payload);
    handleCancelEditBudget();
  };

  const handleDeleteBudget = (id) => {
    confirmDelete('Delete Budget', 'Are you sure?', () => deleteBudget(id));
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
                  <View style={styles.editForm} ref={editFormRef} collapsable={false}>
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
      <View
        style={styles.form}
        ref={editingScheduleId ? editFormRef : undefined}
        collapsable={false}>
        <Text style={styles.formTitle}>Salary Schedule</Text>
        <Text style={styles.helperText}>
          Set your paycheck amount and the days of each month you get paid.
        </Text>

        {primarySalarySchedule && !showSalaryForm ? (
          <View style={styles.scheduleCard}>
            <Text style={styles.scheduleTitle}>{primarySalarySchedule.category}</Text>
            <Text style={styles.scheduleDetail}>
              ${primarySalarySchedule.amount.toFixed(2)} per paycheck
            </Text>
            <Text style={styles.scheduleDetail}>
              Paid on the {formatPayDayList(primarySalarySchedule.payDays)} of each month
            </Text>
            {upcomingPayDates.length > 0 && (
              <Text style={styles.scheduleSubdetail}>
                This month:{' '}
                {upcomingPayDates
                  .map((date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
                  .join(', ')}
              </Text>
            )}
            <View style={styles.scheduleActions}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => populateSalaryForm(primarySalarySchedule)}>
                <Text style={styles.secondaryButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={handleSyncPaychecks}>
                <Text style={styles.secondaryButtonText}>Sync Paychecks</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeleteSalarySchedule}>
                <Text style={styles.deleteButton}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.label}>Paycheck Amount</Text>
            <TextInput
              style={styles.input}
              value={salaryAmount}
              onChangeText={setSalaryAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>Category</Text>
            <TextInput
              style={styles.input}
              value={salaryCategory}
              onChangeText={setSalaryCategory}
              placeholder="Salary"
            />

            <Text style={styles.label}>Pay Days of the Month</Text>
            <Text style={styles.helperText}>
              Enter the day number for each paycheck (e.g. 1 and 15 for twice monthly).
            </Text>

            <TouchableOpacity
              style={styles.presetButton}
              onPress={() => setSalaryPayDays(['1', '15'])}>
              <Text style={styles.presetButtonText}>Use 1st & 15th</Text>
            </TouchableOpacity>

            {salaryPayDays.map((day, index) => (
              <View key={index} style={styles.payDayRow}>
                <TextInput
                  style={[styles.input, styles.payDayInput]}
                  value={day}
                  onChangeText={(value) => handleUpdatePayDay(index, value)}
                  placeholder="Day (1-31)"
                  keyboardType="number-pad"
                  maxLength={2}
                />
                {salaryPayDays.length > 1 && (
                  <TouchableOpacity
                    style={styles.removePayDayButton}
                    onPress={() => handleRemovePayDay(index)}>
                    <Text style={styles.removePayDayText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <TouchableOpacity style={styles.addPayDayButton} onPress={handleAddPayDay}>
              <Text style={styles.addPayDayText}>+ Add Pay Date</Text>
            </TouchableOpacity>

            <View style={styles.editButtons}>
              {primarySalarySchedule && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    resetSalaryForm();
                    setShowSalaryForm(false);
                  }}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.saveButton, !primarySalarySchedule && { flex: 1 }]}
                onPress={handleSaveSalarySchedule}>
                <Text style={styles.saveButtonText}>
                  {editingScheduleId ? 'Update Schedule' : 'Save Schedule'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <View style={styles.form}>
        <Text style={styles.formTitle}>Other Income</Text>
        <Text style={styles.helperText}>Log one-time income like freelance or bonuses.</Text>

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
          placeholder="Freelance, Bonus, etc."
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
          <Text style={styles.emptyText}>No income entries yet. Set up your salary or add income above.</Text>
        ) : (
          income
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map((entry) => (
              <View key={entry.id} style={styles.incomeItem}>
                <View style={styles.incomeInfo}>
                  <View style={styles.incomeTitleRow}>
                    <Text style={styles.incomeCategory}>{entry.category}</Text>
                    {entry.scheduleId && (
                      <Text style={styles.scheduledBadge}>Scheduled</Text>
                    )}
                  </View>
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

          <Text style={styles.label}>Budget Type</Text>
          <View style={styles.periodContainer}>
            {[
              { key: BUDGET_TYPE_OVERALL, label: 'Overall' },
              { key: BUDGET_TYPE_GROUP, label: 'Group' },
              { key: BUDGET_TYPE_CATEGORY, label: 'Category' },
            ].map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[styles.periodButton, budgetType === key && styles.periodButtonActive]}
                onPress={() => {
                  setBudgetType(key);
                  if (key === BUDGET_TYPE_CATEGORY && budgetCategories.length !== 1) {
                    setBudgetCategories(['Eating Out(Solo)']);
                  }
                  if (key === BUDGET_TYPE_OVERALL) {
                    setBudgetCategories([...DEFAULT_OVERALL_CATEGORIES]);
                  }
                }}>
                <Text style={[styles.periodText, budgetType === key && styles.periodTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {budgetType === BUDGET_TYPE_GROUP && (
            <>
              <Text style={styles.label}>Group Name</Text>
              <TextInput
                style={styles.input}
                value={budgetName}
                onChangeText={setBudgetName}
                placeholder="Social Life"
              />
            </>
          )}

          {budgetType === BUDGET_TYPE_OVERALL ? (
            <Text style={styles.helperText}>
              Tracks: {DEFAULT_OVERALL_CATEGORIES.join(', ')}
            </Text>
          ) : (
            <>
              <Text style={styles.label}>
                {budgetType === BUDGET_TYPE_GROUP ? 'Categories in Group' : 'Category'}
              </Text>
              <View style={styles.categoryChipContainer}>
                {getSelectableBudgetCategories().map((cat) => {
                  const selected = budgetCategories.includes(cat);
                  const categoryColor = CATEGORY_COLORS[cat] || '#9E9E9E';
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryChip,
                        selected && { backgroundColor: categoryColor + '30', borderColor: categoryColor },
                      ]}
                      onPress={() => {
                        if (budgetType === BUDGET_TYPE_CATEGORY) {
                          setBudgetCategories([cat]);
                        } else {
                          toggleBudgetCategory(cat, budgetCategories, setBudgetCategories);
                        }
                      }}>
                      <Text style={[styles.categoryChipText, selected && { fontWeight: '600' }]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          <Text style={styles.label}>Period</Text>
          <View style={styles.periodContainer}>
            {BUDGET_PERIOD_OPTIONS.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.budgetPeriodButton,
                  budgetPeriod === key && styles.periodButtonActive,
                ]}
                onPress={() => setBudgetPeriod(key)}>
                <Text style={[styles.periodText, budgetPeriod === key && styles.periodTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.recurringContainer}>
            <Text style={styles.label}>Recurring Budget</Text>
            <Text style={styles.recurringDescription}>
              {getRecurringDescription(budgetPeriod)}
            </Text>
            <View style={styles.switchContainer}>
              <Switch
                value={isRecurring}
                onValueChange={setIsRecurring}
                trackColor={{ false: '#e0e0e0', true: '#9D5CE9' }}
                thumbColor={isRecurring ? '#fff' : '#f4f3f4'}
              />
              <Text style={styles.switchLabel}>
                {isRecurring ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>

          {!isRecurring && (
            <>
              <Text style={styles.label}>Select {getPeriodSelectionLabel(budgetPeriod)}</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowPeriodDatePicker(true)}>
                <Text style={styles.dateButtonText}>
                  {formatSelectedPeriodDate(budgetPeriod, selectedPeriodDate)}
                </Text>
              </TouchableOpacity>
              {budgetPeriod === BUDGET_PERIOD_BIWEEKLY && (
                <Text style={styles.helperText}>
                  Pick any date in the half-month you want. Days 1–15 use the 1st–15th period; days 16+ use the 16th–end period.
                </Text>
              )}
            </>
          )}
          {showPeriodDatePicker && !isRecurring && (
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerWrapper}>
                <View style={styles.datePickerHeader}>
                  <Text style={styles.datePickerHeaderText}>Select {getPeriodSelectionLabel(budgetPeriod)}</Text>
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
        <View style={styles.form} ref={editFormRef} collapsable={false}>
          <Text style={styles.formTitle}>Edit Budget</Text>

          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={styles.input}
            value={editBudgetAmount}
            onChangeText={setEditBudgetAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Budget Type</Text>
          <View style={styles.periodContainer}>
            {[
              { key: BUDGET_TYPE_OVERALL, label: 'Overall' },
              { key: BUDGET_TYPE_GROUP, label: 'Group' },
              { key: BUDGET_TYPE_CATEGORY, label: 'Category' },
            ].map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[styles.periodButton, editBudgetType === key && styles.periodButtonActive]}
                onPress={() => {
                  setEditBudgetType(key);
                  if (key === BUDGET_TYPE_CATEGORY && editBudgetCategories.length !== 1) {
                    setEditBudgetCategories(['Eating Out(Solo)']);
                  }
                  if (key === BUDGET_TYPE_OVERALL) {
                    setEditBudgetCategories([...DEFAULT_OVERALL_CATEGORIES]);
                  }
                }}>
                <Text style={[styles.periodText, editBudgetType === key && styles.periodTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {editBudgetType === BUDGET_TYPE_GROUP && (
            <>
              <Text style={styles.label}>Group Name</Text>
              <TextInput
                style={styles.input}
                value={editBudgetName}
                onChangeText={setEditBudgetName}
                placeholder="Social Life"
              />
            </>
          )}

          {editBudgetType === BUDGET_TYPE_OVERALL ? (
            <Text style={styles.helperText}>
              Tracks: {DEFAULT_OVERALL_CATEGORIES.join(', ')}
            </Text>
          ) : (
            <>
              <Text style={styles.label}>
                {editBudgetType === BUDGET_TYPE_GROUP ? 'Categories in Group' : 'Category'}
              </Text>
              <View style={styles.categoryChipContainer}>
                {getSelectableBudgetCategories().map((cat) => {
                  const selected = editBudgetCategories.includes(cat);
                  const categoryColor = CATEGORY_COLORS[cat] || '#9E9E9E';
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryChip,
                        selected && { backgroundColor: categoryColor + '30', borderColor: categoryColor },
                      ]}
                      onPress={() => {
                        if (editBudgetType === BUDGET_TYPE_CATEGORY) {
                          setEditBudgetCategories([cat]);
                        } else {
                          toggleBudgetCategory(cat, editBudgetCategories, setEditBudgetCategories);
                        }
                      }}>
                      <Text style={[styles.categoryChipText, selected && { fontWeight: '600' }]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          <Text style={styles.label}>Period</Text>
          <View style={styles.periodContainer}>
            {BUDGET_PERIOD_OPTIONS.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.budgetPeriodButton,
                  editBudgetPeriod === key && styles.periodButtonActive,
                ]}
                onPress={() => setEditBudgetPeriod(key)}>
                <Text style={[styles.periodText, editBudgetPeriod === key && styles.periodTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.recurringContainer}>
            <Text style={styles.label}>Recurring Budget</Text>
            <Text style={styles.recurringDescription}>
              {getRecurringDescription(editBudgetPeriod)}
            </Text>
            <View style={styles.switchContainer}>
              <Switch
                value={editIsRecurring}
                onValueChange={setEditIsRecurring}
                trackColor={{ false: '#e0e0e0', true: '#9D5CE9' }}
                thumbColor={editIsRecurring ? '#fff' : '#f4f3f4'}
              />
              <Text style={styles.switchLabel}>
                {editIsRecurring ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>

          {!editIsRecurring && (
            <>
              <Text style={styles.label}>Select {getPeriodSelectionLabel(editBudgetPeriod)}</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEditPeriodDatePicker(true)}>
                <Text style={styles.dateButtonText}>
                  {formatSelectedPeriodDate(editBudgetPeriod, editPeriodDate)}
                </Text>
              </TouchableOpacity>
              {editBudgetPeriod === BUDGET_PERIOD_BIWEEKLY && (
                <Text style={styles.helperText}>
                  Pick any date in the half-month you want. Days 1–15 use the 1st–15th period; days 16+ use the 16th–end period.
                </Text>
              )}
            </>
          )}
          {showEditPeriodDatePicker && !editIsRecurring && (
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerWrapper}>
                <View style={styles.datePickerHeader}>
                  <Text style={styles.datePickerHeaderText}>Select {getPeriodSelectionLabel(editBudgetPeriod)}</Text>
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
                  <View style={styles.budgetHeaderInfo}>
                    <Text style={styles.budgetCategory}>
                      {getBudgetName(budget)}
                    </Text>
                    <Text style={styles.budgetPeriod}>{formatPeriod(budget)}</Text>
                    {getBudgetType(budget) === BUDGET_TYPE_GROUP && budget.categories?.length > 0 && (
                      <Text style={styles.budgetCategories} numberOfLines={2}>
                        {budget.categories.join(', ')}
                      </Text>
                    )}
                    {getBudgetType(budget) === BUDGET_TYPE_OVERALL && (
                      <Text style={styles.budgetCategories}>Lifestyle spending</Text>
                    )}
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

  const renderSubscriptionDueFields = (
    frequency,
    dueDay,
    setDueDay,
    dueMonth,
    setDueMonth,
    dueDayOfWeek,
    setDueDayOfWeek
  ) => {
    if (frequency === 'daily') {
      return (
        <Text style={styles.helperText}>Daily fixed costs are due every day.</Text>
      );
    }

    if (frequency === 'biweekly') {
      return (
        <Text style={styles.helperText}>
          Due on the 1st and 16th of each month (matches bi-weekly budget periods).
        </Text>
      );
    }

    if (frequency === 'weekly') {
      return (
        <>
          <Text style={styles.label}>Due Day of Week</Text>
          <View style={styles.periodSelector}>
            {[
              { label: 'Sun', value: '0' },
              { label: 'Mon', value: '1' },
              { label: 'Tue', value: '2' },
              { label: 'Wed', value: '3' },
              { label: 'Thu', value: '4' },
              { label: 'Fri', value: '5' },
              { label: 'Sat', value: '6' },
            ].map((day) => (
              <TouchableOpacity
                key={day.value}
                style={[
                  styles.periodButton,
                  dueDayOfWeek === day.value && styles.periodButtonActive,
                ]}
                onPress={() => setDueDayOfWeek(day.value)}>
                <Text
                  style={[
                    styles.periodText,
                    dueDayOfWeek === day.value && styles.periodTextActive,
                  ]}>
                  {day.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      );
    }

    if (frequency === 'yearly') {
      return (
        <>
          <Text style={styles.label}>Due Month</Text>
          <TextInput
            style={styles.input}
            value={dueMonth}
            onChangeText={(value) => setDueMonth(value.replace(/[^0-9]/g, ''))}
            placeholder="1-12"
            keyboardType="number-pad"
            maxLength={2}
          />
          <Text style={styles.label}>Due Day</Text>
          <TextInput
            style={styles.input}
            value={dueDay}
            onChangeText={(value) => setDueDay(value.replace(/[^0-9]/g, ''))}
            placeholder="1-31"
            keyboardType="number-pad"
            maxLength={2}
          />
        </>
      );
    }

    return (
      <>
        <Text style={styles.label}>Due Day of Month</Text>
        <Text style={styles.helperText}>
          Enter the day each month this is due (e.g. 1 for rent on the 1st).
        </Text>
        <TextInput
          style={styles.input}
          value={dueDay}
          onChangeText={(value) => setDueDay(value.replace(/[^0-9]/g, ''))}
          placeholder="1-31"
          keyboardType="number-pad"
          maxLength={2}
        />
      </>
    );
  };

  const getDueStatusStyle = (status) => {
    switch (status) {
      case 'paid':
        return styles.dueStatusPaid;
      case 'due_today':
        return styles.dueStatusToday;
      case 'overdue':
        return styles.dueStatusOverdue;
      case 'due_soon':
        return styles.dueStatusSoon;
      default:
        return styles.dueStatusUpcoming;
    }
  };

  const renderSubscriptionsView = () => (
    <>
      {editingSubscriptionId === null ? (
        <View style={styles.form}>
          <Text style={styles.formTitle}>Add Fixed Cost</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={subscriptionName}
            onChangeText={setSubscriptionName}
            placeholder="e.g., Rent, Netflix, Gym, Internet"
          />

          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={styles.input}
            value={subscriptionAmount}
            onChangeText={setSubscriptionAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Category</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowSubscriptionCategoryDropdown(true)}>
            <Text style={[styles.dropdownButtonText, { color: subscriptionCategory ? '#333' : '#999' }]}>
              {subscriptionCategory || 'Select Category'}
            </Text>
            <View
              style={[
                styles.categoryColorIndicator,
                { backgroundColor: CATEGORY_COLORS[subscriptionCategory] || '#9E9E9E' },
              ]}
            />
          </TouchableOpacity>

          <Modal
            visible={showSubscriptionCategoryDropdown}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowSubscriptionCategoryDropdown(false)}>
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowSubscriptionCategoryDropdown(false)}>
              <View style={styles.dropdownMenu} onStartShouldSetResponder={() => true}>
                <ScrollView style={styles.dropdownScrollView}>
                  {CATEGORIES.map((cat) => {
                    const isSelected = subscriptionCategory === cat;
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
                          setSubscriptionCategory(cat);
                          setShowSubscriptionCategoryDropdown(false);
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

          <Text style={styles.label}>Frequency</Text>
          <View style={styles.fixedCostFrequencyContainer}>
            {FIXED_COST_FREQUENCIES.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.fixedCostFrequencyButton,
                  subscriptionFrequency === key && styles.periodButtonActive,
                ]}
                onPress={() => setSubscriptionFrequency(key)}>
                <Text style={[styles.periodText, subscriptionFrequency === key && styles.periodTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {renderSubscriptionDueFields(
            subscriptionFrequency,
            subscriptionDueDay,
            setSubscriptionDueDay,
            subscriptionDueMonth,
            setSubscriptionDueMonth,
            subscriptionDueDayOfWeek,
            setSubscriptionDueDayOfWeek
          )}

          <TouchableOpacity style={styles.addButton} onPress={handleAddSubscription}>
            <Text style={styles.addButtonText}>Add Fixed Cost</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.form} ref={editFormRef} collapsable={false}>
          <Text style={styles.formTitle}>Edit Fixed Cost</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={editSubscriptionName}
            onChangeText={setEditSubscriptionName}
            placeholder="e.g., Rent, Netflix, Gym, Internet"
          />

          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={styles.input}
            value={editSubscriptionAmount}
            onChangeText={setEditSubscriptionAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Category</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowEditSubscriptionCategoryDropdown(true)}>
            <Text style={[styles.dropdownButtonText, { color: editSubscriptionCategory ? '#333' : '#999' }]}>
              {editSubscriptionCategory || 'Select Category'}
            </Text>
            <View
              style={[
                styles.categoryColorIndicator,
                { backgroundColor: CATEGORY_COLORS[editSubscriptionCategory] || '#9E9E9E' },
              ]}
            />
          </TouchableOpacity>

          <Modal
            visible={showEditSubscriptionCategoryDropdown}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowEditSubscriptionCategoryDropdown(false)}>
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowEditSubscriptionCategoryDropdown(false)}>
              <View style={styles.dropdownMenu} onStartShouldSetResponder={() => true}>
                <ScrollView style={styles.dropdownScrollView}>
                  {CATEGORIES.map((cat) => {
                    const isSelected = editSubscriptionCategory === cat;
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
                          setEditSubscriptionCategory(cat);
                          setShowEditSubscriptionCategoryDropdown(false);
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

          <Text style={styles.label}>Frequency</Text>
          <View style={styles.fixedCostFrequencyContainer}>
            {FIXED_COST_FREQUENCIES.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.fixedCostFrequencyButton,
                  editSubscriptionFrequency === key && styles.periodButtonActive,
                ]}
                onPress={() => setEditSubscriptionFrequency(key)}>
                <Text style={[styles.periodText, editSubscriptionFrequency === key && styles.periodTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {renderSubscriptionDueFields(
            editSubscriptionFrequency,
            editSubscriptionDueDay,
            setEditSubscriptionDueDay,
            editSubscriptionDueMonth,
            setEditSubscriptionDueMonth,
            editSubscriptionDueDayOfWeek,
            setEditSubscriptionDueDayOfWeek
          )}

          <View style={styles.editButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEditSubscription}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveEditSubscription}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Fixed Costs</Text>
        {subscriptions.length === 0 ? (
          <Text style={styles.emptyText}>No fixed costs yet. Add one above!</Text>
        ) : (
          subscriptions.map((subscription) => {
            const dueStatus = getSubscriptionDueStatus(subscription);
            const isPaid = isSubscriptionPaid(subscription);

            return (
            <View key={subscription.id} style={styles.budgetCard}>
              <View style={styles.budgetHeader}>
                <View style={styles.subscriptionInfo}>
                  <Text style={styles.budgetCategory}>{subscription.name}</Text>
                  <Text style={styles.budgetPeriod}>
                    {formatFixedCostFrequency(subscription.frequency)} • {subscription.category}
                  </Text>
                  <Text style={styles.subscriptionDueRule}>
                    {formatSubscriptionDueRule(subscription)}
                  </Text>
                  <Text style={[styles.dueStatusText, getDueStatusStyle(dueStatus.status)]}>
                    {dueStatus.label}
                  </Text>
                </View>
                <View style={styles.budgetActions}>
                  <TouchableOpacity onPress={() => handleEditSubscription(subscription)}>
                    <Text style={styles.editButton}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteSubscription(subscription.id)}>
                    <Text style={styles.deleteButton}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.budgetAmounts}>
                <Text style={styles.budgetTotal}>
                  ${subscription.amount.toFixed(2)} / {formatFixedCostFrequency(subscription.frequency).toLowerCase()}
                </Text>
              </View>
              <View style={styles.subscriptionPayActions}>
                {isPaid ? (
                  <TouchableOpacity
                    style={styles.paidButton}
                    onPress={() => handleUnmarkSubscriptionPaid(subscription)}>
                    <Text style={styles.paidButtonText}>Paid ✓</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.markPaidButton}
                    onPress={() => handleMarkSubscriptionPaid(subscription)}>
                    <Text style={styles.markPaidButtonText}>Mark Paid</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            );
          })
        )}
      </View>
    </>
  );

  const getViewTitle = () => {
    if (viewMode === 'expenses') return 'Expenses';
    if (viewMode === 'subscriptions') return 'Fixed Costs';
    if (viewMode === 'income') return 'Income';
    if (viewMode === 'budget') return 'Budget';
    return 'Transactions';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/home')} activeOpacity={0.7}>
            <Image source={require('@/assets/images/logo.png')} style={styles.headerLogo} />
          </TouchableOpacity>
          <Text style={styles.title}>{getViewTitle()}</Text>
        </View>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewToggleButton, viewMode === 'expenses' && styles.viewToggleButtonActive]}
            onPress={() => setViewMode('expenses')}>
            <Text style={[styles.viewToggleButtonText, viewMode === 'expenses' && styles.viewToggleButtonTextActive]}>
              Expenses
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleButton, viewMode === 'subscriptions' && styles.viewToggleButtonActive]}
            onPress={() => setViewMode('subscriptions')}>
            <Text style={[styles.viewToggleButtonText, viewMode === 'subscriptions' && styles.viewToggleButtonTextActive]}>
              Fixed
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

      <ScrollView ref={scrollViewRef} style={styles.content}>
        <View ref={contentRef} collapsable={false}>
          {viewMode === 'expenses' && (
            <BudgetHealthWidget health={budgetHealth} />
          )}
          {viewMode === 'expenses' && renderExpensesView()}
          {viewMode === 'subscriptions' && renderSubscriptionsView()}
          {viewMode === 'income' && renderIncomeView()}
          {viewMode === 'budget' && renderBudgetView()}
        </View>
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
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
    color: '#1A0B3C',
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
    backgroundColor: '#9D5CE9',
    borderColor: '#9D5CE9',
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
  helperText: {
    fontSize: 13,
    color: '#777',
    marginBottom: 12,
    lineHeight: 18,
  },
  scheduleCard: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 16,
  },
  scheduleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  scheduleDetail: {
    fontSize: 15,
    color: '#444',
    marginBottom: 4,
  },
  scheduleSubdetail: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    marginBottom: 12,
  },
  scheduleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 8,
  },
  secondaryButton: {
    backgroundColor: '#F3EBFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E8D5FA',
  },
  secondaryButtonText: {
    color: '#9D5CE9',
    fontSize: 14,
    fontWeight: '600',
  },
  presetButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  presetButtonText: {
    color: '#555',
    fontSize: 13,
    fontWeight: '600',
  },
  payDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  payDayInput: {
    flex: 1,
    marginBottom: 0,
  },
  removePayDayButton: {
    paddingVertical: 8,
  },
  removePayDayText: {
    color: '#999',
    fontSize: 14,
  },
  addPayDayButton: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  addPayDayText: {
    color: '#9D5CE9',
    fontSize: 14,
    fontWeight: '600',
  },
  incomeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  scheduledBadge: {
    fontSize: 11,
    color: '#9D5CE9',
    backgroundColor: '#F3EBFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  subscriptionInfo: {
    flex: 1,
    paddingRight: 12,
  },
  subscriptionDueRule: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  dueStatusText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  dueStatusPaid: {
    color: '#76E05B',
  },
  dueStatusToday: {
    color: '#9D5CE9',
  },
  dueStatusOverdue: {
    color: '#d32f2f',
  },
  dueStatusSoon: {
    color: '#ed6c02',
  },
  dueStatusUpcoming: {
    color: '#666',
  },
  subscriptionPayActions: {
    marginTop: 12,
  },
  markPaidButton: {
    backgroundColor: '#76E05B',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  markPaidButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  paidButton: {
    backgroundColor: '#EDF9E8',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#76E05B',
  },
  paidButtonText: {
    color: '#5CB848',
    fontSize: 15,
    fontWeight: '600',
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
    color: '#9D5CE9',
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
    backgroundColor: '#9D5CE9',
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
    backgroundColor: '#9D5CE9',
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
    color: '#9D5CE9',
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
    borderTopColor: '#9D5CE9',
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
    backgroundColor: '#9D5CE9',
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
    color: '#9D5CE9',
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
  budgetHeaderInfo: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
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
  budgetCategories: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  categoryChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  categoryChipText: {
    fontSize: 12,
    color: '#333',
  },
  budgetActions: {
    flexDirection: 'row',
    gap: 12,
    flexShrink: 0,
    alignItems: 'center',
    paddingTop: 2,
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
    backgroundColor: '#9D5CE9',
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
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  budgetPeriodButton: {
    flexGrow: 1,
    flexBasis: '47%',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#e0e0e0',
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  fixedCostFrequencyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  fixedCostFrequencyButton: {
    flexGrow: 1,
    flexBasis: '30%',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: '#e0e0e0',
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 36,
  },
  periodButtonActive: {
    backgroundColor: '#9D5CE9',
    borderColor: '#9D5CE9',
  },
  periodText: {
    fontSize: 12,
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
