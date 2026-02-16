// JS/admin/modules/music/events.js
import * as API from './api.js';
import * as UI from './ui.js';
import * as Utils from './utils.js';
import {updateTrackOrder} from './api.js';

// Estado Local
export const state = {
    genreId: null,
    artistId: null,
    albumId: null,
    isContextLocked: false, // Bandera de seguridad
    stagedFiles: []
};

// --- LOGICA DE CARGA DE COMBOS ---
export async function handleGenreChange(e) {
    state.genreId = e.target.value;
    state.artistId = null;
    state.albumId = null;


    // Limpiezas visuales
    UI.resetSelect('selectArtista', 'Cargando...');
    UI.resetSelect('selectAlbum', 'Selecciona Artista Primero');
    UI.hideAlbumPreview(); // Ocultamos la tabla
    UI.hideCoverPreview();

    if (!state.genreId) return;
    
    const { data } = await API.getArtistas(state.genreId);
    UI.llenarSelect(document.getElementById('selectArtista'), data, 'id_artista', 'nombre', 'Selecciona Artista');
}

// JS/admin/modules/music/events.js

export async function handleArtistChange(e) {
    const artistId = e.target.value;
    console.log("🎨 Artista seleccionado ID:", artistId); // Debe ser 2 (ZOE)

    const selectAlbum = document.getElementById('selectAlbum');
    
    // Reset preventivo
    UI.resetSelect('selectAlbum', 'Cargando...');
    UI.hideAlbumPreview(); 

    if (!artistId) return;

    // Pedimos los datos
    const { data, error } = await API.getAlbums(artistId);

    if (error) {
        console.error("❌ Error API Albums:", error);
        return;
    }

    // 👇 AQUÍ ESTÁ LA MAGIA DEL DEBUG
    console.log("📦 DATA CRUDA DE ÁLBUMES:", data); 

    if (data && data.length > 0) {
        // Checamos el primer álbum para ver sus columnas
        console.log("🔍 Primer álbum - ID Album:", data[0].id_album);
        console.log("🔍 Primer álbum - Artista ID:", data[0].artista_id);
        
        // Llenamos el select
        UI.llenarSelect(
            selectAlbum, 
            data, 
            'id_album',
            'titulo_album', 
            'Selecciona Álbum',
            'imagen_url',
            'fecha_lanzamiento'
        );
    } else {
        console.warn("⚠️ No se encontraron álbumes para este artista");
        UI.resetSelect('selectAlbum', 'Sin álbumes');
    }
}

export async function handleAlbumChange(e) {
    state.albumId = e.target.value;
    const option = e.target.options[e.target.selectedIndex];
    
    // Referencias HTML
    const container = document.getElementById('albumInventoryContainer');
    const titleEl = document.getElementById('inventoryTitle');
    const yearEl = document.getElementById('inventoryYear');
    // ❌ BORRAMOS LA REFERENCIA A coverEl AQUÍ

    // 1. Mostrar Portada GRANDE en el formulario (Arriba)
    if (state.albumId && option.dataset.cover) {
        UI.showCoverPreview(option.dataset.cover);
    } else {
        UI.hideCoverPreview();
    }

    // 2. Actualizar Cabecera del Inventario (Abajo)
    if (state.albumId) {
        titleEl.textContent = option.text;
        titleEl.innerHTML = `
            ${option.text} 
            <button class="btn-icon-action edit ms-2" 
                    style="background:none; border:none; color:#888; transition:0.2s; cursor:pointer;" 
                    onmouseover="this.style.color='#1db954'; this.style.transform='scale(1.1)'" 
                    onmouseout="this.style.color='#888'; this.style.transform='scale(1)'"
                    onclick="window.abrirModalEditarAlbum()" 
                    title="Editar Portada/Info">
                <i class="ph ph-pencil-simple fs-4"></i>
            </button>
        `;
        yearEl.textContent = `(${option.dataset.year || '----'})`; // Le puse paréntesis para que se vea nice
        
        // ❌ BORRAMOS TODO EL BLOQUE IF/ELSE QUE ACTUALIZABA coverEl.src AQUÍ

        // Cargar Canciones
        const songs = await API.getSongsByAlbum(state.albumId);
        UI.renderAlbumSongs(songs);

        activarDragAndDrop();
        
        // Mostrar contenedor con animación
        container.style.display = 'block';
        container.classList.add('animate__animated', 'animate__fadeIn');
    } else {
        container.style.display = 'none';
        UI.hideAlbumPreview();
    }
}


