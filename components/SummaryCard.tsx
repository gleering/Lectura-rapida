"use client";

import { useEffect, useState } from "react";
import { BookOpen, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSummary } from "@/lib/storage";

interface SummaryCardProps {
  bookId: string;
  summary?: string;
  summaryLoading?: boolean;
}

export function SummaryCard({
  bookId,
  summary: initialSummary,
  summaryLoading: initialLoading,
}: SummaryCardProps) {
  const [summary, setSummary] = useState<string | null>(initialSummary || null);
  const [loading, setLoading] = useState(initialLoading ?? false);

  useEffect(() => {
    if (!summary && !loading) {
      setLoading(true);
      getSummary(bookId)
        .then((s) => {
          setSummary(s);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [bookId, summary, loading]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="size-4" />
            Resumen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <p className="text-sm">Generando resumen con IA…</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="size-4" />
            Resumen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No hay resumen disponible. Verifica que tengas la API key de Google
            Gemini configurada.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="size-4" />
          Resumen
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {summary}
        </p>
      </CardContent>
    </Card>
  );
}
