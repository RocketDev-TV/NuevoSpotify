import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import spotipy
from spotipy.oauth2 import SpotifyOAuth

# --- CONFIGURACIÓN DE CLAVES ---
try:
    # Intenta importar del archivo de configuración (Asegúrate de tener tus nuevas claves aquí)
    from configApiSpotify import CLIENT_ID, CLIENT_SECRET
except ImportError:
    CLIENT_ID = '7fa0175dc0ee49bda077b8c1acbd8e1e'
    CLIENT_SECRET = 'c4dc0a79b36e406c9b6258e70171bc38'

# La REDIRECT_URI debe coincidir exactamente con la del Dashboard
REDIRECT_URI = "http://127.0.0.1:8888/callback"

# Scopes necesarios para leer tus playlists y confirmar tu correo
SCOPE = "playlist-read-private playlist-read-collaborative user-library-read user-read-email"

app = Flask(__name__)
CORS(app)

# --- 🔐 AUTENTICACIÓN REFORZADA MODO DESARROLLO ---
sp = None
try:
    auth_manager = SpotifyOAuth(
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET,
        redirect_uri=REDIRECT_URI,
        scope=SCOPE,
        open_browser=True,
        show_dialog=True,  # Obliga a mostrar la pantalla de login
        cache_path=".cache-nuevo-spotify-prod" # Archivo de caché limpio
    )
    
    sp = spotipy.Spotify(auth_manager=auth_manager)
    print("✅ MODO JEFE: Esperando validación en navegador...")
    
except Exception as e:
    print(f"❌ Error Auth: {e}")

# --- FUNCIONES DE APOYO ---
def ms_to_fmt(ms):
    """Convierte milisegundos a formato Minutos:Segundos"""
    if not ms: return "0:00"
    seconds = int((ms / 1000) % 60)
    minutes = int((ms / (1000 * 60)) % 60)
    return f"{minutes}:{seconds:02d}"

def extract_spotify_id(url, type_):
    """Extrae el ID de la URL de Spotify"""
    try:
        if '?' in url: url = url.split('?')[0]
        parts = url.split('/')
        if type_ in parts:
            return parts[parts.index(type_) + 1].strip()
        return parts[-1].strip()
    except: return None

# --- RUTA PARA ANALIZAR LINKS ---
@app.route('/api/spotify/analyze', methods=['POST'])
def analyze_spotify_link():
    data = request.json
    link = data.get('link')
    if not link: return jsonify({'error': 'Falta el link'}), 400

    print(f"🕵️‍♂️ Analizando: {link}")

    if not sp:
        return jsonify({'error': 'Error de autenticación en el servidor'}), 500

    try:
        results = []
        
        # --- CASO: PLAYLIST ---
        if 'playlist' in link:
            pl_id = extract_spotify_id(link, 'playlist')
            
            # Intento inicial con filtro de mercado para México
            playlist_data = sp.playlist(pl_id, market='from_token')
            print(f"✅ Playlist detectada: {playlist_data.get('name')}")

            tracks_obj = playlist_data.get('tracks', {})
            raw_tracks = tracks_obj.get('items', [])

            # Si falla la carga inicial, aplicamos MODO RUDO (Sin market)
            if not raw_tracks:
                print("⚠️ Intentando descarga alternativa...")
                try:
                    items_resp = sp.playlist_items(pl_id, market='from_token')
                    raw_tracks = items_resp.get('items', [])
                except Exception:
                    print("👉 Activando MODO RUDO (Sin filtro de región)...")
                    items_resp = sp.playlist_items(pl_id)
                    raw_tracks = items_resp.get('items', [])

            # Procesamiento de la información para el frontend
            for item in raw_tracks:
                track = item.get('track')
                if not track: continue
                
                album = track.get('album', {})
                images = album.get('images', [])
                
                results.append({
                    'spotify_id': track.get('id'),
                    'titulo': track.get('name'),
                    'artista': track.get('artists')[0]['name'] if track.get('artists') else 'Desconocido',
                    'album': album.get('name', 'Desconocido'),
                    'duracion_fmt': ms_to_fmt(track.get('duration_ms', 0)),
                    'cover_url': images[0]['url'] if images else ''
                })

            print(f"📊 Procesando {len(results)} canciones...")

        return jsonify({'success': True, 'count': len(results), 'tracks': results})

    except Exception as e:
        print(f"🔥 Error Servidor: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("🚀 Servidor 'Modo Jefe' (Final) corriendo en http://localhost:3001")
    app.run(port=3001, debug=True)