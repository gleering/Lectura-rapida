# SPEC — Transformación a plataforma de aprendizaje profundo

> Documento vivo. Fuente de verdad de la reorientación de ReadFlow AI de "lector rápido"
> a "sistema de entrenamiento de la inteligencia". No borrar. Actualizar al cerrar cada bloque.

## Misión
Que el usuario **comprenda**, **recuerde por años** y **aplique** el conocimiento de los libros.
Principio rector: cada feature debe responder *¿ayuda al cerebro a comprender, recordar o aplicar?*
Si no, no se implementa.

## Los 6 pilares (orden de prioridad)
1. **Repetición Espaciada** (Ebbinghaus, Cepeda 2006) — recordar por años. [EN CURSO]
2. **Active Recall / Recuperación activa** (Roediger & Karpicke 2006) — el testing effect. [EN CURSO]
3. **Tutor IA de comprensión real** (Feynman, self-explanation, Chi 1994) — reformula hasta entender.
4. **Interleaving + grafo de conceptos** (Rohrer 2007; Craik & Lockhart 1972) — conexiones y transferencia.
5. **Resúmenes progresivos + mapas mentales** (Sweller, carga cognitiva) — externalizar estructura.
6. **Métricas de comprensión + gamificación reorientada** (Deci & Ryan) — premiar retención, no velocidad.

Descartado a propósito: más velocidad pura de lectura, badges cosméticos, leaderboard social.

---

## BLOQUE 1 (actual): Active Recall + Repetición Espaciada

Se implementan juntos porque son la columna vertebral: Active Recall genera el acto de
recuperación; la Repetición Espaciada decide *cuándo* repetirlo.

### Modelo de datos
`ReviewCard` (types/index.ts):
- `id`, `bookId`, `concept` (título corto), `prompt` (pregunta de recuperación),
  `answer` (respuesta/explicación de referencia), `source` (extracto del libro).
- Scheduling SM-2: `easeFactor` (def 2.5), `interval` (días), `repetitions`,
  `dueDate` (epoch ms), `lastReviewed`, `createdAt`.
- `lapses` (nº de fallos), `state` ("new" | "learning" | "review").

### Motor SM-2 (lib/spaced-repetition.ts)
- `scheduleCard(card, quality: 0..5)` → card actualizada (algoritmo SM-2 clásico).
- `isDue(card, now)` y `getDueCards(cards, now)`.
- `createReviewCard(...)` factory con defaults.
- `gradeFromSelfRating(rating)` mapea la autoevaluación del usuario (again/hard/good/easy) a quality.

### Active Recall (lib/active-recall.ts)
- `extractReviewCards(bookTitle, text)` — Gemini extrae 5-8 conceptos clave del libro
  y por cada uno genera `concept`, `prompt` (pregunta abierta de recuperación), `answer`.
- `evaluateRecall(prompt, referenceAnswer, userExplanation)` — Gemini evalúa la explicación
  libre del usuario (técnica Feynman): devuelve `{ score 0..100, gap, feedback, suggestedRating }`.

### Storage (lib/storage.ts)
- DB_VERSION → 2. Nuevo object store `reviewCards` (keyPath id, index `by-due` en dueDate,
  index `by-book` en bookId).
- CRUD: `saveReviewCard`, `saveReviewCards`, `getReviewCard`, `getReviewCardsByBook`,
  `getAllReviewCards`, `getDueReviewCards`, `deleteReviewCardsByBook`.

### UI
- Ruta `app/review/page.tsx` — cola diaria de repaso: cuenta pendientes, inicia sesión.
- `components/ReviewSession.tsx` — muestra prompt → usuario escribe explicación (recuperación
  activa) → IA evalúa → usuario confirma autorating (Again/Hard/Good/Easy) → reprograma.
- `components/GenerateCardsButton.tsx` (o integrado en library) — extrae tarjetas de un libro.
- Nav: añadir enlace "Repaso" en AppNav.

