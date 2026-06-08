import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * Income schedule model:
 * {
 *   id, category,
 *   amount,           // net paycheck (used today)
 *   payDays[],
 *   grossIncome?,     // future payroll support
 *   taxes?,           // future payroll support
 *   deductions?,      // future payroll support
 * }
 */
const IncomeScheduleContext = createContext();
const STORAGE_KEY = '@budgeting_app_income_schedules';

export function IncomeScheduleProvider({ children }) {
  const [incomeSchedules, setIncomeSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadIncomeSchedules();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      saveIncomeSchedules();
    }
  }, [incomeSchedules, isLoading]);

  const loadIncomeSchedules = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setIncomeSchedules(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading income schedules:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveIncomeSchedules = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(incomeSchedules));
    } catch (error) {
      console.error('Error saving income schedules:', error);
    }
  };

  const addIncomeSchedule = (schedule) => {
    const newSchedule = {
      ...schedule,
      id: Date.now().toString(),
    };
    setIncomeSchedules((prev) => [...prev, newSchedule]);
    return newSchedule;
  };

  const updateIncomeSchedule = (id, updates) => {
    setIncomeSchedules((prev) =>
      prev.map((schedule) => (schedule.id === id ? { ...schedule, ...updates } : schedule))
    );
  };

  const deleteIncomeSchedule = (id) => {
    setIncomeSchedules((prev) => prev.filter((schedule) => schedule.id !== id));
  };

  const value = {
    incomeSchedules,
    isLoading,
    addIncomeSchedule,
    updateIncomeSchedule,
    deleteIncomeSchedule,
  };

  return (
    <IncomeScheduleContext.Provider value={value}>
      {children}
    </IncomeScheduleContext.Provider>
  );
}

export function useIncomeSchedules() {
  const context = useContext(IncomeScheduleContext);
  if (!context) {
    throw new Error('useIncomeSchedules must be used within IncomeScheduleProvider');
  }
  return context;
}
