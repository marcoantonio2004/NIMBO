import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api/client';
import { useReminders } from '../context/ReminderContext';
import { Sparkles, Send, Bot, User, CheckCircle2, Clock } from 'lucide-react';

export const ChatDrawer: React.FC = () => {
  const { refreshData } = useReminders();
  const [messages, setMessages] = useState<
    Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>
  >([
    {
      role: 'assistant',
      content:
        '¡Hola! Soy NIMBO, tu asistente personal inteligente. Puedes pedirme organizar tus actividades, consultar pendientes, posponer citas o crear recordatorios recurrentes.',
      timestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    '¿Qué actividades tengo pendientes hoy?',
    'Recuérdame mañana a las 8am llamar al hospital',
    '¿Qué tengo programado para esta semana?',
    'Marca como completada mi actividad de ayer',
    'Recuérdame pagar la luz el día 15 de cada mes',
  ];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

      const respTime = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

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
          timestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-h-[820px] bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-xs overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line)] bg-[var(--surface-soft)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--site-primary)] text-white flex items-center justify-center font-bold shadow-sm shadow-[var(--site-primary)]/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-[var(--text)]">Asistente Conversacional</h2>
            <p className="text-[11px] text-[var(--muted)] font-medium">
              Escribe naturalmente para administrar tus pendientes
            </p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={idx}
              className={`flex items-start gap-2.5 max-w-[85%] ${
                isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-[var(--site-primary)] text-white'
                    : 'bg-[var(--site-secondary)] text-[var(--site-on-secondary)]'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? 'bg-[var(--site-primary)] text-white font-medium rounded-tr-xs'
                    : 'bg-[var(--surface-soft)] border border-[var(--line)] text-[var(--text)] rounded-tl-xs'
                }`}
              >
                {m.content}
                <div
                  className={`text-[9px] mt-1.5 font-bold ${
                    isUser ? 'text-white/70 text-right' : 'text-[var(--muted)]'
                  }`}
                >
                  {m.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 max-w-[80%] mr-auto">
            <div className="w-7 h-7 rounded-lg bg-[var(--site-secondary)] text-[var(--site-on-secondary)] flex items-center justify-center text-xs font-bold">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3.5 rounded-2xl bg-[var(--surface-soft)] border border-[var(--line)] text-xs text-[var(--muted)] font-semibold flex items-center gap-1.5">
              <span>NIMBO está procesando tu solicitud...</span>
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
          placeholder="Escribe tu mensaje en español... (ej. Recuérdame pagar el internet mañana 9am)"
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
