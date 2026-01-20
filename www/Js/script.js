const audio = document.getElementById('audio');
const playBtn = document.getElementById('playBtn');
const progressBar = document.getElementById('progressBar');

// Bandera para saber si FUE EL USUARIO quien pausó
let pausaIntencional = false;

// 1. Cargar el "Punto Guardado" al iniciar (Persistencia)
// Esto cumple tu deseo de "volver al minuto/segundo donde se cortó"
window.addEventListener('load', () => {
    const tiempoGuardado = localStorage.getItem('ultimoTiempo');
    
    if (tiempoGuardado) {
        audio.currentTime = parseFloat(tiempoGuardado);
        progressBar.value = (audio.currentTime / audio.duration) * 100 || 0;
        console.log("Tiempo restaurado al segundo:", tiempoGuardado);
    }
    // OJO: AQUÍ NO PONEMOS AUTO-PLAY.
    // Si entras mañana ("fresh start"), se queda calladito esperando tu orden.
});

// 2. Guardar el tiempo cada segundo (Para que no se pierda si se muere el script)
audio.addEventListener('timeupdate', () => {
    if (audio.duration) {
        const progress = (audio.currentTime / audio.duration) * 100;
        progressBar.value = progress;
        // Guardamos en la "memoria del teléfono"
        localStorage.setItem('ultimoTiempo', audio.currentTime);
    }
});

// 3. Control del Botón (La única forma de hacer "Pausa Intencional")
playBtn.addEventListener('click', () => {
    if (audio.paused) {
        pausaIntencional = false; // El usuario quiere ruido
        iniciarReproduccion();
    } else {
        pausaIntencional = true; // El usuario pidió silencio explícitamente
        audio.pause();
    }
});

// 4. Lógica de "Resurrección" (Auto-Play solo si fue accidente)
document.addEventListener("visibilitychange", async () => {
    // Si la app vuelve a ser visible (regresas de WhatsApp)
    if (document.visibilityState === "visible") {
        
        // LA LÓGICA CLAVE:
        // Si el audio está pausado... PERO el usuario NO le dio al botón de pausa...
        // Significa que el sistema (WhatsApp/iOS) nos calló a la mala.
        if (audio.paused && !pausaIntencional) {
            console.log("Detecté interrupción del sistema. Intentando revivir...");
            try {
                await iniciarReproduccion();
            } catch (err) {
                console.log("El navegador no dejó hacer auto-play (necesita toque)", err);
            }
        }
    }
});

// 5. Función auxiliar para iniciar todo el show
async function iniciarReproduccion() {
    try {
        await audio.play();
        playBtn.textContent = '⏸';
        pausaIntencional = false; // Confirmamos que estamos sonando
        
        // Actualizamos Media Session (Para pantalla de bloqueo)
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = "playing";
            configurarMediaSession();
        }
    } catch (err) {
        console.error("Error al reproducir:", err);
    }
}

// 6. Detectar pausas externas (Para cuando WhatsApp nos gana)
audio.addEventListener('pause', () => {
    playBtn.textContent = '▶';
    
    if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = "paused";
    }
    
    // Si el usuario NO fue el que pausó (pausaIntencional es false),
    // entonces mantenemos la esperanza de revivir cuando regrese.
});

// --- Configuración extra (Barras y Metadata) ---
progressBar.addEventListener('input', () => {
    const time = (progressBar.value / 100) * audio.duration;
    audio.currentTime = time;
});

function configurarMediaSession() {
    navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Todavía te alcanzo a ver',
        artist: 'Canseco',
        album: 'Canseco Oficial',
        artwork: [
            { src: 'https://placehold.co/512x512/1db954/ffffff?text=C', sizes: '512x512', type: 'image/png' }
        ]
    });

    navigator.mediaSession.setActionHandler('play', () => {
        pausaIntencional = false;
        iniciarReproduccion();
    });
    navigator.mediaSession.setActionHandler('pause', () => {
        pausaIntencional = true;
        audio.pause();
    });
}