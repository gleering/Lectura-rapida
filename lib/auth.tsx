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

interface AuthState {
  ready: boolean;
  session: Session | null;
  user: User | null;
  /** Rol del perfil ('user' | 'admin'). null hasta que carga o si no hay sesión. */
  role: string | null;
  isAdmin: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!isSupabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);

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

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabase();
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      void loadRole(data.session?.user?.id).finally(() => setReady(true));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      void loadRole(s?.user?.id);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadRole]);

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
