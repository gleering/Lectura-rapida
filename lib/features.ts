// Feature flags de ReadFlow.
//
// MEMBERSHIP_ENABLED controla el paywall de la biblioteca pública y los módulos
// de entrenamiento. Queda en OFF: todo el código de membresías (Lemon Squeezy,
// comps, /pricing) está listo pero NO bloquea a los usuarios todavía. Para
// activarlo más adelante, poné en el build:
//   NEXT_PUBLIC_MEMBERSHIP_ENABLED=true
// (es build arg: hay que reconstruir la imagen, no basta reiniciar).
export const MEMBERSHIP_ENABLED =
  process.env.NEXT_PUBLIC_MEMBERSHIP_ENABLED === "true";
