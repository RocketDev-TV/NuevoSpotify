// JS/login.js

// 1. IMPORTAR CLIENTE (MODO PRO) 🔌
// Traemos 'client' desde config y lo renombramos a '_supabase' aquí mismo
import { client as _supabase } from './config.js';

// Validamos que haya llegado bien
if (!_supabase) {
    console.error("❌ Error CRÍTICO: No se pudo importar el cliente de Supabase en login.js");
    // Si tienes una función global de notificación, úsala con cuidado
    if(typeof mostrarNotificacion === 'function') {
        mostrarNotificacion("Error de sistema: No hay conexión con la base de datos.");
    }
}

// TODO EL CÓDIGO DE LÓGICA LO METEMOS AQUÍ PARA ASEGURAR QUE EL HTML EXISTA
document.addEventListener('DOMContentLoaded', async () => {

    // --- 2. REFERENCIAS DEL DOM (Ahora sí es seguro buscarlas) ---
    // Activamos el ojito (Asumiendo que esta función está en un ui.js global)
    if (typeof activarOjito === 'function') {
        activarOjito('passwordLogin', 'toggleLogin');
    }

    const emailInput = document.querySelector('input[type="email"]');
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
            if(typeof mostrarNotificacion === 'function') mostrarNotificacion(mensaje, "error");
        }
        
        if(mainActionBtn) {
            mainActionBtn.classList.add('shake');
            setTimeout(() => mainActionBtn.classList.remove('shake'), 500);
        }
    }

    // --- 4. LÓGICA PRINCIPAL (LOGIN NORMAL) ---
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
                // A. LOGIN EN AUTH
                const { data, error } = await _supabase.auth.signInWithPassword({
                    email: email,
                    password: password,
                });

                if (error) throw error;
                
                console.log("Login Auth exitoso, revisando rol...");

                // B. VERIFICAR ROL EN BASE DE DATOS 🕵️‍♂️
                const { data: userData, error: userError } = await _supabase
                    .from('usuarios')
                    .select('rol')
                    .eq('uid', data.user.id)
                    .single();

                if (userError) throw userError;

                // C. EL SEMÁFORO 🚦
                if (userData.rol === 'admin') {
                    mostrarNotificacion("Bienvenido, Jefe.", "success");
                    setTimeout(() => {
                        window.location.href = "html/admin-dashboard.html";
                    }, 1000);
                } else {
                    window.location.href = "html/reproductor.html";
                }

            } catch (error) {
                console.error(error); 
                if (error.message.includes("Email not confirmed")) {
                    mostrarError("¡Aguanta! Tu cuenta no está activada. Revisa tu correo.");
                } else if (error.message.includes("Invalid login credentials")) {
                    mostrarError("Credenciales incorrectas.");
                } else {
                    mostrarError(error.message || "Error al iniciar sesión.");
                }
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
                        redirectTo: window.location.origin, 
                        queryParams: {
                            access_type: 'offline',
                            prompt: 'consent',
                        },
                    },
                });
                if (error) throw error;
            } catch (error) {
                console.error("❌ Error Google:", error);
                if(typeof mostrarNotificacion === 'function') mostrarNotificacion("Error al conectar con Google.", "error");
            }
        });
    }

    // --- 6. RECUPERAR CONTRASEÑA ---
    const btnOlvide = document.querySelector('.forgot-link a');
    if (btnOlvide) {
        btnOlvide.addEventListener('click', async (e) => {
            e.preventDefault();

            const { value: email } = await Swal.fire({
                title: '<span class="swal-title-pro">¿Olvidaste tu contraseña?</span>',
                html: '<p class="swal-text-pro">No hay falla carnal. Escribe el correo...</p>',
                input: 'email',
                inputPlaceholder: 'ejemplo@correo.com',
                showCancelButton: true,
                confirmButtonText: 'Enviar enlace',
                cancelButtonText: 'Cancelar',
                buttonsStyling: false, 
                background: '#ffffff',
                customClass: {
                    popup: 'swal-popup-pro',
                    input: 'swal-input-pro',
                    confirmButton: 'btn-pro btn-pro-confirm',
                    cancelButton: 'btn-pro btn-pro-cancel',
                    actions: 'swal-actions-gap'
                }
            });

            if (email) {
                Swal.fire({
                    title: '<span class="swal-title-pro">Enviando...</span>',
                    html: '<p class="swal-text-pro">Estamos contactando al servidor.</p>',
                    allowOutsideClick: false,
                    buttonsStyling: false,
                    customClass: { popup: 'swal-popup-pro' },
                    didOpen: () => { Swal.showLoading(); }
                });

                try {
                    const { data, error } = await _supabase.auth.resetPasswordForEmail(email, {
                        redirectTo: window.location.origin + '/html/cambiar-password.html',
                    });

                    if (error) throw error;

                    if(typeof mostrarNotificacion === 'function') {
                        mostrarNotificacion('¡Listo! Revisa tu bandeja de entrada.', 'success');
                    }

                } catch (error) {
                    console.error(error);
                    if(typeof mostrarNotificacion === 'function') mostrarNotificacion(error.message, "error");
                }
            }
        });
    }

    // --- 7. EJECUTAR VERIFICACIÓN DE SESIÓN ---
    await verificarSesionAlCargar();

}); // Fin del DOMContentLoaded


// --- FUNCIÓN DE VERIFICACIÓN (Puede estar fuera del listener si se llama dentro) ---
async function verificarSesionAlCargar() {
    const { data: { session } } = await _supabase.auth.getSession();

    if (session) {
        console.log("Sesión detectada, verificando rol...");
        const { data: userData, error } = await _supabase
            .from('usuarios')
            .select('rol')
            .eq('uid', session.user.id)
            .single();

        if (error) {
            console.error("Error al verificar rol:", error);
            return;
        }

        if (userData?.rol === 'admin') {
            window.location.href = "html/admin-dashboard.html";
        } else {
            window.location.href = "html/reproductor.html";
        }
    }
}