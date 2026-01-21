// js/config.js

// 1. Tus Credenciales Maestras (Aquí pegas las reales una sola vez)
const SUPABASE_URL = 'https://ufrnahnicbqizcfahdqi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ZAjNBGZJF1H20qjUZL2MIw_CWjZcs2L';

// 2. Función para conectar (Evita el error de "supabase already declared")
function conectarSupabase() {
    // Verificamos que la librería de Supabase se haya cargado en el HTML
    if (typeof supabase === 'undefined') {
        console.error('CRÍTICO: La librería de Supabase no está en el HTML.');
        return null;
    }
    
    // Creamos y retornamos la instancia del cliente
    return supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}