// js/admin/music-manager.js

// Variables de Estado
let selectedGenreId = null;
let selectedArtistId = null;
let selectedAlbumId = null;

// --- 1. INICIALIZACIÓN ---
function iniciarMusicManager() {
    console.log("🎵 Music Manager Listo");
    
    // Cargar la primera lista al entrar
    cargarGeneros(); 

    // Listeners para los Selects (Cascada)
    document.getElementById('selectGenero').addEventListener('change', (e) => {
        selectedGenreId = e.target.value;
        cargarArtistas(selectedGenreId);
        resetSelect('selectAlbum', 'Selecciona un artista primero');
        resetCoverPreview(); 
    });

    document.getElementById('selectArtista').addEventListener('change', (e) => {
        selectedArtistId = e.target.value;
        cargarAlbums(selectedArtistId);
        resetCoverPreview(); 
    });

    document.getElementById('selectAlbum').addEventListener('change', (e) => {
        selectedAlbumId = e.target.value;
        
        // Mostrar portada del álbum seleccionado si existe
        const selectedOption = e.target.options[e.target.selectedIndex];
        const coverUrl = selectedOption.dataset.cover;
        const coverArea = document.getElementById('coverArea');
        const coverImg = document.getElementById('currentCover');

        if (selectedAlbumId && coverUrl) {
            coverImg.src = coverUrl;
            coverArea.style.display = 'block'; 
        } else {
            coverArea.style.display = 'none'; 
        }
    });
}

function resetCoverPreview() {
    document.getElementById('coverArea').style.display = 'none';
    document.getElementById('currentCover').src = '';
}

// --- 2. FUNCIONES DE CARGA (LEER SUPABASE) ---

async function cargarGeneros() {
    const select = document.getElementById('selectGenero');
    select.innerHTML = '<option>Cargando...</option>';

    const { data, error } = await _supabase
        .from('genero')
        .select('id_gener, nombre_genero')
        .order('nombre_genero');

    if (error) return console.error("Error géneros:", error);

    llenarSelect(select, data, 'id_gener', 'nombre_genero', 'Selecciona Género');
}

async function cargarArtistas(genreId) {
    const select = document.getElementById('selectArtista');
    if (!genreId) return resetSelect('selectArtista', 'Selecciona un género primero');

    select.innerHTML = '<option>Cargando...</option>';
    select.disabled = false;

    const { data, error } = await _supabase
        .from('artista')
        .select('id_artista, nombre')
        .eq('genero_id', genreId)
        .order('nombre');

    if (error) return console.error("Error artistas:", error);

    llenarSelect(select, data, 'id_artista', 'nombre', 'Selecciona Artista');
}

async function cargarAlbums(artistId) {
    const select = document.getElementById('selectAlbum');
    if (!artistId) return resetSelect('selectAlbum', 'Selecciona un artista primero');

    select.innerHTML = '<option>Cargando...</option>';
    select.disabled = false;

    // Tabla 'album'
    const { data, error } = await _supabase
        .from('album')
        .select('id_album, titulo_album, imagen_url')
        .eq('artista_id', artistId)
        .order('titulo_album');

    if (error) return console.error("Error álbums:", error);

    llenarSelect(select, data, 'id_album', 'titulo_album', 'Selecciona Álbum / EP', 'imagen_url');
}

// --- 3. FUNCIONES DE CREACIÓN (ESCRIBIR EN SUPABASE) ---

async function crearGenero() {
    const nombre = document.getElementById('newGenreName').value;
    
    // CAMBIO: Alert por Swal
    if (!nombre) return Swal.fire('Ojo', 'Escribe un nombre para el género', 'warning');

    const { data, error } = await _supabase
        .from('genero')
        .insert([{ nombre_genero: nombre }])
        .select()
        .single();

    if (error) {
        Swal.fire('Error', 'No se pudo crear: ' + error.message, 'error');
    } else {
        cerrarModal('genero');
        await cargarGeneros();
        document.getElementById('selectGenero').value = data.id_gener;
        document.getElementById('selectGenero').dispatchEvent(new Event('change'));
        Swal.fire('¡Listo!', 'Género agregado.', 'success');
    }
}