### Estado de implementación — BLOQUE 1 COMPLETO ✅
- [x] Spec
- [x] types: ReviewCard, ReviewCardState, RecallRating
- [x] lib/spaced-repetition.ts (SM-2: createReviewCard, scheduleCard, gradeFromRating, getDueCards, summarizeQueue)
- [x] lib/active-recall.ts (extractReviewConcepts, evaluateRecall con Gemini)
- [x] storage.ts v2 + CRUD (store reviewCards, índices by-due/by-book)
- [x] app/review/page.tsx (cola diaria + generar tarjetas por libro)
- [x] components/ReviewSession.tsx (recuperación libre → evaluación IA → autorating SM-2)
- [x] Nav link "Repaso" en AppNav
- [x] build verde (compiled successfully, ruta /review generada)

### Notas de verificación pendientes (manual, requiere navegador + API key)
- Probar generación de tarjetas de un libro real.
- Probar flujo completo de una sesión de repaso y confirmar reprogramación de dueDate.
- Confirmar migración IndexedDB v1→v2 en usuarios existentes (upgrade condicionado por oldVersion).

---

## Decisiones técnicas
- Sin backend: todo IndexedDB on-device (coherente con arquitectura actual).
- IA: Gemini 1.5 Flash vía `NEXT_PUBLIC_GEMINI_API_KEY` (patrón de ai-service.ts).
- Degradación elegante: si no hay API key, extracción/evaluación devuelven null y la UI lo informa.
- SM-2 elegido sobre FSRS por simplicidad y robustez probada; migrable a FSRS después.

---

## BLOQUE 2 (actual): Tutor IA de comprensión (Pilar 3)

Distinto del repaso: el repaso recupera lo ya aprendido; el tutor logra la **comprensión
inicial**. Objetivo: reformular hasta que exista comprensión real, no aceptar la ilusión.

### Fundamento científico
- Técnica Feynman + self-explanation effect (Chi et al. 1994): explicar con palabras
  propias revela huecos. El tutor obliga a esa explicación y responde al hueco concreto.
- Método socrático: preguntar en vez de solo exponer activa el procesamiento profundo.
- Ajuste al nivel (zona de desarrollo próximo, Vygotsky): la explicación se calibra al
  nivel declarado para no saturar ni aburrir.
- Doble codificación (Paivio): analogías/ejemplos concretos anclan lo abstracto.

### Modelo de datos
Sesión en memoria (no se persiste el transcript; se persiste el resultado como tarjeta
de repaso, conectando con el Bloque 1). No requiere nuevo store.

### lib/ai-tutor.ts
- `tutorRespond({ concept, sourceText?, level, history })` → `TutorTurn`:
  `{ message, analogy, checkQuestion, detectedGap, comprehension }`.
  El tutor evalúa el último mensaje del usuario, detecta el hueco, reexplica con
  un ángulo NUEVO (analogía/ejemplo/lenguaje más simple) y hace UNA pregunta de chequeo.
- `distillToCard(concept, history)` → `{ prompt, answer }` para crear tarjeta al comprender.
- Tipos: `TutorLevel` ("principiante"|"intermedio"|"avanzado"), `TutorMessage`, `TutorTurn`.

### UI
- Ruta `app/tutor/page.tsx` — setup: elegir tema libre o concepto de un libro + nivel → chat.
- `components/AITutor.tsx` — chat: mensajes, input, badge de comprensión, hueco detectado,
  pregunta de chequeo; al "comprendido" ofrece "Guardar como tarjeta de repaso" (→ Bloque 1).
- Nav: enlace "Tutor".

### Estado de implementación — BLOQUE 2 COMPLETO ✅
- [x] Spec (este bloque)
- [x] lib/ai-tutor.ts (tutorRespond, distillToCard; tipos TutorLevel/TutorMessage/TutorTurn)
- [x] components/AITutor.tsx (chat socrático + analogía + hueco + guardar tarjeta)
- [x] app/tutor/page.tsx (setup: tema libre o desde libro + nivel)
- [x] Nav link "Tutor"
- [x] build verde (ruta /tutor generada, typecheck OK)

