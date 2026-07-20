import { defineConfig } from "vitest/config";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    // Solo los tests nuevos: no arrastramos el legacy __tests__/phase3.test.ts,
    // que importa módulos con dependencias de navegador.
    include: [
      "__tests__/tableOfContents.test.ts",
      "__tests__/textImport.test.ts",
    ],
  },
  resolve: {
    // "@/lib/x" -> "<root>/lib/x"
    alias: { "@": root },
  },
});
