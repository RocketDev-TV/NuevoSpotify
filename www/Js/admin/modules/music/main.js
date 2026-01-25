// JS/admin/modules/music/main.js
import * as API from './api.js';
import * as UI from './ui.js';
import * as Events from './events.js';

console.log("🎵 Music Manager (Modular) Cargado");

// --- EXPONER FUNCIONES AL HTML ---
window.crearGenero = Events.crearGenero;
window.crearArtista = Events.crearArtista;
window.crearAlbum = Events.crearAlbum;
window.abrirModal = (id) => document.getElementById(`modal-${id}`).classList.add('active');
window.cerrarModal = UI.cerrarModal;

window.cambiarTabMusic = UI.cambiarTabMusic;

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Cargar Géneros Iniciales
    const { data, error } = await API.getGeneros();
    if (!error) {
        UI.llenarSelect(document.getElementById('selectGenero'), data, 'id_gener', 'nombre_genero', 'Selecciona Género');
    }

    // 2. Listeners de Selects
    document.getElementById('selectGenero').addEventListener('change', Events.handleGenreChange);
    document.getElementById('selectArtista').addEventListener('change', Events.handleArtistChange);
    document.getElementById('selectAlbum').addEventListener('change', Events.handleAlbumChange);

    // 3. Listener de Submit (Subida)
    const formCancion = document.getElementById('formCancion');
    if (formCancion) {
        formCancion.addEventListener('submit', Events.handleSongUpload);
    }

    // 4. Botón Bloquear Contexto
    document.getElementById('btnLockContext').addEventListener('click', () => {
        if (!Events.state.albumId) return Swal.fire('Ojo', 'Selecciona un álbum primero', 'warning');
        UI.bloquearContextoUI(true);
        Swal.fire({
            title: 'Listo', text: 'Arrastra tus canciones ahora', icon: 'success', 
            confirmButtonColor: '#1db954', background: '#1e1e1e', color: '#fff'
        });
    });

    const btnLock = document.getElementById('btnLockContext');
    if (btnLock) {
        // Ahora delegamos la lógica a Events.js
        btnLock.addEventListener('click', Events.toggleContextLock);
    }
    
    // 5. Drag & Drop (Zona de Arrastre)
    setupDragAndDrop();
});

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
        // Simular cambio para actualizar UI
        const event = new Event('change');
        input.dispatchEvent(event);
    });

    // Listener visual para el input file
    input.addEventListener('change', (e) => {
        const count = e.target.files.length;
        const label = document.getElementById('fileLabelText');
        const badge = document.getElementById('fileCountBadge');
        
        if (count > 0) {
            label.textContent = `${count} canciones listas`;
            badge.style.display = 'inline-block';
            badge.textContent = `${count}`;
        } else {
            UI.resetFileUploadUI();
        }
    });
}

///Exportar funciones globales si las necesitas en el HTML (onclicks viejos)
window.crearAlbum = Events.crearAlbum; // Si usas onclick="crearAlbum()" en el HTML