### Conexión entre bloques
El tutor, al lograr comprensión, destila el concepto en una tarjeta de repaso (Bloque 1):
comprender → consolidar por repetición espaciada. Ciclo de aprendizaje cerrado.

### Notas de verificación pendientes (manual, navegador + API key)
- Probar sesión de tutor de un tema libre y confirmar reformulación ante huecos.
- Probar "Guardar como tarjeta de repaso" y verla aparecer en la cola de /review.

---

---

## BLOQUE 3 (actual): Grafo de conceptos + Interleaving (Pilar 4)

### Fundamento científico
- Interleaving (Rohrer & Taylor 2007): mezclar temas en el repaso mejora la discriminación
  y la transferencia frente al bloqueo (estudiar un tema seguido). Cuesta más en el momento
  (dificultad deseable, Bjork) pero produce aprendizaje más duradero y flexible.
- Elaboración / profundidad de procesamiento (Craik & Lockhart 1972): relacionar una idea
  nueva con otras existentes la codifica más profundamente.
- Memoria semántica en red: el conocimiento no se guarda aislado sino en redes de conceptos
  conectados; hacer explícitas esas conexiones fortalece el recuerdo y el pensamiento crítico.

### Modelo de datos
`ConceptLink` (types): `{ id, sourceId, targetId, sourceConcept, targetConcept,
relationship, createdAt }`. Los nodos son las tarjetas de repaso ya existentes.

### lib/interleaving.ts
- `interleaveCards(cards)` — reordena por round-robin de bookId para que tarjetas
  consecutivas vengan de libros/temas distintos (respetando prioridad de vencimiento
  dentro de cada libro). Se aplica a la cola de /review.

### lib/concept-graph.ts
- `findConnections(concepts)` — Gemini detecta relaciones significativas (sobre todo
  cross-libro) entre los conceptos de la biblioteca. Usa índices 1..N para robustez y
  mapea a ids. Devuelve `ConceptLink[]`.
- `groupByConcept(links)` — adyacencia para la visualización.

### Storage
- DB_VERSION → 3. Store `conceptLinks` (keyPath id). CRUD: saveConceptLinks,
  getAllConceptLinks, clearConceptLinks.

### UI
- Ruta `app/connections/page.tsx` — botón "Analizar biblioteca" → mapa de conexiones
  (cada concepto con sus relacionados y la relación descrita).
- Interleaving aplicado en /review antes de iniciar la sesión.
- Nav: enlace "Conexiones".

### Estado de implementación — BLOQUE 3 COMPLETO ✅
- [x] Spec (este bloque)
- [x] types: ConceptLink
- [x] lib/interleaving.ts (interleaveCards, round-robin por bookId)
- [x] lib/concept-graph.ts (findConnections con índices 1..N, groupByConcept)
- [x] storage.ts v3 + CRUD (store conceptLinks: saveConceptLinks, getAllConceptLinks, clearConceptLinks)
- [x] app/connections/page.tsx (analizar biblioteca → mapa de conexiones agrupado)
- [x] interleaving aplicado en /review (interleaveCards(dueCards))
- [x] Nav link "Conexiones"
- [x] build verde (ruta /connections generada, typecheck OK)

### Notas de verificación pendientes (manual, navegador + API key)
- Generar tarjetas de 2+ libros y correr "Analizar biblioteca"; confirmar conexiones cross-libro.
- Confirmar que la sesión de /review alterna tarjetas de libros distintos.

---

---

## BLOQUE 4 (actual): Mapas mentales + Resúmenes progresivos (Pilar 5)

### Fundamento científico
- Teoría de carga cognitiva (Sweller 1988): la memoria de trabajo se satura (~4 elementos).
  Externalizar la estructura en un organizador gráfico descarga la memoria de trabajo y
  libera recursos para comprender. Clave para TDAH/fatiga mental.
