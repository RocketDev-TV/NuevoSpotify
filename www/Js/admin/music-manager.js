// Js/admin/music-manager.js
function iniciarMusicManager() {
    console.log("🎵 Iniciando Music Manager...");
    // Listeners específicos del manager
}


function cambiarVista(vista) {
    // 1. Ocultar todas las secciones
    document.getElementById('view-analytics').style.display = 'none';
    document.getElementById('view-music').style.display = 'none';
    
    // 2. Quitar clase active de todos los botones del menú
    document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));

    // 3. Mostrar la seleccionada
    if (vista === 'analytics') {
        document.getElementById('view-analytics').style.display = 'block';
        // Reactivamos botón (esto es un truco rápido, idealmente usar IDs en botones)
        document.querySelector('.menu-btn:nth-child(1)').classList.add('active');
    } else if (vista === 'music') {
        document.getElementById('view-music').style.display = 'block';
        document.querySelector('.menu-btn:nth-child(2)').classList.add('active');
    }
}

function cambiarTabMusic(tab) {
    // 1. Ocultar contenido tabs
    document.getElementById('tab-importar').style.display = 'none';
    document.getElementById('tab-manual').style.display = 'none';

    // 2. Resetear botones tabs
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    // 3. Activar el correcto
    if (tab === 'importar') {
        document.getElementById('tab-importar').style.display = 'block';
        document.querySelector('.tab-btn:nth-child(1)').classList.add('active'); // Botón 1
    } else if (tab === 'manual') {
        document.getElementById('tab-manual').style.display = 'block'; // Faltaba 'grid' en CSS quizás, block está bien
        document.querySelector('.tab-btn:nth-child(2)').classList.add('active'); // Botón 2
    }
}


// --- H. LÓGICA DEL INPUT DE ARCHIVOS SEXY ---
const fileInput = document.getElementById('inputFileAudio');
const fileLabelText = document.getElementById('fileLabelText');
const fileCountBadge = document.getElementById('fileCountBadge');
const fileListPreview = document.getElementById('fileListPreview');

if(fileInput) {
    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        const count = files.length;

        if (count > 0) {
            // Cambiar diseño si hay archivos
            fileLabelText.textContent = `${count} canciones seleccionadas`;
            fileLabelText.style.color = '#fff';
            fileCountBadge.style.display = 'inline-block';
            fileCountBadge.textContent = count > 1 ? `${count} Archivos` : '1 Archivo';
            
            // (Opcional) Listar nombres
            fileListPreview.innerHTML = '';
            Array.from(files).forEach(file => {
                const div = document.createElement('div');
                div.className = 'file-item-mini';
                div.textContent = `🎵 ${file.name}`;
                fileListPreview.appendChild(div);
            });
        } else {
            // Resetear si cancela
            fileLabelText.textContent = "Click para elegir canciones o arrastra aquí";
            fileCountBadge.style.display = 'none';
            fileListPreview.innerHTML = '';
        }
    });
}

function previewCover(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('coverPreviewImg').src = e.target.result;
            document.getElementById('coverPreviewImg').style.display = 'block';
            document.getElementById('coverLabelText').textContent = 'Cambiar Imagen';
        }
        reader.readAsDataURL(input.files[0]);
    }
}

