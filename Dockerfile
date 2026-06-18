# ── STAGE 1: Dependencias ────────────────────────────────────
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production --ignore-scripts && \
    cp -R node_modules /tmp/prod_node_modules && \
    npm ci --ignore-scripts

# ── STAGE 2: Build ───────────────────────────────────────────
FROM node:18-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables necesarias en build time (valores placeholder, las reales van en Hyperlift)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_WA_CENTRAL
ARG NEXT_PUBLIC_COMISION_POR_CITA

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_WA_CENTRAL=$NEXT_PUBLIC_WA_CENTRAL
ENV NEXT_PUBLIC_COMISION_POR_CITA=$NEXT_PUBLIC_COMISION_POR_CITA
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── STAGE 3: Runner (imagen final ligera) ────────────────────
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Usuario no-root por seguridad
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Copiar solo lo necesario para producción
COPY --from=deps    /tmp/prod_node_modules   ./node_modules
COPY --from=builder /app/public              ./public
COPY --from=builder /app/.next/standalone    ./.next/standalone
COPY --from=builder /app/.next/static        ./.next/static

# Permisos
RUN chown -R nextjs:nodejs /app
USER nextjs

# Puerto que expone Next.js
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Usar el server standalone de Next.js (más eficiente en memoria)
CMD ["node", ".next/standalone/server.js"]