async function crearArtista() {
    const nombre = document.getElementById('newArtistName').value;
    const desc = document.getElementById('newArtistDesc').value;

    // CAMBIO: Alerts por Swal
    if (!nombre) return Swal.fire('Falta información', 'El nombre del artista es obligatorio', 'warning');
    if (!selectedGenreId) return Swal.fire('Atención', 'No hay género seleccionado de fondo', 'error');

    const { data, error } = await _supabase
        .from('artista')
        .insert([{
            nombre: nombre,
            descripcion: desc,
            genero_id: selectedGenreId
        }])
        .select()
        .single();

    if (error) {
        Swal.fire('Error', error.message, 'error');
    } else {
        cerrarModal('artista');
        await cargarArtistas(selectedGenreId);
        document.getElementById('selectArtista').value = data.id_artista;
        document.getElementById('selectArtista').dispatchEvent(new Event('change'));
        Swal.fire('¡Éxito!', 'Artista creado correctamente.', 'success');
    }
}

// --------------------------------------------------------
// FUNCIÓN FINAL Y CORREGIDA: CREAR O ACTUALIZAR ÁLBUM 🧠
// --------------------------------------------------------
async function crearAlbum() {
    // 1. Lectura de Inputs
    const titulo = document.getElementById('newAlbumTitle').value;
    const numCanciones = document.getElementById('newAlbumSongs').value || 1; 
    const file = document.getElementById('newAlbumCover').files[0];
    const tipoLanzamiento = document.getElementById('newAlbumType').value; 
    const fechaInput = document.getElementById('newAlbumDate').value; 

    // 2. VALIDACIONES CON SWAL
    if (!titulo) return Swal.fire('Atención', 'Falta el título del álbum', 'warning');
    if (!selectedArtistId) return Swal.fire('Atención', 'Falta seleccionar un artista', 'warning');
    
    if (!fechaInput) {
        return Swal.fire('Falta la Fecha', 'Por favor selecciona la fecha de lanzamiento original.', 'warning');
    }

    // UX: Botón de "Cargando..."
    const modal = document.getElementById('modal-album');
    const btnGuardar = modal ? (modal.querySelector('.btn-success') || modal.querySelector('.btn-primary') || modal.querySelector('button.btn-confirm') || modal.querySelector('button:last-child')) : null;
    let textoOriginal = "";
    
    if (btnGuardar) {
        textoOriginal = btnGuardar.innerHTML;
        btnGuardar.innerHTML = '⏳ Guardando...';
        btnGuardar.disabled = true;
    }

    try {
        // --- PASO A: Buscar si ya existe ---
        let { data: albumsEncontrados, error: errorBusqueda } = await _supabase
            .from('album')
            .select('id_album, imagen_url')
            .eq('titulo_album', titulo)
            .eq('artista_id', selectedArtistId);

        if (errorBusqueda) throw errorBusqueda;

        let albumExistente = (albumsEncontrados && albumsEncontrados.length > 0) ? albumsEncontrados[0] : null;
        let urlPortada = albumExistente ? albumExistente.imagen_url : null;

        // --- PASO B: Subir Portada ---
        if (file) {
            const selectArtista = document.getElementById('selectArtista');
            const nombreArtista = selectArtista.options[selectArtista.selectedIndex].text
                .trim().replace(/\s+/g, '_').toLowerCase();
            const nombreAlbum = titulo.trim().replace(/\s+/g, '_').toLowerCase();
            
            const filePath = `${nombreArtista}/${nombreAlbum}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;

            const { error: uploadError } = await _supabase.storage
                .from('audio')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = _supabase.storage
                .from('audio')
                .getPublicUrl(filePath);
            
            urlPortada = publicUrlData.publicUrl;
            
            const imgPreview = document.getElementById('coverPreviewImg');
            if (imgPreview) imgPreview.src = urlPortada;
        }

        // --- PASO C: Guardar en Base de Datos ---
        let resultadoDB;
        
        if (albumExistente) {
            // ACTUALIZAR
            console.log("🔄 Actualizando:", titulo);
            resultadoDB = await _supabase
                .from('album')
                .update({ 
                    imagen_url: urlPortada,
                    num_canciones: numCanciones,
                    tipo_lanzamiento: tipoLanzamiento,
                    fecha_lanzamiento: fechaInput
                })
                .eq('id_album', albumExistente.id_album)
                .select();
                
            Swal.fire('¡Actualizado!', 'Datos actualizados correctamente.', 'success');
        } else {
            // CREAR NUEVO
            console.log("✨ Creando:", titulo);
            resultadoDB = await _supabase
                .from('album')
                .insert([{
                    titulo_album: titulo,
                    artista_id: selectedArtistId,
                    num_canciones: numCanciones,
                    imagen_url: urlPortada,
                    tipo_lanzamiento: tipoLanzamiento,
                    fecha_lanzamiento: fechaInput
                }])
                .select();
                
            Swal.fire('¡Creado!', 'Nuevo lanzamiento añadido.', 'success');
        }

        if (resultadoDB.error) throw resultadoDB.error;

        // --- PASO D: Refrescar UI ---
        cerrarModal('album');
        await cargarAlbums(selectedArtistId);
        
        if (resultadoDB.data && resultadoDB.data.length > 0) {
            const nuevoId = resultadoDB.data[0].id_album;
            const selectAlbum = document.getElementById('selectAlbum');
            if (selectAlbum) {
                selectAlbum.value = nuevoId;
                selectAlbum.dispatchEvent(new Event('change'));
            }
        }

    } catch (error) {
        console.error("❌ Error:", error);
        Swal.fire('Error', error.message || 'Error desconocido', 'error');
    } finally {
        if (btnGuardar) {
            btnGuardar.innerHTML = textoOriginal;
            btnGuardar.disabled = false;
        }
        const inputCover = document.getElementById('newAlbumCover');
        if (inputCover) inputCover.value = '';
        const previewImg = document.getElementById('coverPreviewImg');
        if (previewImg) {
            previewImg.style.display = 'none';
            previewImg.src = '';
        }
        const labelText = document.getElementById('coverLabelText');
        if (labelText) labelText.textContent = 'Seleccionar archivo';
    }
}

// --- 4. HELPERS DE UI ---

function abrirModal(tipo) {
    document.getElementById(`modal-${tipo}`).classList.add('active');
}

function cerrarModal(tipo) {
    document.getElementById(`modal-${tipo}`).classList.remove('active');
    const inputs = document.querySelectorAll(`#modal-${tipo} input`);
    inputs.forEach(i => i.value = '');
}

function bloquearContexto() {
    // CAMBIO: Swal en lugar de alert
    if (!selectedAlbumId) return Swal.fire('Ojo', 'Debes seleccionar un Álbum primero', 'warning');

    document.getElementById('selectGenero').disabled = true;
    document.getElementById('selectArtista').disabled = true;
    document.getElementById('selectAlbum').disabled = true;

    const btn = document.getElementById('btnLockContext');
    btn.innerHTML = '<i class="ph ph-check-circle"></i> Contexto Fijado';
    btn.classList.add('btn-success'); 

    // MENSAJE DE ÉXITO FINAL (Estilo Spotify)
    Swal.fire({
        title: '¡Todo listo!',
        text: 'El contexto está fijado. Ahora arrastra tus canciones al panel derecho.',
        icon: 'success',
        confirmButtonText: 'Confirmar',
        confirmButtonColor: '#1db954',
        background: '#1e1e1e',
        color: '#fff'
    });
}

function llenarSelect(selectElement, dataArray, valueKey, textKey, placeholder, imageKey = null) {
    selectElement.innerHTML = `<option value="" data-cover="">${placeholder}</option>`;

    dataArray.forEach(item => {
        const option = document.createElement('option');
        option.value = item[valueKey];
        option.textContent = item[textKey];

        if (imageKey && item[imageKey]) {
            option.dataset.cover = item[imageKey];
        } else {
            option.dataset.cover = "https://placehold.co/400x400?text=Sin+Portada"; 
        }

        selectElement.appendChild(option);
    });
    selectElement.disabled = false;
}

function resetSelect(id, placeholder) {
    const s = document.getElementById(id);
    s.innerHTML = `<option value="">${placeholder}</option>`;
    s.disabled = true;
}

// --- VISTA Y TABS ---
function cambiarVista(vista) {
    document.getElementById('view-analytics').style.display = 'none';
    document.getElementById('view-music').style.display = 'none';
    document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));

    if (vista === 'analytics') {
        document.getElementById('view-analytics').style.display = 'block';
        const btn = document.querySelector('.menu-btn:nth-child(1)');
        if(btn) btn.classList.add('active');
    } else if (vista === 'music') {
        document.getElementById('view-music').style.display = 'block';
        const btn = document.querySelector('.menu-btn:nth-child(2)');
        if(btn) btn.classList.add('active');
    }
}

