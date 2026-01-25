// JS/admin/modules/music/events.js
import * as API from './api.js';
import * as UI from './ui.js';
import * as Utils from './utils.js';

// Estado Local
export const state = {
    genreId: null,
    artistId: null,
    albumId: null
};

// --- LOGICA DE CARGA DE COMBOS ---
export async function handleGenreChange(e) {
    state.genreId = e.target.value;
    state.artistId = null;
    state.albumId = null;
    
    UI.resetSelect('selectAlbum', 'Selecciona un artista primero');
    UI.hideCoverPreview();
    
    const { data } = await API.getArtistas(state.genreId);
    UI.llenarSelect(document.getElementById('selectArtista'), data, 'id_artista', 'nombre', 'Selecciona Artista');
}

export async function handleArtistChange(e) {
    state.artistId = e.target.value;
    state.albumId = null;
    UI.hideCoverPreview();
    
    const { data } = await API.getAlbums(state.artistId);
    UI.llenarSelect(document.getElementById('selectAlbum'), data, 'id_album', 'titulo_album', 'Selecciona Álbum / EP', 'imagen_url');
}

export function handleAlbumChange(e) {
    state.albumId = e.target.value;
    const option = e.target.options[e.target.selectedIndex];
    
    if (state.albumId && option.dataset.cover) {
        UI.showCoverPreview(option.dataset.cover);
    } else {
        UI.hideCoverPreview();
    }
}

// --- FUNCIONES PARA CREAR (LAS QUE LLAMA EL HTML) ---

export async function crearGenero() {
    const nombre = document.getElementById('newGenreName').value;
    if (!nombre) return Swal.fire('Ojo', 'Escribe un nombre', 'warning');

    const { data, error } = await API.createGenero(nombre);

    if (error) {
        Swal.fire('Error', error.message, 'error');
    } else {
        UI.cerrarModal('genero');
        const { data: generos } = await API.getGeneros();
        UI.llenarSelect(document.getElementById('selectGenero'), generos, 'id_gener', 'nombre_genero', 'Selecciona Género');
        
        // Seleccionar el nuevo
        document.getElementById('selectGenero').value = data.id_gener;
        document.getElementById('selectGenero').dispatchEvent(new Event('change'));
        Swal.fire('Listo', 'Género creado', 'success');
    }
}

export async function crearArtista() {
    const nombre = document.getElementById('newArtistName').value;
    const desc = document.getElementById('newArtistDesc').value;

    if (!nombre) return Swal.fire('Falta info', 'Nombre obligatorio', 'warning');
    if (!state.genreId) return Swal.fire('Error', 'Selecciona un género de fondo primero', 'error');

    const { data, error } = await API.createArtista({
        nombre: nombre,
        descripcion: desc,
        genero_id: state.genreId
    });

    if (error) {
        Swal.fire('Error', error.message, 'error');
    } else {
        UI.cerrarModal('artista');
        const { data: artistas } = await API.getArtistas(state.genreId);
        UI.llenarSelect(document.getElementById('selectArtista'), artistas, 'id_artista', 'nombre', 'Selecciona Artista');
        
        document.getElementById('selectArtista').value = data.id_artista;
        document.getElementById('selectArtista').dispatchEvent(new Event('change'));
        Swal.fire('Listo', 'Artista creado', 'success');
    }
}

export async function crearAlbum() {
    // Lectura de inputs
    const titulo = document.getElementById('newAlbumTitle').value;
    const numCanciones = document.getElementById('newAlbumSongs').value || 1;
    const file = document.getElementById('newAlbumCover').files[0];
    const tipo = document.getElementById('newAlbumType').value;
    const fecha = document.getElementById('newAlbumDate').value;

    if (!titulo) return Swal.fire('Falta título', '', 'warning');
    if (!state.artistId) return Swal.fire('Falta Artista', 'Selecciona uno al fondo', 'warning');
    if (!fecha) return Swal.fire('Falta Fecha', 'La fecha original es obligatoria', 'warning');

    // UI Loading
    const btn = document.querySelector('#modal-album button.btn-confirm') || document.querySelector('#modal-album button:last-child');
    UI.toggleLoadingButton(btn, true, 'Guardando...');

    try {
        // 1. Verificar existencia
        const { data: existentes } = await API.checkAlbumExists(titulo, state.artistId);
        const existe = (existentes && existentes.length > 0) ? existentes[0] : null;
        let urlPortada = existe ? existe.imagen_url : null;

        // 2. Subir Portada (Si hay)
        if (file) {
            const artistName = Utils.cleanString(document.getElementById('selectArtista').selectedOptions[0].text);
            const albumName = Utils.cleanString(titulo);
            const path = `${artistName}/${albumName}/${Date.now()}_${Utils.cleanString(file.name)}`;
            
            await API.uploadFileToStorage(path, file);
            const { data: urlData } = await API.getPublicUrl(path);
            urlPortada = urlData.publicUrl;
        }

        // 3. Guardar en BD
        const payload = {
            titulo_album: titulo,
            artista_id: state.artistId,
            num_canciones: numCanciones,
            imagen_url: urlPortada,
            tipo_lanzamiento: tipo,
            fecha_lanzamiento: fecha
        };

        const { data: albumGuardado, error } = await API.upsertAlbum(payload, existe ? existe.id_album : null);
        if (error) throw error;

        // 4. Actualizar UI
        UI.cerrarModal('album');
        const { data: albums } = await API.getAlbums(state.artistId);
        UI.llenarSelect(document.getElementById('selectAlbum'), albums, 'id_album', 'titulo_album', 'Selecciona', 'imagen_url');
        
        if (albumGuardado && albumGuardado.length > 0) {
            document.getElementById('selectAlbum').value = albumGuardado[0].id_album;
            document.getElementById('selectAlbum').dispatchEvent(new Event('change'));
        }
        
        Swal.fire('Éxito', existe ? 'Álbum actualizado' : 'Álbum creado', 'success');

    } catch (err) {
        console.error(err);
        Swal.fire('Error', err.message, 'error');
    } finally {
        UI.toggleLoadingButton(btn, false, 'Guardar');
        // Limpiar inputs específicos
        document.getElementById('newAlbumCover').value = '';
        document.getElementById('coverPreviewImg').style.display = 'none';
    }
}


