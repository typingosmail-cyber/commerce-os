import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

export type NotificationType = "lead" | "escrow" | "commission" | "trust" | "system" | "deal";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, string | number>;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  addNotification: (n: Omit<AppNotification, "id" | "timestamp" | "read">) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

const STORAGE_KEY = "vyapar_notifications";

function generateId() {
  return `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const SEED_NOTIFICATIONS: AppNotification[] = [
  {
    id: "n1", type: "lead", title: "New Lead: SS304 Hex Bolts",
    message: "Automotive Co., Pune posted a requirement for 5000 pcs SS304 Hex Bolts M8. Budget: ₹65,000.",
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(), read: false, actionUrl: "/supplier/dashboard",
  },
  {
    id: "n2", type: "escrow", title: "Escrow Milestone Released",
    message: "₹2,80,000 released for PVC Copper Wire order. Buyer confirmed delivery.",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), read: false, actionUrl: "/escrow",
  },
  {
    id: "n3", type: "commission", title: "Commission Earned: ₹4,500",
    message: "Your affiliate link for Gupta Fasteners converted. Commission credited to wallet.",
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(), read: false, actionUrl: "/creator/dashboard",
  },
  {
    id: "n4", type: "trust", title: "Trust Score Updated",
    message: "Your supplier trust score increased to 785/1000 after 3 successful deliveries.",
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(), read: false, actionUrl: "/supplier/dashboard",
  },
  {
    id: "n5", type: "deal", title: "Deal Guarantee Activated",
    message: "Your ₹1,70,000 order for Hydraulic Cylinders is now protected by Vyapar Guarantee™.",
    timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(), read: true, actionUrl: "/escrow",
  },
  {
    id: "n6", type: "lead", title: "RFQ Response Received",
    message: "Steel India Corp responded to your RFQ for TMT Bars at ₹48,500/ton. 3 days lead time.",
    timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(), read: true, actionUrl: "/buyer/dashboard",
  },
  {
    id: "n7", type: "system", title: "Welcome to Vyapar OS",
    message: "Complete your profile to unlock AI-powered supplier matching and escrow protection.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), read: true, actionUrl: "/supplier/onboarding",
  },
];

function loadNotifications(): AppNotification[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : SEED_NOTIFICATIONS;
  } catch {
    return SEED_NOTIFICATIONS;
  }
}

function saveNotifications(notifs: AppNotification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs));
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(loadNotifications);

  useEffect(() => {
    saveNotifications(notifications);
  }, [notifications]);

  // Simulate real-time notifications
  useEffect(() => {
    const liveNotifs = [
      { type: "lead" as const, title: "New Lead: HDPE Granules", message: "Packaging Ltd., Ahmedabad needs 5 Tons HDPE Granules. Budget: ₹5,00,000.", actionUrl: "/supplier/dashboard" },
      { type: "escrow" as const, title: "Escrow Deposit Received", message: "Buyer deposited ₹1,05,000 for Safety Helmets order. Awaiting shipment.", actionUrl: "/escrow" },
      { type: "commission" as const, title: "Referral Bonus: ₹2,200", message: "A supplier you referred completed their first deal. Bonus credited.", actionUrl: "/creator/dashboard" },
      { type: "trust" as const, title: "Quality Audit Passed", message: "Your product batch #BT-4521 passed quality inspection. Score +15.", actionUrl: "/supplier/dashboard" },
      { type: "deal" as const, title: "Price Drop Alert", message: "Copper Wire prices dropped 8% this week. Good time to place bulk orders.", actionUrl: "/categories" },
    ];

    let idx = 0;
    const interval = setInterval(() => {
      if (idx >= liveNotifs.length) { idx = 0; }
      const n = liveNotifs[idx];
      setNotifications(prev => [{
        id: generateId(), type: n.type, title: n.title, message: n.message,
        timestamp: new Date().toISOString(), read: false, actionUrl: n.actionUrl,
      }, ...prev].slice(0, 50));
      idx++;
    }, 45000); // every 45s

    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const addNotification = useCallback((n: Omit<AppNotification, "id" | "timestamp" | "read">) => {
    setNotifications(prev => [{
      ...n, id: generateId(), timestamp: new Date().toISOString(), read: false,
    }, ...prev].slice(0, 50));
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, clearNotification, addNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
