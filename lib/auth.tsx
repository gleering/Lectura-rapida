"use client";

// Sesión de usuario para la biblioteca pública.
//
// La app NO fuerza login: la lectura y los libros privados funcionan offline
// como siempre. Este proveedor solo expone la sesión para las pantallas que la
// necesitan (biblioteca pública y panel admin). Si Supabase no está
// configurado, queda todo en null y esas pantallas se ocultan.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { getMySubscription, type Subscription } from "@/lib/subscription";

interface AuthState {
  ready: boolean;
  session: Session | null;
  user: User | null;
  /** Rol del perfil ('user' | 'admin'). null hasta que carga o si no hay sesión. */
  role: string | null;
  isAdmin: boolean;
  configured: boolean;
  /** Membresía activa del usuario, o null. */
  subscription: Subscription | null;
  /** Atajo: ¿tiene acceso premium (biblioteca pública + módulos)? */
  hasActiveSub: boolean;
  /** Vuelve a leer la membresía (p. ej. al volver del checkout). */
  refreshSubscription: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!isSupabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const loadRole = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setRole(null);
      return;
    }
    try {
      const { data } = await getSupabase()
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();
      setRole(data?.role ?? "user");
    } catch {
      setRole("user");
    }
  }, []);

  const loadSubscription = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setSubscription(null);
      return;
    }
    try {
      setSubscription(await getMySubscription());
    } catch {
      setSubscription(null);
    }
  }, []);

  const refreshSubscription = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data } = await getSupabase().auth.getUser();
    await loadSubscription(data.user?.id);
  }, [loadSubscription]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabase();
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      const uid = data.session?.user?.id;
      void Promise.all([loadRole(uid), loadSubscription(uid)]).finally(() =>
        setReady(true)
      );
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      void loadRole(s?.user?.id);
      void loadSubscription(s?.user?.id);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadRole, loadSubscription]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabase().auth.signInWithPassword({
      email,
      password,
    });
    return error ? { error: error.message } : {};
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabase().auth.signUp({ email, password });
    return error ? { error: error.message } : {};
  }, []);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured) await getSupabase().auth.signOut();
  }, []);

  const value: AuthState = {
    ready,
    session,
    user: session?.user ?? null,
    role,
    isAdmin: role === "admin",
    configured: isSupabaseConfigured,
    subscription,
    hasActiveSub: subscription != null,
    refreshSubscription,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
