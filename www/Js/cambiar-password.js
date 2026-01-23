// js/cambiar-password.js

const _supabase = conectarSupabase();
const btnGuardar = document.getElementById('btnGuardar');
const pass1 = document.getElementById('newPassword');
const pass2 = document.getElementById('confirmPassword');
const container = document.getElementById('mainContainer');

// Referencias de validación visual
const reqLength = document.getElementById('req-length');
const reqUpper = document.getElementById('req-upper');
const reqNumber = document.getElementById('req-number');
const reqSymbol = document.getElementById('req-symbol');

// 1. SEGURIDAD:
async function verificarPermiso() {
    const { data: { session } } = await _supabase.auth.getSession();

    if (!session) {
        window.location.replace("../index.html");
    } else {
        container.style.display = 'flex'; // Mostramos la tarjeta
        console.log("Acceso autorizado.");
    }
}
verificarPermiso();

// 2. ACTIVAR OJITOS 👁️
activarOjito('newPassword', 'toggle1');
activarOjito('confirmPassword', 'toggle2');

// 3. VALIDACIÓN EN TIEMPO REAL (El semáforo) 🚦
pass1.addEventListener('input', (e) => {
    const val = e.target.value;
    
    // Función helper para cambiar clases
    const setValid = (el, isValid) => {
        if(isValid) {
            el.classList.add('valid');
            el.classList.remove('invalid');
        } else {
            el.classList.add('invalid');
            el.classList.remove('valid');
        }
    };

    setValid(reqLength, val.length >= 8);
    setValid(reqUpper, /[A-Z]/.test(val));
    setValid(reqNumber, /\d/.test(val));
    setValid(reqSymbol, /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(val));
});

// 4. Lógica de Envío
document.getElementById('updateForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const newPass = pass1.value;
    const confirmPass = pass2.value;

    // A. ¿Coinciden?
    if (newPass !== confirmPass) {
        mostrarNotificacion("Las contraseñas no coinciden.", "error");
        vibrarElemento('confirmPassword');
        return;
    }

    // B. ¿Es segura? (Reutilizamos tu función utils o validamos manual aquí)
    // Regex completo para asegurar que cumpla TODO antes de enviar
    const esSegura = newPass.length >= 8 && 
                     /[A-Z]/.test(newPass) && 
                     /\d/.test(newPass) && 
                     /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPass);

    if (!esSegura) {
        mostrarNotificacion("Tu contraseña es débil. Revisa los requisitos en rojo.", "error");
        vibrarElemento('newPassword');
        return;
    }

    // UI Loading
    const textoOriginal = btnGuardar.textContent;
    btnGuardar.textContent = "Actualizando...";
    btnGuardar.disabled = true;

    try {
        const { data, error } = await _supabase.auth.updateUser({
            password: newPass
        });

        if (error) throw error;

        // Éxito
        await Swal.fire({
            icon: 'success',
            title: '¡Listo!',
            text: 'Tu contraseña se actualizó correctamente.',
            confirmButtonColor: '#03624C',
            background: '#ffffff',
            customClass: { popup: 'swal-popup-pro' }
        });

        await _supabase.auth.signOut();
        window.location.replace("../index.html");

    } catch (error) {
        console.error(error);
        mostrarNotificacion("Error al actualizar: " + error.message, "error");
    } finally {
        btnGuardar.textContent = textoOriginal;
        btnGuardar.disabled = false;
    }
});