import { NextResponse } from "next/server";
import crypto from "node:crypto";
import {
  getServerSupabase,
  isServerSupabaseConfigured,
} from "@/lib/serverSupabase";

/**
 * Webhook de Lemon Squeezy (Merchant of Record).
 *
 * Lemon Squeezy firma cada evento con HMAC-SHA256 (header `X-Signature`) usando
 * el signing secret del webhook. Verificamos la firma contra el body CRUDO y,
 * si es válida, sincronizamos la membresía en `public.subscriptions` con la
 * service_role key (saltea RLS). El navegador nunca toca esta ruta.
 *
 * Eventos relevantes: subscription_created / _updated / _cancelled / _expired /
 * _paused / _unpaused / _resumed. Indexamos por `ls_subscription_id`.
 */

export const runtime = "nodejs";

interface LsWebhook {
  meta?: {
    event_name?: string;
    custom_data?: Record<string, unknown>;
  };
  data?: {
    id?: string;
    attributes?: {
      status?: string;
      user_email?: string;
      variant_name?: string;
      renews_at?: string | null;
      ends_at?: string | null;
    };
  };
}

/** Compara firmas en tiempo constante. */
function validSignature(raw: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(raw)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Deriva el plan a partir del nombre de la variante de Lemon Squeezy. */
function planFromVariant(name: string | undefined): "monthly" | "yearly" {
  return /year|anual|annual/i.test(name ?? "") ? "yearly" : "monthly";
}

export async function POST(request: Request) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret || !isServerSupabaseConfigured) {
    return NextResponse.json(
      { error: "Webhook no configurado en el servidor." },
      { status: 503 }
    );
  }

  const raw = await request.text();
  const signature = request.headers.get("x-signature") ?? "";
  if (!signature || !validSignature(raw, signature, secret)) {
    return NextResponse.json({ error: "Firma inválida." }, { status: 401 });
  }

  let payload: LsWebhook;
  try {
    payload = JSON.parse(raw) as LsWebhook;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const event = payload.meta?.event_name ?? "";
  if (!event.startsWith("subscription_")) {
    // Ignoramos órdenes sueltas, etc. Respondemos 200 para no reintentar.
    return NextResponse.json({ ok: true, ignored: event });
  }

  const attrs = payload.data?.attributes;
  const lsId = payload.data?.id;
  // El email puede venir en custom_data (lo prefijamos en el checkout) o en el
  // propio suscriptor. Normalizamos a minúsculas para matchear la tabla.
  const email = String(
    payload.meta?.custom_data?.user_email ?? attrs?.user_email ?? ""
  )
    .trim()
    .toLowerCase();

  if (!lsId || !email || !attrs?.status) {
    return NextResponse.json(
      { error: "Payload incompleto." },
      { status: 422 }
    );
  }

  const record = {
    email,
    plan: planFromVariant(attrs.variant_name),
    status: attrs.status,
    source: "paid" as const,
    current_period_end: attrs.ends_at ?? attrs.renews_at ?? null,
    ls_subscription_id: String(lsId),
    updated_at: new Date().toISOString(),
  };

  const { error } = await getServerSupabase()
    .from("subscriptions")
    .upsert(record, { onConflict: "ls_subscription_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, event, email });
}
