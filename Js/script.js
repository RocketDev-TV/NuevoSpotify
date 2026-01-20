// 1. Agarramos los elementos del HTML
const audio = document.getElementById('audio');
const playBtn = document.getElementById('playBtn');
const progressBar = document.getElementById('progressBar');

// 2. Definimos la Info de la canción (Para la pantalla de bloqueo)
const songMetadata = {
    title: 'Todavía te alcanzo a ver',
    artist: 'Canseco',
    album: 'Canseco Oficial',
    artwork: [
        // Si tienes una imagen, pon la ruta aquí (ej. 'img/portada.jpg')
        { src: 'https://placehold.co/512x512/1db954/ffffff?text=C', sizes: '512x512', type: 'image/png' }
    ]
};

// 3. Función para dar Play/Pause
function togglePlay() {
    if (audio.paused) {
        audio.play()
            .then(() => {
                // Actualizamos la info en el cel cuando empieza a sonar
                updateMediaSession(); 
                playBtn.textContent = '⏸'; // Cambia el icono a Pausa
            })
            .catch(error => console.error("Error al reproducir:", error));
    } else {
        audio.pause();
        playBtn.textContent = '▶'; // Cambia el icono a Play
    }
}

// 4. Configuración de la "Media Session" (La magia para iPhone/Android)
function updateMediaSession() {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata(songMetadata);

        // Conectar los botones del celular (Pantalla de bloqueo / Centro de control)
        navigator.mediaSession.setActionHandler('play', () => togglePlay());
        navigator.mediaSession.setActionHandler('pause', () => togglePlay());
        
        // Botones "siguiente" o "atras"
        navigator.mediaSession.setActionHandler('previoustrack', function() {});
        navigator.mediaSession.setActionHandler('nexttrack', function() {});
    }
}

// 5. Escuchar el click en el botón de tu HTML
playBtn.addEventListener('click', togglePlay);

// 6. Barra de Progreso: Que se mueva sola mientras suena
audio.addEventListener('timeupdate', () => {
    // Calculamos el porcentaje
    const progress = (audio.currentTime / audio.duration) * 100;
    progressBar.value = progress || 0;
});

// 7. Barra de Progreso: Que tú la puedas mover (Adelantar/Regresar)
progressBar.addEventListener('input', () => {
    const time = (progressBar.value / 100) * audio.duration;
    audio.currentTime = time;
});

// 8. Cuando termina la canción, regresamos el botón a Play
audio.addEventListener('ended', () => {
    playBtn.textContent = '▶';
    progressBar.value = 0;
});