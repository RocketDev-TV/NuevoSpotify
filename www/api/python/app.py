import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask import send_from_directory
from supabase import create_client, Client
import pandas as pd
import config
import yt_dlp

from flask_cors import CORS

app = Flask(__name__)
# Esto permite que tu frontend en el puerto 8080 hable con Flask en el 3000
CORS(app, resources={r"/*": {"origins": "*"}})

app = Flask(__name__)
CORS(app)

# --- 🛡️ CONFIGURACIÓN DEL BÚNKER (SEGURIDAD) ---
# Esto protege tu servidor de ataques DDoS y saturación
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://", # Guardado en RAM para máxima velocidad
)

print("📢 --- SISTEMA PROTEGIDO ACTIVADO: VERSIÓN SEGURA --- 📢")

# --- CONFIGURACIÓN VITAL ---
app.config['UPLOAD_FOLDER'] = 'storage_musica' 

# Conexión a Supabase
supabase: Client = create_client(config.SUPABASE_URL, config.SUPABASE_KEY)

# ---------------------------------------------------------
# 1. ENDPOINT DE GRÁFICAS (Growth) 📈
# ---------------------------------------------------------
@app.route('/api/growth', methods=['GET'])
@limiter.limit("10 per minute") # Límite para evitar spam en gráficas
def get_user_growth():
    try:
        response = supabase.table('usuarios').select("created_at").execute()
        data = response.data

        if not data:
            return jsonify({"labels": [], "data": []})

        df = pd.DataFrame(data)
        df['created_at'] = pd.to_datetime(df['created_at'])
        df['fecha'] = df['created_at'].dt.date
        conteo_diario = df.groupby('fecha').size().reset_index(name='nuevos_usuarios')
        
        labels = conteo_diario['fecha'].astype(str).tolist()
        values = conteo_diario['nuevos_usuarios'].tolist()

        return jsonify({"labels": labels, "data": values})

    except Exception as e:
        print(f"Error Growth: {e}")
        return jsonify({"error": str(e)}), 500

# ---------------------------------------------------------
# 2. ENDPOINT DE SUBIDA (Upload) 📤
# ---------------------------------------------------------
@app.route('/upload', methods=['POST'])
@limiter.limit("5 per minute") # 👈 Blindaje contra subidas masivas (DDoS)
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400
        
        file = request.files['file']
        ruta_relativa = request.form.get('ruta')

        # --- SEGURIDAD: SANITIZACIÓN ---
        if not ruta_relativa or '..' in ruta_relativa or ruta_relativa.startswith('/'):
            return jsonify({"error": "Ruta inválida o maliciosa detectada"}), 403

        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400

        # Construir ruta absoluta de forma segura
        full_path = os.path.abspath(os.path.join(app.config['UPLOAD_FOLDER'], ruta_relativa))
        
        # Doble check de seguridad: asegurar que no se salga de storage_musica
        if not full_path.startswith(os.path.abspath(app.config['UPLOAD_FOLDER'])):
            return jsonify({"error": "Acceso denegado a ruta externa"}), 403

        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        file.save(full_path)
        print(f"✅ Archivo guardado de forma segura: {full_path}")

        return jsonify({"mensaje": "Subida exitosa", "path": full_path}), 200

    except Exception as e:
        print(f"❌ Error subiendo: {e}")
        return jsonify({"error": str(e)}), 500

# ---------------------------------------------------------
# 3. ENDPOINT DE BORRADO (Delete) 🗑️
# ---------------------------------------------------------
@app.route('/delete', methods=['POST'])
@limiter.limit("3 per minute") # 👈 Súper estricto para evitar borrado accidental masivo
def delete_file():
    try:
        data = request.json
        ruta_relativa = data.get('ruta') 

        if not ruta_relativa or '..' in ruta_relativa:
            return jsonify({"error": "Ruta inválida"}), 403

        file_path = os.path.abspath(os.path.join(app.config['UPLOAD_FOLDER'], ruta_relativa))

        # Check de seguridad Path Traversal
        if not file_path.startswith(os.path.abspath(app.config['UPLOAD_FOLDER'])):
             return jsonify({"error": "Acceso denegado"}), 403

        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"✅ Archivo borrado: {file_path}")
            return jsonify({"mensaje": "Archivo eliminado"}), 200
        else:
            print(f"⚠️ Archivo no encontrado: {file_path}")
            return jsonify({"mensaje": "El archivo ya no existía"}), 200

    except Exception as e:
        print(f"❌ Error borrando: {e}")
        return jsonify({"error": str(e)}), 500