// --- FUNCIONES PARA CREAR ---

export async function crearGenero() {
    const nombre = document.getElementById('newGenreName').value;
    const decadaSeleccionada = document.getElementById('newGenreDecade').value;

    if (!nombre) return Swal.fire('Ojo', 'Escribe un nombre', 'warning');
    if (!decadaSeleccionada) return Swal.fire('Ojo', 'Selecciona una década', 'warning');

    const { data, error } = await API.createGenero({
        nombre_genero: nombre,
        decada: decadaSeleccionada // Enviamos la fecha correcta
    });

    if (error) {
        console.error("Error BD:", error);
        // Si sale error de constraint, mostramos mensaje amigable
        if (error.code === '23514') {
            Swal.fire('Error', 'La fecha de década no es válida para esta base de datos.', 'error');
        } else {
            Swal.fire('Error', error.message, 'error');
        }
    } else {
        UI.cerrarModal('genero');
    const { data: generos } = await API.getGeneros();
    
    // 🔄 ACTUALIZAMOS AMBOS COMBOS AL MISMO TIEMPO
    const manualSelect = document.getElementById('selectGenero');
    const ytSelect = document.getElementById('yt-select-genero');

    UI.llenarSelect(manualSelect, generos, 'id_gener', 'nombre_genero', 'Selecciona Género');
    if (ytSelect) {
        UI.llenarSelect(ytSelect, generos, 'id_gener', 'nombre_genero', 'Selecciona Género');
    }
    
    // Seleccionamos el que acabas de crear automáticamente
    if (manualSelect) manualSelect.value = data.id_gener;
    if (ytSelect) ytSelect.value = data.id_gener;
    
    Swal.fire('Listo', 'Género creado y actualizado', 'success');
    }
}

export async function crearArtista() {
    const nombre = document.getElementById('newArtistName').value;
    const desc = document.getElementById('newArtistDesc').value;

    // 🔍 BUSCAMOS EL GÉNERO EN AMBOS COMBOS
    const manualGenre = document.getElementById('selectGenero')?.value;
    const ytGenre = document.getElementById('yt-select-genero')?.value;
    const activeGenreId = manualGenre || ytGenre || state.genreId;

    if (!nombre) return Swal.fire('Falta info', 'Nombre obligatorio', 'warning');
    if (!activeGenreId) return Swal.fire('Error', 'Selecciona un género de fondo primero', 'error');

    const { data, error } = await API.createArtista({
        nombre: nombre,
        descripcion: desc,
        genero_id: activeGenreId // Usamos el ID que encontramos
    });

    if (error) {
        Swal.fire('Error', error.message, 'error');
    } else {
        UI.cerrarModal('artista');
        const { data: artistas } = await API.getArtistas(activeGenreId);
        
        // 🔄 ACTUALIZAMOS AMBOS COMBOS DE ARTISTAS
        const manualArt = document.getElementById('selectArtista');
        const ytArt = document.getElementById('yt-select-artista');

        UI.llenarSelect(manualArt, artistas, 'id_artista', 'nombre', 'Selecciona Artista');
        if (ytArt) {
            UI.llenarSelect(ytArt, artistas, 'id_artista', 'nombre', 'Seleccionar Artista');
            ytArt.disabled = false;
        }

        Swal.fire('Listo', 'Artista creado', 'success');
    }
}

// --- LÓGICA DE BLOQUEO DE CONTEXTO ---
export function toggleContextLock() {
    // 🔍 PLAN B: Si el estado está vacío, leemos del HTML a la fuerza
    if (!state.artistId) {
        const val = document.getElementById('selectArtista').value;
        if (val) state.artistId = val;
    }
    if (!state.albumId) {
        const val = document.getElementById('selectAlbum').value;
        if (val) state.albumId = val;
    }

    // DEBUG: Para saber qué está viendo el botón
    console.log("🔒 Intentando bloquear con State:", state);

    // 1. Validar (Ahora sí, con datos frescos)
    if (!state.albumId || !state.artistId) {
        return Swal.fire({
            title: 'Espera',
            text: 'Selecciona Artista y Álbum antes de confirmar.',
            icon: 'warning',
            background: '#1e1e1e', color: '#fff'
        });
    }

    // 2. Cambiar estado
    state.isContextLocked = !state.isContextLocked; 

    // 3. Actualizar UI
    UI.bloquearContextoUI(state.isContextLocked);

    if (state.isContextLocked) {
        Swal.fire({
            title: 'Contexto Fijado',
            text: 'Ahora sí, arrastra tus canciones.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            background: '#1e1e1e', color: '#fff'
        });
    }
}

