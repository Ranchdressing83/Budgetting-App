import { assertFirebaseConfigured, auth } from '@/config/firebase';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [configError, setConfigError] = useState(null);

  useEffect(() => {
    try {
      assertFirebaseConfigured();
    } catch (error) {
      setConfigError(error.message);
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email, password) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const signUp = async (email, password) => {
    await createUserWithEmailAndPassword(auth, email.trim(), password);
  };

  const logOut = async () => {
    await signOut(auth);
  };

  const value = {
    user,
    isLoading,
    configError,
    signIn,
    signUp,
    logOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
