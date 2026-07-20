# Mejora integral ReadFlow AI — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans para ejecutar
> este plan por fases (ejecución inline en esta sesión; los subagentes no aplican aquí).
> Los pasos usan checkboxes `- [ ]` para seguimiento.

**Goal:** Unificar la app en un design system tokenizado Focus Blue (claro + oscuro), eliminar
fricción de UX (onboarding, feedback, búsqueda), optimizar el bundle y el hot path RSVP, y
subir la accesibilidad a AA — sin romper nada de lo existente (local-first, offline, PWA,
lógica de aprendizaje, auto-deploy).

**Architecture:** Re-apuntar los tokens shadcn existentes (`globals.css` + `tailwind.config.ts`)
a la paleta Focus Blue del `DESIGN.md`; así las rutas viejas (que ya usan tokens) se unifican
solas, y las 6 pantallas rediseñadas se migran de hex arbitrarios a esos mismos tokens. Las
fuentes se cablean una sola vez en `app/layout.tsx` con `next/font`. El feedback pasa por un
store de toasts global. El rendimiento se ataca con `import()` dinámico (pdfjs, recharts) y
`React.memo` en el árbol del lector.

**Tech Stack:** Next.js 15 App Router, React 19, TS 5.7, Tailwind 3.4 + shadcn, zustand, idb,
pdfjs-dist, framer-motion, recharts (solo dashboards), vitest.

---

## Mapa de tokens (referencia canónica)

Paleta light (de `public/stitch_readflow_ai_landing_page/readflow_ai/DESIGN.md`):

| Token CSS | Hex origen | HSL | Uso |
|---|---|---|---|
| `--background` | `#faf8ff` | `257 100% 99%` | fondo app |
| `--foreground` | `#131b2e` | `222 42% 13%` | texto principal |
| `--card` | `#ffffff` | `0 0% 100%` | tarjetas |
| `--primary` | `#004ac6` | `218 100% 39%` | CTAs, links |
| `--primary-bright` | `#2563eb` | `221 83% 53%` | play, gráficos, activos |
| `--primary-soft` | `#dbe1ff`/`#dae2fd` | `230 100% 93%` | chips/fondos suaves |
| `--secondary` | `#eaedff` | `231 100% 96%` | pills, contenedores tono medio |
| `--muted` | `#f2f3ff` | `235 100% 97%` | paneles suaves |
| `--muted-foreground` | `#434655` (y `#737686` en textos chicos → usar este) | `230 12% 30%` | texto secundario |
| `--accent` | `#e2e7ff` | `230 100% 94%` | hovers/tracks |
| `--border` / `--input` | `#c3c6d7` | `231 20% 80%` | bordes |
| `--ring` | `#004ac6` | `218 100% 39%` | foco |
| `--destructive` | `#ba1a1a` | `0 75% 42%` | error |
| `--destructive-soft` | `#ffdad6` / fg `#93000a` | `6 100% 92%` / `356 100% 29%` | avisos de riesgo |
| `--success` | `#006c49` | `161 100% 21%` | verde Flow |
| `--success-soft` | `#6cf8bb` / fg `#00714d` | `154 91% 70%` / `161 100% 22%` | chips "al día"/leído |
| `--warning` | `#996100` | `38 100% 30%` | ámbar Insight |
| `--warning-soft` | `#ffddb8` / fg `#784b00` | `31 100% 86%` / `38 100% 24%` | logros/nudges |

Dark = base navy (DESIGN.md: "deep Navy-950"): fondo `228 45% 7%`, card `227 35% 11%`,
primary `#2563eb` (blanco encima da 5.2:1 ✓), texto `233 100% 97%`, muted-fg `227 25% 72%`,
softs = mismas familias a ~15% de luminosidad con foregrounds claros (`#6cf8bb`, `#ffddb8`,
`#ffb4ab`, `#b4c5ff`).

Reglas de migración hex→token: `#faf8ff`→`bg-background` (o `bg-card` si es superficie elevada
sobre secondary, como la pestaña activa de Controls), `#131b2e`→`text-foreground`,
`#434655`/`#737686`→`text-muted-foreground`, `#c3c6d7`→`border`/`bg-border`,
`#004ac6`→`primary`, `#003ea8`→`hover:bg-primary/90`, `#2563eb`→`primary-bright`,
`#dbe1ff`/`#dae2fd`→`primary-soft`, `#eaedff`→`secondary`, `#f2f3ff`→`muted`,
`#e2e7ff`→`accent`, blanco de tarjetas→`bg-card`, verdes→`success*`, ámbar→`warning*`,
rojos→`destructive*`. `style={{fontFamily: var(--font-hanken)}}`→clase `font-display`.

Decisiones registradas:
- **Landing.tsx conserva sus constantes de color** (página de marketing pública, light-only por
  diseño); solo se le quitan los `next/font` duplicados para usar las variables globales.
- **PacerReader/PageReader conservan chrome oscuro translúcido**: flotan sobre el color de
  fondo elegido por el usuario (funcional, no tema de app).
- **Los gráficos hechos a mano en `Stats.tsx` se conservan** (más livianos que recharts y ya
  responsive); recharts queda para RetentionDashboard/ProgressTracker y pasa a carga lazy.
  Se les agrega semántica ARIA.
- **`DEFAULT_SETTINGS.theme` pasa a `"light"`** (el rediseño Focus Blue es light-first);
  los usuarios que ya guardaron "dark" conservan su elección y reciben el dark navy nuevo.

---

