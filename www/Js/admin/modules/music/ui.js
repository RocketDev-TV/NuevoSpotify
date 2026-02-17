// JS/admin/modules/music/ui.js
import * as API from './api.js';
import * as UI from './ui.js';


export function llenarSelect(selectElement, dataArray, valueKey, textKey, placeholder, imageKey = null, yearKey = null) {
    selectElement.innerHTML = `<option value="" data-cover="" data-year="">${placeholder}</option>`;

    dataArray.forEach(item => {
        const option = document.createElement('option');
        option.value = item[valueKey];
        option.textContent = item[textKey];

        // Guardar Portada
        if (imageKey) {
            option.dataset.cover = item[imageKey] || "https://placehold.co/400x400?text=Sin+Portada";
        }

        // Guardar Año (NUEVO) 📅
        if (yearKey && item[yearKey]) {
            // La fecha viene como "2008-11-20", cortamos solo el año
            option.dataset.year = item[yearKey].substring(0, 4);
            option.dataset.fullDate = item[yearKey];
        }

        // Guardar Tipo y Cantidad para la edición
        if (item.tipo_lanzamiento) option.dataset.type = item.tipo_lanzamiento;
        if (item.num_canciones) option.dataset.songs = item.num_canciones;

        selectElement.appendChild(option);
    });
    selectElement.disabled = false;
}

export function resetSelect(id, placeholder) {
    const s = document.getElementById(id);
    if (s) {
        s.innerHTML = `<option value="">${placeholder}</option>`;
        s.disabled = true;
        s.value = "";
    }
}

export function showCoverPreview(url) {
    const area = document.getElementById('coverArea');
    const img = document.getElementById('currentCover');
    if (area && img) {
        img.src = url;
        area.style.display = 'block';
    }
}

export function hideCoverPreview() {
    const area = document.getElementById('coverArea');
    const img = document.getElementById('currentCover');
    if (area && img) {
        area.style.display = 'none';
        img.src = '';
    }
}

export function resetFileUploadUI() {
    document.getElementById('inputFileAudio').value = '';
    document.getElementById('fileLabelText').textContent = "Click para elegir canciones o arrastra aquí";
    document.getElementById('fileCountBadge').style.display = 'none';
    document.getElementById('fileListPreview').innerHTML = '';
}

export function toggleLoadingButton(btn, isLoading, text = "") {
    if (isLoading) {
        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = `<i class="ph ph-spinner ph-spin"></i> ${text}`;
        btn.disabled = true;
    } else {
        btn.innerHTML = btn.dataset.originalText || text;
        btn.disabled = false;
    }
}

export function bloquearContextoUI(isLocked) {
    const btn = document.getElementById('btnLockContext');
    document.getElementById('selectGenero').disabled = isLocked;
    document.getElementById('selectArtista').disabled = isLocked;
    document.getElementById('selectAlbum').disabled = isLocked;

    if (isLocked) {
        btn.innerHTML = '<i class="ph ph-check-circle"></i> Contexto Fijado';
        btn.classList.add('btn-success');
    } else {
        btn.innerHTML = '<i class="ph ph-lock-key"></i> Bloquear Contexto';
        btn.classList.remove('btn-success');
    }
}

// Helpers para Modales
export function cerrarModal(suffix) {
    // El HTML manda 'genero', pero el ID real es 'modal-genero'
    const id = `modal-${suffix}`;

    const el = document.getElementById(id);
    if (el) {
        el.classList.remove('active');
        // Limpiamos los inputs dentro de ese modal
        el.querySelectorAll('input, textarea, select').forEach(i => i.value = '');
    } else {
        console.error(`No se encontró el modal con ID: ${id}`);
    }
}

export function cambiarTabMusic(tab) {
    // ... (tu código actual para ocultar/mostrar tabs) ...
    document.getElementById('tab-importar').style.display = 'none';
    document.getElementById('tab-manual').style.display = 'none';
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    if (tab === 'importar') {
        document.getElementById('tab-importar').style.display = 'block';
        const btn = document.querySelector('.tab-btn:nth-child(1)');
        if (btn) btn.classList.add('active');
    } else if (tab === 'manual') {
        document.getElementById('tab-manual').style.display = 'block';
        const btn = document.querySelector('.tab-btn:nth-child(2)');
        if (btn) btn.classList.add('active');
    }
}

