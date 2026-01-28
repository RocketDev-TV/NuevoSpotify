// JS/config.js
console.log("🔌 Intentando cargar Configuración...");

const SUPABASE_URL = 'https://ufrnahnicbqizcfahdqi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ZAjNBGZJF1H20qjUZL2MIw_CWjZcs2L';

// Validación básica
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ ERROR: Faltan credenciales en config.js");
}

let clientInstance = null;

if (typeof supabase === 'undefined') {
    console.error("❌ ERROR CRÍTICO: La librería de Supabase no cargó desde el HTML.");
} else {
    clientInstance = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // Guardamos en window por si acaso (para debuggear en consola)
    window._supabase = clientInstance;
    
    console.log("✅ Supabase conectado y exportado.");
}

export const client = clientInstance;