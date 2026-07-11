import React, { createContext, useCallback, useContext, useEffect } from 'react';
import { normalizeCategory } from '../constants/categories';
import { applyScheduleSync, removeScheduleTransactions } from '../utils/incomeScheduleUtils';
import { toNumber } from '../utils/moneyUtils';
import { stripUndefined } from '../utils/firestoreUtils';
import { useFirestoreSync } from '@/hooks/useFirestoreSync';

const TransactionsContext = createContext();

function normalizeTransactions(transactions) {
  return transactions.map((transaction) =>
    stripUndefined({
      ...transaction,
      amount: toNumber(transaction.amount, 0),
      category: transaction.category
        ? normalizeCategory(transaction.category)
        : transaction.category,
    })
  );
}

export function TransactionsProvider({ children }) {
  const { items: transactions, setItems: setTransactions, isLoading } = useFirestoreSync(
    'transactions'
  );

  useEffect(() => {
    if (isLoading || transactions.length === 0) {
      return;
    }

    const normalized = normalizeTransactions(transactions);
    if (JSON.stringify(normalized) !== JSON.stringify(transactions)) {
      setTransactions(normalized);
    }
  }, [isLoading, transactions, setTransactions]);

  const addTransaction = (transaction) => {
    const newTransaction = stripUndefined({
      ...transaction,
      id: Date.now().toString(),
      date: transaction.date || new Date().toISOString(),
    });
    setTransactions((prev) => [...prev, newTransaction]);
  };

  const deleteTransaction = (id) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const updateTransaction = (id, updates) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? stripUndefined({ ...t, ...updates }) : t))
    );
  };

  const syncScheduledIncome = useCallback(
    (schedule) => {
      const now = new Date();
      setTransactions((prev) =>
        applyScheduleSync(prev, schedule, now.getFullYear(), now.getMonth())
      );
    },
    [setTransactions]
  );

  const removeScheduledIncome = useCallback(
    (scheduleId) => {
      setTransactions((prev) => removeScheduleTransactions(prev, scheduleId));
    },
    [setTransactions]
  );

  const getIncome = () => {
    return transactions.filter((t) => t.type === 'income');
  };

  const getExpenses = () => {
    return transactions.filter((t) => t.type === 'expense');
  };

  const getTotalIncome = () => {
    return getIncome().reduce((sum, t) => sum + t.amount, 0);
  };

  const getTotalExpenses = () => {
    return getExpenses().reduce((sum, t) => sum + t.amount, 0);
  };

  const getNet = () => {
    return getTotalIncome() - getTotalExpenses();
  };

  const exportTransactions = async () => {
    try {
      const data = {
        transactions,
        exportDate: new Date().toISOString(),
        version: '1.0',
      };
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Error exporting transactions:', error);
      throw error;
    }
  };

  const importTransactions = async (jsonData) => {
    try {
      const data = JSON.parse(jsonData);
      if (data.transactions && Array.isArray(data.transactions)) {
        setTransactions(normalizeTransactions(data.transactions));
        return true;
      }
      throw new Error('Invalid data format');
    } catch (error) {
      console.error('Error importing transactions:', error);
      throw error;
    }
  };

  const value = {
    transactions,
    isLoading,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    syncScheduledIncome,
    removeScheduledIncome,
    getIncome,
    getExpenses,
    getTotalIncome,
    getTotalExpenses,
    getNet,
    exportTransactions,
    importTransactions,
  };

  return (
    <TransactionsContext.Provider value={value}>
      {children}
    </TransactionsContext.Provider>
  );
}

export function useTransactions() {
  const context = useContext(TransactionsContext);
  if (!context) {
    throw new Error('useTransactions must be used within TransactionsProvider');
  }
  return context;
}
