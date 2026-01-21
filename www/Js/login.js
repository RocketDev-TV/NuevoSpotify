// --- 1. CONEXIÓN A SUPABASE ---
// Como ya tenemos config.js, solo mandamos llamar a la función que creamos allá.
// Esto nos devuelve el cliente "_supabase" listo para usar.
const _supabase = conectarSupabase();

// Verificamos por si las dudas (ayuda a depurar si falta el script en el HTML)
if (!_supabase) {
    console.error("❌ Error: No se pudo conectar a Supabase. Revisa que config.js esté cargado en el HTML.");
    mostrarNotificacion("Error de sistema: No hay conexión con la base de datos.");
}

// --- 2. REFERENCIAS DEL DOM (Elementos de la pantalla) ---
const formTitle = document.querySelector('.header-text h1');
const toggleText = document.querySelector('.header-text p');
const emailInput = document.querySelector('input[type="email"]');
const passwordInput = document.querySelector('input[type="password"]');
const mainActionBtn = document.querySelector('.btn-login');
const googleBtn = document.querySelector('.social-btn.google');
const forgotLink = document.querySelector('.forgot-link');
const showPassBtn = document.querySelector('.toggle-password');

// Activar el ojito
activarOjito('passwordLogin', 'toggleLogin');

// --- MANEJO DE ERRORES VISUALES ---
// Buscamos o creamos el div de error dinámicamente
let errorDiv = document.querySelector('#error-message-box');
if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.id = 'error-message-box';
    errorDiv.style.color = '#e74c3c';
    errorDiv.style.fontSize = '13px';
    errorDiv.style.textAlign = 'center';
    errorDiv.style.marginBottom = '15px';
    errorDiv.style.display = 'none';
    
    // Insertamos el error antes del link de "olvidaste contraseña"
    const form = document.querySelector('.login-form');
    if(form) form.insertBefore(errorDiv, forgotLink);
}

// Estado: true = Login, false = Registro
let isLoginMode = true;

// --- 3. FUNCIONES DE SEGURIDAD ---

function esContrasenaSegura(password) {
    // Regex: 8 chars, 1 Mayus, 1 Num, 1 Simbolo
    const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    return regex.test(password);
}

function mostrarError(mensaje) {
    if(errorDiv) {
        errorDiv.textContent = mensaje;
        errorDiv.style.display = 'block';
    } else {
        mostrarNotificacion(mensaje); // Fallback por si no carga el DOM
    }
    
    if(mainActionBtn) {
        mainActionBtn.classList.add('shake');
        setTimeout(() => mainActionBtn.classList.remove('shake'), 500);
    }
}

// --- 4. LÓGICA DE INTERFAZ (Toggle Login/Registro) ---
function toggleMode(e) {
    if(e) e.preventDefault();
    isLoginMode = !isLoginMode;
    if(errorDiv) errorDiv.style.display = 'none';

    if (isLoginMode) {
        formTitle.textContent = "Iniciar Sesión";
        toggleText.innerHTML = '¿Nuevo usuario? <a href="#" id="toggleBtn">Crear cuenta</a>';
        mainActionBtn.textContent = "Entrar";
        if(forgotLink) forgotLink.style.display = 'block';
    } else {
        formTitle.textContent = "Crear Cuenta";
        toggleText.innerHTML = '¿Ya tienes cuenta? <a href="#" id="toggleBtn">Inicia sesión</a>';
        mainActionBtn.textContent = "Registrarse";
        if(forgotLink) forgotLink.style.display = 'none';
    }
    
    const newToggleBtn = document.getElementById('toggleBtn');
    if(newToggleBtn) newToggleBtn.addEventListener('click', toggleMode);
}

// Inicializar el link de toggle
const linkToggle = toggleText ? toggleText.querySelector('a') : null;
if(linkToggle) {
    linkToggle.id = 'toggleBtn';
    linkToggle.addEventListener('click', toggleMode);
}

// Ver/Ocultar contraseña
if(showPassBtn && passwordInput){
    showPassBtn.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        showPassBtn.classList.toggle('bi-eye');
        showPassBtn.classList.toggle('bi-eye-slash');
    });
}

// --- 5. LÓGICA PRINCIPAL (LOGIN / SIGNUP) ---
if(mainActionBtn){
    mainActionBtn.addEventListener('click', async () => {
        const email = emailInput.value;
        const password = passwordInput.value;
        
        if(errorDiv) errorDiv.style.display = 'none';

        if (!email || !password) {
            mostrarError("Por favor llena todos los campos, carnal.");
            return;
        }

        const textoOriginal = mainActionBtn.textContent;
        mainActionBtn.textContent = "Procesando...";
        mainActionBtn.disabled = true;

        try {
            if (isLoginMode) {
                // --- LOGIN ---
                const { data, error } = await _supabase.auth.signInWithPassword({
                    email: email,
                    password: password,
                });

                if (error) throw error;
                
                console.log("Login exitoso:", data);
                window.location.href = "html/reproductor.html";

            } else {
                // --- REGISTRO ---
                if (!esContrasenaSegura(password)) {
                    throw new Error("La contraseña es muy débil. Necesita 8 caracteres, 1 mayúscula, 1 número y 1 símbolo.");
                }

                const { data, error } = await _supabase.auth.signUp({
                    email: email,
                    password: password,
                });

                if (error) throw error;

                mostrarNotificacion("¡Cuenta creada! Te mandamos un correo para confirmar.");
                // Regresamos al login para que confirme
                toggleMode(); 
            }
        } catch (error) {
            mostrarError(error.message || "Ocurrió un error inesperado.");
        } finally {
            mainActionBtn.textContent = textoOriginal;
            mainActionBtn.disabled = false;
        }
    });
}

// --- 6. GOOGLE LOGIN (BLINDADO) ---
if(googleBtn){
    googleBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log("👆 Botón Google presionado");

        try {
            const { data, error } = await _supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + '/html/reproductor.html',
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                },
            });

            if (error) throw error;
            console.log("🚀 Redirigiendo a Google...");
            
        } catch (error) {
            console.error("❌ Error:", error);
            mostrarError("Error al conectar con Google: " + error.message);
        }
    });
}
