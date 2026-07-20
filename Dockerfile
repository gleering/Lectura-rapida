# ReadFlow — imagen Docker aislada (Next.js standalone).
# Multi-stage: deps -> build -> runner mínimo, sin toolchain ni secretos.

# 1) Dependencias
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# 2) Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# La clave de Gemini NUNCA se hornea (es server-only, se inyecta en runtime).
# En cambio, las vars NEXT_PUBLIC_* de Supabase SÍ se inlinean en el bundle del
# cliente en tiempo de build, así que deben estar disponibles acá. La anon key
# es pública por diseño (el acceso lo restringe RLS). Dokploy debe pasarlas como
# build args; si faltan, la biblioteca pública se oculta y la app local sigue
# funcionando igual.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 3) Runner (producción, usuario no-root)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Solo lo imprescindible del output standalone.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
