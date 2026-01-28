// Js/admin-dashboard.js

// 1. INICIALIZACIÓN GENERAL
document.addEventListener('DOMContentLoaded', () => {
    console.log("👋 Admin Dashboard cargado");
    
    // Iniciar el reloj y la fecha del header
    actualizarReloj();
    setInterval(actualizarReloj, 60000); 

    // Si existe la función de Analytics, la iniciamos
    if (typeof iniciarAnalytics === 'function') {
        iniciarAnalytics();
    }
});

// 2. LÓGICA DEL RELOJ Y FECHA
function actualizarReloj() {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const clockEl = document.getElementById('clockTime');
    if(clockEl) clockEl.textContent = timeString;

    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = now.toLocaleDateString('es-ES', dateOptions);
    
    const dateEl = document.getElementById('fullDateDisplay');
    if(dateEl) {
        dateEl.textContent = dateString.charAt(0).toUpperCase() + dateString.slice(1);
    }
}

// 3. SISTEMA DE NAVEGACIÓN (SIN la palabra 'export') 🚫
function cambiarVista(vista) {
    // Ocultar todas las secciones
    const secciones = document.querySelectorAll('.view-section');
    secciones.forEach(sec => sec.style.display = 'none');

    // Quitar active de los botones
    const botones = document.querySelectorAll('.menu-btn');
    botones.forEach(btn => btn.classList.remove('active'));

    // Mostrar sección actual
    const seccionActiva = document.getElementById(`view-${vista}`);
    if (seccionActiva) seccionActiva.style.display = 'block';

    // Activar botón
    // Nota: Busca el botón que tenga el onclick correspondiente
    const botonActivo = document.querySelector(`button[onclick="cambiarVista('${vista}')"]`);
    if (botonActivo) botonActivo.classList.add('active');
}

// 4. LOGOUT
const btnLogout = document.getElementById('btnLogout');
if(btnLogout) {
    btnLogout.addEventListener('click', () => {
        if(window._supabase) {
            window._supabase.auth.signOut().then(() => {
                window.location.href = '../index.html'; 
            });
        } else {
            window.location.href = '../index.html';
        }
    });
}

window.cambiarVista = cambiarVista;