- Organizadores gráficos + chunking: agrupar en jerarquías reduce los elementos a manejar.
- Resumen progresivo (Forte, PARA/Zettelkasten): condensar en capas sucesivas fuerza a
  destilar la esencia; cada capa es una reelaboración (elaboración activa, no copia pasiva).

### Modelo de datos (kv-blobs, SIN bump de versión de DB)
- `MindMapNode { label, children? }`; `MindMap { bookId, root, generatedAt }`.
- `ProgressiveSummary { bookId, aiSummary (L1), keyPoints[] (L2 editable), synthesis (L3), updatedAt }`.

### lib/mind-map.ts
- `generateMindMap(bookTitle, text)` — Gemini devuelve árbol jerárquico {label, children}.
  Normalización recursiva con límite de profundidad/anchura.

### lib/progressive-summary.ts
- `generateAISummary(text)` (reutiliza ai-service) — capa 1.
- `extractKeyPoints(text)` — puntos clave (semilla de capa 2, editable por el usuario).
- Capa 3 = síntesis con palabras propias del usuario (input libre).

### Storage (kv)
- `saveMindMap`/`getMindMap`; `saveProgressiveSummary`/`getProgressiveSummary`.

### UI
- Ruta `app/study/page.tsx` — selector de libro + dos herramientas.
- `components/MindMapView.tsx` — árbol jerárquico recursivo (indentado con conectores).
- `components/ProgressiveSummaryView.tsx` — 3 capas: resumen IA, puntos clave editables,
  síntesis propia; persiste.
- Nav: enlace "Estudiar".

### Estado de implementación — BLOQUE 4 COMPLETO ✅
- [x] Spec (este bloque)
- [x] types: MindMapNode, MindMap, ProgressiveSummary
- [x] lib/mind-map.ts (generateMindMap, normalización recursiva prof.4/anchura 6)
- [x] lib/progressive-summary.ts (generateAISummary reutiliza ai-service, extractKeyPoints)
- [x] storage.ts kv CRUD (saveMindMap/getMindMap, saveProgressiveSummary/getProgressiveSummary — sin bump de versión)
- [x] components/MindMapView.tsx (árbol recursivo con colores por nivel)
- [x] components/ProgressiveSummaryView.tsx (3 capas: resumen IA / puntos editables / síntesis)
- [x] app/study/page.tsx (selector de libro + tabs mapa/resumen)
- [x] Nav link "Estudiar"
- [x] build verde (ruta /study generada, typecheck OK)

### Notas de verificación pendientes (manual, navegador + API key)
- Generar mapa mental de un libro y confirmar jerarquía coherente.
- Completar las 3 capas del resumen progresivo y confirmar que persisten al recargar.

---

---

## BLOQUE 5 ✅ COMPLETO: Métricas de comprensión + Gamificación reorientada (Pilar 6)

### Fundamento científico
- "Lo que se mide se optimiza": si premias tiempo/velocidad de lectura, entrenas a leer
  rápido y olvidar (ilusión de fluidez). Si premias RETENCIÓN CONSOLIDADA, entrenas memoria
  duradera. Este bloque reorienta la métrica-objetivo del sistema entero.
- Teoría de la autodeterminación (Deci & Ryan): la motivación intrínseca crece con
  competencia (ver progreso real), autonomía (metas propias) y sentido. Las metas diarias
  se enmarcan como progreso de dominio, no como recompensas vacías.

### Enfoque técnico
Capa 100% DERIVADA de datos ya existentes (tarjetas de repaso + conexiones). Sin llamadas
IA: determinista y rápida. La racha se deriva de `lastReviewed` de las tarjetas (no requiere
tracking nuevo).

### lib/learning-metrics.ts
- `computeLearningMetrics(cards, links)` → `LearningMetrics`:
  totalConcepts, mastered (review + interval≥21 o reps≥4), consolidating, learning,
  atRisk (vencidas), connections, retentionRate (aciertos/intentos vía reps y lapses),
  avgEase, streak (días consecutivos con repaso), reviewsToday, masteryLevel.