// --- LOGICA DE SUBIDA DE CANCIONES ---
/*
export async function handleSongUpload(e) {
    e.preventDefault();
    
    // Si no está bloqueado, no pasa nadie.
    if (!state.isContextLocked) {
        return Swal.fire({
            title: '¡Alto ahí!', 
            text: 'Debes presionar el botón "Confirmar para Subir" (el candado) antes de procesar las canciones.',
            icon: 'warning',
            background: '#1e1e1e', color: '#fff'
        });
    }

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
*/

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
    state.isContextLocked = false;
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

// --- FUNCIONES GLOBALES (Para botones de la Tabla) ---

// Configuración de estilo Dark para los modales
const swalDarkConfig = {
    background: '#181818',
    color: '#fff',
    confirmButtonColor: '#1db954',
    cancelButtonColor: '#333',
    customClass: {
        popup: 'border border-secondary shadow-lg rounded-4',
        input: 'bg-dark text-white border-secondary focus-ring-success my-3'
    }
};

// 1. Borrar Canción (Estilo GitHub)
window.borrarCancion = async (id) => {
    const result = await Swal.fire({
        ...swalDarkConfig,
        title: '¿Borrar canción?',
        html: `<p class="text-secondary fs-6">Escribe <strong class="text-danger">borrar</strong> para confirmar:</p>`,
        input: 'text',
        inputPlaceholder: 'borrar',
        confirmButtonText: 'Eliminar',
        confirmButtonColor: '#d33', // Rojo específico para borrar
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
        preConfirm: (value) => {
            if (value !== 'borrar') {
                Swal.showValidationMessage('Escribe "borrar" exactamente.');
            }
        }
    });

    if (result.isConfirmed) {
        const { error } = await API.deleteCancion(id);
        
        if (error) {
            Swal.fire({ ...swalDarkConfig, icon: 'error', title: 'Error', text: error.message });
        } else {
            // Recargar tabla
            const songs = await API.getSongsByAlbum(state.albumId);
            UI.renderAlbumSongs(songs);
            
            Swal.fire({
                icon: 'success', title: 'Eliminada',
                toast: true, position: 'top-end', showConfirmButton: false, timer: 2000,
                background: '#181818', color: '#fff'
            });
        }
    }
};

// 2. Editar Canción
window.editarCancion = async (id, currentTitle) => {
    const { value: newTitle } = await Swal.fire({
        ...swalDarkConfig,
        title: 'Editar Título',
        input: 'text',
        inputValue: currentTitle,
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        inputValidator: (val) => !val && 'El nombre no puede estar vacío'
    });

    if (newTitle && newTitle !== currentTitle) {
        const { error } = await API.updateCancionTitle(id, newTitle);

        if (error) {
            Swal.fire({ ...swalDarkConfig, icon: 'error', title: 'Error', text: 'No se pudo actualizar' });
        } else {
            const songs = await API.getSongsByAlbum(state.albumId);
            UI.renderAlbumSongs(songs);
            
            Swal.fire({
                icon: 'success', title: 'Actualizado',
                toast: true, position: 'top-end', showConfirmButton: false, timer: 2000,
                background: '#181818', color: '#fff'
            });
        }
    }
};

let sortableInstance = null; // Para guardar la instancia y no crear dobles

export function activarDragAndDrop() {
    const lista = document.getElementById('albumSongsTableBody'); 

    if (sortableInstance) sortableInstance.destroy();

    sortableInstance = new Sortable(lista, {
        animation: 150,
        handle: '.drag-handle', // Esto coincide con el icono que pusimos en UI.js
        ghostClass: 'bg-dark-highlight', // Clase visual opcional
        onEnd: async function (evt) {
            // ... (tu lógica de updates estaba perfecta) ...
            const items = lista.querySelectorAll('.song-item');
            const updates = [];

            items.forEach((item, index) => {
                const id = item.dataset.id;
                updates.push({
                    id_cancion: id,
                    numero_track: index + 1
                });
            });
            
            // Usamos API.updateTrackOrder si importaste todo como API
            await API.updateTrackOrder(updates); 
        }
    });
}

