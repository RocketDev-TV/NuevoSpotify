// Js/login.js

// --- 1. CONEXIÓN A SUPABASE ---
const _supabase = conectarSupabase();

if (!_supabase) {
    console.error("❌ Error: No se pudo conectar a Supabase.");
    mostrarNotificacion("Error de sistema: No hay conexión con la base de datos.");
}

// Activamos el ojito para el login
activarOjito('passwordLogin', 'toggleLogin');

// --- 2. REFERENCIAS DEL DOM ---
const emailInput = document.querySelector('input[type="email"]');
// Usamos el ID correcto
const passwordInput = document.getElementById('passwordLogin'); 
const mainActionBtn = document.querySelector('.btn-login');
const googleBtn = document.querySelector('.social-btn.google');
const forgotLink = document.querySelector('.forgot-link');

// Referencias para mensajes de error
let errorDiv = document.querySelector('#error-message-box');
if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.id = 'error-message-box';
    errorDiv.style.color = '#e74c3c';
    errorDiv.style.fontSize = '13px';
    errorDiv.style.textAlign = 'center';
    errorDiv.style.marginBottom = '15px';
    errorDiv.style.display = 'none';
    
    const form = document.querySelector('.login-form');
    if(form) form.insertBefore(errorDiv, forgotLink);
}

// --- 3. FUNCIONES DE UI ---
function mostrarError(mensaje) {
    if(errorDiv) {
        errorDiv.textContent = mensaje;
        errorDiv.style.display = 'block';
    } else {
        mostrarNotificacion(mensaje, "error");
    }
    
    if(mainActionBtn) {
        mainActionBtn.classList.add('shake');
        setTimeout(() => mainActionBtn.classList.remove('shake'), 500);
    }
}

// --- 4. LÓGICA PRINCIPAL (SOLO LOGIN) ---
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
        mainActionBtn.textContent = "Iniciando...";
        mainActionBtn.disabled = true;

        try {
            // --- LOGIN ÚNICAMENTE ---
            const { data, error } = await _supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) throw error;
            
            console.log("Login exitoso:", data);
            
            // Redirección correcta a la carpeta html
            window.location.href = "html/reproductor.html";

        } catch (error) {
            console.error(error);
            mostrarError("Credenciales incorrectas o usuario no encontrado.");
        } finally {
            mainActionBtn.textContent = textoOriginal;
            mainActionBtn.disabled = false;
        }
    });
}

// --- 5. GOOGLE LOGIN ---
if(googleBtn){
    googleBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        try {
            const { data, error } = await _supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    // Redirección correcta
                    redirectTo: window.location.origin + '/html/reproductor.html',
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                },
            });

            if (error) throw error;
            
        } catch (error) {
            console.error("❌ Error:", error);
            mostrarNotificacion("Error al conectar con Google: " + error.message, "error");
        }
    });
}