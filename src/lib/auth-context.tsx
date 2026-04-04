import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type UserRole = "buyer" | "seller" | "creator";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  company: string;
  avatar: string;
  activeRole: UserRole;
  roles: UserRole[];
  plan: "free" | "basic" | "premium" | "enterprise";
  trustScore: number;
  walletBalance: number;
  creditsRemaining: number;
  joinedAt: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => void;
  signup: (name: string, email: string, company: string) => void;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  updatePlan: (plan: UserProfile["plan"]) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "vyapar_user";

function loadUser(): UserProfile | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
}

function saveUser(user: UserProfile | null) {
  if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  else localStorage.removeItem(STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(loadUser);

  const login = useCallback((email: string, _password: string) => {
    const profile: UserProfile = {
      id: `user-${Date.now()}`,
      name: email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      email,
      company: "Demo Enterprise Pvt Ltd",
      avatar: email.slice(0, 2).toUpperCase(),
      activeRole: "buyer",
      roles: ["buyer", "seller", "creator"],
      plan: "free",
      trustScore: 650,
      walletBalance: 5000,
      creditsRemaining: 25,
      joinedAt: new Date().toISOString(),
    };
    setUser(profile);
    saveUser(profile);
  }, []);

  const signup = useCallback((name: string, email: string, company: string) => {
    const profile: UserProfile = {
      id: `user-${Date.now()}`,
      name,
      email,
      company,
      avatar: name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
      activeRole: "buyer",
      roles: ["buyer", "seller", "creator"],
      plan: "free",
      trustScore: 300,
      walletBalance: 1000,
      creditsRemaining: 10,
      joinedAt: new Date().toISOString(),
    };
    setUser(profile);
    saveUser(profile);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    saveUser(null);
  }, []);

  const switchRole = useCallback((role: UserRole) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, activeRole: role };
      saveUser(updated);
      return updated;
    });
  }, []);

  const updatePlan = useCallback((plan: UserProfile["plan"]) => {
    setUser(prev => {
      if (!prev) return prev;
      const credits = { free: 10, basic: 50, premium: 200, enterprise: 9999 };
      const updated = { ...prev, plan, creditsRemaining: credits[plan] };
      saveUser(updated);
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, login, signup, logout, switchRole, updatePlan }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
