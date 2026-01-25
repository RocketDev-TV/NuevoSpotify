// JS/admin/modules/music/api.js

// 1. CONFIGURACIÓN DEL SERVIDOR PROPIO 🏠
// Como estás en la misma compu, usamos localhost.
// Si estuvieras probando desde tu cel, pondrías tu IP local (ej. http://192.168.100.X:3000)
const SERVER_URL = 'http://localhost:3000'; 

// --- EL GUARDIÁN DE LA BD 🛡️ ---
function getDB() {
    if (!window._supabase) {
        console.error("⛔ DETENIDO: Supabase no está listo.");
        if(typeof Swal !== 'undefined') Swal.fire('Error', 'No hay conexión a BD.', 'error');
        throw new Error("Supabase no inicializado");
    }
    return window._supabase;
}

// --- FUNCIONES DE BASE DE DATOS (Supabase) ---
// Estas se quedan IGUAL porque la info de texto sí va a la nube

export async function getGeneros() {
    return await getDB().from('genero').select('id_gener, nombre_genero').order('nombre_genero');
}

export async function getArtistas(genreId) {
    return await getDB().from('artista').select('id_artista, nombre').eq('genero_id', genreId).order('nombre');
}

export async function getAlbums(artistId) {
    return await getDB().from('album').select('id_album, titulo_album, imagen_url').eq('artista_id', artistId).order('titulo_album');
}

export async function getCancionesPorAlbum(albumId) {
    return await getDB().from('canciones').select('duracion_cancion').eq('album_id', albumId);
}

export async function createGenero(data) {
    return await getDB().from('genero').insert([data]).select().single();
}

export async function createArtista(data) {
    return await getDB().from('artista').insert([data]).select().single();
}

export async function checkAlbumExists(titulo, artistaId) {
    return await getDB().from('album').select('id_album, imagen_url')
        .eq('titulo_album', titulo).eq('artista_id', artistaId);
}

export async function upsertAlbum(data, id = null) {
    if (id) {
        return await getDB().from('album').update(data).eq('id_album', id).select();
    } else {
        return await getDB().from('album').insert([data]).select();
    }
}

export async function insertCancion(data) {
    return await getDB().from('canciones').insert([data]);
}

export async function updateAlbumDuration(albumId, duracionFinal) {
    return await getDB().from('album').update({ duracion_album: duracionFinal }).eq('id_album', albumId);
}

// --- 🔄 AQUÍ ESTÁ EL CAMBIO: STORAGE AL SERVIDOR PROPIO ---


export async function uploadFileToStorage(path, file) {
    const formData = new FormData();
    

    formData.append('ruta', path); 

    formData.append('file', file);

    try {
        console.log(`📤 Enviando a ${SERVER_URL}/upload...`);
        
        const response = await fetch(`${SERVER_URL}/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.statusText}`);
        }
        
        const resultado = await response.json();
        console.log("✅ Servidor respondió:", resultado);

        return { data: { path: path }, error: null };

    } catch (error) {
        console.error("❌ Error subiendo al servidor propio:", error);
        return { data: null, error: error };
    }
}

export async function getPublicUrl(path) {
    // En lugar de pedirle la URL a Supabase, la construimos nosotros
    // Ej: http://localhost:3000/musica/zoe/reptilectric/cancion.mp3
    
    // Codificamos la ruta por si tiene espacios o caracteres raros
    // Pero ojo: tu servidor guarda las carpetas tal cual, así que solo aseguramos la URL base.
    const fullUrl = `${SERVER_URL}/musica/${path}`;
    
    return { data: { publicUrl: fullUrl } };
}