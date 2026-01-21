// js/utils.js

/**
 * 1. FUNCIÓN MAESTRA DEL OJITO 👁️
 * Convierte cualquier par de (Input + Icono) en un toggle de contraseña.
 * @param {string} inputId - El ID del campo de contraseña (ej: 'passwordInput')
 * @param {string} iconId - El ID del icono del ojo (ej: 'togglePass1')
 */
function activarOjito(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);

    // Si no existen en el HTML, no hacemos nada para evitar errores
    if (!input || !icon) return;

    icon.addEventListener('click', () => {
        // Si es password lo volvemos texto, si es texto lo volvemos password
        const tipoActual = input.getAttribute('type');
        const nuevoTipo = tipoActual === 'password' ? 'text' : 'password';
        
        input.setAttribute('type', nuevoTipo);

        // Cambiamos el icono (relleno vs tachado)
        icon.classList.toggle('bi-eye');
        icon.classList.toggle('bi-eye-slash');
    });
}

/**
 * 2. VALIDACIÓN DE CONTRASEÑA GLOBAL 🔒
 * Regresa true si cumple con: 8 chars, 1 Mayus, 1 Num, 1 Simbolo
 */
function esContrasenaSegura(password) {
    const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    return regex.test(password);
}

/**
 * 3. ANIMACIÓN DE ERROR (SHAKE) 🫨
 * Hace vibrar un botón o input para indicar error visualmente.
 */
function vibrarElemento(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.classList.add('shake'); // Asegúrate de tener la clase .shake en tu CSS
        setTimeout(() => el.classList.remove('shake'), 500);
    }
}

/**
 * 4. SISTEMA DE NOTIFICACIONES (SweetAlert2)
 * @param {string} mensaje - El texto a mostrar
 * @param {string} tipo - 'success' (verde), 'error' (rojo), 'warning' (amarillo)
 */
function mostrarNotificacion(mensaje, tipo = 'error') {
    // Definimos colores según el tipo
    let titulo = '';
    let confirmBtnColor = '#03624C'; // Tu verde Bangladesh

    if (tipo === 'success') {
        titulo = '¡Excelente!';
    } else if (tipo === 'error') {
        titulo = '¡Ups!';
        confirmBtnColor = '#e74c3c'; // Rojo para errores
    } else {
        titulo = 'Atención';
    }

    Swal.fire({
        title: titulo,
        text: mensaje,
        icon: tipo,
        confirmButtonText: 'Entendido',
        confirmButtonColor: confirmBtnColor,
        background: '#ffffff', // Fondo blanco como tus tarjetas
        color: '#032221',      // Texto oscuro (Dark Green)
        borderRadius: '20px',
        customClass: {
            popup: 'mis-alertas-pro' // Por si queremos meterle CSS extra luego
        }
    });
}