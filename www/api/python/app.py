from flask import Flask, jsonify, request
from supabase import create_client, Client
import pandas as pd
from flask_cors import CORS
import os
import config

app = Flask(__name__)
CORS(app)

print("📢 --- SISTEMA REINICIADO: VERSIÓN CON DELETE --- 📢") # <--- Agrega esto

# --- CONFIGURACIÓN VITAL ---
# Definimos la carpeta donde se guarda la música
app.config['UPLOAD_FOLDER'] = 'storage_musica' 

# Conexión a Supabase
supabase: Client = create_client(config.SUPABASE_URL, config.SUPABASE_KEY)

# ---------------------------------------------------------
# 1. ENDPOINT DE GRÁFICAS (Growth) 📈
# ---------------------------------------------------------
@app.route('/api/growth', methods=['GET'])
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
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400
        
        file = request.files['file']
        ruta_relativa = request.form.get('ruta') # Ej: "zoe/memo_rex/cancion.mp3"

        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400
        if not ruta_relativa:
            return jsonify({"error": "Falta la ruta destino"}), 400

        # Construir ruta absoluta
        full_path = os.path.join(app.config['UPLOAD_FOLDER'], ruta_relativa)

        # Crear carpetas si no existen
        os.makedirs(os.path.dirname(full_path), exist_ok=True)

        file.save(full_path)
        print(f"✅ Archivo guardado: {full_path}")

        return jsonify({"mensaje": "Subida exitosa", "path": full_path}), 200

    except Exception as e:
        print(f"❌ Error subiendo: {e}")
        return jsonify({"error": str(e)}), 500

# ---------------------------------------------------------
# 3. ENDPOINT DE BORRADO (Delete) 🗑️
# ---------------------------------------------------------
@app.route('/delete', methods=['POST'])
def delete_file():
    try:
        data = request.json
        ruta_relativa = data.get('ruta') 

        if not ruta_relativa:
            return jsonify({"error": "Falta la ruta"}), 400

        file_path = os.path.join(app.config['UPLOAD_FOLDER'], ruta_relativa) 

        # Seguridad básica
        if '..' in ruta_relativa:
             return jsonify({"error": "Ruta inválida"}), 403

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

# ---------------------------------------------------------
# INICIO DEL SERVIDOR 🚀
# ---------------------------------------------------------
if __name__ == '__main__':
    # Escucha en todas las interfaces (0.0.0.0) puerto 3000
    app.run(host='0.0.0.0', debug=True, port=3000)