import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api/client';
import { useReminders } from '../context/ReminderContext';
import { speakText, stopSpeaking, isSpeaking } from '../utils/speech';
import { BotIcon } from './BotIcon';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Clock,
  Volume2,
  VolumeX,
  Calendar,
  Check,
  Mic,
  MicOff,
  Settings2,
  Key,
  ExternalLink,
  X,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  aiModelUsed?: string;
  toolExecuted?: string;
}

export const ChatDrawer: React.FC = () => {
  const { reminders, refreshData, toggleComplete } = useReminders();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        '¡Hola! Soy NIMBO, tu asistente personal inteligente y confidente. 🌸 Estoy consultando tu agenda...',
      timestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingActive, setSpeakingActive] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(() => {
    return localStorage.getItem('nimbo_auto_speak') === 'true';
  });

  // Gemini API Key Modal
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState(() => {
    return localStorage.getItem('nimbo_gemini_key') || '';
  });
  const [keySavedMessage, setKeySavedMessage] = useState('');
  const [aiEngineStatus, setAiEngineStatus] = useState<{
    hasKey: boolean;
    engineName: string;
  }>({
    hasKey: Boolean(localStorage.getItem('nimbo_gemini_key')),
    engineName: localStorage.getItem('nimbo_gemini_key')
      ? 'Google Gemini 2.5 Flash'
      : 'NIMBO Conversacional (Local)',
  });

  const endRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Filter today's pending reminders from live context
  const todayStr = new Date().toISOString().split('T')[0];
  const todayPending = reminders.filter(
    (r) => r.date === todayStr && r.status !== 'COMPLETED'
  );

  const quickPrompts = [
    '¿Qué actividades tengo pendientes hoy?',
    'Me siento abrumado, ¿por dónde empiezo?',
    'Recuérdame mañana a las 9am llamar al doctor',
    'Dame un consejo para concentrarme mejor',
    'Recuérdame pagar el internet el 15 de cada mes',
    '¿Cómo estás hoy, Nimbo?',
  ];

  // Check backend AI status on mount
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await api.ai.status();
        const localKey = localStorage.getItem('nimbo_gemini_key');
        setAiEngineStatus({
          hasKey: res.hasGeminiKey || Boolean(localKey),
          engineName: res.hasGeminiKey || Boolean(localKey)
            ? 'Google Gemini 2.5 Flash'
            : 'NIMBO Inteligencia Local',
        });
      } catch {
        // ignore
      }
    }
    checkStatus();
  }, []);

  // Fetch proactive greeting on mount with real DB events
  useEffect(() => {
    let isMounted = true;
    async function loadGreeting() {
      try {
        const res = await api.ai.greeting();
        if (isMounted && res.success && res.greeting) {
          setMessages([
            {
              role: 'assistant',
              content: res.greeting,
              timestamp: new Date().toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
              }),
            },
          ]);
        }
      } catch (err) {
        console.warn('Could not load greeting:', err);
      }
    }

    loadGreeting();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Voice dictation initialization
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      alert(
        'El reconocimiento de voz por micrófono no está soportado en este navegador. Te sugerimos usar Chrome o Safari.'
      );
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognitionRef.current = recognition;
      recognition.lang = 'es-MX';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join('');
        setInput(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.warn('Error starting speech recognition:', err);
      setIsListening(false);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const time = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

    setMessages((prev) => [...prev, { role: 'user', content: text, timestamp: time }]);
    setInput('');
    setLoading(true);

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await api.ai.chat(text, historyPayload);

      const respTime = new Date().toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
      });

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.response,
          timestamp: respTime,
          aiModelUsed: res.aiModelUsed,
          toolExecuted: res.toolExecuted,
        },
      ]);

      // If a database tool was executed, immediately refresh app data
      if (res.toolExecuted) {
        await refreshData();
      }

      // If auto-speak is enabled, speak response out loud
      if (autoSpeak) {
        setSpeakingActive(true);
        speakText(res.response, {
          onEnd: () => setSpeakingActive(false),
          onError: () => setSpeakingActive(false),
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error comunicando con el asistente.';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Lo siento, ocurrió un error: ${msg}. Por favor intenta de nuevo. 🌸`,
          timestamp: new Date().toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSpeak = (text: string) => {
    if (speakingActive) {
      stopSpeaking();
      setSpeakingActive(false);
      return;
    }
    setSpeakingActive(true);
    speakText(text, {
      onEnd: () => setSpeakingActive(false),
      onError: () => setSpeakingActive(false),
    });
  };

  const toggleAutoSpeak = () => {
    const nextVal = !autoSpeak;
    setAutoSpeak(nextVal);
    localStorage.setItem('nimbo_auto_speak', String(nextVal));
    if (!nextVal) {
      stopSpeaking();
      setSpeakingActive(false);
    } else {
      speakText('¡Voz activada! Leeré mis respuestas en voz alta para ti.');
    }
  };

  const handleSaveGeminiKey = () => {
    const key = geminiKeyInput.trim();
    if (key) {
      localStorage.setItem('nimbo_gemini_key', key);
      setAiEngineStatus({
        hasKey: true,
        engineName: 'Google Gemini 2.5 Flash',
      });
      setKeySavedMessage('✓ Clave guardada correctamente. ¡Gemini 2.5 Flash activado!');
    } else {
      localStorage.removeItem('nimbo_gemini_key');
      setAiEngineStatus({
        hasKey: false,
        engineName: 'NIMBO Inteligencia Local',
      });
      setKeySavedMessage('Clave eliminada. Modo local activado.');
    }
    setTimeout(() => {
      setKeySavedMessage('');
      setShowKeyModal(false);
    }, 1200);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] sm:h-[720px] max-h-[820px] bg-[var(--surface)] border border-[var(--line)] rounded-3xl shadow-2xl overflow-hidden relative">
      {/* Header with assistant status & controls */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-[var(--line)] bg-[var(--surface-soft)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[var(--site-primary)] to-rose-400 p-1 text-white flex items-center justify-center shadow-md shadow-[var(--site-primary)]/20">
            <BotIcon className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black tracking-tight text-[var(--text)]">NIMBO</h2>
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                En línea
              </span>
            </div>
            <p className="text-[11px] text-[var(--muted)] font-medium flex items-center gap-1.5">
              <span>{aiEngineStatus.engineName}</span>
            </p>
          </div>
        </div>

        {/* Right Header Buttons: Voice toggle & Gemini Model Config */}
        <div className="flex items-center gap-2">
          {/* Auto-Voice button */}
          <button
            onClick={toggleAutoSpeak}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              autoSpeak
                ? 'bg-rose-500 text-white border-rose-500 shadow-sm shadow-rose-500/30'
                : 'border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]'
            }`}
            title={autoSpeak ? 'Desactivar voz automática de Nimbo' : 'Activar voz automática de Nimbo'}
          >
            {autoSpeak ? <Volume2 className="w-3.5 h-3.5 animate-pulse" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{autoSpeak ? 'Voz: Activa' : 'Voz: Silencio'}</span>
          </button>

          {/* AI Engine Modal trigger */}
          <button
            onClick={() => setShowKeyModal(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              aiEngineStatus.hasKey
                ? 'border-[var(--site-primary)]/40 bg-[var(--site-primary)]/10 text-[var(--site-primary)]'
                : 'border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]'
            }`}
            title="Configurar clave de Gemini o cambiar modelo de IA"
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--site-primary)]" />
            <span className="hidden md:inline">
              {aiEngineStatus.hasKey ? 'Gemini 2.5' : 'Activar Gemini'}
            </span>
          </button>
        </div>
      </div>

      {/* Proactive Today's Agenda Ribbon */}
      {todayPending.length > 0 && (
        <div className="p-2.5 bg-rose-500/5 border-b border-rose-500/15 px-4 sm:px-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Tus actividades de hoy ({todayPending.length})
            </span>
            <span className="text-[10px] text-[var(--muted)]">Toca ✓ para completar</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
            {todayPending.map((item) => (
              <div
                key={item.id}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-xs shadow-2xs group"
              >
                <button
                  onClick={() => toggleComplete(item.id)}
                  title="Marcar como completada"
                  className="w-4 h-4 rounded-md border border-[var(--line)] hover:border-emerald-500 hover:bg-emerald-500 hover:text-white text-transparent flex items-center justify-center transition-all"
                >
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </button>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[var(--text)] text-xs line-clamp-1">{item.title}</span>
                  <span className="text-[10px] text-[var(--muted)] font-mono">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={idx}
              className={`flex items-start gap-2.5 max-w-[90%] sm:max-w-[80%] ${
                isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold overflow-hidden ${
                  isUser
                    ? 'bg-[var(--site-primary)] text-white shadow-xs'
                    : 'bg-gradient-to-tr from-[var(--site-primary)] to-rose-400 p-0.5 text-white'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <BotIcon className="w-5 h-5" />}
              </div>

              <div
                className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? 'bg-[var(--site-primary)] text-white font-medium rounded-tr-xs shadow-md shadow-[var(--site-primary)]/15'
                    : 'bg-[var(--surface-soft)] border border-[var(--line)] text-[var(--text)] rounded-tl-xs shadow-xs'
                }`}
              >
                {m.content}

                <div className="flex items-center justify-between gap-3 mt-2.5 pt-2 border-t border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-bold ${
                        isUser ? 'text-white/70' : 'text-[var(--muted)]'
                      }`}
                    >
                      {m.timestamp}
                    </span>
                    {!isUser && m.aiModelUsed && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-[var(--site-primary)]/10 text-[var(--site-primary)] font-bold">
                        {m.aiModelUsed.includes('gemini') ? '✨ Gemini 2.5' : '🌸 Nimbo Local'}
                      </span>
                    )}
                  </div>

                  {!isUser && (
                    <button
                      onClick={() => handleSpeak(m.content)}
                      className="flex items-center gap-1 text-[10px] font-bold text-[var(--site-primary)] hover:underline opacity-80 hover:opacity-100 transition-opacity"
                      title="Escuchar este mensaje con la voz de Nimbo"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Escuchar</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2.5 max-w-[85%] mr-auto">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[var(--site-primary)] to-rose-400 p-0.5 text-white flex items-center justify-center">
              <BotIcon className="w-5 h-5 animate-pulse" />
            </div>
            <div className="p-3.5 rounded-2xl bg-[var(--surface-soft)] border border-[var(--line)] text-xs text-[var(--muted)] font-semibold flex items-center gap-2 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[var(--site-primary)] animate-ping" />
              <span>NIMBO está pensando y consultando tu agenda...</span>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Quick suggestions chips */}
      <div className="p-2 sm:px-4 bg-[var(--surface-soft)] border-t border-[var(--line)] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {quickPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            disabled={loading}
            className="flex-shrink-0 px-2.5 py-1 rounded-xl text-[11px] font-bold border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--site-primary)] transition-all"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Listening Banner if Speech Dictation is Active */}
      {isListening && (
        <div className="bg-rose-500/10 border-t border-rose-500/20 px-4 py-2 flex items-center justify-between text-xs font-bold text-rose-600 dark:text-rose-400 animate-pulse">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 animate-bounce" />
            <span>Escuchando tu voz... Habla naturalmente con Nimbo.</span>
          </div>
          <button
            onClick={toggleListening}
            className="text-[10px] bg-rose-500 text-white px-2 py-0.5 rounded-md hover:bg-rose-600"
          >
            Detener
          </button>
        </div>
      )}

      {/* Input Form with Microphone & Send */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 sm:p-4 bg-[var(--surface)] border-t border-[var(--line)] flex items-center gap-2"
      >
        <button
          type="button"
          onClick={toggleListening}
          className={`p-2.5 rounded-xl border transition-all flex items-center justify-center ${
            isListening
              ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/40 animate-pulse scale-105'
              : 'border-[var(--line)] bg-[var(--surface-soft)] text-[var(--muted)] hover:text-[var(--site-primary)] hover:border-[var(--site-primary)]'
          }`}
          title={isListening ? 'Detener micrófono' : 'Hablar con el micrófono'}
        >
          {isListening ? <Mic className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            isListening
              ? 'Escuchando tu voz...'
              : 'Escribe o habla libremente... (ej. ¿Qué tengo hoy?, Recuérdame pagar el agua el viernes)'
          }
          className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] text-xs sm:text-sm focus:border-[var(--site-primary)] outline-none transition-colors"
        />

        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-[var(--site-primary)] text-white text-xs font-black tracking-wide shadow-md shadow-[var(--site-primary)]/20 hover:brightness-105 active:scale-98 disabled:opacity-50 transition-all flex items-center gap-1.5"
          aria-label="Enviar mensaje a Nimbo"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Enviar</span>
        </button>
      </form>

      {/* Gemini AI Key Modal */}
      {showKeyModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--line)] rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[var(--site-primary)]" />
                <h3 className="font-black text-sm text-[var(--text)]">
                  Potenciar con Google Gemini 2.5 Flash
                </h3>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="text-[var(--muted)] hover:text-[var(--text)] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--muted)] leading-relaxed">
              Nimbo ya cuenta con inteligencia local para organizar tu agenda. Pero al agregar tu clave gratuita de **Google Gemini**, Nimbo adquiere **libertad total de conversación, empatía profunda, razonamiento y multiturno fluido**.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-[var(--text)]">
                Clave API de Google Gemini (Gratis)
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-[var(--muted)] absolute left-3 top-3" />
                <input
                  type="password"
                  value={geminiKeyInput}
                  onChange={(e) => setGeminiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] text-xs font-mono focus:border-[var(--site-primary)] outline-none"
                />
              </div>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-[var(--site-primary)] hover:underline font-bold"
              >
                <span>Obtener clave gratis en Google AI Studio</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {keySavedMessage && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{keySavedMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--line)]">
              <button
                type="button"
                onClick={() => {
                  setGeminiKeyInput('');
                  localStorage.removeItem('nimbo_gemini_key');
                  setAiEngineStatus({
                    hasKey: false,
                    engineName: 'NIMBO Inteligencia Local',
                  });
                  setKeySavedMessage('Clave eliminada. Modo local activado.');
                }}
                className="px-3 py-2 text-xs font-bold text-[var(--muted)] hover:text-red-500 transition-colors"
              >
                Limpiar clave
              </button>
              <button
                type="button"
                onClick={handleSaveGeminiKey}
                className="px-4 py-2 rounded-xl bg-[var(--site-primary)] text-white text-xs font-bold shadow-sm shadow-[var(--site-primary)]/20 hover:brightness-105 active:scale-98 transition-all"
              >
                Guardar y Activar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