- `computeDailyGoals(cards, metrics)` → metas del día (repaso, concepto nuevo, conexión).

### UI
- Ruta `app/progress/page.tsx` — dashboard de aprendizaje: nivel de dominio, conceptos
  dominados / en riesgo / aprendiendo, retención, conexiones, racha, metas del día.
- `components/LearningDashboard.tsx`.
- Nav: enlace "Progreso".

### Estado de implementación
- [x] Spec (este bloque)
- [x] types: LearningMetrics, DailyLearningGoal
- [x] lib/learning-metrics.ts
- [x] components/LearningDashboard.tsx
- [x] app/progress/page.tsx (ruta /progress generada, 5.92 kB)
- [x] Nav link "Progreso" (TrendingUp)
- [x] build verde (14/14 páginas, sin errores de tipos)

---

## REFINAMIENTOS (post-6-pilares)

### Inicio como lanzadera del bucle de comprensión ✅
- Hero reenmarcado: de "Lee más rápido con RSVP" a "Comprende lo que lees. De verdad."
  (la misión es entrenar la mente, no leer PDFs).
- Sección "Tu día de aprendizaje" en `app/page.tsx`: reutiliza `computeLearningMetrics` +
  `computeDailyGoals` para mostrar nivel de dominio, racha, repasos de hoy, CTA a `/review`
  si hay conceptos en riesgo, y las metas del día. Solo aparece si hay conceptos.
  Fundamento: reducir la fricción hacia la acción de mayor valor (repasar lo que se olvida)
  y hacer visible el progreso real (competencia, Deci & Ryan) desde el primer pantallazo.
- build verde (Inicio 3.54 kB).

### Mapa mental como fuente de tarjetas de repaso ✅
- Puente Bloque 4 → Bloque 1: la estructura del mapa alimenta el recuerdo activo.
- `lib/mind-map.ts`: `collectLeafPaths(root)` recoge las hojas (sub-ideas concretas) con su
  ruta de ramas; `mindMapToReviewConcepts(bookTitle, leaves)` genera en UN lote una pregunta
  de recuerdo abierto + respuesta de referencia por hoja (máx. 20). Reusa `callGemini` y
  añade `extractJsonArray`.
- `components/MindMapView.tsx`: botón "Crear tarjetas de repaso" cuando existe un mapa →
  crea tarjetas con `createReviewCard` (dedup por conteo previo del libro), guarda con
  `saveReviewCards`, y muestra confirmación con enlace directo a `/review`.
- Fundamento: comprender la estructura (Sweller: carga cognitiva) no basta para recordar;
  hay que recuperarla de memoria (efecto de test, Roediger & Karpicke). El mapa organiza,
  las tarjetas consolidan.
- build verde (/study 5.88 kB, /review 5.25 kB).

### Fin de libro → consolidación en tarjetas ✅
- Problema: al terminar un libro, el diálogo solo ofrecía "Leer de nuevo" / "Ver estadísticas"
  (callejón sin salida, refuerza el uso pasivo). Es el momento de mayor implicación.
- `components/Reader/ReaderScreen.tsx`: el diálogo "¡Libro terminado!" ahora lidera con
  "Consolidar en tarjetas de repaso" → `extractReviewConcepts` sobre el texto completo →
  `createReviewCard` (dedup por conteo previo) → `saveReviewCards` → navega a `/review`.
  Copy reorientado: "leer no es recordar". "Leer de nuevo" y "Ver estadísticas" quedan como
  acciones secundarias.
- Fundamento: convierte la lectura (pasiva) en recuperación (activa) justo en el pico de
  implicación; ataca directamente el "no quiero una app para leer PDFs". Efecto de test
  (Roediger & Karpicke) + espaciamiento (Ebbinghaus).
- build verde (/reader 10.4 kB).

### Puntos clave del resumen progresivo → tarjetas ✅ (simetría con el mapa mental)
- Puente Bloque 4 (Capa 2) → Bloque 1: la destilación alimenta el recuerdo activo.
- `lib/progressive-summary.ts`: `keyPointsToReviewConcepts(bookTitle, points)` genera en UN
  lote, por cada punto clave, un título corto + pregunta de recuerdo abierto + respuesta de
  referencia (máx. 12). Nueva interfaz `KeyPointConcept`.
