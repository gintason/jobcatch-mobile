import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, setSessionExpiredHandler } from "./api";
import { referralDraft } from "./referrals";
import { tokens } from "./tokens";

export type Role = "customer" | "artisan" | "employer" | "job_seeker" | "rider" | "admin";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  phone?: string | null;
  photo?: string | null;
  has_password?: boolean;
  date_joined?: string;
  is_phone_verified?: boolean;
  is_email_verified: boolean;
  is_identity_verified: boolean;
  profile: unknown;
}

interface AuthResponse { access: string; refresh: string; user: User }

interface AuthValue {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<{ created: boolean }>;
  register: (p: { full_name: string; email: string; phone?: string; password: string; referral_code?: string }) => Promise<void>;
  verifyOtp: (email: string, code: string) => Promise<void>;
  resendOtp: (email: string) => Promise<void>;
  switchRole: (role: Role) => Promise<void>;
  refreshUser: () => Promise<void>;
  /** Replace the cached account (after editing the profile). */
  setUser: (u: User) => void;
  /** Store new tokens + account (after a password change signs other devices out). */
  acceptSession: (d: { access: string; refresh: string; user: User }) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSessionExpiredHandler(() => { setUser(null); qc.clear(); });
    (async () => {
      const t = await tokens.load();
      if (t.access || t.refresh) {
        try { setUser(await api.get<User>("/auth/me/")); } catch { await tokens.clear(); }
      }
      setReady(true);
    })();
    return () => setSessionExpiredHandler(null);
  }, [qc]);

  const accept = useCallback(async (d: AuthResponse) => {
    await tokens.set(d.access, d.refresh);
    qc.clear();
    setUser(d.user);
  }, [qc]);

  const value = useMemo<AuthValue>(() => ({
    user, ready,
    login: async (email, password) => accept(await api.post<AuthResponse>("/auth/login/", { email: email.trim(), password })),
    loginWithGoogle: async (idToken) => {
      const d = await api.post<AuthResponse & { created?: boolean }>("/auth/google/", {
        credential: idToken, referral_code: referralDraft.get() || undefined });
      referralDraft.clear();
      await accept(d);
      return { created: !!d.created };
    },
    register: async (p) => {
      await api.anon("/auth/register/", { ...p, email: p.email.trim(), role: "customer", referral_code: p.referral_code || undefined });
      referralDraft.clear();
    },
    verifyOtp: async (email, code) => accept(await api.post<AuthResponse>("/auth/verify-otp/", { email: email.trim(), code: code.trim(), purpose: "email_verify" })),
    resendOtp: async (email) => { await api.post("/auth/resend-otp/", { email: email.trim(), purpose: "email_verify" }); },
    switchRole: async (role) => {
      const d = await api.post<Partial<User>>("/auth/switch-role/", { role });
      setUser((u) => (u ? { ...u, ...d } : u));
    },
    refreshUser: async () => { setUser(await api.get<User>("/auth/me/")); },
    setUser: (u) => setUser(u),
    acceptSession: async (d) => { await tokens.set(d.access, d.refresh); setUser(d.user); },
    logout: async () => {
      try { await api.post("/auth/logout/", { refresh: tokens.refresh() }); } catch { /* clear locally regardless */ }
      await tokens.clear();
      qc.clear();
      setUser(null);
    },
  }), [user, ready, accept, qc]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Some endpoints are scoped to the active role (CVs → job seeker, bookings →
 * customer). Screens that need one call this; it switches quietly and reports
 * when the role is in place so queries can start.
 */
export function useEnsureRole(role: Role) {
  const { user, switchRole } = useAuth();
  const [failed, setFailed] = useState(false);
  const ok = user?.role === role || user?.role === "admin";
  useEffect(() => {
    if (user && !ok && !failed) switchRole(role).catch(() => setFailed(true));
  }, [user, ok, failed, role, switchRole]);
  return ok;
}
