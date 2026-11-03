import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

interface PushContextType {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  loading: boolean;
  subscribeToPush: () => Promise<boolean>;
  unsubscribeFromPush: () => Promise<void>;
  sendTestPush: () => Promise<{ sentCount: number; message: string }>;
}

const PushContext = createContext<PushContextType | undefined>(undefined);

export const PushProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    ) {
      setIsSupported(true);
      setPermission(Notification.permission);

      // Check current subscription and sync with backend if granted
      navigator.serviceWorker.ready.then(async (reg) => {
        try {
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            setIsSubscribed(true);
            const subJson = sub.toJSON();
            if (subJson.endpoint && subJson.keys?.p256dh && subJson.keys?.auth) {
              const ua = navigator.userAgent;
              let deviceName = 'Navegador Web';
              if (/iPhone/i.test(ua)) deviceName = 'iPhone (Safari PWA)';
              else if (/iPad/i.test(ua)) deviceName = 'iPad (Safari PWA)';
              else if (/Android/i.test(ua)) deviceName = 'Dispositivo Android';
              else if (/Macintosh/i.test(ua)) deviceName = 'MacBook / Mac Desktop';
              else if (/Windows/i.test(ua)) deviceName = 'Windows PC';

              await api.push.subscribe({
                endpoint: subJson.endpoint,
                keys: {
                  p256dh: subJson.keys.p256dh,
                  auth: subJson.keys.auth,
                },
                deviceName,
              }).catch(() => {});
            }
          } else {
            setIsSubscribed(false);
          }
        } catch (e) {
          console.warn('Error checking push subscription:', e);
        }
      });
    }
  }, []);

  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    setLoading(true);

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        setLoading(false);
        return false;
      }

      const reg = await navigator.serviceWorker.ready;
      const keyRes = await api.push.getPublicKey();
      const convertedKey = urlBase64ToUint8Array(keyRes.publicKey);

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });

      const subJson = subscription.toJSON();
      if (subJson.endpoint && subJson.keys?.p256dh && subJson.keys?.auth) {
        // Detect friendly device name
        const ua = navigator.userAgent;
        let deviceName = 'Navegador Web';
        if (/iPhone/i.test(ua)) deviceName = 'iPhone (Safari PWA)';
        else if (/iPad/i.test(ua)) deviceName = 'iPad (Safari PWA)';
        else if (/Android/i.test(ua)) deviceName = 'Dispositivo Android';
        else if (/Macintosh/i.test(ua)) deviceName = 'MacBook / Mac Desktop';
        else if (/Windows/i.test(ua)) deviceName = 'Windows PC';

        await api.push.subscribe({
          endpoint: subJson.endpoint,
          keys: {
            p256dh: subJson.keys.p256dh,
            auth: subJson.keys.auth,
          },
          deviceName,
        });

        setIsSubscribed(true);
        setLoading(false);

        // Immediate confirmation push to Android notification bar
        api.push.test().catch((e) => console.warn('Test push notification error:', e));

        return true;
      }

      setLoading(false);
      return false;
    } catch (err) {
      console.error('Error during push subscription:', err);
      setLoading(false);
      return false;
    }
  }, [isSupported]);

  const unsubscribeFromPush = useCallback(async () => {
    if (!isSupported) return;
    setLoading(true);

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await api.push.unsubscribe(sub.endpoint);
      }
      setIsSubscribed(false);
    } catch (err) {
      console.error('Error unsubscribing:', err);
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  const sendTestPush = useCallback(async () => {
    return api.push.test();
  }, []);

  return (
    <PushContext.Provider
      value={{
        isSupported,
        permission,
        isSubscribed,
        loading,
        subscribeToPush,
        unsubscribeFromPush,
        sendTestPush,
      }}
    >
      {children}
    </PushContext.Provider>
  );
};

export const usePush = () => {
  const ctx = useContext(PushContext);
  if (!ctx) throw new Error('usePush must be used within a PushProvider');
  return ctx;
};
