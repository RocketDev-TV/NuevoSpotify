# El Búnker · NuevoSpotify

Plataforma de streaming de música con features sociales (estilo Apple Music / Spotify), organizada como microservicios independientes y lista para escalar horizontalmente detrás de Docker.

## Arquitectura

```
┌────────────┐       ┌──────────────────────┐       ┌────────────────────────┐
│  frontend  │  browser  │       backend        │       │           api           │
│  Next.js   │──────▶│  NestJS + GraphQL/REST │──────▶│  Python / Flask         │
│  :3001     │       │  :4000                │       │  (interno, solo compose) │
└────────────┘       └───────────┬───────────┘       └────────────┬────────────┘
                                  │                                 │
                                  │        volumen compartido        │
                                  └───────────── storage_musica ─────┘
                                  │
                                  ▼
                          Postgres (Supabase, remoto)

                          Redis (provisto en compose, ver "Redis" abajo)
```

- **`/frontend`** — Next.js 16 (App Router). Habla con `backend` por GraphQL/REST desde el navegador del usuario.
- **`/backend`** — NestJS + Prisma + GraphQL (Apollo). Dueño de toda la base de datos (Postgres/Supabase) y de todo el almacenamiento de archivos: escribe a disco, sirve `/musica/*` como estático, y es el único servicio que el navegador conoce por nombre.
- **`/api`** — Python/Flask, apodado internamente "el Búnker". Acotado a lo que **solo Python puede hacer**: extraer metadata de YouTube y descargar/transcodificar audio con `yt-dlp` + `ffmpeg` + `mutagen`. No tiene base de datos ni sirve archivos: descarga directo al volumen compartido y le devuelve a `backend` la info ya masticada.
- **Volumen `storage_musica`** — compartido entre `backend` y `api`. Lo que Python descarga, Nest lo sirve; no hay copia intermedia.
- **Postgres** — hosteado en Supabase. No hay contenedor de base de datos; solo se inyectan variables de entorno.
- **Redis** — incluido en `docker-compose.yml` como ruta de escalabilidad ya preparada (p. ej. mover el rate limiting de `api` de memoria a Redis compartido, o cachear catálogo en `backend`), pero **hoy ningún servicio lo consume todavía**. No lo describas como feature activa en producción.
- **WebSockets** — no implementados aún en ningún servicio (no hay servidor de WebSocket en Nest). Queda fuera del alcance de esta reestructuración.

### Por qué está partido así

Antes, un mini-servidor Express (`music-server`) y el propio Python duplicaban la lógica de guardar/servir archivos, y NestJS reenviaba cada subida por HTTP a Python solo para escribirla a disco. Ahora Nest posee el disco directamente (memoria → `fs.writeFile`, sin round-trip de red) y Python queda reducido a las tres rutas que de verdad necesitan sus librerías (`yt-dlp`, `ffmpeg`, `mutagen`). Esto también elimina URLs de `localhost` hardcodeadas que rompían en cuanto cada pieza corría en su propio contenedor.

## Rate Limiting

Implementado con `Flask-Limiter` en `/api` (ya en el código, no es aspiracional):
- Límite global: `200 por día`, `50 por hora`.
- `/api/download_single`: `15 por minuto` (yt-dlp + ffmpeg es costoso).
- Guardado en memoria (`storage_uri="memory://"`) — al día de hoy por-instancia, no compartido entre réplicas. Migrar a `redis://redis:6379` es el paso natural si `api` llega a correr con más de una réplica.

`backend` (NestJS) no tiene rate limiting propio todavía.

## Cómo levantar todo

**Requisitos:** Docker + Docker Compose. Una base de datos Postgres accesible (Supabase).

1. Copia las plantillas de entorno:
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   ```
2. Rellena `.env` (raíz) con las credenciales públicas de Supabase (`NEXT_PUBLIC_*`) y `backend/.env` con las credenciales reales (`DATABASE_URL`, `SUPABASE_KEY`, etc.) — ver [Variables de entorno](#variables-de-entorno).
3. Levanta todo:
   ```bash
   docker compose up --build
   ```
4. Servicios expuestos al host:
   - Frontend: [http://localhost:3001](http://localhost:3001)
   - Backend (REST bajo `/music-manager`, GraphQL Playground en `/graphql`): [http://localhost:4000](http://localhost:4000)
   - `api` (Python) **no publica puerto al host** — solo es alcanzable dentro de la red de Compose como `http://api:3000`, desde `backend`.

## Variables de entorno

**`.env`** (raíz, junto a `docker-compose.yml`) — solo usadas para sustituir `${VAR}` en `build.args` del frontend. No son secretas:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_BACKEND_URL` — URL del backend **alcanzable desde el navegador** (`http://localhost:4000` en local; el dominio real en producción). Nunca el nombre de servicio interno de Compose.

**`backend/.env`** — secretos reales, montados en runtime en el contenedor `backend`:
- `DATABASE_URL`, `DIRECT_URL` — Postgres (Supabase).
- `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_JWT_SECRET`.
- `PYTHON_SERVER_URL` — solo relevante fuera de Docker Compose; dentro de compose se sobreescribe automáticamente a `http://api:3000`.

**Inyectadas directamente en `docker-compose.yml`** (no requieren `.env` propio): `STORAGE_ROOT`, `PUBLIC_BACKEND_URL` (backend), `PUBLIC_BASE_URL` (api). Estas dos últimas son deliberadamente iguales a `NEXT_PUBLIC_BACKEND_URL` — son URLs que terminan en `<audio src>` dentro del navegador, no llamadas entre contenedores.

## Desarrollo local sin Docker

Cada servicio puede correr suelto:

```bash
# backend
cd backend && npm install && npm run start:dev   # :4000

# frontend
cd frontend && npm install && npm run dev         # :3001

# api (requiere ffmpeg instalado localmente)
cd api && python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt && python app.py  # :3000
```

## Pendientes conocidos (fuera de alcance de esta reestructuración)

- `capacitor.config.json` (raíz) apunta `webDir: "www"`, carpeta que ya no existe (se retiró el frontend legacy). El empaquetado móvil necesita un nuevo `webDir` cuando se retome — no hay reemplazo automático porque el frontend de Next.js no está exportado como sitio estático.
- Redis está provisto pero no consumido por ningún servicio todavía (ver [Rate Limiting](#rate-limiting)).
- `backend` no tiene rate limiting propio; solo `api` lo tiene.
