import os
import requests
import yt_dlp
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from mutagen.mp3 import MP3

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# --- RATE LIMITER ---
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://", # Guardado en RAM para máxima velocidad
)

print("📢 --- SISTEMA PROTEGIDO ACTIVADO: VERSIÓN PURIFICADA --- 📢")

# --- CONFIGURACIÓN VITAL ---
app.config['UPLOAD_FOLDER'] = 'storage_musica'

# URL alcanzable desde el NAVEGADOR donde NestJS sirve /musica (Nest es dueño del
# almacenamiento y el servido estático ahora; Python solo descarga con yt-dlp/ffmpeg).
PUBLIC_BASE_URL = os.environ.get('PUBLIC_BASE_URL', 'http://localhost:4000')

# NOTA: /upload, /api/delete_folder, /upload_cover y /musica/<path> vivían aquí antes.
# Esa responsabilidad (almacenamiento simple + servido estático) ahora vive en NestJS
# (backend/src/modules/music-manager). Este servicio queda enfocado solo en lo que
# necesita yt-dlp/ffmpeg/mutagen.

def descargar_portada(thumbnail_url, artista_nom, album_tit):
    """Descarga el thumbnail de YouTube y lo guarda como cover.jpg en la carpeta del álbum.
    Si ya existe una portada local, no la vuelve a descargar (se llama una vez por track)."""
    if not thumbnail_url:
        return None

    carpeta = os.path.join(app.config['UPLOAD_FOLDER'], artista_nom, album_tit)
    cover_path = os.path.join(carpeta, 'cover.jpg')

    if os.path.exists(cover_path):
        return f"{PUBLIC_BASE_URL}/musica/{artista_nom}/{album_tit}/cover.jpg"

    try:
        os.makedirs(carpeta, exist_ok=True)
        resp = requests.get(thumbnail_url, timeout=15)
        resp.raise_for_status()
        with open(cover_path, 'wb') as f:
            f.write(resp.content)
        return f"{PUBLIC_BASE_URL}/musica/{artista_nom}/{album_tit}/cover.jpg"
    except Exception as e:
        print(f"⚠️ No se pudo descargar la portada: {e}")
        return None

# ---------------------------------------------------------
# 1. YOUTUBE: EXTRAER METADATA (El Explorador) 🔍
# ---------------------------------------------------------
@app.route('/api/metadata', methods=['POST'])
def get_metadata():
    try:
        yt_url = request.json.get('url')
        ydl_opts = {'extract_flat': 'in_playlist', 'quiet': True}

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(yt_url, download=False)
            entries = info.get('entries', [])
            if not entries:
                entries = [info]

            tracks = []
            for entry in entries:
                tracks.append({
                    'titulo': entry.get('title'),
                    'url_video': f"https://www.youtube.com/watch?v={entry.get('id')}",
                    'duracion_seg': entry.get('duration'),
                    'duracion_fmt': f"{int(entry.get('duration', 0)//60)}:{int(entry.get('duration', 0)%60):02d}" if entry.get('duration') else "0:00",
                    'thumbnail': entry.get('thumbnails')[0]['url'] if entry.get('thumbnails') else None,
                })

            return jsonify({
                'playlist_name': info.get('title', 'Video Individual'),
                'count': len(tracks),
                'tracks': tracks
            })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------------------------------------------------
# 2. YOUTUBE: EL MINERO DE DESCARGAS ⛏️ (PURIFICADO)
# ---------------------------------------------------------
@app.route('/api/download_single', methods=['POST'])
@limiter.limit("15 per minute")
def download_single_track():
    try:
        data = request.json
        track = data.get('track')
        artista_nom = data.get('artista_nombre', 'Desconocido')
        album_tit = data.get('album_titulo', 'Desconocido')

        titulo = track.get('titulo')
        url_video = track.get('url_video')
        thumbnail_url = data.get('thumbnail') or track.get('thumbnail')

        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': os.path.join(app.config['UPLOAD_FOLDER'], f'{artista_nom}/{album_tit}/{titulo}.%(ext)s'),
            'postprocessors': [{'key': 'FFmpegExtractAudio', 'preferredcodec': 'mp3', 'preferredquality': '320'}],
            'quiet': True
        }

        # 1. Descargamos el MP3
        print(f"📥 Minando audio: {titulo}")
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url_video])

        # 2. Medimos su duración local
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{artista_nom}/{album_tit}/{titulo}.mp3")
        audio = MP3(file_path)
        duracion_decimal = round(audio.info.length / 60, 2)

        # 3. Generamos la URL final (Nest sirve /musica, no este servicio)
        public_url = f"{PUBLIC_BASE_URL}/musica/{artista_nom}/{album_tit}/{titulo}.mp3"

        # 4. Bajamos la portada local desde el thumbnail de YouTube (si vino uno)
        cover_url = descargar_portada(thumbnail_url, artista_nom, album_tit)

        # 🛑 ¡CERO BASE DE DATOS AQUÍ! Solo le pasamos los datos masticados a NestJS
        return jsonify({
            "success": True,
            "audio_url": public_url,
            "duracion_decimal": duracion_decimal,
            "cover_url": cover_url
        })

    except Exception as e:
        print(f"❌ Error en la mina con {data.get('index')}: {e}")
        return jsonify({"error": str(e)}), 500

# ---------------------------------------------------------
# 3. YOUTUBE: DESCARGA MASIVA
# ---------------------------------------------------------
@app.route('/api/download_batch', methods=['POST'])
def download_batch():
    try:
        data = request.json
        tracks = data.get('tracks', [])
        artista_nom = data.get('artista_nombre', 'Desconocido')
        album_tit = data.get('album_titulo', 'Desconocido')
        thumbnail_url = data.get('thumbnail')

        # Portada local del álbum a partir del thumbnail de YouTube (idempotente: si ya existe, no vuelve a bajarla)
        cover_url = descargar_portada(thumbnail_url, artista_nom, album_tit)

        exitosas = 0
        for track in tracks:
            titulo = track.get('titulo')
            url_video = track.get('url_video') # Asegúrate de que NestJS mande la URL

            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': os.path.join(app.config['UPLOAD_FOLDER'], f'{artista_nom}/{album_tit}/{titulo}.%(ext)s'),
                'postprocessors': [{'key': 'FFmpegExtractAudio', 'preferredcodec': 'mp3', 'preferredquality': '320'}],
                'quiet': True
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url_video])
            exitosas += 1

        return jsonify({"success": True, "procesadas": exitosas, "cover_url": cover_url}), 200

    except Exception as e:
        print(f"❌ Error en descarga masiva: {e}")
        return jsonify({"error": str(e)}), 500

# ---------------------------------------------------------
# HEALTHCHECK (lo usa el healthcheck: de Docker Compose)
# ---------------------------------------------------------
@app.route('/health')
def health():
    return jsonify({"status": "ok"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=3000)
