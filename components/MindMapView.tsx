"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Sparkles, GitBranch, Layers, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  generateMindMap,
  collectLeafPaths,
  mindMapToReviewConcepts,
} from "@/lib/mind-map";
import { createReviewCard } from "@/lib/spaced-repetition";
import {
  getMindMap,
  saveMindMap,
  getBookContent,
  getReviewCardsByBook,
  saveReviewCards,
} from "@/lib/storage";
import type { MindMapNode, MindMap } from "@/types";

interface MindMapViewProps {
  bookId: string;
  bookTitle: string;
}

const LEVEL_COLORS = [
  "border-primary text-primary",
  "border-blue-500 text-blue-600 dark:text-blue-400",
  "border-green-500 text-green-600 dark:text-green-400",
  "border-orange-500 text-orange-600 dark:text-orange-400",
];

function TreeNode({ node, depth }: { node: MindMapNode; depth: number }) {
  const color = LEVEL_COLORS[Math.min(depth, LEVEL_COLORS.length - 1)];
  return (
    <div className={depth === 0 ? "" : "ml-4 border-l pl-4"}>
      <div
        className={`mb-2 inline-block rounded-lg border-l-4 bg-secondary/40 px-3 py-1.5 text-sm font-medium ${color}`}
      >
        {node.label}
      </div>
      {node.children && node.children.length > 0 && (
        <div className="space-y-1">
          {node.children.map((child, i) => (
            <TreeNode key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function MindMapView({ bookId, bookTitle }: MindMapViewProps) {
  const [map, setMap] = useState<MindMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingCards, setCreatingCards] = useState(false);
  const [createdCount, setCreatedCount] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    setCreatedCount(null);
    getMindMap(bookId).then((m) => {
      setMap(m);
      setLoading(false);
    });
  }, [bookId]);

  const createCards = async () => {
    if (!map) return;
    setCreatingCards(true);
    setError(null);
    setCreatedCount(null);
    try {
      const leaves = collectLeafPaths(map.root);
      const concepts = await mindMapToReviewConcepts(bookTitle, leaves);
      if (!concepts || concepts.length === 0) {
        setError(
          "No se pudieron crear tarjetas. Verifica que la IA esté configurada en el servidor (GEMINI_API_KEY)."
        );
        return;
      }
      const existing = await getReviewCardsByBook(bookId);
      const startIdx = existing.length;
      const now = Date.now();
      const cards = concepts.map((c, i) =>
        createReviewCard({
          id: `${bookId}_mapcard_${startIdx + i}_${now}`,
          bookId,
          concept: c.concept,
          prompt: c.prompt,
          answer: c.answer,
          now,
        })
      );
      await saveReviewCards(cards);
      setCreatedCount(cards.length);
    } finally {
      setCreatingCards(false);
    }
  };

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const content = await getBookContent(bookId);
      if (!content) return;
      const root = await generateMindMap(bookTitle, content.words.join(" "));
      if (!root) {
        setError(
          "No se pudo generar el mapa. Verifica que la IA esté configurada en el servidor (GEMINI_API_KEY)."
        );
        return;
      }
      const newMap: MindMap = { bookId, root, generatedAt: Date.now() };
      await saveMindMap(newMap);
      setMap(newMap);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">Cargando…</p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          La estructura visual descarga tu memoria de trabajo y facilita comprender
          el conjunto.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={generate}
          disabled={generating}
        >
          {generating ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Generando…
            </>
          ) : (
            <>
              <Sparkles className="mr-2 size-4" />
              {map ? "Regenerar" : "Generar mapa"}
            </>
          )}
        </Button>
      </div>

      {error && (
        <Card className="border-orange-500/40 bg-orange-500/5">
          <CardContent className="p-4 text-sm text-muted-foreground">
            {error}
          </CardContent>
        </Card>
      )}

      {map ? (
        <>
          <Card>
            <CardContent className="overflow-x-auto p-5">
              <TreeNode node={map.root} depth={0} />
            </CardContent>
          </Card>

          {/* Puente estructura → recuperación: convertir el mapa en tarjetas. */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="flex-1">
                <p className="text-sm font-medium">
                  Convierte esta estructura en repaso activo
                </p>
                <p className="text-xs text-muted-foreground">
                  Genera tarjetas de recuerdo desde las ideas del mapa. Entender
                  la estructura no basta: hay que recuperarla de memoria.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={createCards}
                disabled={creatingCards}
              >
                {creatingCards ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Creando…
                  </>
                ) : (
                  <>
                    <Layers className="mr-2 size-4" />
                    Crear tarjetas de repaso
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {createdCount !== null && (
            <Card className="border-emerald-500/40 bg-emerald-500/5">
              <CardContent className="flex flex-col items-start gap-2 p-4 sm:flex-row sm:items-center">
                <div className="flex flex-1 items-center gap-2 text-sm">
                  <CheckCircle2 className="size-5 flex-shrink-0 text-emerald-500" />
                  <span>
                    {createdCount} tarjeta{createdCount === 1 ? "" : "s"} creada
                    {createdCount === 1 ? "" : "s"} desde el mapa.
                  </span>
                </div>
                <Link
                  href="/review"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Ir a repasar
                </Link>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        !error && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
              <GitBranch className="size-8" />
              <p>Genera un mapa mental para ver la estructura del libro.</p>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
