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
  isOffline: boolean;
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

const CACHED_USER_KEY = 'nimbo_cached_user';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const cached = localStorage.getItem(CACHED_USER_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const [setupCompleted, setSetupCompleted] = useState(true);
  const [isOffline, setIsOffline] = useState(() => {
    return typeof navigator !== 'undefined' ? !navigator.onLine : false;
  });

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);

      // If offline, preserve cached user
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsOffline(true);
        const cached = localStorage.getItem(CACHED_USER_KEY);
        if (cached) {
          setUser(JSON.parse(cached));
        }
        return;
      }

      // First check if owner is configured
      const statusRes = await api.auth.status();
      setSetupCompleted(statusRes.setupCompleted);

      if (!statusRes.setupCompleted) {
        setUser(null);
        localStorage.removeItem(CACHED_USER_KEY);
        return;
      }

      // If owner is configured, verify session
      const meRes = await api.auth.me();
      setUser(meRes.user);
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(meRes.user));
    } catch (err: any) {
      // If error is 401 Unauthorized, session truly expired
      if (err?.statusCode === 401) {
        setUser(null);
        localStorage.removeItem(CACHED_USER_KEY);
      } else {
        // Network error (offline or server unreachable): preserve cached user
        const cached = localStorage.getItem(CACHED_USER_KEY);
        if (cached) {
          try {
            setUser(JSON.parse(cached));
          } catch {
            setUser(null);
          }
        }
      }
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
    localStorage.setItem(CACHED_USER_KEY, JSON.stringify(res.user));
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
    localStorage.setItem(CACHED_USER_KEY, JSON.stringify(res.user));
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } finally {
      setUser(null);
      localStorage.removeItem(CACHED_USER_KEY);
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
    localStorage.setItem(CACHED_USER_KEY, JSON.stringify(res.user));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        setupCompleted,
        isOffline,
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
