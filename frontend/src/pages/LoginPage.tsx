import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      setLoading(true);
      setError('');
      await login({ email, password });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--site-background)]">
      <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--line)] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[var(--site-primary)] text-white flex items-center justify-center font-black text-xl shadow-lg shadow-[var(--site-primary)]/20 mx-auto">
            ✦
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--text)]">NIMBO</h1>
          <p className="text-xs text-[var(--muted)] font-medium">
            Acceso exclusivo al asistente personal del propietario
          </p>
        </div>

        {error && (
          <div className="p-3 text-xs rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--muted)] mb-1">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[var(--muted)] absolute left-3.5 top-3" />
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="propietario@nimbo.local"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] text-sm font-semibold focus:border-[var(--site-primary)] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--muted)] mb-1">
              Contraseña Maestra
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[var(--muted)] absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] text-sm font-semibold focus:border-[var(--site-primary)] outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[var(--site-primary)] text-white text-xs font-black tracking-wider uppercase shadow-md shadow-[var(--site-primary)]/20 hover:brightness-105 active:scale-98 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Verificando...' : 'Ingresar a mi asistente'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 text-center text-[10px] text-[var(--muted)] flex items-center justify-center gap-1.5 border-t border-[var(--line)]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Acceso privado protegido con Argon2id y sesiones cifradas</span>
        </div>
      </div>
    </div>
  );
};
