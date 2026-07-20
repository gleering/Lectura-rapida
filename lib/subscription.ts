// Membresías (biblioteca pública + módulos de entrenamiento).
//
// El acceso premium se decide por una fila en `public.subscriptions` que
// matchee el email del usuario. Puede venir de un pago (Lemon Squeezy, vía
// webhook) o de un comp que el admin regala a mano.

import { getSupabase } from "@/lib/supabase";

export type SubPlan = "monthly" | "yearly" | "comp";
export type SubStatus =
  | "active"
  | "on_trial"
  | "cancelled"
  | "expired"
  | "past_due"
  | "paused";
export type SubSource = "paid" | "comp";

export interface Subscription {
  id: string;
  email: string;
  plan: SubPlan;
  status: SubStatus;
  source: SubSource;
  currentPeriodEnd: string | null;
  lsSubscriptionId: string | null;
  createdAt: string;
}

interface SubscriptionRow {
  id: string;
  email: string;
  plan: SubPlan;
  status: SubStatus;
  source: SubSource;
  current_period_end: string | null;
  ls_subscription_id: string | null;
  created_by: string | null;
  created_at: string;
}

function rowToSub(r: SubscriptionRow): Subscription {
  return {
    id: r.id,
    email: r.email,
    plan: r.plan,
    status: r.status,
    source: r.source,
    currentPeriodEnd: r.current_period_end,
    lsSubscriptionId: r.ls_subscription_id,
    createdAt: r.created_at,
  };
}

/** ¿Esta fila da acceso ahora mismo? (activa/trial y sin vencer). */
export function isActive(sub: Subscription): boolean {
  if (sub.status !== "active" && sub.status !== "on_trial") return false;
  if (!sub.currentPeriodEnd) return true;
  return new Date(sub.currentPeriodEnd).getTime() > Date.now();
}

/**
 * Membresía vigente del usuario logueado (la más “fuerte” si hay varias).
 * Devuelve null si no tiene ninguna activa. RLS ya limita la lectura a su email.
 */
export async function getMySubscription(): Promise<Subscription | null> {
  const { data, error } = await getSupabase()
    .from("subscriptions")
    .select(
      "id,email,plan,status,source,current_period_end,ls_subscription_id,created_by,created_at"
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const subs = (data as SubscriptionRow[]).map(rowToSub);
  return subs.find(isActive) ?? null;
}

// --- Admin: gestión de comps ------------------------------------------------

/** Lista todas las membresías (solo admin; RLS lo fuerza). */
export async function listAllSubscriptions(): Promise<Subscription[]> {
  const { data, error } = await getSupabase()
    .from("subscriptions")
    .select(
      "id,email,plan,status,source,current_period_end,ls_subscription_id,created_by,created_at"
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as SubscriptionRow[]).map(rowToSub);
}

/** Regala una membresía gratuita a un email (solo admin). */
export async function grantComp(email: string): Promise<void> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("subscriptions").insert({
    email: email.trim().toLowerCase(),
    plan: "comp",
    status: "active",
    source: "comp",
    current_period_end: null,
    created_by: user?.id ?? null,
  });
  if (error) throw new Error(error.message);
}

/** Revoca (borra) una membresía por id (solo admin). */
export async function revokeSubscription(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from("subscriptions")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}
