// js/registro.js

// 1. Conexión a Supabase (usando config.js)
const _supabase = conectarSupabase();

// 2. Referencias del DOM
const usernameInput = document.getElementById('usernameInput');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const confirmInput = document.getElementById('confirmPasswordInput');
const btnRegistrar = document.getElementById('btnRegistrar');

// Referencias para la validación visual (Lista de requisitos)
const reqLength = document.getElementById('req-length');
const reqUpper = document.getElementById('req-upper');
const reqNumber = document.getElementById('req-number');
const reqSymbol = document.getElementById('req-symbol');
const requirementsBox = document.querySelector('.password-requirements');

// --- 3. ACTIVAR LOS OJITOS (La magia de utils.js) --- 👁️
activarOjito('passwordInput', 'togglePass1');
activarOjito('confirmPasswordInput', 'togglePass2');

// --- 4. VALIDACIÓN EN TIEMPO REAL (UX Pro) ---
passwordInput.addEventListener('input', (e) => {
    const pass = e.target.value;
    
    // Mostrar la cajita de requisitos si escriben
    if(pass.length > 0) requirementsBox.style.display = 'block';
    else requirementsBox.style.display = 'none';

    // Validar Longitud (8 chars)
    actualizarRequisito(reqLength, pass.length >= 8);
    // Validar Mayúscula
    actualizarRequisito(reqUpper, /[A-Z]/.test(pass));
    // Validar Número
    actualizarRequisito(reqNumber, /\d/.test(pass));
    // Validar Símbolo
    actualizarRequisito(reqSymbol, /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass));
});

// Helper para pintar verde/gris los requisitos
function actualizarRequisito(elemento, esValido) {
    if (esValido) {
        elemento.classList.add('valid');
        elemento.classList.remove('invalid');
    } else {
        elemento.classList.add('invalid');
        elemento.classList.remove('valid');
    }
}

// --- 5. LÓGICA DE REGISTRO ---
btnRegistrar.addEventListener('click', async () => {
    const username = usernameInput.value;
    const email = emailInput.value;
    const password = passwordInput.value;
    const confirmPass = confirmInput.value;

    // Validaciones básicas
    if(!email || !password || !username) {
        mostrarNotificacion("Por favor llena todos los campos, carnal.", "error");
        return;
    }

    if(password !== confirmPass) {
        mostrarNotificacion("Las contraseñas no coinciden.", "error");
        vibrarElemento('confirmPasswordInput'); // Usamos utils.js para vibrar
        return;
    }

    if(!esContrasenaSegura(password)) {
        mostrarNotificacion("La contraseña no cumple con los requisitos de seguridad.");
        vibrarElemento('passwordInput');
        return;
    }

    // Animación de carga
    const textoOriginal = btnRegistrar.textContent;
    btnRegistrar.textContent = "Creando cuenta...";
    btnRegistrar.disabled = true;

    try {
        // Registro en Supabase
        const { data, error } = await _supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                // Guardamos el nombre de usuario como metadata
                data: {
                    username: username,
                    full_name: username // Opcional, por si Google lo pide así
                }
            }
        });

        if (error) throw error;

        mostrarNotificacion("¡Bienvenido al club! Revisa tu correo para confirmar tu cuenta.");
        window.location.href = "../index.html"; // Regresar al login

    } catch (error) {
        console.error(error);
        mostrarNotificacion("Error: " + error.message);
    } finally {
        btnRegistrar.textContent = textoOriginal;
        btnRegistrar.disabled = false;
    }
});