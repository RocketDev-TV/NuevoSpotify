// JS/admin/modules/music/main.js
import * as API from './api.js';
import * as UI from './ui.js';
import * as Events from './events.js';

console.log("🎵 Music Manager (Modular) Cargado");

// --- 1. PUENTE HTML <-> JS ---
window.crearGenero = Events.crearGenero;
window.crearArtista = Events.crearArtista;
window.crearAlbum = Events.crearAlbum;
window.abrirModal = (id) => document.getElementById(`modal-${id}`).classList.add('active');
window.cerrarModal = UI.cerrarModal;
window.cambiarTabMusic = UI.cambiarTabMusic;

// Funciones de Carga Masiva (Staging)
window.bloquearContexto = Events.toggleContextLock;
window.editarNombreStaging = Events.editarNombreStaging;
window.eliminarDeStaging = Events.eliminarDeStaging;
window.actualizarOrdenStaging = Events.actualizarOrdenStaging;
window.resetearTodo = Events.resetearTodo;

// --- 2. INICIALIZACIÓN ---
export async function initMusicManager() {
    console.log("🚀 Iniciando Music Manager...");

    // A. Cargar Datos Iniciales
    const { data, error } = await API.getGeneros();
    if (!error) {
        UI.llenarSelect(document.getElementById('selectGenero'), data, 'id_gener', 'nombre_genero', 'Selecciona Género');
    }

    // B. Listeners de Selects (Contexto)
    const selGenero = document.getElementById('selectGenero');
    const selArtista = document.getElementById('selectArtista');
    const selAlbum = document.getElementById('selectAlbum');

    if (selGenero) selGenero.addEventListener('change', Events.handleGenreChange);
    if (selArtista) selArtista.addEventListener('change', Events.handleArtistChange);
    if (selAlbum) selAlbum.addEventListener('change', Events.handleAlbumChange);

    // C. Preparar el Formulario de Carga (LA CORRECCIÓN) 🛠️
    const formCancion = document.getElementById('formCancion');
    if (formCancion) {
        // 1. Clonamos el formulario PRIMERO para limpiar cualquier listener viejo
        const newForm = formCancion.cloneNode(true);
        formCancion.parentNode.replaceChild(newForm, formCancion);

        // 2. Ahora conectamos el evento SUBMIT al NUEVO formulario
        newForm.addEventListener('submit', (e) => {
            e.preventDefault();
            Events.procesarColaDeSubida();
        });

        // 3. Conectamos el Input de Archivos (que está DENTRO del nuevo form)
        const newInputFile = document.getElementById('inputFileAudio');
        if (newInputFile) {
            newInputFile.addEventListener('change', (e) => {
                console.log("📂 Archivos seleccionados:", e.target.files.length); // Debug
                Events.handleFileSelect(e);
            });
        }

        // 4. Conectamos Drag & Drop al nuevo form
        setupDragAndDrop();
    }

    // D. Restaurar Sesión
    await recuperarEstadoPrevio();
}

// --- 3. AUTO-RECUPERACIÓN ---
async function recuperarEstadoPrevio() {
    // ... (Tu código de recuperación, igual que antes) ...
    const selectArtista = document.getElementById('selectArtista');
    const selectAlbum = document.getElementById('selectAlbum');
    
    if (selectArtista && selectArtista.value) {
        Events.state.artistId = selectArtista.value;
        await Events.handleArtistChange({ target: { value: selectArtista.value } });

        if (selectAlbum && selectAlbum.value) {
            selectAlbum.value = selectAlbum.value;
            const option = selectAlbum.querySelector(`option[value="${selectAlbum.value}"]`);
            if(option) {
                option.selected = true;
                Events.state.albumId = selectAlbum.value;
                await Events.handleAlbumChange({ target: selectAlbum });
            }
        }
    }
}

// --- 4. DRAG & DROP ---
function setupDragAndDrop() {
    const dropZone = document.getElementById('dropZone');
    const input = document.getElementById('inputFileAudio');

    if (!dropZone || !input) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); });
    });

    ['dragenter', 'dragover'].forEach(() => dropZone.classList.add('highlight'));
    ['dragleave', 'drop'].forEach(() => dropZone.classList.remove('highlight'));

    dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        input.files = files;
        // Disparamos el cambio manualmente
        const event = new Event('change');
        input.dispatchEvent(event);
    });
}

// EN JS/admin/modules/music/main.js (Dentro de initMusicManager o al final)

// Referencias al DOM
const btnClonar = document.getElementById('btnClonar');
const inputLink = document.getElementById('spotifyLink');
const statusArea = document.getElementById('cloner-status');

if (btnClonar) {
    btnClonar.addEventListener('click', async () => {
        const url = inputLink.value.trim();

        if (!url) return Swal.fire('¡Aguanta!', 'Primero pega un link de Spotify, ¿no?', 'warning');

        // 1. UI: Modo Cargando
        btnClonar.disabled = true;
        btnClonar.innerHTML = `<i class="ph ph-spinner ph-spin"></i> Espiando...`;
        statusArea.innerHTML = `
            <div class="text-center text-warning mt-3">
                <i class="ph ph-magnifying-glass mb-2"></i><br>
                Contactando a Spotify...
            </div>`;

        try {
            // 2. PETICIÓN AL PYTHON 🐍
            const response = await fetch('http://localhost:3001/api/spotify/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ link: url })
            });

            const data = await response.json();

            if (!data.success) throw new Error(data.error || "Error desconocido del servidor");

            // 3. ÉXITO: Pintamos la tabla
            console.log("🔥 Metadata Recibida:", data);
            UI.renderSpotifyImportTable(data.tracks); 
            
            statusArea.innerHTML = ''; // Borramos el texto de carga antes de que el UI pinte la tabla
            
            statusArea.innerHTML = ''; // Limpiamos el mensaje de carga
            Swal.fire({
                title: '¡Encontrado!',
                text: `Se detectaron ${data.count} canciones.`,
                icon: 'success',
                toast: true, position: 'top-end', timer: 3000, showConfirmButton: false
            });

        } catch (err) {
            console.error("Error importando:", err);
            statusArea.innerHTML = `
                <div class="alert alert-danger mt-3">
                    <i class="ph ph-warning-circle"></i> ${err.message}
                </div>`;
        } finally {
            // 4. Restaurar botón
            btnClonar.disabled = false;
            btnClonar.innerHTML = `<i class="ph ph-download-simple"></i> Clonar`;
        }
    });
}


// 🔥 ARRANQUE AUTOMÁTICO
document.addEventListener('DOMContentLoaded', initMusicManager);