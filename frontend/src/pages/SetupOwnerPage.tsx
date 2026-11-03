import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { KeyRound, ShieldAlert, Sparkles, ArrowRight, AlertCircle } from 'lucide-react';

export const SetupOwnerPage: React.FC = () => {
  const { setupOwner } = useAuth();

  const [setupSecret, setSetupSecret] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [timezone, setTimezone] = useState('America/Mexico_City');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupSecret || !name || !email || password.length < 10) {
      setError('La contraseña debe tener al menos 10 caracteres y todos los campos son obligatorios.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await setupOwner({
        setupSecret: setupSecret.trim(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        timezone: timezone.trim(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error durante la inicialización';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--site-background)]">
      <div className="w-full max-w-lg bg-[var(--surface)] border border-[var(--line)] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[var(--site-primary)] text-white flex items-center justify-center font-black text-xl shadow-lg shadow-[var(--site-primary)]/20 mx-auto">
            ✦
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--text)]">
            Inicialización Propietaria
          </h1>
          <p className="text-xs text-[var(--muted)]">
            Configuración inicial de uso exclusivo. Se creará la única cuenta propietaria de NIMBO.
          </p>
        </div>

        {error && (
          <div className="p-3 text-xs rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
          <span>
            Esta acción es de un solo uso. Una vez creado el propietario, este formulario quedará deshabilitado permanentemente.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--muted)] mb-1">
              Secreto de Instalación (SETUP_SECRET) *
            </label>
            <input
              type="password"
              required
              autoFocus
              value={setupSecret}
              onChange={(e) => setSetupSecret(e.target.value)}
              placeholder="Clave maestra de instalación del archivo .env"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] text-sm font-semibold focus:border-[var(--site-primary)] outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--muted)] mb-1">
                Tu Nombre *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Marco Antonio"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] text-sm font-semibold focus:border-[var(--site-primary)] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--muted)] mb-1">
                Zona Horaria
              </label>
              <input
                type="text"
                required
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] text-sm font-semibold focus:border-[var(--site-primary)] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--muted)] mb-1">
              Correo Electrónico del Propietario *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="propietario@nimbo.local"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] text-sm font-semibold focus:border-[var(--site-primary)] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--muted)] mb-1">
              Contraseña Maestra (mínimo 10 caracteres) *
            </label>
            <input
              type="password"
              required
              minLength={10}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] text-sm font-semibold focus:border-[var(--site-primary)] outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[var(--site-primary)] text-white text-xs font-black tracking-wider uppercase shadow-md shadow-[var(--site-primary)]/20 hover:brightness-105 active:scale-98 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Inicializando...' : 'Completar instalación y acceder'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