# --- ENDPOINT METADATA (YOUTUBE) ---
@app.route('/api/metadata', methods=['POST'])
def get_metadata():
    try:
        yt_url = request.json.get('url')
        ydl_opts = {
            'extract_flat': 'in_playlist', 
            'quiet': True,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(yt_url, download=False)

            entries = info.get('entries', [])
            
            # Si no es playlist
            if not entries:
                entries = [info]

            tracks = []
            for entry in entries:
                tracks.append({
                    'titulo': entry.get('title'),
                    'duracion_seg': entry.get('duration'),
                    # Formateamos la duración de segundos a MM:SS
                    'duracion_fmt': f"{int(entry.get('duration', 0)//60)}:{int(entry.get('duration', 0)%60):02d}" if entry.get('duration') else "0:00",
                    'thumbnail': entry.get('thumbnails')[0]['url'] if entry.get('thumbnails') else None,
                    'artista_sugerido': entry.get('uploader') or entry.get('channel')
                })
                
            return jsonify({
                'playlist_name': info.get('title', 'Video Individual'),
                'count': len(tracks),
                'tracks': tracks
            })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- ENDPOINT DE DESCARGA (YOUTUBE) ---
@app.route('/api/download', methods=['POST'])
@limiter.limit("2 per minute") # Mantenemos el búnker de seguridad que armamos
def download_youtube_audio():
    try:
        data = request.json
        yt_url = data.get('url')
        
        if not yt_url:
            return jsonify({"error": "Falta la URL de YouTube"}), 400

        # Configuración para extraer solo el audio y convertirlo a MP3
        ydl_opts = {
            'format': 'bestaudio/best',
            # 📂 Estructura dinámica: Carpeta Artista / Carpeta Album (o Playlist) / Canción
            'outtmpl': os.path.join(app.config['UPLOAD_FOLDER'], '%(uploader)s/%(playlist_title|Individual)s/%(title)s.%(ext)s'),
            
            'writethumbnail': True, # 👈 Descarga la imagen de portada
            'postprocessors': [
                {
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3', # O 'flac' si de verdad quieres archivos pesados
                    'preferredquality': '192',
                },
                # 🖼️ Este procesador mete la imagen dentro del MP3 (metadata)
                {'key': 'EmbedThumbnail'},
                # 📝 Este mete los tags (Artista, Título) automáticamente
                {'key': 'FFmpegMetadata'},
            ],
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            print(f"📥 Iniciando descarga: {yt_url}")
            info = ydl.extract_info(yt_url, download=True)
            # Obtenemos el nombre final del archivo (quitando la extensión original)
            base_name = ydl.prepare_filename(info).rsplit('.', 1)[0]
            filename = f"{base_name}.mp3"

        print(f"✅ Descarga completada: {filename}")
        return jsonify({
            "success": True, 
            "mensaje": "¡Rola bajada con éxito!", 
            "archivo": os.path.basename(filename)
        })

    except Exception as e:
        print(f"❌ Error en la descarga: {e}")
        return jsonify({"error": str(e)}), 500


# --- ENDPOINT DE DESCARGA MASIVA (HIGH-FIDELITY) ---
@app.route('/api/download_playlist', methods=['POST'])
@limiter.limit("1 per minute")
def download_playlist_fidelity():
    try:
        data = request.json
        # Extraemos todo lo que mandó el JS
        artista_id = data.get('artista_id')
        artista_nom = data.get('artista_nombre')
        album_tit = data.get('album_titulo')
        album_year = data.get('album_year')
        genero_id = data.get('genero_id')
        img_url = data.get('imagen_url')
        tracks = data.get('tracks', [])

        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': os.path.join(app.config['UPLOAD_FOLDER'], f'{artista_nom}/{album_tit}/%(title)s.%(ext)s'),
            'postprocessors': [
                {'key': 'FFmpegExtractAudio', 'preferredcodec': 'mp3', 'preferredquality': '320'},
                {'key': 'EmbedThumbnail'},      
                {'key': 'FFmpegMetadata'},       
            ],
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([data.get('url')])

        # 🚀 PASO SUPABASE: Insertar Álbum y Canciones
        # 1. Crear el Álbum
        album_entry = {
            "titulo_album": album_tit,
            "artista_id": artista_id,
            "fecha_lanzamiento": f"{album_year}-01-01",
            "imagen_url": img_url,
            "tipo_lanzamiento": "ALBUM"
        }
        res_alb = supabase.table('album').upsert(album_entry).execute()
        new_album_id = res_alb.data[0]['id_album']

        # 2. Insertar Canciones una por una
        for i, track in enumerate(tracks):
            # Sanitizamos el título para evitar problemas en la URL
            clean_title = track['titulo'].replace(" ", "_") # Opcional: mantener consistencia
            
            # 🎯 IMPORTANTE: Si yt-dlp baja el archivo con un nombre y tú guardas otro 
            # en la BD, no va a sonar. 
            audio_url = f"http://localhost:3000/musica/{artista_nom}/{album_tit}/{track['titulo']}.mp3"
            
            cancion_entry = {
                "titulo_cancion": track['titulo'],
                "artista_id": artista_id,
                "album_id": new_album_id,
                "audio_path": audio_url,
                "numero_track": i + 1,
                "imagen_url": img_url,
                "reproducciones": 0
            }
            supabase.table('canciones').insert(cancion_entry).execute()

        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
# ---------------------------------------------------------
# INICIO DEL SERVIDOR 🚀
# ---------------------------------------------------------
if __name__ == '__main__':
    # Puerto 3000 para producción blindada
    app.run(host='0.0.0.0', debug=True, port=3000)