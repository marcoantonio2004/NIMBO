import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X, Smartphone, CheckCircle } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPwaBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('nimbo_pwa_dismissed') === 'true';
  });

  useEffect(() => {
    // Check if already running as installed PWA
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isAppleDevice);

    // Listen for Chrome / Android / Edge install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  if (isStandalone || dismissed) {
    return null;
  }

  // If not iOS and no install prompt is ready yet, we can show a general install helper
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsStandalone(true);
      }
    } else if (isIos) {
      setShowIosGuide(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('nimbo_pwa_dismissed', 'true');
  };

  return (
    <>
      {/* Floating PWA Install Bar */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 animate-in fade-in slide-in-from-bottom duration-300">
        <div className="bg-[var(--surface)]/95 backdrop-blur-md border border-[var(--site-primary)]/30 rounded-2xl p-4 shadow-2xl shadow-[var(--site-primary)]/10 text-[var(--text)]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--site-primary)] text-white flex items-center justify-center font-black text-xl shadow-md shadow-[var(--site-primary)]/20 flex-shrink-0">
                ✦
              </div>
              <div>
                <h4 className="text-xs font-black text-[var(--text)] tracking-tight">
                  Instalar NIMBO en tu dispositivo
                </h4>
                <p className="text-[11px] text-[var(--muted)] leading-tight mt-0.5">
                  Acceso directo como app nativa, alertas con voz y push 24/7.
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-[var(--muted)] hover:text-[var(--text)] p-1 rounded-lg transition-colors"
              title="Cerrar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[var(--site-primary)] text-white text-xs font-bold hover:brightness-105 active:scale-98 transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isIos ? 'Ver cómo instalar en iPhone' : 'Instalar Aplicación'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* iOS Instructions Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[var(--surface)] border border-[var(--line)] rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[var(--site-primary)]" />
                <h3 className="text-sm font-extrabold text-[var(--text)]">
                  Instalar en tu iPhone o iPad
                </h3>
              </div>
              <button
                onClick={() => setShowIosGuide(false)}
                className="text-[var(--muted)] hover:text-[var(--text)] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[var(--muted)] leading-relaxed">
              En Safari para iOS las aplicaciones se instalan directamente con la función de agregar al inicio:
            </p>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-soft)] border border-[var(--line)]">
                <div className="p-1.5 rounded-lg bg-[var(--site-primary)]/10 text-[var(--site-primary)] font-bold">
                  <Share className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-extrabold text-[var(--text)]">Paso 1:</span>
                  <p className="text-[11px] text-[var(--muted)]">
                    Toca el botón <strong>Compartir</strong> en la barra inferior de Safari.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-soft)] border border-[var(--line)]">
                <div className="p-1.5 rounded-lg bg-[var(--site-primary)]/10 text-[var(--site-primary)] font-bold">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-extrabold text-[var(--text)]">Paso 2:</span>
                  <p className="text-[11px] text-[var(--muted)]">
                    Baja en las opciones y selecciona <strong>"Agregar a pantalla de inicio"</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-soft)] border border-[var(--line)]">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 font-bold">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-extrabold text-[var(--text)]">Paso 3:</span>
                  <p className="text-[11px] text-[var(--muted)]">
                    Presiona <strong>"Agregar"</strong> en la esquina superior derecha. ¡Listo!
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 rounded-xl bg-[var(--site-primary)] text-white text-xs font-bold hover:brightness-105 transition-all"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
