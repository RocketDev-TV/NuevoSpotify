import os
import shutil
import yt_dlp
import glob
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from mutagen.mp3 import MP3

app = Flask(__name__)
# Permitimos que hablen con Flask desde el puerto 3000
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

# ---------------------------------------------------------
# 1. ENDPOINT DE SUBIDA MANUAL (Upload) 📤
# ---------------------------------------------------------
@app.route('/upload', methods=['POST'])
@limiter.limit("5 per minute") 
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400
        
        file = request.files['file']
        ruta_relativa = request.form.get('ruta')

        if not ruta_relativa or '..' in ruta_relativa or ruta_relativa.startswith('/'):
            return jsonify({"error": "Ruta inválida o maliciosa detectada"}), 403

        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400

        full_path = os.path.abspath(os.path.join(app.config['UPLOAD_FOLDER'], ruta_relativa))
        
        if not full_path.startswith(os.path.abspath(app.config['UPLOAD_FOLDER'])):
            return jsonify({"error": "Acceso denegado a ruta externa"}), 403

        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        file.save(full_path)
        return jsonify({"mensaje": "Subida exitosa", "path": full_path}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------------------------------------------------
# 2. ENDPOINT DE BORRADO NUCLEAR (Carpetas Completas) ☢️
# ---------------------------------------------------------
@app.route('/api/delete_folder', methods=['POST'])
@limiter.limit("2 per minute")
def delete_folder():
    try:
        data = request.json
        ruta_relativa = data.get('ruta')

        if not ruta_relativa or '..' in ruta_relativa:
            return jsonify({"error": "Ruta inválida"}), 403

        folder_path = os.path.abspath(os.path.join(app.config['UPLOAD_FOLDER'], ruta_relativa))

        if not folder_path.startswith(os.path.abspath(app.config['UPLOAD_FOLDER'])):
             return jsonify({"error": "Acceso denegado"}), 403

        if os.path.exists(folder_path):
            shutil.rmtree(folder_path) 
            return jsonify({"mensaje": "Carpeta eliminada por completo"}), 200
        else:
            return jsonify({"mensaje": "La carpeta ya no existía"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------------------------------------------------
# 3. YOUTUBE: EXTRAER METADATA (El Explorador) 🔍
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
# 4. YOUTUBE: EL MINERO DE DESCARGAS ⛏️ (PURIFICADO)
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
        
        # 3. Generamos la URL final
        public_url = f"http://localhost:3000/musica/{artista_nom}/{album_tit}/{titulo}.mp3"

        # 🛑 ¡CERO BASE DE DATOS AQUÍ! Solo le pasamos los datos masticados a NestJS
        return jsonify({
            "success": True, 
            "audio_url": public_url,
            "duracion_decimal": duracion_decimal
        })

    except Exception as e:
        print(f"❌ Error en la mina con {data.get('index')}: {e}")
        return jsonify({"error": str(e)}), 500

# ---------------------------------------------------------
# 4.5 YOUTUBE: DESCARGA MASIVA (NUEVO)
# ---------------------------------------------------------
@app.route('/api/download_batch', methods=['POST'])
def download_batch():
    try:
        data = request.json
        tracks = data.get('tracks', [])
        artista_nom = data.get('artista_nombre', 'Desconocido')
        album_tit = data.get('album_titulo', 'Desconocido')
        
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

        return jsonify({"success": True, "procesadas": exitosas}), 200

    except Exception as e:
        print(f"❌ Error en descarga masiva: {e}")
        return jsonify({"error": str(e)}), 500

# ---------------------------------------------------------
# 5. ENDPOINT DE PORTADAS (Upload Cover) 🖼️
# ---------------------------------------------------------
@app.route('/upload_cover', methods=['POST'])
@limiter.limit("10 per minute")
def upload_cover():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400
        
        file = request.files['file']
        artista_nom = request.form.get('artista_nombre', 'Desconocido')
        album_tit = request.form.get('album_titulo', 'Desconocido')

        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400

        ext = os.path.splitext(file.filename)[1]
        nombre_portada = f"cover{ext}" 

        ruta_relativa = os.path.join(artista_nom, album_tit, nombre_portada)
        full_path = os.path.abspath(os.path.join(app.config['UPLOAD_FOLDER'], ruta_relativa))

        if not full_path.startswith(os.path.abspath(app.config['UPLOAD_FOLDER'])):
            return jsonify({"error": "Acceso denegado a ruta externa"}), 403

        folder_path = os.path.dirname(full_path)
        os.makedirs(folder_path, exist_ok=True)
        
        # Limpieza de portadas viejas
        portadas_viejas = glob.glob(os.path.join(folder_path, 'cover.*'))
        for vieja in portadas_viejas:
            try:
                os.remove(vieja)
            except Exception as e:
                pass
                
        file.save(full_path)
        public_url = f"http://localhost:3000/musica/{artista_nom}/{album_tit}/{nombre_portada}"

        return jsonify({"mensaje": "Portada subida", "url": public_url}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- SERVIDOR DE ARCHIVOS (Para ver portadas y escuchar música) ---
@app.route('/musica/<path:filename>')
def serve_musica(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=3000)