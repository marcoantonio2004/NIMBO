import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePush } from '../context/PushContext';
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
} from 'lucide-react';

interface NavbarProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ theme, toggleTheme }) => {
  const { user, logout } = useAuth();
  const { isSubscribed, subscribeToPush, loading: pushLoading } = usePush();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { to: '/', label: 'Inicio', icon: LayoutDashboard },
    { to: '/reminders', label: 'Recordatorios', icon: CheckSquare },
    { to: '/calendar', label: 'Calendario', icon: Calendar },
    { to: '/assistant', label: 'Asistente IA', icon: Sparkles },
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
              <div className="w-9 h-9 rounded-xl bg-[var(--site-primary)] text-white flex items-center justify-center font-black shadow-md shadow-[var(--site-primary)]/20 transition-transform group-hover:scale-105">
                ✦
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
