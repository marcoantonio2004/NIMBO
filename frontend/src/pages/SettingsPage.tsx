import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePush } from '../context/PushContext';
import { api } from '../api/client';
import {
  User,
  Bell,
  Smartphone,
  Shield,
  Key,
  Globe,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Send,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, updateProfile, logout } = useAuth();
  const { isSubscribed, subscribeToPush, sendTestPush, loading: pushLoading } = usePush();

  const [name, setName] = useState(user?.name || '');
  const [timezone, setTimezone] = useState(user?.timezone || 'America/Mexico_City');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [saving, setSaving] = useState(false);

  const [testPushStatus, setTestPushStatus] = useState('');
  const [devices, setDevices] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsMsg, setSessionsMsg] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name);
      setTimezone(user.timezone);
      loadDevices();
      loadSessions();
    }
  }, [user]);

  const loadDevices = async () => {
    try {
      const res = await api.push.getDevices();
      setDevices(res.devices);
    } catch {}
  };

  const loadSessions = async () => {
    try {
      const res = await api.auth.sessions();
      setSessions(res.sessions);
    } catch {}
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setProfileSuccess('');
    setProfileError('');

    try {
      await updateProfile({
        name: name.trim(),
        timezone: timezone.trim(),
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });

      setProfileSuccess('Perfil actualizado correctamente.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error actualizando perfil';
      setProfileError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleTestPush = async () => {
    setTestPushStatus('Enviando...');
    try {
      const res = await sendTestPush();
      setTestPushStatus(res.message);
      loadDevices();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al enviar notificación';
      setTestPushStatus(msg);
    }
  };

  const handleRevokeOthers = async () => {
    try {
      const res = await api.auth.revokeOthers();
      setSessionsMsg(res.message);
      loadSessions();
    } catch {}
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[var(--text)]">Configuración</h1>
        <p className="text-xs sm:text-sm text-[var(--muted)]">
          Administración de cuenta propietaria, notificaciones push y dispositivos sincronizados
        </p>
      </div>

      {/* Profile & Security */}
      <section className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-[var(--site-secondary)] text-[var(--site-on-secondary)] flex items-center justify-center font-bold">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[var(--text)]">Perfil del Propietario</h2>
            <p className="text-xs text-[var(--muted)]">{user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          {profileSuccess && (
            <div className="p-3 text-xs rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div className="p-3 text-xs rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--muted)] mb-1">Nombre</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] text-sm font-semibold focus:border-[var(--site-primary)] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--muted)] mb-1">Zona Horaria</label>
              <input
                type="text"
                required
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="America/Mexico_City"
                className="w-full px-3.5 py-2 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] text-sm font-semibold focus:border-[var(--site-primary)] outline-none"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--line)]">
            <span className="block text-xs font-bold text-[var(--muted)] mb-2">Cambiar contraseña</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <input
                  type="password"
                  placeholder="Contraseña actual"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] text-xs font-semibold focus:border-[var(--site-primary)] outline-none"
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Nueva contraseña (mínimo 10 caracteres)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] text-xs font-semibold focus:border-[var(--site-primary)] outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-[var(--site-primary)] text-white text-xs font-extrabold shadow-sm shadow-[var(--site-primary)]/20 hover:brightness-105 active:scale-98 transition-all"
            >
              {saving ? 'Guardando...' : 'Guardar cambios de perfil'}
            </button>
          </div>
        </form>
      </section>

      {/* Web Push Notifications 24/7 */}
      <section className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[var(--text)]">Notificaciones Push 24/7 (VAPID)</h2>
            <p className="text-xs text-[var(--muted)]">
              Procesamiento autónomo en la nube aunque tu computadora o navegador estén apagados
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[var(--surface-soft)] border border-[var(--line)] mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-[var(--text)]">Estado en este dispositivo:</div>
            <div className="text-xs text-[var(--muted)] mt-0.5">
              {isSubscribed
                ? 'Conectado a la infraestructura cloud mediante Web Push.'
                : 'Aún no has concedido permisos de Web Push en este navegador.'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isSubscribed && (
              <button
                onClick={subscribeToPush}
                disabled={pushLoading}
                className="px-4 py-2 rounded-xl bg-[var(--site-primary)] text-white text-xs font-bold shadow-xs hover:brightness-105"
              >
                {pushLoading ? 'Activando...' : 'Activar Push 24/7'}
              </button>
            )}

            <button
              onClick={handleTestPush}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-xs font-bold hover:bg-[var(--line)] transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar prueba</span>
            </button>
          </div>
        </div>

        {testPushStatus && (
          <div className="text-xs font-semibold text-[var(--site-primary)] mb-3">
            {testPushStatus}
          </div>
        )}

        {/* Registered Devices */}
        <div>
          <h3 className="text-xs font-bold text-[var(--muted)] mb-2 uppercase tracking-wider">
            Dispositivos Registrados ({devices.length})
          </h3>
          <div className="divide-y divide-[var(--line)] border border-[var(--line)] rounded-xl overflow-hidden">
            {devices.length === 0 ? (
              <div className="p-4 text-xs text-[var(--muted)] text-center">
                No hay dispositivos suscritos todavía.
              </div>
            ) : (
              devices.map((d) => (
                <div key={d.id} className="p-3 bg-[var(--surface)] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="w-4 h-4 text-[var(--site-primary)]" />
                    <div>
                      <div className="font-bold text-[var(--text)]">{d.deviceName}</div>
                      <div className="text-[10px] text-[var(--muted)]">
                        Registrado el: {new Date(d.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <span className="text-emerald-500 font-bold text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    Activo
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Active Sessions & Security */}
      <section className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[var(--text)]">Sesiones Activas</h2>
              <p className="text-xs text-[var(--muted)]">Administra tus accesos concurrentes</p>
            </div>
          </div>

          <button
            onClick={handleRevokeOthers}
            className="px-3 py-1.5 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/10 text-xs font-bold transition-colors"
          >
            Cerrar otras sesiones
          </button>
        </div>

        {sessionsMsg && (
          <div className="text-xs font-semibold text-emerald-600 mb-3">{sessionsMsg}</div>
        )}

        <div className="divide-y divide-[var(--line)] border border-[var(--line)] rounded-xl overflow-hidden">
          {sessions.map((s) => (
            <div key={s.id} className="p-3 bg-[var(--surface)] flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-[var(--text)] flex items-center gap-2">
                  <span>{s.userAgent?.slice(0, 45) || 'Navegador Web'}...</span>
                  {s.isCurrent && (
                    <span className="bg-[var(--site-primary)] text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md">
                      Sesión actual
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-[var(--muted)] mt-0.5">
                  IP: {s.ipAddress} · Última actividad: {new Date(s.lastActiveAt).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
