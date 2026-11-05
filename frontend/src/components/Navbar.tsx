import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePush } from '../context/PushContext';
import { useReminders } from '../context/ReminderContext';
import {
  CheckSquare,
  Calendar,
  Sparkles,
  History,
  Settings,
  Bell,
  BellRing,
  Sun,
  Moon,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import { BotIcon } from './BotIcon';

interface NavbarProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ theme, toggleTheme }) => {
  const { user, logout } = useAuth();
  const { isSubscribed, subscribeToPush, loading: pushLoading } = usePush();
  const { isOffline, pendingSyncCount, triggerSync } = useReminders();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { to: '/', label: 'Asistente', icon: Sparkles },
    { to: '/reminders', label: 'Recordatorios', icon: CheckSquare },
    { to: '/calendar', label: 'Calendario', icon: Calendar },
    { to: '/history', label: 'Historial', icon: History },
    { to: '/settings', label: 'Configuración', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[var(--surface)] border-b border-[var(--line)] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[var(--site-primary)] to-rose-400 p-1 text-white flex items-center justify-center shadow-md shadow-[var(--site-primary)]/20 transition-transform group-hover:scale-105">
                <BotIcon className="w-7 h-7" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold tracking-tight text-lg text-[var(--text)]">NIMBO</span>
                <span className="text-[9px] tracking-widest text-[var(--muted)] font-bold -mt-1 uppercase">
                  Asistente Personal
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1" aria-label="Navegación principal">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                    isActive
                      ? 'bg-[var(--site-secondary)] text-[var(--site-on-secondary)] font-extrabold'
                      : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-soft)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Offline & Sync Status Indicator */}
            {isOffline ? (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400"
                title="Modo sin conexión. Tus cambios se guardan localmente y se sincronizarán al reconectar."
              >
                <WifiOff className="w-3.5 h-3.5 animate-pulse" />
                <span className="hidden sm:inline">Offline</span>
                {pendingSyncCount > 0 && (
                  <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-black">
                    {pendingSyncCount}
                  </span>
                )}
              </div>
            ) : pendingSyncCount > 0 ? (
              <button
                onClick={() => triggerSync()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-all"
                title="Hay cambios locales pendientes de sincronizar con la nube. Haz clic para sincronizar ahora."
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">Sincronizar ({pendingSyncCount})</span>
              </button>
            ) : null}

            {/* Push notification 1-click status / activation */}
            <button
              onClick={() => {
                if (!isSubscribed) subscribeToPush();
              }}
              disabled={pushLoading}
              title={isSubscribed ? 'Notificaciones Push 24/7 activas' : 'Activar notificaciones Push 24/7'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                isSubscribed
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-[var(--surface-soft)] border-[var(--line)] text-[var(--muted)] hover:border-[var(--site-primary)]'
              }`}
            >
              {isSubscribed ? (
                <>
                  <BellRing className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="hidden sm:inline">Push 24/7 activo</span>
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{pushLoading ? 'Activando...' : 'Activar avisos'}</span>
                </>
              )}
            </button>

            {/* Dark / Light Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-soft)] transition-colors"
              title="Cambiar tema de apariencia"
              aria-label="Cambiar tema de apariencia"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Profile Avatar / Logout */}
            <div className="flex items-center gap-2 pl-1">
              <div
                className="w-8 h-8 rounded-full bg-[var(--site-secondary)] text-[var(--site-on-secondary)] flex items-center justify-center font-extrabold text-xs border border-[var(--line)]"
                title={`Propietario: ${user?.name || 'Tú'}`}
              >
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'TÚ'}
              </div>
              <button
                onClick={logout}
                className="p-2 text-[var(--muted)] hover:text-red-500 rounded-xl transition-colors"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-[var(--muted)] hover:text-[var(--text)]"
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--line)] bg-[var(--surface)] px-4 pt-2 pb-4 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                  isActive
                    ? 'bg-[var(--site-secondary)] text-[var(--site-on-secondary)]'
                    : 'text-[var(--muted)] hover:bg-[var(--surface-soft)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
};
