import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

const BudgetContext = createContext();
const STORAGE_KEY = '@budgeting_app_budgets';

export function BudgetProvider({ children }) {
  const [budgets, setBudgets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBudgets();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      saveBudgets();
    }
  }, [budgets, isLoading]);

  const loadBudgets = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setBudgets(parsed);
      }
    } catch (error) {
      console.error('Error loading budgets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveBudgets = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(budgets));
    } catch (error) {
      console.error('Error saving budgets:', error);
    }
  };

  const addBudget = (budget) => {
    const newBudget = {
      ...budget,
      id: Date.now().toString(),
    };
    setBudgets((prev) => [...prev, newBudget]);
  };

  const updateBudget = (id, updates) => {
    setBudgets((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
  };

  const deleteBudget = (id) => {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  };

  const getBudget = (category, period, periodKey) => {
    // First, try to find an exact match for the period
    const exactMatch = budgets.find(
      (b) =>
        b.category === category &&
        b.period === period &&
        b.periodKey === periodKey
    );
    if (exactMatch) return exactMatch;

    // If no exact match, check for a recurring budget for this category and period type
    const recurringBudget = budgets.find(
      (b) =>
        b.category === category &&
        b.period === period &&
        b.isRecurring === true
    );
    return recurringBudget || null;
  };

  const getBudgetsForPeriod = (period, periodKey) => {
    const periodBudgets = budgets.filter(
      (b) => b.period === period && b.periodKey === periodKey && !b.isRecurring
    );
    
    // Also include recurring budgets for this period type
    const recurringBudgets = budgets.filter(
      (b) => b.period === period && b.isRecurring === true
    );
    
    // Combine and deduplicate by category
    const combined = [...periodBudgets];
    recurringBudgets.forEach((recurring) => {
      const exists = combined.some((b) => b.category === recurring.category);
      if (!exists) {
        combined.push({ ...recurring, periodKey });
      }
    });
    
    return combined;
  };

  const getRecurringBudgets = () => {
    return budgets.filter((b) => b.isRecurring === true);
  };

  const value = {
    budgets,
    isLoading,
    addBudget,
    updateBudget,
    deleteBudget,
    getBudget,
    getBudgetsForPeriod,
    getRecurringBudgets,
  };

  return (
    <BudgetContext.Provider value={value}>
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudget() {
  const context = useContext(BudgetContext);
  if (!context) {
    throw new Error('useBudget must be used within BudgetProvider');
  }
  return context;
}

