// js/reproductor.js

// 1. Conectamos (usando config.js)
const _supabase = conectarSupabase();

// 2. Elementos del DOM donde vamos a pintar los datos
const profileName = document.getElementById('userName');
const profileImage = document.getElementById('userAvatar');
const btnLogout = document.getElementById('btnLogout');



// 3 cargar canciones
async function cargarCancionDesdeSupabase() {
  try {
    const supa = _supabase;

    const { data: song, error } = await supa
      .from("canciones")
      .select("id_cancion, titulo_cancion, audio_path")
      .order("id_cancion", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!song) return console.warn("No hay canciones en BD");
    if (!song.audio_path) return console.warn("La canción no tiene audio_path");

    console.log("🎵 Canción BD:", song);

    const { data: signed, error: signedErr } = await supa.storage
      .from("audio")
      .createSignedUrl(song.audio_path, 3600);

    if (signedErr) throw signedErr;

    console.log("🔐 Signed URL:", signed.signedUrl);

    const audioEl = document.getElementById("audio");
    if (!audioEl) return console.error("No existe #audio");

    audioEl.pause();
    audioEl.src = signed.signedUrl;
    audioEl.load();

    // intenta autoplay (puede bloquearse)
    await audioEl.play().catch(() => {
      console.warn("Autoplay bloqueado. Dale play manual.");
    });

  } catch (e) {
    console.error("❌ Error en cargarCancionDesdeSupabase:", e);
  }
}


// 4. Función Principal: Verificar quién entró
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




    // 5. Sacamos los datos del usuario
    const user = session.user;
    console.log("Usuario logueado:", user);

    // Intentamos obtener nombre y foto (Google los da en user_metadata)
    // Si entró por correo, usamos el 'full_name' que guardamos o su email
    const nombre = user.user_metadata.full_name || user.user_metadata.username || user.email;
    const avatar = user.user_metadata.avatar_url || user.user_metadata.picture; 
    // (Nota: Google a veces usa 'avatar_url' y a veces 'picture')

    // 6. Pintamos en el HTML
    if (profileName) profileName.textContent = `Hola, ${nombre}`;
    
    if (profileImage && avatar) {
        profileImage.src = avatar;
    } else if (profileImage) {
        // Si no tiene foto, ponemos una genérica
        profileImage.src = "https://ui-avatars.com/api/?name=" + nombre + "&background=random";
    }

        //correr en paralelo 
        await Promise.all([
          cargarCancionDesdeSupabase(),
          renderArtistas(),
          renderGeneros()
        ]);

}

// 7. Botón de Cerrar Sesión
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



