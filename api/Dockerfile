# syntax=docker/dockerfile:1

# ---- builder ----
FROM python:3.12-slim-bookworm AS builder
WORKDIR /api

RUN apt-get update && apt-get install -y --no-install-recommends gcc \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ---- runtime ----
FROM python:3.12-slim-bookworm AS runtime
WORKDIR /api

# ffmpeg es un binario que yt-dlp invoca como subproceso, no un paquete pip.
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg curl \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --system --uid 1001 apiuser

COPY --from=builder /install /usr/local
COPY app.py .

RUN mkdir -p /api/storage_musica && chown -R apiuser:apiuser /api/storage_musica

USER apiuser
EXPOSE 3000
ENV PYTHONUNBUFFERED=1

HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=10s \
  CMD curl -f http://localhost:3000/health || exit 1

# gunicorn en vez del server de desarrollo de Flask (debug=True es riesgo de ejecución de
# código si esto llega a exponerse). --timeout 120 porque yt-dlp+ffmpeg pueden tardar más
# que el timeout default de 30s de gunicorn.
CMD ["gunicorn", "--bind", "0.0.0.0:3000", "--workers", "2", "--timeout", "120", "app:app"]