- `components/ProgressiveSummaryView.tsx`: nuevo prop `bookTitle`; botón "Crear tarjetas de
  repaso" en la Capa 2 (solo si hay puntos con texto). Persiste ediciones antes de convertir,
  crea con `createReviewCard` (dedup por conteo previo), guarda con `saveReviewCards`, y
  muestra confirmación con enlace a `/review`. `app/study/page.tsx` pasa `bookTitle`.
- Fundamento: destilar en puntos clave es elaboración (Craik & Lockhart); recuperarlos de
  memoria consolida (efecto de test, Roediger & Karpicke).
- build verde (/study 6.08 kB).

### Fallo de comprensión en el lector → tarjeta de repaso ✅ (aprendizaje guiado por error)
- Problema: las pausas de comprensión del lector solo actualizaban un stat (aciertos/total);
  el fallo —la señal de aprendizaje más valiosa— se perdía.
- `components/Reader/ReaderScreen.tsx`: tras responder, el diálogo ofrece "Repasar esto luego"
  (destacado cuando la respuesta es incorrecta). Crea una tarjeta con prompt = la pregunta,
  answer = la opción correcta, vía `createReviewCard` + `saveReviewCards` (dedup por conteo
  previo del libro). Flag `qCardSaved` evita duplicados; se resetea con cada nueva pregunta.
- Fundamento: aprendizaje guiado por error + dificultad deseable (Bjork); recuperar justo lo
  que fallaste, espaciado en el tiempo, es donde más se aprende. Cierra un bucle antes abierto.
- build verde (/reader 10.7 kB).

### Puntos de entrada al repaso (resumen)
Repaso alimentado desde 5 superficies: (1) sección Repaso por libro, (2) fin de lectura,
(3) mapa mental, (4) puntos clave del resumen progresivo, (5) fallo de comprensión en el
lector. Además el Tutor destila tarjetas al lograr comprensión. Todos convergen en SM-2.

## Refinamiento de UX móvil ✅ (accesibilidad y zona del pulgar)
- Problema: la barra de navegación superior con 10 destinos se desbordaba en móvil (público
  objetivo: TDAH, autodidactas, estudiantes — mayoritariamente en el teléfono). Además el
  `viewport` bloqueaba el zoom y los diálogos largos no hacían scroll en pantallas pequeñas.
- `components/AppNav.tsx`: reescrito. En escritorio (`md:`) sigue siendo barra superior. En
  móvil, barra inferior fija en la zona del pulgar con los 4 destinos primarios
  (`/`, `/library`, `/review`, `/progress`) + botón "Más" que abre una hoja deslizante
  (framer-motion, `y:100%`→`0`) con los 6 destinos secundarios en rejilla; se cierra al tocar.
  Respeta `safe-area-inset-bottom`.
- `<main>` de las 10 páginas de contenido: `pb-24 md:pb-8` para no quedar tapado por la barra
  inferior. El lector a pantalla completa (sin `<main>`) no se ve afectado.
- `app/layout.tsx`: se elimina `maximumScale: 1` → se re-habilita el zoom (accesibilidad,
  crítico para baja visión y lectura asistida).
- `components/ui/dialog.tsx`: `max-h-[calc(100dvh-2rem)] overflow-y-auto` → los diálogos
  largos (consolidar, comprensión) hacen scroll en móvil en lugar de cortarse.
- Fundamento UX: alcanzabilidad con el pulgar (barra inferior) reduce fricción en el uso
  mayoritariamente móvil; el zoom re-habilitado es un requisito de accesibilidad (WCAG 1.4.4)
  para el público objetivo. Menos fricción de navegación = menor carga cognitiva extrínseca
  (Sweller), más recursos para comprender.
- build verde (14 rutas, sin errores de tipos).