// --- LOGICA DE SUBIDA DE CANCIONES ---
export async function handleSongUpload(e) {
    e.preventDefault();
    
    if (!state.artistId || !state.albumId) return Swal.fire('Error', 'Bloquea el contexto primero.', 'error');

    const files = document.getElementById('inputFileAudio').files;
    if (files.length === 0) return Swal.fire('Ojo', 'Sin archivos.', 'warning');

    const form = document.getElementById('formCancion');
    const btn = form.querySelector('button[type="submit"]');
    UI.toggleLoadingButton(btn, true, `Subiendo ${files.length}...`);

    let exitosas = 0, errores = 0;
    
    const artistName = Utils.cleanString(document.getElementById('selectArtista').selectedOptions[0].text);
    const albumName = Utils.cleanString(document.getElementById('selectAlbum').selectedOptions[0].text);
    const coverUrl = document.getElementById('selectAlbum').selectedOptions[0].dataset.cover;

    for (const file of files) {
        try {
            const duracionSeg = await Utils.obtenerDuracionAudio(file);
            const duracionFmt = Utils.formatearDuracionParaBD(duracionSeg);

            const path = `${artistName}/${albumName}/${Date.now()}_${Utils.cleanString(file.name)}`;
            const { error: upErr } = await API.uploadFileToStorage(path, file);
            if (upErr) throw upErr;

            const { data: publicUrl } = await API.getPublicUrl(path);

            const { error: dbErr } = await API.insertCancion({
                titulo_cancion: file.name.replace(/\.[^/.]+$/, ""),
                artista_id: state.artistId,
                album_id: state.albumId,
                audio_path: publicUrl.publicUrl,
                reproducciones: 0,
                duracion_cancion: duracionFmt,
                imagen_url: coverUrl
            });
            if (dbErr) throw dbErr;

            exitosas++;
        } catch (err) {
            console.error(err);
            errores++;
        }
    }

    if (exitosas > 0) await recalculateAlbumDuration(state.albumId);

    UI.toggleLoadingButton(btn, false, 'Procesar Todo el Álbum');

    if (errores === 0) {
        confirmarFlujoContinuo(exitosas);
    } else {
        Swal.fire('Terminado', `Subidas: ${exitosas}, Errores: ${errores}`, 'warning');
    }
}

async function recalculateAlbumDuration(albumId) {
    const { data } = await API.getCancionesPorAlbum(albumId);
    if (!data) return;

    let totalSegundos = 0;
    data.forEach(c => totalSegundos += Utils.convertirFormatoASegundos(c.duracion_cancion));
    
    const finalFmt = Utils.formatearDuracionParaBD(totalSegundos);
    await API.updateAlbumDuration(albumId, finalFmt);
    console.log("Nueva duración:", finalFmt);
}

function confirmarFlujoContinuo(count) {
    Swal.fire({
        title: '¡Éxito!',
        text: `Se subieron ${count} canciones. ¿Más para este álbum?`,
        icon: 'success',
        showCancelButton: true,
        confirmButtonText: 'Sí, más',
        cancelButtonText: 'No, terminar',
        confirmButtonColor: '#1db954',
        background: '#1e1e1e', color: '#fff'
    }).then((result) => {
        if (result.isConfirmed) {
            UI.resetFileUploadUI();
        } else {
            resetearTodoElSistema();
        }
    });
}

export function resetearTodoElSistema() {
    UI.resetFileUploadUI();
    UI.bloquearContextoUI(false);
    UI.resetSelect('selectGenero', 'Selecciona Género'); 
    UI.resetSelect('selectArtista', 'Selecciona Género Primero');
    UI.resetSelect('selectAlbum', 'Selecciona Artista Primero');
    state.genreId = null; state.artistId = null; state.albumId = null;
    UI.hideCoverPreview();
    
    document.getElementById('selectGenero').disabled = false;
    API.getGeneros().then(({data}) => {
        UI.llenarSelect(document.getElementById('selectGenero'), data, 'id_gener', 'nombre_genero', 'Selecciona Género');
    });
}