window.cambiarTabMusic = cambiarTabMusic;


// 2. Renderizar la Tabla 🎨

export function renderAlbumSongs(songs) {
    const container = document.getElementById('albumInventoryContainer');
    const tbody = document.getElementById('albumSongsTableBody');
    const badge = document.getElementById('albumTotalSongs');

    if (!container || !tbody) return;

    tbody.innerHTML = ''; // Limpiar tabla

    if (songs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-5">Álbum vacío</td></tr>`;
        if (badge) badge.textContent = "0 tracks";
    } else {
        // Ordenamos visualmente por numero_track para que al renderizar se vean en orden
        // (Si no tienen numero, usamos el ID como respaldo)
        songs.sort((a, b) => (a.numero_track || 999) - (b.numero_track || 999));

        songs.forEach((song, index) => {
            const tr = document.createElement('tr');

            // 1. Clases y Data-ID para el Drag & Drop
            tr.classList.add('song-item');
            tr.dataset.id = song.id_cancion;

            const trackNum = index + 1;
            const safeTitle = song.titulo_cancion.replace(/'/g, "\\'");

            tr.innerHTML = `
                <td class="text-center align-middle text-secondary">
                    <div class="d-flex align-items-center justify-content-center gap-2">
                        <i class="ph ph-list drag-handle" style="cursor: grab; color: #666;"></i>
                        <span class="small font-monospace">${trackNum}</span>
                    </div>
                </td>
                
                <td class="align-middle">
                    <div class="song-title-cell text-white fw-bold">${song.titulo_cancion}</div>
                </td>
                
                <td class="text-center align-middle font-monospace" style="color: #bbb;">
                    ${formatDuration(song.duracion_cancion)} 
                </td>
                
                <td class="align-middle">
                    <div class="d-flex justify-content-center align-items-center gap-3">
                        
                        <button class="btn-icon-action edit" 
                                style="background:none; border:none; color:#888; transition:0.2s; cursor:pointer;"
                                onmouseover="this.style.color='#1db954'; this.style.transform='scale(1.1)'"
                                onmouseout="this.style.color='#888'; this.style.transform='scale(1)'"
                                onclick="window.editarCancion(${song.id_cancion}, '${safeTitle}')" 
                                title="Editar nombre">
                            <i class="ph ph-pencil-simple fs-5"></i>
                        </button>

                        <button class="btn-icon-action delete" 
                                style="background:none; border:none; color:#888; transition:0.2s; cursor:pointer;"
                                onmouseover="this.style.color='#ff4d4d'; this.style.transform='scale(1.1)'"
                                onmouseout="this.style.color='#888'; this.style.transform='scale(1)'"
                                onclick="window.borrarCancion(${song.id_cancion})" 
                                title="Borrar canción">
                            <i class="ph ph-trash fs-5"></i>
                        </button>

                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
        if (badge) badge.textContent = `${songs.length} tracks`;
    }

    container.style.display = 'block';
    container.classList.add('animate__animated', 'animate__fadeIn');
}

// Helper para convertir segundos (float) a MM:SS
function formatDuration(rawDuration) {
    if (!rawDuration) return '--:--';

    // Convertimos a string por si viene como número
    const str = rawDuration.toString();

    // Separamos minutos y segundos por el punto
    const parts = str.split('.');

    const min = parts[0];
    let sec = parts[1] || '00';

    // Caso especial: Si es 4.5, significa 4:50, no 4:05
    if (sec.length === 1) {
        sec += '0';
    }

    // Nos aseguramos de tomar solo los primeros 2 dígitos de los segundos
    return `${min}:${sec.substring(0, 2)}`;
}

export function hideAlbumPreview() {
    const container = document.getElementById('albumInventoryContainer');
    if (container) {
        container.style.display = 'none';
        // Limpiar el título también para que no se vea el rastro
        document.getElementById('inventoryTitle').textContent = 'Título';
        document.getElementById('inventoryYear').textContent = '(----)';
        document.getElementById('albumSongsTableBody').innerHTML = '';
    }
}

let stagingSortable = null;

export function renderUploadPreview(filesArray) {
    const container = document.getElementById('fileListPreview');
    if (!container) return;

    const existingTracksCount = document.querySelectorAll('#albumSongsTableBody tr').length;

    container.innerHTML = `
        <table class="table table-dark table-hover table-sm align-middle mb-0" style="table-layout: fixed; width: 100%;">
            <thead style="position: sticky; top: 0; background: #121212; z-index: 5; box-shadow: 0 2px 5px rgba(0,0,0,0.5);">
                <tr class="text-secondary" style="font-size: 0.75rem;">
                    <th style="width: 40px;"></th> 
                    <th style="width: 40px;" class="text-center">#</th>
                    <th>Título</th>
                    <th style="width: 70px;" class="text-end"><i class="ph ph-clock"></i></th>
                    <th style="width: 50px;"></th> 
                </tr>
            </thead>
            <tbody id="stagingTableBody">
                </tbody>
        </table>
    `;

    const tbody = document.getElementById('stagingTableBody');

    if (filesArray.length === 0) {
        container.innerHTML = `
            <div class="d-flex flex-column align-items-center justify-content-center text-muted" style="height: 150px;">
                <i class="ph ph-cloud-arrow-up fs-1 mb-2" style="opacity: 0.5;"></i>
                <span class="small">Arrastra tus canciones aquí</span>
            </div>`;
        const btn = document.getElementById('btnProcesarAlbum');
        if (btn) btn.style.display = 'none';
        return;
    }

    filesArray.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.dataset.tempId = item.id_temp;
        tr.classList.add('staged-item');

        const displayNum = existingTracksCount + index + 1;
        item.trackNum = displayNum;

        tr.innerHTML = `
            <td class="text-center">
                <i class="ph ph-dots-six-vertical drag-handle-staged" 
                   style="cursor: grab; color: #555; font-size: 1.2rem;"></i>
            </td>
            
            <td class="text-secondary font-monospace text-center small">
                ${displayNum}
            </td>

            <td style="overflow: hidden;">
                <div class="d-flex align-items-center justify-content-between gap-3 pe-2">
                    <div class="d-flex flex-column" style="min-width: 0;">
                        <div class="text-truncate text-white fw-bold" title="${item.title}">
                            ${item.title}
                        </div>
                        <div class="text-muted" style="font-size: 0.65rem;">
                            ${(item.file.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                    </div>
                    
                    <button type="button" 
                            class="btn-staging edit"
                            style="flex-shrink: 0;"
                            onclick="window.editarNombreStaging('${item.id_temp}')">
                        <i class="ph ph-pencil-simple fs-5"></i>
                    </button>
                </div>
            </td>

            <td class="text-end font-monospace text-secondary small">
                ${item.duration.toString().replace('.', ':')}
            </td>

            <td class="text-end">
                <button type="button"
                        class="btn-staging delete"
                        onclick="window.eliminarDeStaging('${item.id_temp}')">
                    <i class="ph ph-x fs-5"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (stagingSortable) stagingSortable.destroy();
    stagingSortable = new Sortable(tbody, {
        animation: 150,
        handle: '.drag-handle-staged',
        onEnd: function () {
            window.actualizarOrdenStaging();
        }
    });

    const btnProcess = document.getElementById('btnProcesarAlbum');
    if (btnProcess) btnProcess.style.display = 'block';
}

export function renderSpotifyImportTable(tracks) {
    const container = document.getElementById('cloner-status');
    if (!container) return;

    if (!tracks || tracks.length === 0) {
        container.innerHTML = '<p class="text-muted text-center mt-3">No hay canciones para mostrar.</p>';
        return;
    }

    let html = `
    <div class="glass-panel mt-4 animate__animated animate__fadeIn" style="border: 1px solid rgba(29, 185, 84, 0.3);">
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h4 class="text-success"><i class="ph ph-spotify-logo"></i> Resultados encontrados</h4>
            <span class="badge bg-success text-black border-0 fw-bold">${tracks.length} tracks</span>
        </div>
        
        <div class="table-responsive custom-scroll" style="max-height: 400px; overflow-y: auto;">
            <table class="table table-dark table-hover table-sm align-middle mb-0" style="table-layout: fixed;">
                <thead style="position: sticky; top: 0; background: #121212; z-index: 10;">
                    <tr class="text-secondary small">
                        <th width="40" class="text-center">#</th>
                        <th width="60">Cover</th>
                        <th>Título</th>
                        <th>Artista</th>
                        <th>Álbum</th>
                        <th class="text-end" width="60">Dur.</th>
                    </tr>
                </thead>
                <tbody>
    `;

    tracks.forEach((track, index) => {
        html += `
            <tr>
                <td class="text-center text-muted small">${index + 1}</td>
                <td>
                    <img src="${track.cover_url}" style="width: 40px; height: 40px; border-radius: 4px; object-fit: cover; box-shadow: 0 2px 5px rgba(0,0,0,0.5);">
                </td>
                <td class="fw-bold text-white text-truncate" title="${track.titulo}">
                    ${track.titulo}
                </td>
                <td class="text-secondary text-truncate" title="${track.artista}">
                    ${track.artista}
                </td>
                <td class="text-muted small text-truncate" title="${track.album}">
                    ${track.album}
                </td>
                <td class="text-end font-monospace small text-secondary">
                    ${track.duracion_fmt}
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
        
        <div class="mt-3 text-end pt-3 border-top border-secondary">
            <button id="btnImportarSupabase" class="btn-primary" style="background-color: #1db954; color: black; font-weight: bold; width: 100%;">
                <i class="ph ph-cloud-arrow-up"></i> Guardar en mi Catálogo
            </button>
        </div>
    </div>
    `;

    container.innerHTML = html;

    // Listener temporal para el botón de guardar
    const btnSave = document.getElementById('btnImportarSupabase');
    if(btnSave) {
        btnSave.addEventListener('click', () => {
             Swal.fire('¡Siguiente Paso!', 'Aquí iniciaremos la descarga y conversión (Fase 2).', 'info');
        });
    }
}

export function renderYTPreview(data) {
    const container = document.getElementById('yt-results-body');
    container.innerHTML = ''; 

    data.tracks.forEach((track, index) => {
        const tr = document.createElement('tr');
        tr.dataset.videoUrl = track.url_video;
        tr.className = 'song-row-yt';

        tr.innerHTML = `
            <td><input type="checkbox" class="track-select" checked></td>
            <td>
                <img src="${track.thumbnail}" style="width: 40px; border-radius: 4px;">
            </td>
            <td>
                <input type="text" class="edit-input-yt title" value="${track.titulo}">
            </td>
            <td>${track.duracion_fmt}</td>
        `;
        container.appendChild(tr);
    });
}

export function initYTManager() {
    const btnConsultar = document.getElementById('btnConsultarYT');
    const inputYT = document.getElementById('ytLink');

    btnConsultar?.addEventListener('click', async () => {
        const url = inputYT.value.trim();
        
        if (!url) {
            return Swal.fire('Ojo', 'Pega un link de YouTube primero, mai.', 'warning');
        }

        // Bloqueamos el botón con un spinner (esto ya lo tienes en ui.js)
        UI.toggleLoadingButton(btnConsultar, true, 'Buscando...');

        try {
            // 2. Llamada a tu servidor Flask local
            const res = await API.consultarYTMetadata(url);

            if (res.error) {
                Swal.fire('Error del Búnker', res.error, 'error');
            } else {
                // 3. Renderizamos la tabla con la metadata
                UI.renderYTPreview(res);
            }
        } catch (error) {
            console.error("❌ Fallo de conexión con Flask:", error);
            Swal.fire('Error', 'No pude conectar con el servidor Python. ¿Está encendido?', 'error');
        } finally {
            UI.toggleLoadingButton(btnConsultar, false, 'Consultar');
        }
    });
}

// Agrega esto dentro de tu initYTManager o en el bloque de inicialización
export async function syncYTCombos() {
    const selectGeneroYT = document.getElementById('yt-select-genero');
    const selectArtistaYT = document.getElementById('yt-select-artista');

    // 1. Llenar géneros inicialmente
    const { data: generos } = await API.getGeneros();
    UI.llenarSelect(selectGeneroYT, generos, 'id_gener', 'nombre_genero', 'Seleccionar Género');

    // 2. Evento de cambio de género para YouTube
    selectGeneroYT.addEventListener('change', async (e) => {
        const genId = e.target.value;
        UI.resetSelect('yt-select-artista', 'Cargando artistas...');
        
        if (genId) {
            const { data: artistas } = await API.getArtistas(genId);
            UI.llenarSelect(selectArtistaYT, artistas, 'id_artista', 'nombre', 'Seleccionar Artista');
        }
    });
}