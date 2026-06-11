import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type ReviewerRole = "viewer" | "reviewer" | "senior_reviewer" | "admin";

export interface ReviewerUser {
  id: string;
  name: string;
  email: string;
  role: ReviewerRole;
  loggedInAt: string;
}

export type ReviewerPermission =
  | "review.view"
  | "review.approve"
  | "review.reject"
  | "review.needs_info"
  | "review.escalate"
  | "audit.export"
  | "queue.reset";

const ROLE_PERMISSIONS: Record<ReviewerRole, ReviewerPermission[]> = {
  viewer: ["review.view"],
  reviewer: ["review.view", "review.approve", "review.reject", "review.needs_info"],
  senior_reviewer: [
    "review.view", "review.approve", "review.reject", "review.needs_info",
    "review.escalate", "audit.export",
  ],
  admin: [
    "review.view", "review.approve", "review.reject", "review.needs_info",
    "review.escalate", "audit.export", "queue.reset",
  ],
};

export const ROLE_LABELS: Record<ReviewerRole, string> = {
  viewer: "Viewer (Read-only)",
  reviewer: "Reviewer",
  senior_reviewer: "Senior Reviewer",
  admin: "Compliance Admin",
};

export const ROLE_DESCRIPTIONS: Record<ReviewerRole, string> = {
  viewer: "Browse queue & audit trail. Cannot take actions.",
  reviewer: "Approve, reject, or request more info on documents.",
  senior_reviewer: "All reviewer powers + escalate to compliance & export audit.",
  admin: "Full compliance admin: all actions + queue reset.",
};

// Demo accounts (frontend prototype, per project memory)
export const DEMO_REVIEWERS: Array<{ email: string; password: string; name: string; id: string; role: ReviewerRole }> = [
  { email: "viewer@vyapar.in", password: "demo", name: "A. Verma", id: "RV-101", role: "viewer" },
  { email: "reviewer@vyapar.in", password: "demo", name: "R. Sharma", id: "RV-007", role: "reviewer" },
  { email: "senior@vyapar.in", password: "demo", name: "P. Iyer", id: "RV-201", role: "senior_reviewer" },
  { email: "admin@vyapar.in", password: "demo", name: "S. Khan", id: "RV-001", role: "admin" },
];

const STORAGE_KEY = "vyapar_reviewer_session_v1";

function loadSession(): ReviewerUser | null {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); }
  catch { return null; }
}
function saveSession(u: ReviewerUser | null) {
  if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  else localStorage.removeItem(STORAGE_KEY);
}

interface ReviewerAuthContextType {
  user: ReviewerUser | null;
  login: (email: string, password: string) => { ok: boolean; error?: string };
  loginAs: (role: ReviewerRole) => void;
  logout: () => void;
  can: (perm: ReviewerPermission) => boolean;
}

const Ctx = createContext<ReviewerAuthContextType | null>(null);

export function ReviewerAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ReviewerUser | null>(loadSession);

  const login = useCallback((email: string, password: string) => {
    const match = DEMO_REVIEWERS.find(d => d.email.toLowerCase() === email.toLowerCase() && d.password === password);
    if (!match) return { ok: false, error: "Invalid email or password" };
    const u: ReviewerUser = {
      id: match.id, name: match.name, email: match.email, role: match.role,
      loggedInAt: new Date().toISOString(),
    };
    setUser(u); saveSession(u);
    return { ok: true };
  }, []);

  const loginAs = useCallback((role: ReviewerRole) => {
    const match = DEMO_REVIEWERS.find(d => d.role === role)!;
    const u: ReviewerUser = {
      id: match.id, name: match.name, email: match.email, role: match.role,
      loggedInAt: new Date().toISOString(),
    };
    setUser(u); saveSession(u);
  }, []);

  const logout = useCallback(() => { setUser(null); saveSession(null); }, []);

  const can = useCallback((perm: ReviewerPermission) => {
    if (!user) return false;
    return ROLE_PERMISSIONS[user.role].includes(perm);
  }, [user]);

  return <Ctx.Provider value={{ user, login, loginAs, logout, can }}>{children}</Ctx.Provider>;
}

export function useReviewerAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useReviewerAuth must be used within ReviewerAuthProvider");
  return c;
}
