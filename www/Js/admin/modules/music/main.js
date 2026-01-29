// JS/admin/modules/music/main.js
import * as API from './api.js';
import * as UI from './ui.js';
import * as Events from './events.js';

console.log("🎵 Music Manager (Modular) Cargado");

// --- 1. CONEXIÓN HTML <-> JS (El Puente) ---
// Conectamos los onclick del HTML directamente a las funciones nuevas de Events.js
window.crearGenero = Events.crearGenero;
window.crearArtista = Events.crearArtista;
window.crearAlbum = Events.crearAlbum;
window.abrirModal = (id) => document.getElementById(`modal-${id}`).classList.add('active');
window.cerrarModal = UI.cerrarModal;
window.cambiarTabMusic = UI.cambiarTabMusic;

// 🔥 AQUÍ EL FIX PRINCIPAL: 
// Hacemos que el botón del HTML llame a la función REAL de bloqueo
window.bloquearContexto = Events.toggleContextLock; 

// --- 2. INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
    
    // A. Cargar Géneros
    const { data, error } = await API.getGeneros();
    if (!error) {
        UI.llenarSelect(document.getElementById('selectGenero'), data, 'id_gener', 'nombre_genero', 'Selecciona Género');
    }

    // B. Listeners de Cambios (Selects)
    document.getElementById('selectGenero').addEventListener('change', Events.handleGenreChange);
    document.getElementById('selectArtista').addEventListener('change', Events.handleArtistChange);
    document.getElementById('selectAlbum').addEventListener('change', Events.handleAlbumChange);

    // C. Subida de Canciones
    const formCancion = document.getElementById('formCancion');
    if (formCancion) {
        formCancion.addEventListener('submit', Events.handleSongUpload);
    }
    
    // D. Drag & Drop
    setupDragAndDrop();

    // --- 3. AUTO-RECUPERACIÓN INTELIGENTE 🧠 ---
    // Esto arregla el error de "Selecciona Artista" al dar Refresh
    await recuperarEstadoPrevio();
});

// Función separada para limpiar el código
async function recuperarEstadoPrevio() {
    console.log("🔄 Intentando recuperar sesión...");

    const selectArtista = document.getElementById('selectArtista');
    const selectAlbum = document.getElementById('selectAlbum');

    // 1. Capturamos los valores visuales ANTES de que se borren
    const savedArtistId = selectArtista.value;
    const savedAlbumId = selectAlbum.value; // ¡Aquí está la clave! Lo guardamos antes del reset.

    if (savedArtistId) {
        console.log("✅ Artista detectado:", savedArtistId);
        
        // 2. Sincronizamos el estado
        Events.state.artistId = savedArtistId;

        // 3. Disparamos la carga de álbumes MANUALMENTE
        // Simulamos el evento para que traiga la lista de la BD
        await Events.handleArtistChange({ target: { value: savedArtistId } });

        // 4. Ahora sí, si teníamos un álbum, lo restauramos
        if (savedAlbumId) {
            console.log("✅ Álbum detectado (Restaurando):", savedAlbumId);
            
            // Como handleArtistChange reseteó el select, volvemos a ponerle el valor
            selectAlbum.value = savedAlbumId;
            
            // Y actualizamos el estado y la vista (portada, tabla, etc.)
            // Necesitamos pasar el elemento select completo para que lea los datasets (cover, year)
            // Buscamos la opción seleccionada manualmente para simular el evento completo
            const option = selectAlbum.querySelector(`option[value="${savedAlbumId}"]`);
            
            if(option) {
                option.selected = true;
                Events.state.albumId = savedAlbumId;
                // Disparamos el cambio final para mostrar la tabla
                await Events.handleAlbumChange({ target: selectAlbum });
            }
        }
    }
}

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
        const event = new Event('change');
        input.dispatchEvent(event);
    });

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