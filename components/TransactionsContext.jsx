import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

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
        // Parse the JSON string back into an array
        const parsed = JSON.parse(stored);
        setTransactions(parsed);
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

  const value = {
    transactions,
    isLoading,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    getIncome,
    getExpenses,
    getTotalIncome,
    getTotalExpenses,
    getNet,
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

