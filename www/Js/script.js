const audio = document.getElementById('audio');
const playBtn = document.getElementById('playBtn');
const progressBar = document.getElementById('progressBar');

// Banderas de control
let pausaIntencional = false;
let isDragging = false; 

// 1. CARGAR PUNTO GUARDADO
window.addEventListener('load', () => {
    const tiempoGuardado = localStorage.getItem('ultimoTiempo');
    if (tiempoGuardado && audio.duration) {
        audio.currentTime = parseFloat(tiempoGuardado);
        progressBar.value = (audio.currentTime / audio.duration) * 100 || 0;
    }
});

// 2. ACTUALIZAR TIEMPO (De la canción hacia la barra)
audio.addEventListener('timeupdate', () => {
    // Si la estás moviendo tú (isDragging), NO dejamos que la canción mueva la barra
    if (!isDragging && audio.duration) {
        const progress = (audio.currentTime / audio.duration) * 100;
        progressBar.value = progress;
    }
    
    // Guardamos siempre el tiempo real
    if (audio.duration) {
        localStorage.setItem('ultimoTiempo', audio.currentTime);
        // Importante: Mantener al sistema avisado de dónde vamos
        actualizarEstadoPosicion(); 
    }
});

// 3. CONTROL DE LA BARRA (WEB) - FIX CORREGIDO
// Usamos 'input' para saber que estás arrastrando (bloqueamos actualizaciones)
progressBar.addEventListener('input', () => {
    isDragging = true; 
});

// Usamos 'change' para aplicar el cambio FINAL cuando sueltas
progressBar.addEventListener('change', () => {
    const time = (progressBar.value / 100) * audio.duration;
    audio.currentTime = time;
    
    // Importante: Soltamos el bloqueo HASTA que ya aplicamos el tiempo
    isDragging = false; 
    
    // Forzamos actualización visual inmediata en el cel
    actualizarEstadoPosicion();
});

// 4. CONTROL DEL BOTÓN PLAY/PAUSE
playBtn.addEventListener('click', () => {
    if (audio.paused) {
        pausaIntencional = false;
        iniciarReproduccion();
    } else {
        pausaIntencional = true;
        audio.pause();
    }
});

// 5. RESURRECCIÓN (Anti-Whatsapp)
document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "visible") {
        if (audio.paused && !pausaIntencional) {
            try {
                await iniciarReproduccion();
            } catch (err) { console.log("Requiere toque", err); }
        }
    }
});

// 6. FUNCIONES AUXILIARES
async function iniciarReproduccion() {
    try {
        await audio.play();
        playBtn.textContent = '⏸';
        pausaIntencional = false;
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = "playing";
            configurarMediaSession();
        }
    } catch (err) { console.error("Error play:", err); }
}

audio.addEventListener('pause', () => {
    playBtn.textContent = '▶';
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = "paused";
});

audio.addEventListener('play', () => {
    playBtn.textContent = '⏸';
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = "playing";
});

// 7. MEDIA SESSION (Notificaciones y Bloqueo) - VERSIÓN BLINDADA
function actualizarEstadoPosicion() {
    if ('mediaSession' in navigator && audio.duration && !isNaN(audio.duration)) {
        try {
            navigator.mediaSession.setPositionState({
                duration: audio.duration,
                playbackRate: audio.playbackRate,
                position: audio.currentTime
            });
        } catch (e) {}
    }
}

function configurarMediaSession() {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Todavía te alcanzo a ver',
        artist: 'Canseco',
        album: 'Canseco Oficial',
        artwork: [ { src: 'https://placehold.co/512x512/1db954/ffffff?text=C', sizes: '512x512', type: 'image/png' } ]
    });

    navigator.mediaSession.setActionHandler('play', () => { pausaIntencional = false; iniciarReproduccion(); });
    navigator.mediaSession.setActionHandler('pause', () => { pausaIntencional = true; audio.pause(); });
    
    // --- AQUÍ ESTÁ EL FIX PARA ADELANTAR DESDE EL IPHONE/ANDROID ---
    navigator.mediaSession.setActionHandler('seekto', (details) => {
        let tiempoDestino = null;

        if (details.seekTime || details.seekTime === 0) {
            tiempoDestino = details.seekTime;
        } else if (details.seekOffset) {
            tiempoDestino = audio.currentTime + details.seekOffset;
        }

        if (tiempoDestino !== null && Number.isFinite(tiempoDestino)) {
            // Asegurar límites
            tiempoDestino = Math.max(0, Math.min(tiempoDestino, audio.duration));
            
            // Intentar fastSeek para móviles modernos
            if (audio.fastSeek) {
                try { audio.fastSeek(tiempoDestino); } 
                catch (e) { audio.currentTime = tiempoDestino; }
            } else {
                audio.currentTime = tiempoDestino;
            }
            
            // Actualizar cel inmediatamente
            actualizarEstadoPosicion();
        }
    });
}