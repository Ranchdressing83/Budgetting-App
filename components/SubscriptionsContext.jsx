import React, { createContext, useContext } from 'react';
import { useFirestoreSync } from '@/hooks/useFirestoreSync';

const SubscriptionsContext = createContext();

export function SubscriptionsProvider({ children }) {
  const {
    items: subscriptions,
    setItems: setSubscriptions,
    isLoading,
  } = useFirestoreSync('subscriptions');

  const addSubscription = (subscription) => {
    const newSubscription = {
      ...subscription,
      id: Date.now().toString(),
    };
    setSubscriptions((prev) => [...prev, newSubscription]);
  };

  const updateSubscription = (id, updates) => {
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const deleteSubscription = (id) => {
    setSubscriptions((prev) => prev.filter((s) => s.id !== id));
  };

  const value = {
    subscriptions,
    isLoading,
    addSubscription,
    updateSubscription,
    deleteSubscription,
  };

  return (
    <SubscriptionsContext.Provider value={value}>
      {children}
    </SubscriptionsContext.Provider>
  );
}

export function useSubscriptions() {
  const context = useContext(SubscriptionsContext);
  if (!context) {
    throw new Error('useSubscriptions must be used within SubscriptionsProvider');
  }
  return context;
}
