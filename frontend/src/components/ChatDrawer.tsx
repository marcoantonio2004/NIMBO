import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api/client';
import { useReminders } from '../context/ReminderContext';
import { speakText } from '../utils/speech';
import {
  Sparkles,
  Send,
  Bot,
  User,
  CheckCircle2,
  Clock,
  Volume2,
  Calendar,
  AlertCircle,
  Check,
} from 'lucide-react';

export const ChatDrawer: React.FC = () => {
  const { reminders, refreshData, toggleComplete } = useReminders();
  const [messages, setMessages] = useState<
    Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>
  >([
    {
      role: 'assistant',
      content:
        '¡Hola! Soy NIMBO, tu asistente personal inteligente. Estoy consultando tu agenda de hoy...',
      timestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [greetingLoaded, setGreetingLoaded] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Filter today's pending reminders from live context
  const todayStr = new Date().toISOString().split('T')[0];
  const todayPending = reminders.filter(
    (r) => r.date === todayStr && r.status !== 'COMPLETED'
  );

  const quickPrompts = [
    '¿Qué actividades tengo pendientes hoy?',
    'Recuérdame mañana a las 8am llamar al hospital',
    '¿Qué tengo programado para esta semana?',
    'Marca como completada mi actividad de ayer',
    'Recuérdame pagar la luz el día 15 de cada mes',
  ];

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
          setGreetingLoaded(true);
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

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

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
        { role: 'assistant', content: res.response, timestamp: respTime },
      ]);

      // If a database tool was executed, immediately refresh app data
      if (res.toolExecuted) {
        await refreshData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error comunicando con el asistente.';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Lo siento, ocurrió un error: ${msg}. Por favor intenta de nuevo.`,
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
    // Strip markdown formatting for cleaner speech narration
    const cleanText = text.replace(/[*_#`]/g, '');
    speakText(cleanText);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] sm:h-[720px] max-h-[820px] bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-xs overflow-hidden">
      {/* Header with assistant status & today counter */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-[var(--line)] bg-[var(--surface-soft)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--site-primary)] text-white flex items-center justify-center font-bold shadow-sm shadow-[var(--site-primary)]/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-[var(--text)]">NIMBO Asistente</h2>
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                En línea
              </span>
            </div>
            <p className="text-[11px] text-[var(--muted)] font-medium">
              Escribe o habla naturalmente para organizar tu tiempo
            </p>
          </div>
        </div>

        {todayPending.length > 0 && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-xs font-bold text-[var(--site-primary)]">
            <Clock className="w-3.5 h-3.5" />
            <span>{todayPending.length} pendiente{todayPending.length > 1 ? 's' : ''} hoy</span>
          </div>
        )}
      </div>

      {/* Proactive Today's Agenda Ribbon */}
      {todayPending.length > 0 && (
        <div className="p-3 bg-emerald-500/5 border-b border-emerald-500/20 px-4 sm:px-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Tus actividades de hoy
            </span>
            <span className="text-[10px] text-[var(--muted)]">Toca ✓ para completar</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {todayPending.map((item) => (
              <div
                key={item.id}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-xs shadow-2xs group"
              >
                <button
                  onClick={() => toggleComplete(item.id)}
                  title="Marcar como completada"
                  className="w-5 h-5 rounded-md border border-[var(--line)] hover:border-emerald-500 hover:bg-emerald-500 hover:text-white text-transparent flex items-center justify-center transition-all"
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </button>
                <div className="flex flex-col">
                  <span className="font-bold text-[var(--text)] line-clamp-1">{item.title}</span>
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
                className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-[var(--site-primary)] text-white shadow-xs'
                    : 'bg-[var(--site-secondary)] text-[var(--site-on-secondary)]'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? 'bg-[var(--site-primary)] text-white font-medium rounded-tr-xs shadow-sm shadow-[var(--site-primary)]/10'
                    : 'bg-[var(--surface-soft)] border border-[var(--line)] text-[var(--text)] rounded-tl-xs shadow-2xs'
                }`}
              >
                {m.content}

                <div className="flex items-center justify-between gap-3 mt-2 pt-1 border-t border-black/5 dark:border-white/5">
                  <span
                    className={`text-[9px] font-bold ${
                      isUser ? 'text-white/70' : 'text-[var(--muted)]'
                    }`}
                  >
                    {m.timestamp}
                  </span>

                  {!isUser && (
                    <button
                      onClick={() => handleSpeak(m.content)}
                      className="flex items-center gap-1 text-[10px] font-bold text-[var(--site-primary)] hover:underline opacity-80 hover:opacity-100 transition-opacity"
                      title="Escuchar este mensaje en voz alta"
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
          <div className="flex items-center gap-2 max-w-[85%] mr-auto">
            <div className="w-7 h-7 rounded-lg bg-[var(--site-secondary)] text-[var(--site-on-secondary)] flex items-center justify-center text-xs font-bold">
              <Bot className="w-4 h-4 animate-spin text-[var(--site-primary)]" />
            </div>
            <div className="p-3.5 rounded-2xl bg-[var(--surface-soft)] border border-[var(--line)] text-xs text-[var(--muted)] font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--site-primary)] animate-ping" />
              <span>NIMBO está consultando y actualizando tu agenda...</span>
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
            className="flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--site-primary)] transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 sm:p-4 bg-[var(--surface)] border-t border-[var(--line)] flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe lo que necesites en español... (ej. Recuérdame pagar la luz el viernes a las 5pm)"
          className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] text-xs sm:text-sm focus:border-[var(--site-primary)] outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-[var(--site-primary)] text-white text-xs font-extrabold shadow-sm shadow-[var(--site-primary)]/20 hover:brightness-105 active:scale-98 disabled:opacity-50 transition-all flex items-center gap-1.5"
          aria-label="Enviar mensaje al asistente"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Enviar</span>
        </button>
      </form>
    </div>
  );
};
