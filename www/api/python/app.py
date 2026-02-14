import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from supabase import create_client, Client
import pandas as pd
import config

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

# ---------------------------------------------------------
# INICIO DEL SERVIDOR 🚀
# ---------------------------------------------------------
if __name__ == '__main__':
    # Puerto 3000 para producción blindada
    app.run(host='0.0.0.0', debug=True, port=3000)