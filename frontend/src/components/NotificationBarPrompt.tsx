import React, { useState } from 'react';
import { usePush } from '../context/PushContext';
import { Bell, BellRing, Check, ShieldCheck, Sparkles, X } from 'lucide-react';

export const NotificationBarPrompt: React.FC = () => {
  const { isSupported, isSubscribed, subscribeToPush, loading } = usePush();
  const [dismissed, setDismissed] = useState(false);
  const [justActivated, setJustActivated] = useState(false);

  if (!isSupported || isSubscribed || dismissed) {
    if (justActivated) {
      return (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-between gap-3 text-xs font-bold animate-in fade-in duration-300">
          <div className="flex items-center gap-2.5">
            <Check className="w-4 h-4 stroke-[3] text-emerald-500" />
            <span>¡Notificaciones 24/7 activas en tu barra de estado de Android!</span>
          </div>
          <button
            onClick={() => setJustActivated(false)}
            className="text-emerald-600/70 hover:text-emerald-600 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }
    return null;
  }

  const handleActivate = async () => {
    const success = await subscribeToPush();
    if (success) {
      setJustActivated(true);
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-500/10 via-[var(--site-secondary)] to-pink-500/10 border border-[var(--site-primary)]/30 text-[var(--text)] shadow-xs animate-in slide-in-from-top-2 duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--site-primary)] text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-[var(--site-primary)]/20">
            <BellRing className="w-4 h-4 animate-bounce" />
          </div>
          <div>
            <h4 className="text-xs font-black text-[var(--text)] tracking-tight">
              Avisos en la barra de notificaciones
            </h4>
            <p className="text-[11px] text-[var(--muted)] leading-relaxed mt-0.5">
              Activa los permisos para que tus recordatorios aparezcan en la barra superior de tu Android, incluso con la aplicación cerrada o la pantalla bloqueada.
            </p>
          </div>
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="text-[var(--muted)] hover:text-[var(--text)] p-1 rounded-lg"
          title="Cerrar aviso temporalmente"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={handleActivate}
          disabled={loading}
          className="w-full sm:w-auto flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-[var(--site-primary)] text-white text-xs font-extrabold hover:brightness-105 active:scale-98 transition-all shadow-xs"
        >
          <Bell className="w-3.5 h-3.5" />
          <span>{loading ? 'Activando...' : 'Activar en mi barra de notificaciones'}</span>
        </button>
      </div>
    </div>
  );
};