### Fase 1: Tokens + fuentes + dark
**Files:** `app/globals.css`, `tailwind.config.ts`, `app/layout.tsx`, `app/manifest.ts`,
`components/ThemeProvider.tsx`, `types/index.ts`, `app/settings/page.tsx`, `components/Landing.tsx`
y los 13 archivos con hex (`app/{page,library,stats,progress,review}.tsx`, `components/{Stats,
ReviewSession,LearningDashboard,PublicLibrary}.tsx`, `components/Reader/{ReaderScreen,Controls,
ProgressBar}.tsx`).

- [ ] globals.css: paleta light+dark según tabla; `:focus-visible` global; `color-scheme`.
- [ ] tailwind.config.ts: colores nuevos (`primary.bright/soft`, `success*`, `warning*`,
      `destructive.soft*`) + `fontFamily.sans/display`.
- [ ] layout.tsx: `Hanken_Grotesk` + `Geist` via `next/font/google` (variables
      `--font-hanken`/`--font-geist`), body `font-sans`, `viewport.themeColor` por media.
- [ ] manifest.ts: `background_color #faf8ff`, `theme_color #004ac6`.
- [ ] ThemeProvider: `ThemeMode = light|dark|system` + matchMedia + `MotionConfig reducedMotion="user"`.
- [ ] Migrar los 13 archivos hex→tokens (tabla de arriba). Verificar visual light y dark.
- [ ] `npm run build` y commit `feat(design): …`.

### Fase 2: Componentes compartidos
**Files:** crear `components/PageShell.tsx`, `components/StatTile.tsx`, `components/EmptyState.tsx`;
adoptar en Home, Library, Review, Progress, Stats, Settings.
- [ ] PageShell: `<div min-h-screen bg-background text-foreground><AppNav/><main máx-ancho>{children}</main></div>` con prop `maxWidth`.
- [ ] StatTile (icono/label/valor/sub centrados) usado en Home y Review.
- [ ] EmptyState (borde discontinuo + icono + texto + acción) usado en Home/Library/Progress/Review.
- [ ] Build + commit `refactor(ui): …`.

### Fase 3: Toasts + errores
**Files:** crear `store/useToastStore.ts`, `components/ui/toaster.tsx`, `app/error.tsx`,
`app/not-found.tsx`; tocar `app/review/page.tsx`, `components/UploadButton.tsx`,
`app/library/page.tsx` (confirmar borrado), `components/Reader/ReaderScreen.tsx` (try/catch IA).
- [ ] Store de toasts + componente `role="status" aria-live="polite"`, montado en layout.
- [ ] alert() de review → toast error + toast success con conteo de tarjetas.
- [ ] UploadButton: navegar al lector apenas se guarda el libro; resumen IA en background real;
      soporte `.txt`/`.md` (nueva `lib/textImport.ts` + test vitest).
- [ ] Confirmación de borrado con Dialog (título del libro + advertencia tarjetas).
- [ ] try/catch + toast en openSummary/openDictionary/consolidate/handleComprehension.
- [ ] error.tsx / not-found.tsx tokenizados en español.
- [ ] Tests + build + commit `feat(ux): …`.

### Fase 4: Onboarding + búsqueda + ajustes
**Files:** crear `components/Onboarding.tsx`; tocar `app/page.tsx`, `app/library/page.tsx`,
`app/settings/page.tsx`, `components/Reader/{ReaderScreen,Controls}.tsx`.
- [ ] Onboarding 3 pasos en Home vacía (subir libro → primera sesión → consolidar en repaso).
- [ ] Búsqueda por título/autor + chips Todos/En progreso/Terminados en biblioteca.
- [ ] Ajustes: selector de tema Claro/Oscuro/Sistema + tarjeta de atajos de teclado.
- [ ] Lector: ↑/↓ velocidad, hint de atajos en desktop, indicador "Progreso guardado" al pausar.
- [ ] Build + commit `feat(ux): …`.

### Fase 5: Rendimiento
**Files:** `lib/pdfParser.ts`, `app/stats/page.tsx`, usos de `ProgressTracker`,
`components/Reader/{Controls,ProgressBar,ChapterNav}.tsx`, `<img>` de portadas.
- [ ] `await import("pdfjs-dist")` dentro de `parsePdf` (worker URL intacta).
- [ ] `next/dynamic` para RetentionDashboard y ProgressTracker (ssr:false, loader).
- [ ] React.memo + callbacks estables en el árbol del lector RSVP.
- [ ] `loading="lazy" decoding="async"` en portadas.
- [ ] Comparar First Load JS antes/después con `next build`. Commit `perf: …`.

### Fase 6: Accesibilidad
- [ ] Targets ≥44px en Controls (transporte, stepper PPM, tabs de método).
- [ ] ARIA: gráfico de actividad `role="img"` + aria-label; tabs de biblioteca; búsqueda.
- [ ] Fix warning lint NBackTest (useCallback en playNextTrial).
- [ ] Commit `fix(a11y): …`.

### Fase 7: Validación final
- [ ] `npm run test` verde, `npm run lint` limpio, `npm run build` sin errores.
- [ ] Navegador (dev sin Supabase para entrar sin login): importar TXT, RSVP completo con
      atajos, repaso, búsqueda, borrado con confirmación, tema oscuro/sistema, móvil 375px,
      consola limpia. Con Supabase activo: landing renderiza.
- [ ] Rutas restantes (training/study/tutor/connections/admin/login/pricing) revisadas en
      ambos temas (heredan tokens).
- [ ] Screenshots de evidencia + resumen. Listo para push (no se pushea sin confirmación).

## Fuera de alcance (documentado en el informe final)
EPUB, notificaciones push de repaso, sync multi-dispositivo del contenido privado,
command palette, observabilidad (se entrega recomendación), migración de charts a recharts
(se justifica mantener SVG propio).
