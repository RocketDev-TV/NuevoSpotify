// js/reproductor.js

// 1. Conectamos (usando config.js)
const _supabase = conectarSupabase();

// 2. Elementos del DOM donde vamos a pintar los datos
const profileName = document.getElementById('userName');
const profileImage = document.getElementById('userAvatar');
const btnLogout = document.getElementById('btnLogout');

// 3. Función Principal: Verificar quién entró
async function verificarSesion() {
    // Supabase automáticamente detecta el #access_token en la URL y crea la sesión
    const { data: { session }, error } = await _supabase.auth.getSession();

    if (!session) {
        // Si no hay sesión, vas pa'tras (Login)
        window.location.href = "../index.html";
        return;
    }

    // --- AQUÍ ESTÁ LA MAGIA QUE LIMPIA LA URL ---
    // Reemplaza la URL actual por una limpia sin recargar la página
    window.history.replaceState({}, document.title, window.location.pathname);

    //fORZAMOS EL INGRESO DE FECH DE NACIMIENTO
    await exigirFechaNacimientoSiFalta(_supabase);




    // 4. Sacamos los datos del usuario
    const user = session.user;
    console.log("Usuario logueado:", user);

    // Intentamos obtener nombre y foto (Google los da en user_metadata)
    // Si entró por correo, usamos el 'full_name' que guardamos o su email
    const nombre = user.user_metadata.full_name || user.user_metadata.username || user.email;
    const avatar = user.user_metadata.avatar_url || user.user_metadata.picture; 
    // (Nota: Google a veces usa 'avatar_url' y a veces 'picture')

    // 5. Pintamos en el HTML
    if (profileName) profileName.textContent = `Hola, ${nombre}`;
    
    if (profileImage && avatar) {
        profileImage.src = avatar;
    } else if (profileImage) {
        // Si no tiene foto, ponemos una genérica
        profileImage.src = "https://ui-avatars.com/api/?name=" + nombre + "&background=random";
    }
}

// 6. Botón de Cerrar Sesión
if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
        const { error } = await _supabase.auth.signOut();
        if (!error) {
            window.location.href = "../index.html";
        }
    });
}

// Ejecutamos al cargar
verificarSesion();