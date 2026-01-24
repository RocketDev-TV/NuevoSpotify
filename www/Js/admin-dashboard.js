// js/admin-dashboard.js

// Referencias globales
const btnLogout = document.getElementById('btnLogout');
const adminNameSpan = document.getElementById('adminName');
const fullDateDisplay = document.getElementById('fullDateDisplay');
const clockTimeDisplay = document.getElementById('clockTime');

// Conexión
const _supabase = conectarSupabase();

// --- PUNTO DE ENTRADA PRINCIPAL ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Seguridad (Esperamos a que verifique)
    await verificarAdmin();
    
    // 2. Una vez verificado, arrancamos los módulos hijos
    // El "?" es por seguridad, por si el archivo no cargó
    if(typeof iniciarAnalytics === 'function') {
        iniciarAnalytics(); 
    } else {
        console.error("Falta analytics.js");
    }

    if(typeof iniciarMusicManager === 'function') {
        iniciarMusicManager();
    }
    
    // 3. Reloj Global
    actualizarReloj();
    setInterval(actualizarReloj, 1000);
});

// --- A. SEGURIDAD: ¿Eres Admin? 🕵️‍♂️ ---
async function verificarAdmin() {
    // 1. Checar sesión
    const { data: { session } } = await _supabase.auth.getSession();

    if (!session) {
        window.location.href = "../index.html"; 
        return;
    }

    // 2. Checar ROL y NOMBRE
    const { data: userData, error } = await _supabase
        .from('usuarios')
        .select('rol, nombre, apellido_paterno') 
        .eq('uid', session.user.id)
        .single();

    if (error || userData.rol !== 'admin') {
        console.warn("Acceso denegado: Usuario no es admin.");
        window.location.href = "reproductor.html"; 
        return;
    }

    // 3. Mostrar Nombre
    if (userData.nombre) {
        const nombreCompleto = `${userData.nombre} ${userData.apellido_paterno || ''}`; 
        adminNameSpan.textContent = nombreCompleto;
    } else {
        const email = session.user.email;
        adminNameSpan.textContent = email.split('@')[0];
    }
    
    // ❌ AQUÍ ESTABA EL ERROR: cargarDatosDashboard();
    // Ya no la llamamos aquí. Se llama sola dentro de iniciarAnalytics().
}

// --- B. RELOJ ---
function actualizarReloj() {
    const ahora = new Date();
    const horas = String(ahora.getHours()).padStart(2, '0');
    const minutos = String(ahora.getMinutes()).padStart(2, '0');
    
    if(clockTimeDisplay) clockTimeDisplay.innerText = `${horas}:${minutos}`;

    const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const fechaTexto = ahora.toLocaleDateString('es-ES', opciones);
    
    if(fullDateDisplay) fullDateDisplay.innerText = fechaTexto.charAt(0).toUpperCase() + fechaTexto.slice(1);
}

// --- E. LOGOUT ---
if(btnLogout) {
    btnLogout.addEventListener('click', async (e) => {
        e.preventDefault();
        await _supabase.auth.signOut();
        window.location.href = "../index.html";
    });
}