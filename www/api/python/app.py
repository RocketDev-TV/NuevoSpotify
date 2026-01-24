from flask import Flask, jsonify
from supabase import create_client, Client
import pandas as pd
from flask_cors import CORS
import os

import config

app = Flask(__name__)
# para que cualquier puerto acceda a la api
CORS(app) 

# --- CONFIGURACIÓN SUPABASE ---
supabase: Client = create_client(config.SUPABASE_URL, config.SUPABASE_KEY)

@app.route('/api/growth', methods=['GET'])
def get_user_growth():
    try:
        # 1. Traer datos de la tabla 'usuarios'
        # Seleccionamos solo la fecha de creación (created_at)
        # NOTA: Asegúrate de que tu tabla 'usuarios' tenga columna 'created_at'. 
        # Si no la tiene, Supabase la pone por defecto al crear tablas, checa el nombre exacto.
        response = supabase.table('usuarios').select("created_at").execute()
        data = response.data

        if not data:
            return jsonify({"labels": [], "data": []})

        # 2. PANDAS AL RESCATE 🐼
        df = pd.DataFrame(data)
        
        # Convertimos la columna a formato fecha real
        df['created_at'] = pd.to_datetime(df['created_at'])
        
        # Le quitamos la hora, dejamos solo la fecha (YYYY-MM-DD)
        df['fecha'] = df['created_at'].dt.date
        
        # Agrupamos por fecha y contamos cuántos registros hay por día
        conteo_diario = df.groupby('fecha').size().reset_index(name='nuevos_usuarios')
        
        # (Opcional) Rellenar días vacíos si quieres una línea continua perfecta
        # Pero por ahora lo dejamos simple.

        # 3. Preparar JSON para Chart.js
        # Convertimos las fechas a string para que JS las entienda
        labels = conteo_diario['fecha'].astype(str).tolist()
        values = conteo_diario['nuevos_usuarios'].tolist()

        return jsonify({
            "labels": labels, # Eje X: ["2026-01-20", "2026-01-21", ...]
            "data": values    # Eje Y: [5, 12, ...]
        })

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Corre en el puerto 5000
    app.run(debug=True, port=5000)