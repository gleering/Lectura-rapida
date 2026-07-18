"use client";

import { Sun, Moon, RotateCcw } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { WordDisplay } from "@/components/Reader/WordDisplay";
import { useSettingsStore } from "@/store/useSettingsStore";
import { DEFAULT_SETTINGS, SPEED_OPTIONS, type Speed } from "@/types";
import { cn } from "@/lib/utils";

const FONTS = [
  {
    label: "Sans (sistema)",
    value:
      "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  },
  { label: "Serif", value: "ui-serif, Georgia, Cambria, 'Times New Roman', serif" },
  {
    label: "Monoespaciada",
    value: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  },
];

export default function SettingsPage() {
  const { settings, update } = useSettingsStore();

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Ajustes</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => update(DEFAULT_SETTINGS)}
          >
            <RotateCcw className="size-4" /> Restablecer
          </Button>
        </div>

        {/* Live preview */}
        <Card className="mb-6 overflow-hidden">
          <div
            className="flex h-40 items-center justify-center"
            style={{ backgroundColor: settings.backgroundColor }}
          >
            <WordDisplay
              chunkText="inteligencia"
              pivotWord="inteligencia"
              settings={settings}
            />
          </div>
        </Card>

        <div className="space-y-6">
          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle>Apariencia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <Label>Tema de la aplicación</Label>
                <div className="flex overflow-hidden rounded-md border">
                  <button
                    onClick={() => update({ theme: "light" })}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 text-sm",
                      settings.theme === "light"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-secondary"
                    )}
                  >
                    <Sun className="size-4" /> Claro
                  </button>
                  <button
                    onClick={() => update({ theme: "dark" })}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 text-sm",
                      settings.theme === "dark"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-secondary"
                    )}
                  >
                    <Moon className="size-4" /> Oscuro
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="font">Fuente</Label>
                <Select
                  id="font"
                  value={settings.fontFamily}
                  onChange={(e) => update({ fontFamily: e.target.value })}
                  className="w-56"
                >
                  {FONTS.map((f) => (
                    <option key={f.label} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Tamaño de texto</Label>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {settings.fontSize}px
                  </span>
                </div>
                <Slider
                  min={28}
                  max={120}
                  step={2}
                  value={settings.fontSize}
                  onValueChange={(v) => update({ fontSize: v })}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Espaciado entre letras</Label>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {settings.letterSpacing.toFixed(2)}em
                  </span>
                </div>
                <Slider
                  min={0}
                  max={0.5}
                  step={0.01}
                  value={settings.letterSpacing}
                  onValueChange={(v) => update({ letterSpacing: v })}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Posición vertical de la palabra</Label>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {settings.verticalPosition}%
                  </span>
                </div>
                <Slider
                  min={10}
                  max={80}
                  step={1}
                  value={settings.verticalPosition}
                  onValueChange={(v) => update({ verticalPosition: v })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="tc">Color del texto</Label>
                  <input
                    id="tc"
                    type="color"
                    value={settings.textColor}
                    onChange={(e) => update({ textColor: e.target.value })}
                    className="size-9 cursor-pointer rounded border bg-transparent"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="bc">Color de fondo</Label>
                  <input
                    id="bc"
                    type="color"
                    value={settings.backgroundColor}
                    onChange={(e) =>
                      update({ backgroundColor: e.target.value })
                    }
                    className="size-9 cursor-pointer rounded border bg-transparent"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reading */}
          <Card>
            <CardHeader>
              <CardTitle>Lectura</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="speed">Velocidad por defecto</Label>
                <Select
                  id="speed"
                  value={settings.speed}
                  onChange={(e) =>
                    update({ speed: Number(e.target.value) as Speed })
                  }
                  className="w-40"
                >
                  {SPEED_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s} ppm
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label>Palabras por pantalla</Label>
                <div className="flex overflow-hidden rounded-md border">
                  {([1, 2, 3] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => update({ mode: m })}
                      className={cn(
                        "px-4 py-2 text-sm",
                        settings.mode === m
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-secondary"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="orp">Punto óptimo (ORP)</Label>
                  <p className="text-xs text-muted-foreground">
                    Resalta la letra central de cada palabra.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.orpColor}
                    onChange={(e) => update({ orpColor: e.target.value })}
                    className="size-9 cursor-pointer rounded border bg-transparent"
                    aria-label="Color del punto óptimo"
                  />
                  <Switch
                    id="orp"
                    checked={settings.orpEnabled}
                    onCheckedChange={(v) => update({ orpEnabled: v })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="comp">Pausa de comprensión</Label>
                  <p className="text-xs text-muted-foreground">
                    Preguntar cada cierta cantidad de palabras.
                  </p>
                </div>
                <Select
                  id="comp"
                  value={settings.comprehensionInterval}
                  onChange={(e) =>
                    update({ comprehensionInterval: Number(e.target.value) })
                  }
                  className="w-40"
                >
                  <option value={0}>Desactivado</option>
                  <option value={250}>Cada 250</option>
                  <option value={500}>Cada 500</option>
                  <option value={1000}>Cada 1000</option>
                  <option value={2000}>Cada 2000</option>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
