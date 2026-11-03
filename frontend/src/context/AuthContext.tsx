import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '../api/client';

export interface User {
  id: string;
  email: string;
  name: string;
  timezone: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  setupCompleted: boolean;
  checkAuth: () => Promise<void>;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  setupOwner: (data: {
    setupSecret: string;
    email: string;
    password: string;
    name: string;
    timezone?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: {
    name?: string;
    timezone?: string;
    currentPassword?: string;
    newPassword?: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupCompleted, setSetupCompleted] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      // First check if owner is configured
      const statusRes = await api.auth.status();
      setSetupCompleted(statusRes.setupCompleted);

      if (!statusRes.setupCompleted) {
        setUser(null);
        return;
      }

      // If owner is configured, verify session
      const meRes = await api.auth.me();
      setUser(meRes.user);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (credentials: { email: string; password: string }) => {
    const res = await api.auth.login(credentials);
    setUser(res.user);
  };

  const setupOwner = async (data: {
    setupSecret: string;
    email: string;
    password: string;
    name: string;
    timezone?: string;
  }) => {
    const res = await api.auth.setup(data);
    setUser(res.user);
    setSetupCompleted(true);
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } finally {
      setUser(null);
    }
  };

  const updateProfile = async (data: {
    name?: string;
    timezone?: string;
    currentPassword?: string;
    newPassword?: string;
  }) => {
    const res = await api.auth.updateProfile(data);
    setUser(res.user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        setupCompleted,
        checkAuth,
        login,
        setupOwner,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
