import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { normalizeCategory } from '../constants/categories';
import { applyScheduleSync, removeScheduleTransactions } from '../utils/incomeScheduleUtils';

// Create the context - this will hold our transactions array and functions to modify it
const TransactionsContext = createContext();

// Storage key for persisting transactions
const STORAGE_KEY = '@budgeting_app_transactions';

export function TransactionsProvider({ children }) {
  // State to hold all transactions
  // Each transaction: { id, type: "income" | "expense", amount, category, date }
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load transactions from AsyncStorage when app starts
  useEffect(() => {
    loadTransactions();
  }, []);

  // Save transactions to AsyncStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      saveTransactions();
    }
  }, [transactions, isLoading]);

  // Load transactions from persistent storage
  const loadTransactions = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setTransactions(
          parsed.map((transaction) => ({
            ...transaction,
            category: transaction.category
              ? normalizeCategory(transaction.category)
              : transaction.category,
          }))
        );
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Save transactions to persistent storage
  const saveTransactions = async () => {
    try {
      // Convert array to JSON string for storage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (error) {
      console.error('Error saving transactions:', error);
    }
  };

  // Add a new transaction
  const addTransaction = (transaction) => {
    const newTransaction = {
      ...transaction,
      id: Date.now().toString(), // Simple ID using timestamp
      date: transaction.date || new Date().toISOString(), // Use provided date or current time
    };
    setTransactions((prev) => [...prev, newTransaction]);
  };

  // Delete a transaction by ID
  const deleteTransaction = (id) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  // Update an existing transaction
  const updateTransaction = (id, updates) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  const syncScheduledIncome = useCallback((schedule) => {
    const now = new Date();
    setTransactions((prev) =>
      applyScheduleSync(prev, schedule, now.getFullYear(), now.getMonth())
    );
  }, []);

  const removeScheduledIncome = useCallback((scheduleId) => {
    setTransactions((prev) => removeScheduleTransactions(prev, scheduleId));
  }, []);

  // Get all income transactions
  const getIncome = () => {
    return transactions.filter((t) => t.type === 'income');
  };

  // Get all expense transactions
  const getExpenses = () => {
    return transactions.filter((t) => t.type === 'expense');
  };

  // Calculate total income
  const getTotalIncome = () => {
    return getIncome().reduce((sum, t) => sum + t.amount, 0);
  };

  // Calculate total expenses
  const getTotalExpenses = () => {
    return getExpenses().reduce((sum, t) => sum + t.amount, 0);
  };

  // Calculate net (income - expenses)
  const getNet = () => {
    return getTotalIncome() - getTotalExpenses();
  };

  // Export transactions as JSON
  // NOTE: Ready for future use - can be called to export data for backup/transfer
  // Returns: JSON string with transactions data
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

  // Import transactions from JSON
  // NOTE: Ready for future use - can be called to import data from backup/transfer
  // Parameters: jsonData (string) - JSON string containing transactions array
  const importTransactions = async (jsonData) => {
    try {
      const data = JSON.parse(jsonData);
      // Validate data structure
      if (data.transactions && Array.isArray(data.transactions)) {
        setTransactions(data.transactions);
        await saveTransactions();
        return true;
      } else {
        throw new Error('Invalid data format');
      }
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

// Custom hook to use the context in components
export function useTransactions() {
  const context = useContext(TransactionsContext);
  if (!context) {
    throw new Error('useTransactions must be used within TransactionsProvider');
  }
  return context;
}

