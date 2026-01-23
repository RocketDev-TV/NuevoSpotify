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
    let titulo = '';
    let confirmBtnColor = '#03624C'; 

    if (tipo === 'success') {
        titulo = '¡Excelente!';
    } else if (tipo === 'error') {
        titulo = '¡Ups!';
        confirmBtnColor = '#e74c3c'; 
    } else {
        titulo = 'Atención';
    }

    Swal.fire({
        title: titulo,
        text: mensaje,
        icon: tipo,
        confirmButtonText: 'Entendido',
        confirmButtonColor: confirmBtnColor,
        background: '#ffffff',
        color: '#032221',
        // borderRadius: '20px',  <--- BORRA ESTA LÍNEA 🗑️
        customClass: {
            popup: 'mis-alertas-pro' 
        }
    });
}



/**
 * 5. FORZAR FECHA DE NACIMIENTO SI VIENE DE GOOGLE 🗓️
 * @param {object} supa - cliente de Supabase (ej: _supabase)
 */
async function exigirFechaNacimientoSiFalta(supa) {
  try {
    if (!supa?.auth) {
      console.error("exigirFechaNacimientoSiFalta: cliente Supabase inválido");
      return;
    }

    // 1) Traer sesión desde el cliente correcto
    const { data: sessionData, error: sessionErr } = await supa.auth.getSession();
    if (sessionErr) throw sessionErr;

    const user = sessionData?.session?.user;
    if (!user) return;

    // 2) Validar si viene de Google (robusto)
    const provider =
      user?.app_metadata?.provider ||
      user?.identities?.[0]?.provider ||
      user?.app_metadata?.providers?.[0];

    console.log("[DOB] provider detectado:", provider);
    console.log("[DOB] Swal existe?:", typeof Swal !== "undefined");

    const esGoogle = provider === "google";
    if (!esGoogle) return;

    // 3) Consultar tabla usuarios (columna CORRECTA)
    const { data: u, error: userErr } = await supa
      .from("usuarios")
      .select("uid, fecha_de_nacimiento")
      .eq("uid", user.id)
      .maybeSingle();

    if (userErr) throw userErr;

    // Si no existe registro, lo creamos (con columna correcta)
    if (!u) {
      const { error: insErr } = await supa.from("usuarios").insert({
        uid: user.id,
        fecha_de_nacimiento: null,
        rol: "usuario",
      });

      if (insErr) throw insErr;
    } else {
      // Si ya tiene fecha, ya no pedimos nada
      if (u.fecha_de_nacimiento) return;
    }

    // Si Swal no existe, no podemos mostrar popup
    console.log("[DOB] fecha en BD es NULL -> debe abrir popup");
    if (typeof Swal === "undefined") {
      console.error("[DOB] SweetAlert2 (Swal) NO está cargado.");
      return;
    }

    // 4) Pedir fecha en popup
    const { value: dob } = await Swal.fire({
      title: "Completa tu perfil 🧾",
      text: "Antes de continuar, ingresa tu fecha de nacimiento",
      input: "date",
      inputAttributes: { required: true },
      allowOutsideClick: false,
      allowEscapeKey: false,
      confirmButtonText: "Guardar",
      confirmButtonColor: "#199c47",
      background: "#ffffff",
      color: "#032221",
      preConfirm: (value) => {
        if (!value) {
          Swal.showValidationMessage("Ingresa tu fecha de nacimiento");
          return false;
        }

        // Validación: no futura + mínimo 13 años (ajusta si quieres)
        const d = new Date(value);
        const hoy = new Date();
        if (d > hoy) {
          Swal.showValidationMessage("La fecha no puede ser futura");
          return false;
        }

        const minEdad = 13;
        const limite = new Date(hoy.getFullYear() - minEdad, hoy.getMonth(), hoy.getDate());
        if (d > limite) {
          Swal.showValidationMessage(`Debes tener al menos ${minEdad} años`);
          return false;
        }

        return value;
      },
    });

    if (!dob) return;

    // 5) Guardar fecha (columna CORRECTA)
    const { error: updErr } = await supa
      .from("usuarios")
      .update({ fecha_de_nacimiento: dob })
      .eq("uid", user.id);

    if (updErr) throw updErr;

    mostrarNotificacion("Fecha de nacimiento guardada ✅", "success");
  } catch (err) {
    console.error("Error exigirFechaNacimientoSiFalta:", err);
    mostrarNotificacion(
      "No se pudo guardar la fecha de nacimiento.",
      "error"
    );
  }
}
