import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X, Smartphone, CheckCircle, Monitor, MoreVertical } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPwaBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    return (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt || null;
  });
  const [isStandalone, setIsStandalone] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem('nimbo_pwa_dismissed') === 'true';
  });

  useEffect(() => {
    // Check if already running as installed standalone PWA
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    // Detect platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }

    // Listen for install prompt event
    const handlePrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const handleCustomPrompt = (e: Event) => {
      const custom = e as CustomEvent<BeforeInstallPromptEvent>;
      if (custom.detail) {
        setDeferredPrompt(custom.detail);
      }
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('nimbo:installable', handleCustomPrompt);

    window.addEventListener('appinstalled', () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent | null }).__pwaInstallPrompt = null;
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('nimbo:installable', handleCustomPrompt);
    };
  }, []);

  if (isStandalone || dismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    const prompt = deferredPrompt || (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt;

    if (prompt) {
      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsStandalone(true);
          setDeferredPrompt(null);
          (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent | null }).__pwaInstallPrompt = null;
          return;
        }
      } catch (err) {
        console.warn('Native prompt failed or was dismissed, showing guide:', err);
      }
    }

    // If native prompt is not available, open the guide modal
    setShowGuide(true);
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('nimbo_pwa_dismissed', 'true');
  };

  return (
    <>
      {/* Floating PWA Install Bar */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 animate-in fade-in slide-in-from-bottom duration-300">
        <div className="bg-[var(--surface)]/95 backdrop-blur-md border border-[var(--site-primary)]/40 rounded-2xl p-4 shadow-2xl shadow-[var(--site-primary)]/15 text-[var(--text)]">
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
              className="text-[var(--muted)] hover:text-[var(--text)] p-1 rounded-lg transition-colors cursor-pointer"
              title="Cerrar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[var(--site-primary)] text-white text-xs font-bold hover:brightness-105 active:scale-98 transition-all shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Instalar Aplicación</span>
            </button>
          </div>
        </div>
      </div>

      {/* Instructions Modal (shown if native prompt is unavailable or device requires manual add) */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--surface)] border border-[var(--line)] rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-[var(--text)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {platform === 'desktop' ? (
                  <Monitor className="w-5 h-5 text-[var(--site-primary)]" />
                ) : (
                  <Smartphone className="w-5 h-5 text-[var(--site-primary)]" />
                )}
                <h3 className="text-sm font-extrabold text-[var(--text)]">
                  {platform === 'ios'
                    ? 'Instalar en iPhone o iPad'
                    : platform === 'android'
                    ? 'Instalar en Android (Chrome)'
                    : 'Instalar en tu Computadora'}
                </h3>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="text-[var(--muted)] hover:text-[var(--text)] p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[var(--muted)] leading-relaxed">
              Sigue estos sencillos pasos para tener NIMBO en tu pantalla de inicio como app independiente:
            </p>

            {platform === 'ios' && (
              <div className="space-y-2.5 text-xs">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-soft)] border border-[var(--line)]">
                  <div className="p-1.5 rounded-lg bg-[var(--site-primary)]/10 text-[var(--site-primary)] font-bold flex-shrink-0">
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
                  <div className="p-1.5 rounded-lg bg-[var(--site-primary)]/10 text-[var(--site-primary)] font-bold flex-shrink-0">
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
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 font-bold flex-shrink-0">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-extrabold text-[var(--text)]">Paso 3:</span>
                    <p className="text-[11px] text-[var(--muted)]">
                      Presiona <strong>"Agregar"</strong> en la esquina superior derecha.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {platform === 'android' && (
              <div className="space-y-2.5 text-xs">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-soft)] border border-[var(--line)]">
                  <div className="p-1.5 rounded-lg bg-[var(--site-primary)]/10 text-[var(--site-primary)] font-bold flex-shrink-0">
                    <MoreVertical className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-extrabold text-[var(--text)]">Paso 1:</span>
                    <p className="text-[11px] text-[var(--muted)]">
                      Toca el menú de los <strong>tres puntos (⋮)</strong> en la esquina superior derecha de Chrome.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-soft)] border border-[var(--line)]">
                  <div className="p-1.5 rounded-lg bg-[var(--site-primary)]/10 text-[var(--site-primary)] font-bold flex-shrink-0">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-extrabold text-[var(--text)]">Paso 2:</span>
                    <p className="text-[11px] text-[var(--muted)]">
                      Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-soft)] border border-[var(--line)]">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 font-bold flex-shrink-0">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-extrabold text-[var(--text)]">Paso 3:</span>
                    <p className="text-[11px] text-[var(--muted)]">
                      Confirma <strong>"Instalar"</strong>. Se añadirá el ícono de NIMBO a tu celular.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {platform === 'desktop' && (
              <div className="space-y-2.5 text-xs">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-soft)] border border-[var(--line)]">
                  <div className="p-1.5 rounded-lg bg-[var(--site-primary)]/10 text-[var(--site-primary)] font-bold flex-shrink-0">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-extrabold text-[var(--text)]">Paso 1:</span>
                    <p className="text-[11px] text-[var(--muted)]">
                      En la barra de direcciones de tu navegador (Chrome o Edge), busca el ícono de <strong>Instalar (⊕ o 📥)</strong> a la derecha.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-soft)] border border-[var(--line)]">
                  <div className="p-1.5 rounded-lg bg-[var(--site-primary)]/10 text-[var(--site-primary)] font-bold flex-shrink-0">
                    <MoreVertical className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-extrabold text-[var(--text)]">Alternativa:</span>
                    <p className="text-[11px] text-[var(--muted)]">
                      Haz clic en el menú <strong>(⋮)</strong> &gt; <strong>"Transmitir, guardar y compartir"</strong> &gt; <strong>"Instalar página como app..."</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-soft)] border border-[var(--line)]">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 font-bold flex-shrink-0">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-extrabold text-[var(--text)]">Listo:</span>
                    <p className="text-[11px] text-[var(--muted)]">
                      NIMBO se abrirá en su propia ventana sin barras de navegación.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowGuide(false)}
              className="w-full py-2.5 rounded-xl bg-[var(--site-primary)] text-white text-xs font-bold hover:brightness-105 transition-all cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
