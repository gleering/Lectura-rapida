"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, BookOpen } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const { signIn, signUp, configured } = useAuth();

  const [mode, setMode] = useState<"in" | "up">(
    params.get("mode") === "up" ? "up" : "in"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      if (mode === "in") {
        const { error } = await signIn(email, password);
        if (error) return setError(error);
        router.push(next);
      } else {
        const { error } = await signUp(email, password);
        if (error) return setError(error);
        // Según la config del proyecto, puede requerir confirmar el email.
        const res = await signIn(email, password);
        if (res.error) {
          setNotice(
            "Cuenta creada. Revisá tu email para confirmarla y luego inicia sesión."
          );
          setMode("in");
        } else {
          router.push(next);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-6 p-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <BookOpen className="size-8 text-primary" />
            <h1 className="text-xl font-bold">
              {mode === "in" ? "Iniciar sesión" : "Crear cuenta"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Accede a la biblioteca pública de ReadFlow.
            </p>
          </div>

          {!configured ? (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              La biblioteca pública no está configurada en este entorno.
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="password">
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={
                    mode === "in" ? "current-password" : "new-password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputCls}
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
              {notice && (
                <p className="text-sm text-muted-foreground">{notice}</p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                {mode === "in" ? "Entrar" : "Registrarme"}
              </Button>
            </form>
          )}

          {configured && (
            <p className="text-center text-sm text-muted-foreground">
              {mode === "in" ? "¿No tenés cuenta?" : "¿Ya tenés cuenta?"}{" "}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => {
                  setMode(mode === "in" ? "up" : "in");
                  setError(null);
                  setNotice(null);
                }}
              >
                {mode === "in" ? "Registrate" : "Iniciá sesión"}
              </button>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
