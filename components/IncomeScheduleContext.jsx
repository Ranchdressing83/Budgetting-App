import React, { createContext, useContext } from 'react';
import { useFirestoreSync } from '@/hooks/useFirestoreSync';

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

export function IncomeScheduleProvider({ children }) {
  const {
    items: incomeSchedules,
    setItems: setIncomeSchedules,
    isLoading,
  } = useFirestoreSync('incomeSchedules');

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
