import React, { createContext, useContext, useEffect, useRef } from 'react';
import {
  createDefaultBudgets,
  findBudget,
  getBudgetsForPeriodResolved,
  migrateBudgets,
  stripLegacyCollegeBudgets,
} from '../utils/budgetUtils';
import { useFirestoreSync } from '@/hooks/useFirestoreSync';

const BudgetContext = createContext();

const BUDGET_SYNC_OPTIONS = {
  getDefaultItems: () => [],
  getDefaultMeta: () => ({
    defaultsSeeded: false,
    collegeBudgetsRemoved: false,
  }),
};

export function BudgetProvider({ children }) {
  const {
    items: budgets,
    setItems: setBudgets,
    meta,
    setMeta,
    isLoading,
    isReady,
  } = useFirestoreSync('budgets', BUDGET_SYNC_OPTIONS);
  const hasRunMigrations = useRef(false);

  useEffect(() => {
    if (!isReady || isLoading || hasRunMigrations.current) {
      return;
    }

    let nextBudgets = migrateBudgets(budgets);
    const nextMeta = { ...meta };
    let changed = false;

    if (!meta.collegeBudgetsRemoved) {
      nextBudgets = stripLegacyCollegeBudgets(nextBudgets);
      nextMeta.collegeBudgetsRemoved = true;
      changed = true;

      if (nextBudgets.length === 0) {
        nextBudgets = createDefaultBudgets();
        nextMeta.defaultsSeeded = true;
      }
    } else if (budgets.length === 0 && !meta.defaultsSeeded) {
      nextBudgets = createDefaultBudgets();
      nextMeta.defaultsSeeded = true;
      changed = true;
    }

    const migratedBudgets = migrateBudgets(budgets);
    if (JSON.stringify(migratedBudgets) !== JSON.stringify(budgets)) {
      nextBudgets = migratedBudgets;
      changed = true;
    }

    hasRunMigrations.current = true;

    if (changed) {
      setBudgets(nextBudgets);
      setMeta(nextMeta);
    }
  }, [isReady, isLoading, budgets, meta, setBudgets, setMeta]);

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
        return true;
      }
      throw new Error('Invalid data format');
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