function cambiarTabMusic(tab) {
    document.getElementById('tab-importar').style.display = 'none';
    document.getElementById('tab-manual').style.display = 'none';
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    if (tab === 'importar') {
        document.getElementById('tab-importar').style.display = 'block';
        const btn = document.querySelector('.tab-btn:nth-child(1)');
        if(btn) btn.classList.add('active');
    } else if (tab === 'manual') {
        document.getElementById('tab-manual').style.display = 'block';
        const btn = document.querySelector('.tab-btn:nth-child(2)');
        if(btn) btn.classList.add('active');
    }
}

// --- INPUT DE ARCHIVOS ---
const fileInput = document.getElementById('inputFileAudio');
const fileLabelText = document.getElementById('fileLabelText');
const fileCountBadge = document.getElementById('fileCountBadge');
const fileListPreview = document.getElementById('fileListPreview');

if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        const count = files.length;

        if (count > 0) {
            fileLabelText.textContent = `${count} canciones seleccionadas`;
            fileLabelText.style.color = '#fff';
            fileCountBadge.style.display = 'inline-block';
            fileCountBadge.textContent = count > 1 ? `${count} Archivos` : '1 Archivo';

            fileListPreview.innerHTML = '';
            Array.from(files).forEach(file => {
                const div = document.createElement('div');
                div.className = 'file-item-mini';
                div.textContent = `🎵 ${file.name}`;
                fileListPreview.appendChild(div);
            });
        } else {
            fileLabelText.textContent = "Click para elegir canciones o arrastra aquí";
            fileCountBadge.style.display = 'none';
            fileListPreview.innerHTML = '';
        }
    });
}

