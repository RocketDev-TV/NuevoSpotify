# syntax=docker/dockerfile:1
#
# Base Debian-slim (no Alpine) en AMBOS stages a propósito: prisma/schema.prisma no define
# binaryTargets, así que el engine de Prisma se resuelve automático según la plataforma donde
# corre `prisma generate` - mantener builder y runtime en la misma familia de libc evita el
# clásico mismatch "engine no coincide con el runtime". Debian-slim también tiene mejor
# cobertura de prebuilds para bcrypt (nativo) que Alpine/musl.

# ---- builder ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts ./

# `prisma generate` solo necesita una URL con sintaxis válida, nunca se conecta de verdad.
# Los secretos reales se inyectan solo en runtime (env_file en docker-compose), nunca se
# hornean en la imagen.
ARG DATABASE_URL=postgresql://user:password@localhost:5432/placeholder
ENV DATABASE_URL=$DATABASE_URL
RUN npx prisma generate

COPY . .
RUN npm run build
RUN npm prune --omit=dev

# ---- runner ----
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates curl \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --system --gid 1001 nestjs \
 && useradd --system --uid 1001 --gid nestjs nestjs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

RUN mkdir -p /app/storage_musica && chown -R nestjs:nestjs /app/storage_musica

USER nestjs
EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=15s \
  CMD curl -f http://localhost:4000/health || exit 1

CMD ["node", "dist/main"]
