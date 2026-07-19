/**
 * "Bionic" / anclaje de fijación: resaltar las primeras letras de cada palabra
 * da a la mirada un punto de fijación estable, reduciendo las regresiones
 * (releer hacia atrás) típicas de la atención dispersa. No cambia el texto,
 * solo dónde cae el ojo.
 *
 * Devuelve cuántos caracteres iniciales conviene enfatizar según el largo:
 * palabras cortas casi enteras, largas ~40 %.
 */
export function bionicSplit(word: string): { head: string; tail: string } {
  // Prefijo de puntuación (comillas, ¿, ¡) que no debe contar como letra.
  const lead = word.match(/^[^\p{L}\p{N}]*/u)?.[0] ?? "";
  const rest = word.slice(lead.length);
  const letters = rest.replace(/[^\p{L}\p{N}].*$/u, "");
  const n = letters.length;

  let bold: number;
  if (n <= 1) bold = n;
  else if (n <= 3) bold = 1;
  else if (n <= 6) bold = 2;
  else bold = Math.ceil(n * 0.4);

  const head = lead + rest.slice(0, bold);
  const tail = rest.slice(bold);
  return { head, tail };
}
