import os
import pandas as pd
import config
import yt_dlp
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask import send_from_directory
from supabase import create_client, Client
from mutagen.mp3 import MP3
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
                    # 🔗 Generamos la URL completa usando el ID del video
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
        artista_id = data.get('artista_id')
        artista_nom = data.get('artista_nombre')
        album_tit = data.get('album_titulo')
        album_year = data.get('album_year')
        img_url = data.get('imagen_url') 
        tracks = data.get('tracks', []) # Aquí necesitamos que cada track traiga su 'url_video'

        # 1. Crear/Upsert del Álbum
        album_entry = {
            "titulo_album": album_tit,
            "artista_id": artista_id,
            "fecha_lanzamiento": f"{album_year}-01-01",
            "imagen_url": img_url,
            "num_canciones": len(tracks),
            "tipo_lanzamiento": "ALBUM"
        }
        res_alb = supabase.table('album').upsert(album_entry).execute()
        new_album_id = res_alb.data[0]['id_album']

        total_segundos_album = 0 

        # 2. Bucle ÚNICO de descarga y registro
        for i, track in enumerate(tracks):
            titulo_editado = track.get('titulo', 'Sin Titulo')
            video_url = track.get('url_video') # # Asegúrate de mandarlo desde el JS
            
            if not video_url:
                print(f"⚠️ Saltando {titulo_editado} porque no tiene URL")
                continue # Pasa a la siguiente rola en lugar de tronar
            
            # Configuración para descargar esta canción específica con SU nombre editado
            ydl_opts_individual = {
                'format': 'bestaudio/best',
                'outtmpl': os.path.join(app.config['UPLOAD_FOLDER'], f'{artista_nom}/{album_tit}/{titulo_editado}.%(ext)s'),
                'postprocessors': [
                    {'key': 'FFmpegExtractAudio', 'preferredcodec': 'mp3', 'preferredquality': '320'},
                    {'key': 'EmbedThumbnail'},      
                    {'key': 'FFmpegMetadata'},       
                ],
                'quiet': True
            }

            with yt_dlp.YoutubeDL(ydl_opts_individual) as ydl:
                print(f"📥 Bajando rola {i+1}/{len(tracks)}: {titulo_editado}")
                ydl.download([video_url]) # Descarga solo ese video

            # 3. Medir y Registrar
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{artista_nom}/{album_tit}/{titulo_editado}.mp3")
            duracion_decimal = 0.0 
            
            try:
                audio = MP3(file_path)
                duracion_decimal = round(audio.info.length / 60, 2)
                total_segundos_album += audio.info.length
            except Exception as e:
                print(f"⚠️ Error midiendo {file_path}: {e}")

            supabase.table('canciones').insert({
                "titulo_cancion": titulo_editado,
                "artista_id": artista_id,
                "album_id": new_album_id,
                "audio_path": f"http://localhost:3000/musica/{artista_nom}/{album_tit}/{titulo_editado}.mp3",
                "numero_track": i + 1,
                "imagen_url": img_url,
                "duracion_cancion": duracion_decimal,
                "reproducciones": 0
            }).execute()

        # 4. Actualizar Duración del Álbum
        duracion_final_album = round(total_segundos_album / 60, 2)
        supabase.table('album').update({
            "duracion_album": duracion_final_album 
        }).eq('id_album', new_album_id).execute()

        return jsonify({"success": True, "mensaje": f"Álbum {album_tit} listo."})

    except Exception as e:
        print(f"❌ Error masivo: {e}")
        return jsonify({"error": str(e)}), 500

# --- ENDPOINT PARA DESCARGA INDIVIDUAL (Soporta barra de progreso) ---
@app.route('/api/download_single', methods=['POST'])
@limiter.limit("10 per minute")
def download_single_track():
    try:
        data = request.json
        track = data.get('track')
        artista_id = data.get('artista_id')
        artista_nom = data.get('artista_nombre')
        album_tit = data.get('album_titulo')
        album_year = data.get('album_year')
        img_url = data.get('imagen_url')
        index = data.get('index')
        total = data.get('total')
        album_id = data.get('new_album_id')

        # 1. Crear o recuperar el álbum (Solo si no tenemos el ID aún)
        if not album_id:
            album_entry = {
                "titulo_album": album_tit,
                "artista_id": artista_id,
                "fecha_lanzamiento": f"{album_year}-01-01",
                "imagen_url": img_url,
                "num_canciones": total,
                "tipo_lanzamiento": "ALBUM"
            }
            res_alb = supabase.table('album').upsert(album_entry).execute()
            album_id = res_alb.data[0]['id_album']

        # 2. Descargar la rola específica
        titulo = track.get('titulo')
        url_video = track.get('url_video')
        
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': os.path.join(app.config['UPLOAD_FOLDER'], f'{artista_nom}/{album_tit}/{titulo}.%(ext)s'),
            'postprocessors': [{'key': 'FFmpegExtractAudio', 'preferredcodec': 'mp3', 'preferredquality': '320'}],
            'quiet': True
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url_video])

        # 3. Medir duración
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{artista_nom}/{album_tit}/{titulo}.mp3")
        audio = MP3(file_path)
        duracion_decimal = round(audio.info.length / 60, 2)

        # 4. Insertar canción
        supabase.table('canciones').insert({
            "titulo_cancion": titulo,
            "artista_id": artista_id,
            "album_id": album_id,
            "audio_path": f"http://localhost:3000/musica/{artista_nom}/{album_tit}/{titulo}.mp3",
            "numero_track": index,
            "imagen_url": img_url,
            "duracion_cancion": duracion_decimal,
            "reproducciones": 0
        }).execute()

        # 5. Si es la última canción, calculamos la duración total del álbum
        if index == total:
            canciones = supabase.table('canciones').select("duracion_cancion").eq('album_id', album_id).execute()
            suma_duracion = sum([c['duracion_cancion'] for c in canciones.data])
            supabase.table('album').update({"duracion_album": round(suma_duracion, 2)}).eq('id_album', album_id).execute()

        return jsonify({"success": True, "album_id": album_id})

    except Exception as e:
        print(f"❌ Error en track {data.get('index')}: {e}")
        return jsonify({"error": str(e)}), 500
# ---------------------------------------------------------
# INICIO DEL SERVIDOR 🚀
# ---------------------------------------------------------
if __name__ == '__main__':
    # Puerto 3000 para producción blindada
    app.run(host='0.0.0.0', debug=True, port=3000)