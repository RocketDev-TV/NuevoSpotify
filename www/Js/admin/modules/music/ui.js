// JS/admin/modules/music/ui.js

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
        }
        
        selectElement.appendChild(option);
    });
    selectElement.disabled = false;
}

export function resetSelect(id, placeholder) {
    const s = document.getElementById(id);
    if(s) {
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
    document.getElementById('tab-importar').style.display = 'none';
    document.getElementById('tab-manual').style.display = 'none';
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    if (tab === 'importar') {
        document.getElementById('tab-importar').style.display = 'block';
        const btn = document.querySelector('.tab-btn:nth-child(1)'); // Primer botón
        if(btn) btn.classList.add('active');
    } else if (tab === 'manual') {
        document.getElementById('tab-manual').style.display = 'block';
        const btn = document.querySelector('.tab-btn:nth-child(2)'); // Segundo botón
        if(btn) btn.classList.add('active');
    }
}


// 2. Renderizar la Tabla 🎨

// JS/admin/modules/music/ui.js

export function renderAlbumSongs(songs) {
    const container = document.getElementById('albumInventoryContainer'); 
    const tbody = document.getElementById('albumSongsTableBody');
    const badge = document.getElementById('albumTotalSongs');

    if (!container || !tbody) return;

    tbody.innerHTML = '';

    if (songs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted py-5">
                    <i class="ph ph-music-notes-simple fs-1 mb-2"></i><br>
                    Este álbum está vacío. ¡Sube algo arriba!
                </td>
            </tr>`;
        if(badge) badge.textContent = "0 tracks";
    } else {
        songs.forEach((song, index) => {
            const tr = document.createElement('tr');
            const trackNum = index + 1;
            
            // Escapar comillas simples para evitar errores de JS
            const safeTitle = song.titulo_cancion.replace(/'/g, "\\'"); 

            tr.innerHTML = `
                <td class="text-center align-middle text-secondary">${trackNum}</td>
                
                <td class="align-middle">
                    <div class="song-title-cell">${song.titulo_cancion}</div>
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
        if(badge) badge.textContent = `${songs.length} tracks`;
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
    const container = document.getElementById('albumPreviewContainer');
    if (container) container.style.display = 'none';
}