// 1. Función para abrir el modal en MODO EDICIÓN

window.abrirModalEditarAlbum = async () => {
    if (!state.albumId) return;

    const select = document.getElementById('selectAlbum');
    const option = select.options[select.selectedIndex];

    // Llenar inputs
    document.getElementById('newAlbumTitle').value = option.text;
    document.getElementById('newAlbumDate').value = option.dataset.fullDate || ''; 

    if (option.dataset.type) document.getElementById('newAlbumType').value = option.dataset.type;
    if (option.dataset.songs) document.getElementById('newAlbumSongs').value = option.dataset.songs;

    const modalTitle = document.querySelector('#modal-album h2') || document.querySelector('#modal-album .modal-title');
    const modalBtn = document.querySelector('#modal-album .btn-confirm') || document.querySelector('#modal-album button[type="submit"]') || document.querySelector('#modal-album button:last-child');

    // Solo intentamos cambiar el texto si los encontramos (para que no truene)
    if (modalTitle) modalTitle.textContent = 'Editar Álbum';
    if (modalBtn) modalBtn.textContent = 'Guardar Cambios';

    // Abrir modal
    document.getElementById('modal-album').classList.add('active');
};

// Esta función se dispara CUANDO SELECCIONAN ARCHIVOS (Input change o Drop)
export async function handleFileSelect(event) {
    const files = event.target.files || event.dataTransfer.files;
    if (!files.length) return;

    if (!state.isContextLocked) {
        UI.resetFileUploadUI(); 
        return Swal.fire('¡Alto ahí!', 'Bloquea el contexto (Candado) antes de agregar canciones.', 'warning');
    }

    const btn = document.getElementById('btnProcesarAlbum');
    UI.toggleLoadingButton(btn, true, 'Analizando archivos...');

    // 1. Contamos las que ya existen en la base de datos (Tabla de abajo)
    const dbTracksCount = document.querySelectorAll('#albumSongsTableBody tr').length;
    
    // 2. Contamos las que YA tienes en espera (Staging) (Tabla de arriba)
    const stagedTracksCount = state.stagedFiles.length;

    // 3. El siguiente número empieza después de la suma de ambas
    let nextTrackNum = dbTracksCount + stagedTracksCount + 1;

    for (const file of files) {
        try {
            const duracionSeg = await Utils.obtenerDuracionAudio(file);
            const duracionFmt = Utils.formatearDuracionParaBD(duracionSeg);
            const cleanTitle = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");

            state.stagedFiles.push({
                id_temp: Date.now() + Math.random(), 
                file: file, 
                title: cleanTitle,
                duration: duracionFmt,
                trackNum: nextTrackNum++ // Aumentamos el contador
            });

        } catch (err) {
            console.error("Error leyendo archivo:", file.name, err);
        }
    }

    UI.renderUploadPreview(state.stagedFiles);
    UI.toggleLoadingButton(btn, false, 'Procesar todo el álbum');
    
    // Limpiamos el input para que detecte si subes el mismo archivo dos veces seguidas
    document.getElementById('inputFileAudio').value = ''; 
}

// 1. EDITAR NOMBRE EN STAGING
export const editarNombreStaging = async (tempId) => {
    // Buscar el archivo en el array
    const item = state.stagedFiles.find(f => f.id_temp == tempId);
    if (!item) return;

    const { value: newTitle } = await Swal.fire({
        title: 'Editar Título',
        input: 'text',
        inputValue: item.title,
        background: '#181818', color: '#fff',
        confirmButtonColor: '#1db954',
        showCancelButton: true
    });

    if (newTitle) {
        item.title = newTitle; // Actualizamos el dato en memoria
        UI.renderUploadPreview(state.stagedFiles); // Redibujamos
    }
};

