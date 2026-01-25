// JS/admin/modules/music/utils.js

export function cleanString(str) {
    return str.trim().replace(/\s+/g, '_').toLowerCase();
}

export function obtenerDuracionAudio(file) {
    return new Promise((resolve) => {
        const objectUrl = URL.createObjectURL(file);
        const audio = new Audio(objectUrl);
        
        audio.onloadedmetadata = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(audio.duration); // Retorna segundos totales (float)
        };
        
        audio.onerror = () => resolve(0); 
    });
}

export function formatearDuracionParaBD(segundosTotales) {
    const minutos = Math.floor(segundosTotales / 60);
    const segundos = Math.floor(segundosTotales % 60);
    // Convierte 248 seg -> 4.08
    return parseFloat(`${minutos}.${segundos < 10 ? '0' : ''}${segundos}`);
}

export function convertirFormatoASegundos(formatoVisual) {
    // Convierte 4.08 -> 248 seg
    const min = Math.floor(formatoVisual); 
    const sec = Math.round((formatoVisual - min) * 100);
    return (min * 60) + sec;
}