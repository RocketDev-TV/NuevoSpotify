// JS/admin/modules/music/ui.js

export function llenarSelect(selectElement, dataArray, valueKey, textKey, placeholder, imageKey = null) {
    selectElement.innerHTML = `<option value="" data-cover="">${placeholder}</option>`;
    dataArray.forEach(item => {
        const option = document.createElement('option');
        option.value = item[valueKey];
        option.textContent = item[textKey];
        if (imageKey) {
            option.dataset.cover = item[imageKey] || "https://placehold.co/400x400?text=Sin+Portada";
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