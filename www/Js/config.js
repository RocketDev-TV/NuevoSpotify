// js/config.js

console.log("🔌 Intentando cargar Configuración...");

// 1. TUS CREDENCIALES (Asegúrate que NO estén vacías)
const SUPABASE_URL = 'https://ufrnahnicbqizcfahdqi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ZAjNBGZJF1H20qjUZL2MIw_CWjZcs2L';

// 2. Validación de Seguridad
if (!SUPABASE_URL || !SUPABASE_KEY || SUPABASE_URL === '' || SUPABASE_KEY === '') {
    console.error("❌ ERROR CRÍTICO: Las credenciales de Supabase están vacías en config.js");
    alert("Error: Faltan las llaves de Supabase en config.js");
}

// 3. Validación de Librería
if (typeof supabase === 'undefined') {
    console.error("❌ ERROR CRÍTICO: La librería de Supabase no cargó (CDN caído o bloqueado).");
} else {
    try {
        // 4. Crear Cliente y Pegarlo a la Ventana
        const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        window._supabase = client;
        console.log("✅ Supabase conectado y listo en window._supabase");
    } catch (error) {
        console.error("❌ ERROR al conectar Supabase:", error);
    }
}