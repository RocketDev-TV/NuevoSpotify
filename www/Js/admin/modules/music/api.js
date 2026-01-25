// JS/admin/modules/music/api.js

// OJO: Borramos la línea "const supabase = ..." del inicio.
// Usaremos window._supabase directo en cada función para evitar el error de carga.

export async function getGeneros() {
    return await window._supabase.from('genero').select('id_gener, nombre_genero').order('nombre_genero');
}

export async function getArtistas(genreId) {
    return await window._supabase.from('artista').select('id_artista, nombre').eq('genero_id', genreId).order('nombre');
}

export async function getAlbums(artistId) {
    return await window._supabase.from('album').select('id_album, titulo_album, imagen_url').eq('artista_id', artistId).order('titulo_album');
}

export async function getCancionesPorAlbum(albumId) {
    return await window._supabase.from('canciones').select('duracion_cancion').eq('album_id', albumId);
}

export async function createGenero(nombre) {
    return await window._supabase.from('genero').insert([{ nombre_genero: nombre }]).select().single();
}

export async function createArtista(data) {
    return await window._supabase.from('artista').insert([data]).select().single();
}

export async function checkAlbumExists(titulo, artistaId) {
    return await window._supabase.from('album').select('id_album, imagen_url')
        .eq('titulo_album', titulo).eq('artista_id', artistaId);
}

export async function upsertAlbum(data, id = null) {
    if (id) {
        return await window._supabase.from('album').update(data).eq('id_album', id).select();
    } else {
        return await window._supabase.from('album').insert([data]).select();
    }
}

export async function uploadFileToStorage(path, file) {
    return await window._supabase.storage.from('audio').upload(path, file, { upsert: true });
}

export async function getPublicUrl(path) {
    return window._supabase.storage.from('audio').getPublicUrl(path);
}

export async function insertCancion(data) {
    return await window._supabase.from('canciones').insert([data]);
}

export async function updateAlbumDuration(albumId, duracionFinal) {
    return await window._supabase.from('album').update({ duracion_album: duracionFinal }).eq('id_album', albumId);
}