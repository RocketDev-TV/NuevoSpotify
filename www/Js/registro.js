// 1. Conexión a Supabase
const _supabase = conectarSupabase();

// 2. Referencias del DOM
const nombreInput = document.getElementById('nombreInput');
const paternoInput = document.getElementById('paternoInput');
const maternoInput = document.getElementById('maternoInput');
const fechaInput = document.getElementById('fechaInput');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const confirmInput = document.getElementById('confirmPasswordInput');
const btnRegistrar = document.getElementById('btnRegistrar');

// Referencias de validación visual
const reqLength = document.getElementById('req-length');
const reqUpper = document.getElementById('req-upper');
const reqNumber = document.getElementById('req-number');
const reqSymbol = document.getElementById('req-symbol');
const requirementsBox = document.querySelector('.password-requirements');

// --- 3. ACTIVAR LOS OJITOS ---
activarOjito('passwordInput', 'togglePass1');
activarOjito('confirmPasswordInput', 'togglePass2');

// --- 4. VALIDACIÓN EN TIEMPO REAL ---
passwordInput.addEventListener('input', (e) => {
    const pass = e.target.value;
    if (pass.length > 0) requirementsBox.style.display = 'block';
    else requirementsBox.style.display = 'none';

    actualizarRequisito(reqLength, pass.length >= 8);
    actualizarRequisito(reqUpper, /[A-Z]/.test(pass));
    actualizarRequisito(reqNumber, /\d/.test(pass));
    actualizarRequisito(reqSymbol, /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass));
});

function actualizarRequisito(elemento, esValido) {
    if (esValido) {
        elemento.classList.add('valid');
        elemento.classList.remove('invalid');
    } else {
        elemento.classList.add('invalid');
        elemento.classList.remove('valid');
    }
}

// --- 5. FUNCIÓN DE REGISTRO BLINDADA ---
btnRegistrar.addEventListener('click', async () => {
    // A. Capturamos valores
    const nombre = nombreInput.value.trim();
    const paterno = paternoInput.value.trim();
    const materno = maternoInput.value.trim();
    const fecha = fechaInput.value;
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPass = confirmInput.value;

    // B. Validaciones básicas
    if (!nombre || !paterno || !materno || !fecha || !email || !password) {
        mostrarNotificacion("¡Faltan datos! Llena todo el formulario, carnal.", "error");
        return;
    }

    // C. Validación de fecha
    const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!fechaRegex.test(fecha)) {
        mostrarNotificacion("Por favor selecciona la fecha usando el calendario.", "error");
        vibrarElemento('fechaInput');
        return;
    }

    // D. Validaciones de contraseña
    if (password !== confirmPass) {
        mostrarNotificacion("Las contraseñas no coinciden.", "error");
        vibrarElemento('confirmPasswordInput');
        return;
    }

    if (!esContrasenaSegura(password)) {
        mostrarNotificacion("La contraseña no es segura. Revisa los requisitos abajo.");
        vibrarElemento('passwordInput');
        return;
    }

    // E. Empezamos el proceso
    const textoOriginal = btnRegistrar.textContent;
    btnRegistrar.textContent = "Creando perfil...";
    btnRegistrar.disabled = true;

    try {
        // PASO 1: Crear usuario en Supabase Auth
        const { data: authData, error: authError } = await _supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: `${nombre} ${paterno} ${materno}`,
                }
            }
        });

        // Manejo específico si Auth falla (ej. si tienes confirmación desactivada y el usuario ya existe)
        if (authError) throw authError;

        if (authData.user) {
            console.log("✅ Usuario Auth creado ID:", authData.user.id);

            // PASO 2: Insertar en la BD
            const { error: dbError } = await _supabase
                .from('usuarios')
                .upsert([
                    {
                        uid: authData.user.id,
                        nombre: nombre,
                        apellido_paterno: paterno,
                        apellido_materno: materno,
                        correo: email,
                        fecha_de_nacimiento: fecha,
                        rol: 'usuario'
                    }
                ]);

            if (dbError) {
                console.error("❌ Error DB Detallado:", JSON.stringify(dbError)); // Para que veas todo el chisme en consola
                
                const mensajeError = (dbError.message || "").toLowerCase();
                
                if (
                    dbError.code === '23505' || 
                    mensajeError.includes("duplicate") || 
                    mensajeError.includes("unique") ||
                    mensajeError.includes("violates unique constraint")
                ) {
                    throw new Error("Este correo ya está registrado. ¿Por qué no inicias sesión?");
                }
                
                // Si es otro error raro
                throw new Error("Hubo un problema al guardar tu perfil. Código: " + (dbError.code || "Desconocido"));
            }

            // ÉXITO TOTAL 🎉
            mostrarNotificacion("¡Bienvenido al club! Revisa tu correo para activar la cuenta.", "success");

            setTimeout(() => {
                window.location.href = "../index.html";
            }, 2500);
        }

    } catch (error) {
        console.error("🔥 Error capturado:", error);

        let mensaje = error.message;

        // 1. Usuario ya existe en Auth (mensaje estándar de Supabase)
        if (mensaje.includes("User already registered") || mensaje.includes("already registered")) {
            mensaje = "Este correo ya tiene cuenta. ¡Córrele a iniciar sesión!";
        }
        // 2. Rate Limit (Demasiados intentos)
        else if (mensaje.includes("rate limit") || error.status === 429) {
            mensaje = "Tranquilo veloz, espera unos segundos antes de intentar de nuevo.";
        }
        // 3. Contraseña débil (por si se nos pasó validarla antes)
        else if (mensaje.includes("Password should be")) {
            mensaje = "La contraseña es muy débil, métele más galleta.";
        }

        mostrarNotificacion(mensaje, "error");

        // Opcional: Si el error es de usuario duplicado, podríamos redirigirlo al login
        if (mensaje.includes("ya tiene cuenta") || mensaje.includes("ya está registrado")) {
            setTimeout(() => window.location.href = "../index.html", 3000);
        }

    } finally {
        btnRegistrar.textContent = textoOriginal;
        btnRegistrar.disabled = false;
    }
});