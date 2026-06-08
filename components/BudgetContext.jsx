import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createDefaultBudgets,
  findBudget,
  getBudgetsForPeriodResolved,
  migrateBudgets,
  stripLegacyCollegeBudgets,
} from '../utils/budgetUtils';

const BudgetContext = createContext();
const STORAGE_KEY = '@budgeting_app_budgets';
const DEFAULTS_SEEDED_KEY = '@budgeting_app_defaults_seeded';
const COLLEGE_BUDGETS_REMOVED_KEY = '@budgeting_app_college_budgets_removed';

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
      const defaultsSeeded = await AsyncStorage.getItem(DEFAULTS_SEEDED_KEY);
      const collegeBudgetsRemoved = await AsyncStorage.getItem(COLLEGE_BUDGETS_REMOVED_KEY);

      if (stored) {
        let parsed = migrateBudgets(JSON.parse(stored));

        if (!collegeBudgetsRemoved) {
          parsed = stripLegacyCollegeBudgets(parsed);
          await AsyncStorage.setItem(COLLEGE_BUDGETS_REMOVED_KEY, 'true');

          if (parsed.length === 0) {
            parsed = createDefaultBudgets();
          }
        }

        setBudgets(parsed);
      } else if (!defaultsSeeded) {
        const defaults = createDefaultBudgets();
        setBudgets(defaults);
        await AsyncStorage.setItem(DEFAULTS_SEEDED_KEY, 'true');
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

  const getBudget = (identifier, period, periodKey) => {
    return findBudget(budgets, identifier, period, periodKey);
  };

  const getBudgetsForPeriod = (period, periodKey) => {
    return getBudgetsForPeriodResolved(budgets, period, periodKey);
  };

  const getRecurringBudgets = () => {
    return budgets.filter((b) => b.isRecurring === true);
  };

  const exportBudgets = async () => {
    try {
      const data = {
        budgets,
        exportDate: new Date().toISOString(),
        version: '2.0',
      };
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Error exporting budgets:', error);
      throw error;
    }
  };

  const importBudgets = async (jsonData) => {
    try {
      const data = JSON.parse(jsonData);
      if (data.budgets && Array.isArray(data.budgets)) {
        setBudgets(migrateBudgets(data.budgets));
        await saveBudgets();
        return true;
      } else {
        throw new Error('Invalid data format');
      }
    } catch (error) {
      console.error('Error importing budgets:', error);
      throw error;
    }
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
    exportBudgets,
    importBudgets,
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
