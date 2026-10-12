// Shared notification state for the header bell and the Notifications page.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { vendorService } from '@/services/vendorService';

const Ctx = createContext(null);

export function NotificationsProvider({ children }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setItems(await vendorService.listNotifications());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Services fire this when they add a notification (new case, payment, bank update…).
    const onNew = () => refresh();
    window.addEventListener('hcw:notifications', onNew);
    return () => window.removeEventListener('hcw:notifications', onNew);
  }, [refresh]);

  const setRead = useCallback((id, read) => {
    setItems((list) => list.map((n) => (n.id === id ? { ...n, read } : n)));
    vendorService.setNotificationRead(id, read);
  }, []);

  const markAllRead = useCallback(() => {
    setItems((list) => list.map((n) => ({ ...n, read: true })));
    vendorService.markAllNotificationsRead();
  }, []);

  const remove = useCallback((id) => {
    setItems((list) => list.filter((n) => n.id !== id));
    vendorService.deleteNotification(id);
  }, []);

  const value = useMemo(
    () => ({ items, loading, unreadCount: items.filter((n) => !n.read).length, refresh, setRead, markAllRead, remove }),
    [items, loading, refresh, setRead, markAllRead, remove],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotifications() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationsProvider>');
  return ctx;
}
