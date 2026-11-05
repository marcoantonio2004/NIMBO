import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ReminderProvider } from './context/ReminderContext';
import { PushProvider } from './context/PushContext';

import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { RemindersPage } from './pages/RemindersPage';
import { CalendarPage } from './pages/CalendarPage';
import { ChatAssistantPage } from './pages/ChatAssistantPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { SetupOwnerPage } from './pages/SetupOwnerPage';
import { InstallPwaBanner } from './components/InstallPwaBanner';
import { BotIcon } from './components/BotIcon';
import { speakText } from './utils/speech';

const AppContent: React.FC = () => {
  const { user, loading, setupCompleted } = useAuth();

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem('nimbo_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('nimbo_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Listen to service worker push events to speak voice alert aloud
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const handler = (event: MessageEvent) => {
        if (event.data?.type === 'NIMBO_VOICE_ALERT' && event.data?.text) {
          speakText(event.data.text);
        }
      };
      navigator.serviceWorker.addEventListener('message', handler);
      return () => navigator.serviceWorker.removeEventListener('message', handler);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--site-background)] text-[var(--text)]">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[var(--site-primary)] to-rose-400 p-2 text-white flex items-center justify-center shadow-xl shadow-[var(--site-primary)]/25 animate-pulse">
          <BotIcon className="w-10 h-10" />
        </div>
        <div className="mt-4 font-black tracking-widest text-xs uppercase text-[var(--muted)]">
          NIMBO
        </div>
      </div>
    );
  }

  // 1. Initial Setup Guard
  if (!setupCompleted) {
    return <SetupOwnerPage />;
  }

  // 2. Authentication Guard
  if (!user) {
    return (
      <>
        <LoginPage />
        <InstallPwaBanner />
      </>
    );
  }

  // 3. Authenticated Owner App
  return (
    <ReminderProvider>
      <PushProvider>
        <div className="min-h-screen bg-[var(--site-background)] text-[var(--text)] flex flex-col">
          <Navbar theme={theme} toggleTheme={toggleTheme} />
          <main className="flex-1 pb-16">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/reminders" element={<RemindersPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/assistant" element={<Navigate to="/" replace />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <InstallPwaBanner />
        </div>
      </PushProvider>
    </ReminderProvider>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