function previewCover(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const preview = document.getElementById('coverPreviewImg');
            preview.src = e.target.result;
            preview.style.display = 'block';
            document.getElementById('coverLabelText').textContent = 'Cambiar Imagen';
        }
        reader.readAsDataURL(input.files[0]);
    }
}

// --- I. LÓGICA DE SUBIDA DE CANCIONES (EL MOTOR PRINCIPAL) 🚀 ---

const formCancion = document.getElementById('formCancion');

if (formCancion) {
    formCancion.addEventListener('submit', async (e) => {
        e.preventDefault(); 

        // 1. Validaciones
        if (!selectedArtistId || !selectedAlbumId) {
            return Swal.fire('Error', 'Debes bloquear el contexto (Artista/Álbum) primero.', 'error');
        }

        const files = document.getElementById('inputFileAudio').files;
        if (files.length === 0) {
            return Swal.fire('Ojo', 'No has seleccionado ninguna canción.', 'warning');
        }

        // 2. Preparar UI
        const btnSubmit = formCancion.querySelector('button[type="submit"]');
        const originalText = btnSubmit.innerHTML;
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<i class="ph ph-spinner ph-spin"></i> Subiendo ${files.length} canciones...`;

        let subidasExitosas = 0;
        let errores = 0;

        // 3. RECUPERAR DATOS DEL CONTEXTO
        const selectArtista = document.getElementById('selectArtista');
        const nombreArtista = selectArtista.options[selectArtista.selectedIndex].text
            .trim().replace(/\s+/g, '_').toLowerCase();

        const selectAlbum = document.getElementById('selectAlbum');
        const nombreAlbum = selectAlbum.options[selectAlbum.selectedIndex].text
            .trim().replace(/\s+/g, '_').toLowerCase();
        
        const coverUrlAlbum = selectAlbum.options[selectAlbum.selectedIndex].dataset.cover;

        // 4. BUCLE DE CARGA
        for (const file of files) {
            try {
                // A. Calcular Duración
                const duracionSegundos = await obtenerDuracionAudio(file);
                const minutos = Math.floor(duracionSegundos / 60);
                const segundos = Math.floor(duracionSegundos % 60);
                const duracionFormato = parseFloat(`${minutos}.${segundos < 10 ? '0' : ''}${segundos}`);

                // B. Subir archivo
                const filePath = `${nombreArtista}/${nombreAlbum}/${Date.now()}_${file.name}`;

                const { data: storageData, error: uploadError } = await _supabase.storage
                    .from('audio')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                // C. Obtener URL
                const { data: publicUrlData } = _supabase.storage
                    .from('audio')
                    .getPublicUrl(filePath);

                // D. Insertar en BD
                const { error: dbError } = await _supabase
                    .from('canciones')
                    .insert([{
                        titulo_cancion: file.name.replace(/\.[^/.]+$/, ""),
                        artista_id: selectedArtistId,
                        album_id: selectedAlbumId, 
                        audio_path: publicUrlData.publicUrl, 
                        reproducciones: 0,
                        duracion_cancion: duracionFormato, 
                        imagen_url: coverUrlAlbum          
                    }]);

                if (dbError) throw dbError;

                subidasExitosas++;

            } catch (err) {
                console.error(`Error subiendo ${file.name}:`, err);
                errores++;
            }
        }

        // 5. ACTUALIZAR DURACIÓN TOTAL DEL ÁLBUM
        if (subidasExitosas > 0) {
            await actualizarDuracionAlbum(selectedAlbumId);
        }

        // 6. RESULTADO FINAL CON FLUJO INTELIGENTE 🧠
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = originalText;

        if (errores === 0) {
            // PREGUNTA CLAVE AL USUARIO
            Swal.fire({
                title: '¡Carga Exitosa!',
                text: `Se subieron ${subidasExitosas} canciones. ¿Quieres agregar más canciones a este mismo álbum?`,
                icon: 'success',
                showCancelButton: true,
                confirmButtonText: 'Sí, agregar más',
                cancelButtonText: 'No, ya acabé',
                confirmButtonColor: '#1db954', // Verde Spotify
                cancelButtonColor: '#6e6e6e',  // Gris discreto
                background: '#1e1e1e',
                color: '#fff'
            }).then((result) => {
                if (result.isConfirmed) {
                    // OPCIÓN A: QUIERE SEGUIR (Mismo contexto)
                    limpiarSoloArchivos(); 
                    Swal.fire({
                        title: '¡Siguele!', 
                        text: 'El álbum sigue seleccionado. Arrastra las siguientes canciones.', 
                        icon: 'info', 
                        timer: 2000, 
                        showConfirmButton: false,
                        background: '#1e1e1e',
                        color: '#fff'
                    });
                } else {
                    // OPCIÓN B: YA ACABÓ (Reset total)
                    resetearFormularioCompleto();
                }
            });
        } else {
            Swal.fire('Terminado con errores', `Subidas: ${subidasExitosas}, Fallidas: ${errores}.`, 'warning');
        }
    });
}

// --- FUNCIONES AUXILIARES ---

// 1. Limpieza Total
function resetearFormularioCompleto() {
    // A. Limpiar archivos
    limpiarSoloArchivos();

    // B. Desbloquear selects
    document.getElementById('selectGenero').disabled = false;
    document.getElementById('selectArtista').disabled = false; // Se activará al elegir género
    document.getElementById('selectAlbum').disabled = false;   // Se activará al elegir artista

    // C. Resetear valores de los selects (Ponerlos en blanco)
    document.getElementById('selectGenero').value = "";
    
    // Para Artista y Álbum, mejor los reseteamos y bloqueamos visualmente
    resetSelect('selectArtista', 'Selecciona un género primero');
    resetSelect('selectAlbum', 'Selecciona un artista primero');

    // D. Resetear botón de bloqueo
    const btnLock = document.getElementById('btnLockContext');
    btnLock.innerHTML = '<i class="ph ph-lock-key"></i> Bloquear Contexto'; 
    btnLock.classList.remove('btn-success');
    
    // E. Resetear variables globales
    selectedGenreId = null;
    selectedArtistId = null;
    selectedAlbumId = null;
    
    // F. Ocultar portada actual
    resetCoverPreview();
}

// 2. Limpieza Parcial (Opción "SÍ, AGREGAR MÁS")
function limpiarSoloArchivos() {
    document.getElementById('inputFileAudio').value = '';
    document.getElementById('fileLabelText').textContent = "Click para elegir canciones o arrastra aquí";
    document.getElementById('fileCountBadge').style.display = 'none';
    document.getElementById('fileListPreview').innerHTML = '';
}

// 3. Helper de Reset de Select (Ya lo tenías, pero asegúrate que esté así)
function resetSelect(id, placeholder) {
    const s = document.getElementById(id);
    s.innerHTML = `<option value="">${placeholder}</option>`;
    s.disabled = true;
    s.value = ""; // Asegurar que quede vacío
}

// 2. Obtener duración real del archivo (HTML5 Audio API)
function obtenerDuracionAudio(file) {
    return new Promise((resolve) => {
        const objectUrl = URL.createObjectURL(file);
        const audio = new Audio(objectUrl);
        
        audio.onloadedmetadata = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(audio.duration); // Retorna segundos totales (float)
        };
        
        audio.onerror = () => resolve(0); // Si falla, 0
    });
}

// 3. Sumar canciones y actualizar tabla 'album'
async function actualizarDuracionAlbum(albumId) {
    // A. Traer todas las duraciones
    const { data: canciones, error } = await _supabase
        .from('canciones')
        .select('duracion_cancion')
        .eq('album_id', albumId);

    if (error || !canciones) return;

    // B. Sumar convirtiendo a segundos reales
    let totalSegundos = 0;
    canciones.forEach(c => {
        // Desconvertir 4.08 -> 4 min 8 seg
        const min = Math.floor(c.duracion_cancion); 
        const sec = Math.round((c.duracion_cancion - min) * 100);
        totalSegundos += (min * 60) + sec;
    });

    // C. Convertir total a formato visual
    const minTotal = Math.floor(totalSegundos / 60);
    const secTotal = Math.floor(totalSegundos % 60);
    const duracionFinal = parseFloat(`${minTotal}.${secTotal < 10 ? '0' : ''}${secTotal}`);

    // D. Guardar en tabla album
    await _supabase
        .from('album')
        .update({ duracion_album: duracionFinal })
        .eq('id_album', albumId);
        
    console.log("⏱️ Duración álbum actualizada:", duracionFinal);
}

// --- J. ZONA DE ARRASTRE (DRAG & DROP) FIX 🛠️ ---

const dropZone = document.getElementById('dropZone'); // El ID que acabamos de poner
const inputAudio = document.getElementById('inputFileAudio');

if (dropZone && inputAudio) {
    // 1. Evitar que el navegador abra el archivo (Dragover y Drop)
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // 2. Efectos visuales (Opcional: poner borde verde cuando arrastras encima)
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('highlight'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('highlight'), false);
    });

    // 3. LA MAGIA: Recibir los archivos soltados
    dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        // A. Pasar los archivos al input invisible
        inputAudio.files = files;

        // B. Disparar manualmente el evento 'change'
        // Esto hace que se ejecute tu lógica de "fileLabelText", "fileCountBadge", etc.
        const event = new Event('change');
        inputAudio.dispatchEvent(event);
    }
}