// 2. ELIMINAR DE STAGING
export const eliminarDeStaging = async (tempId) => {
    const item = state.stagedFiles.find(f => f.id_temp == tempId);
    if (!item) return;

    const result = await Swal.fire({
        title: '¿Quitar de la lista?',
        text: `Vas a quitar "${item.title}" de la carga actual.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, quitar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#d33',
        background: '#181818', color: '#fff'
    });

    if (result.isConfirmed) {
        // 1. Borramos del array (Memoria)
        state.stagedFiles = state.stagedFiles.filter(f => f.id_temp != tempId);
        
        // 2. 👇 CORRECCIÓN: Recalculamos los números AQUÍ (En memoria)
        // Ya no llamamos a 'actualizarOrdenStaging' porque leería la fila vieja del HTML
        const existingCount = document.querySelectorAll('#albumSongsTableBody tr').length;
        
        state.stagedFiles.forEach((file, index) => {
            file.trackNum = existingCount + 1 + index;
        });

        // 3. Limpiezas extra
        if (state.stagedFiles.length === 0) {
            document.getElementById('inputFileAudio').value = '';
        }
        
        // 4. Renderizamos (Esto borrará la fila visualmente y pondrá los números bien)
        UI.renderUploadPreview(state.stagedFiles); 
        
        const Toast = Swal.mixin({
            toast: true, position: 'top-end', showConfirmButton: false, timer: 1500,
            background: '#181818', color: '#fff', iconColor: '#d33'
        });
        Toast.fire({ icon: 'success', title: 'Quitado de la lista' });
    }
};
/*
window.eliminarDeStaging = (tempId) => {
    state.stagedFiles = state.stagedFiles.filter(f => f.id_temp != tempId);
    UI.renderUploadPreview(state.stagedFiles);
    
    // Si vaciamos la lista, limpiamos el input file real
    if (state.stagedFiles.length === 0) {
        document.getElementById('inputFileAudio').value = '';
    }
};
*/

// 3. ACTUALIZAR ORDEN (Drag & Drop)
export const actualizarOrdenStaging = () => {
    const rows = document.querySelectorAll('#stagingTableBody tr');
    const newOrderArray = [];
    
    // Reconstruimos el array basado en el orden visual del HTML
    rows.forEach((row, index) => {
        const tempId = row.dataset.tempId;
        const item = state.stagedFiles.find(f => f.id_temp == tempId);
        
        // Recalculamos el número de track (Base existente + posición nueva)
        // Ejemplo: Si ya hay 3 rolas, la primera de aquí es la 4
        const existingCount = document.querySelectorAll('#albumSongsTableBody tr').length;
        item.trackNum = existingCount + 1 + index;
        
        newOrderArray.push(item);
    });

    state.stagedFiles = newOrderArray;
    UI.renderUploadPreview(state.stagedFiles); // Redibujamos para que se actualicen los numeritos (1, 2, 3...)
};

export async function procesarColaDeSubida() {
    if (state.stagedFiles.length === 0) return Swal.fire('Nada que subir', '', 'warning');

    const btn = document.getElementById('btnProcesarAlbum');
    UI.toggleLoadingButton(btn, true, `Subiendo ${state.stagedFiles.length} canciones...`);

    let exitosas = 0;
    const artistName = Utils.cleanString(document.getElementById('selectArtista').selectedOptions[0].text);
    const albumName = Utils.cleanString(document.getElementById('selectAlbum').selectedOptions[0].text);
    const coverUrl = document.getElementById('selectAlbum').selectedOptions[0].dataset.cover;

    // Iteramos sobre el array (Staging)
    for (const item of state.stagedFiles) {
        try {
            // 1. Subir Archivo
            const path = `${artistName}/${albumName}/${Date.now()}_${Utils.cleanString(item.file.name)}`;
            const { error: upErr } = await API.uploadFileToStorage(path, item.file);
            if (upErr) throw upErr;

            const { data: publicUrl } = await API.getPublicUrl(path);

            // 2. Insertar en BD
            const { error: dbErr } = await API.insertCancion({
                titulo_cancion: item.title,
                artista_id: state.artistId,
                album_id: state.albumId,
                audio_path: publicUrl.publicUrl,
                reproducciones: 0,
                duracion_cancion: item.duration,
                imagen_url: coverUrl,
                numero_track: item.trackNum
            });
            if (dbErr) throw dbErr;

            exitosas++;
        } catch (err) {
            console.error("Error subiendo:", item.title, err);
        }
    }

    // Limpieza final
    UI.toggleLoadingButton(btn, false, 'Procesar todo el álbum');
    state.stagedFiles = [];
    UI.renderUploadPreview([]); 
    document.getElementById('inputFileAudio').value = '';

    await recalculateAlbumDuration(state.albumId);
    const songs = await API.getSongsByAlbum(state.albumId);
    UI.renderAlbumSongs(songs);

    Swal.fire({
        title: '¡Subida Completa!',
        text: `Se agregaron ${exitosas} canciones exitosamente.`,
        icon: 'success',
        showCancelButton: true,
        confirmButtonText: 'Seguir en este Álbum',
        cancelButtonText: 'Cambiar de Álbum', // Botón secundario
        confirmButtonColor: '#1db954',
        cancelButtonColor: '#333',
        background: '#181818', color: '#fff'
    }).then((result) => {
        // Si el usuario da click en "Cambiar de Álbum" (Cancel button)
        if (result.dismiss === Swal.DismissReason.cancel) {
            toggleContextLock(); // 🔓 ¡DESBLOQUEAMOS AUTOMÁTICAMENTE!
            
            // Opcional: Limpiar selects si quieres forzar a elegir de nuevo
            // UI.resetSelect('selectAlbum', 'Selecciona Artista Primero');
        }
        // Si da click en "Seguir", no hacemos nada (se queda el candado puesto)
    });
}

//Opcion nuclear
export async function resetearTodo() {
    // 1. Preguntamos por si fue dedazo
    const result = await Swal.fire({
        title: '¿Reiniciar todo?',
        text: "Se limpiará la selección actual y la lista de subida.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#333',
        confirmButtonText: 'Sí, limpiar',
        cancelButtonText: 'Cancelar',
        background: '#181818', color: '#fff'
    });

    if (!result.isConfirmed) return;

    // 2. Limpieza Nuclear del Estado ☢️
    state.genreId = null;
    state.artistId = null;
    state.albumId = null;
    state.isContextLocked = false;
    state.stagedFiles = [];

    // 3. Limpieza Visual (UI)
    // Selects
    document.getElementById('selectGenero').value = "";
    UI.resetSelect('selectArtista', 'Selecciona un género primero');
    UI.resetSelect('selectAlbum', 'Selecciona un artista primero');
    
    // Escondemos portadas y tablas
    UI.hideCoverPreview();
    UI.hideAlbumPreview(); // Tabla de abajo
    UI.renderUploadPreview([]); // Tabla de arriba (Staging)
    
    // Inputs
    UI.resetFileUploadUI();
    
    // Candado
    UI.bloquearContextoUI(false);

    // 4. Feedback
    const Toast = Swal.mixin({
        toast: true, position: 'top-end', showConfirmButton: false, timer: 1500,
        background: '#181818', color: '#fff', iconColor: '#d33'
    });
    Toast.fire({ icon: 'success', title: 'Todo limpio' });
}

// --- 🆕 EVENTOS DE YOUTUBE ---

// JS/admin/modules/music/events.js

export async function initYTManager() {
    const btnConsultar = document.getElementById('btnConsultarYT');

    btnConsultar?.addEventListener('click', async () => {
        const url = document.getElementById('ytLink').value.trim();
        if (!url) return Swal.fire('Ojo', 'Pega un link de YouTube', 'warning');

        UI.toggleLoadingButton(btnConsultar, true, 'Buscando...');

        try {
            // Aquí definimos 'res'
            const res = await API.consultarYTMetadata(url); 
            console.log("📦 Respuesta recibida:", res);

            if (res && !res.error) {
                // 💡 'res' vive aquí adentro, así que aquí lo usamos
                UI.renderYTPreview(res);
                await cargarGenerosYT(); // La función que arregla tus combos
            } else {
                Swal.fire('Error', res.error || 'No se pudo obtener metadata', 'error');
            }
        } catch (error) {
            console.error("❌ Error en el flujo:", error);
            Swal.fire('Error', 'Fallo de conexión con el servidor Flask', 'error');
        } finally {
            UI.toggleLoadingButton(btnConsultar, false, 'Consultar');
        }
    });

    const selectGeneroYT = document.getElementById('yt-select-genero');
    const selectArtistaYT = document.getElementById('yt-select-artista');

    // 🔄 El "Cable" para cargar artistas
    selectGeneroYT?.addEventListener('change', async (e) => {
        const genreId = e.target.value;
        
        if (!genreId) {
            UI.resetSelect('yt-select-artista', 'Selecciona un género primero');
            return;
        }

        UI.resetSelect('yt-select-artista', 'Cargando artistas...');
        
        try {
            const { data } = await API.getArtistas(genreId);
            UI.llenarSelect(selectArtistaYT, data, 'id_artista', 'nombre', 'Seleccionar Artista');
        } catch (error) {
            console.error("❌ Error cargando artistas para YT:", error);
        }
    });

    const btnDescargar = document.getElementById('btnDescargarMasivo');
    btnDescargar?.addEventListener('click', handleDescargaMasiva);
}

async function cargarGenerosYT() {
    const select = document.getElementById('yt-select-genero');
    // Si ya tiene opciones (más de la de "Seleccionar"), no lo volvemos a cargar
    if (select.options.length > 1) return;

    const { data, error } = await API.getGeneros();
    if (data) {
        UI.llenarSelect(select, data, 'id_gener', 'nombre_genero', 'Seleccionar Género');
    }
}

// JS/admin/modules/music/events.js

async function handleDescargaMasiva() {
    const btnDescargar = document.getElementById('btnDescargarMasivo');
    const ytUrl = document.getElementById('ytLink').value;
    const artistId = document.getElementById('yt-select-artista').value;
    const artistName = document.getElementById('yt-select-artista').selectedOptions[0].text;
    const albumName = document.getElementById('yt-album-name').value;
    const albumYear = document.getElementById('yt-album-year').value;
    const genreId = document.getElementById('yt-select-genero').value;
    const customCoverFile = document.getElementById('yt-custom-cover').files[0];

    let finalCoverUrl = "";

    if (customCoverFile) {
        const fileName = `covers/${Date.now()}_${customCoverFile.name}`;
        // Usamos el API de Storage de Supabase
        const { data, error } = await API.getDB().storage
            .from('portadas-albums') // ⚠️ Asegúrate de que el bucket sea PÚBLICO
            .upload(fileName, customCoverFile);
        
        if (error) throw error;

        // Obtenemos la URL pública para mandársela a Python
        const { data: pubUrl } = API.getDB().storage
            .from('portadas-albums')
            .getPublicUrl(fileName);
            
        finalCoverUrl = pubUrl.publicUrl;
    }
    
    if (!artistId || !albumName || !albumYear) {
        return Swal.fire('Falta info', 'Artista, nombre del disco y año son obligatorios, mai.', 'warning');
    }

    UI.toggleLoadingButton(btnDescargar, true, 'Subiendo portada y procesando...');

    try {
        let finalCoverUrl = "";
        
        // 1. Subir portada manual al Bucket si existe
        if (customCoverFile) {
            const fileName = `covers/${Date.now()}_${customCoverFile.name}`;
            const { data, error } = await API.getDB().storage
                .from('portadas-albums') // ⚠️ Crea este bucket en el dashboard de Supabase primero
                .upload(fileName, customCoverFile);
            
            if (error) throw error;
            const { data: pubUrl } = API.getDB().storage.from('portadas-albums').getPublicUrl(fileName);
            finalCoverUrl = pubUrl.publicUrl;
        }

        // 2. Armar el payload súper cargado
        const payload = {
            url: ytUrl,
            artista_id: artistId,        // Para el query de Supabase
            artista_nombre: artistName,  // Para la carpeta del server
            album_titulo: albumName,
            album_year: albumYear,
            genero_id: genreId,
            imagen_url: finalCoverUrl,   // La URL del bucket
            tracks: Array.from(document.querySelectorAll('#yt-results-body tr'))
                .filter(row => row.querySelector('.track-select').checked)
                .map(row => ({
                    titulo: row.querySelector('.edit-input-yt.title').value
                }))
        };

        const res = await API.descargarYTPlaylist(payload);

        if (res.success) {
            Swal.fire('¡Éxito Total!', `Álbum "${albumName}" guardado en servidor y catálogo.`, 'success');
            document.getElementById('yt-preview-container').style.display = 'none';
        } else {
            throw new Error(res.error);
        }
    } catch (error) {
        console.error(error);
        Swal.fire('Error', error.message, 'error');
    } finally {
        UI.toggleLoadingButton(btnDescargar, false, 'Iniciar Descarga Masiva');
    }
}