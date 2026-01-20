const audio = document.getElementById('audio');
const playBtn = document.getElementById('playBtn');
const progressBar = document.getElementById('progressBar');

const songMetadata = {
    title: 'Todavía te alcanzo a ver',
    artist: 'Canseco',
    album: 'Canseco Oficial',
    artwork: [
        { src: 'https://placehold.co/512x512/1db954/ffffff?text=C', sizes: '512x512', type: 'image/png' }
    ]
};

// Función maestra para reproducir (maneja errores si el navegador se durmió)
async function playAudio() {
    try {
        await audio.play();
        playBtn.textContent = '⏸';
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = "playing";
        }
    } catch (err) {
        console.error("El navegador se puso fresa y no dejó reproducir:", err);
        // Si falla, a veces ayuda actualizar el estado para decirle "estoy listo"
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = "paused";
        }
    }
}

// Inicializar Media Session
if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata(songMetadata);

    // AQUÍ ESTA LA MAGIA: 
    // Cuando le das Play desde la notificación después de ver el video de Whats,
    // forzamos la ejecución de la función playAudio.
    navigator.mediaSession.setActionHandler('play', () => {
        playAudio();
    });

    navigator.mediaSession.setActionHandler('pause', () => {
        audio.pause();
        playBtn.textContent = '▶';
        navigator.mediaSession.playbackState = "paused";
    });
}

// Botón de la interfaz
playBtn.addEventListener('click', () => {
    if (audio.paused) {
        playAudio();
    } else {
        audio.pause();
    }
});

// Eventos del Audio (Para sincronizar si el sistema lo pausa solo)
audio.addEventListener('play', () => {
    playBtn.textContent = '⏸';
    if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = "playing";
    }
});

audio.addEventListener('pause', () => {
    playBtn.textContent = '▶';
    // Importante: Mantener el estado en 'paused' para que la notificación no desaparezca
    if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = "paused";
    }
});

// Barra de progreso (Igual que antes)
audio.addEventListener('timeupdate', () => {
    if (audio.duration) {
        progressBar.value = (audio.currentTime / audio.duration) * 100;
    }
});

progressBar.addEventListener('input', () => {
    const time = (progressBar.value / 100) * audio.duration;
    audio.currentTime = time;
});