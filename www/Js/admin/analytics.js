// js/admin/analytics.js

// 1. IMPORTAMOS AL CLIENTE (Se llama 'client')
import { client } from '../config.js';

// Si admin-dashboard.js llama a esta función, necesitamos exponerla
// O si se ejecuta sola al importar, asegúrate de llamarla.
// Por los logs, parece que ya se está llamando bien, así que solo corregimos la variable.

export function iniciarAnalytics() {
    console.log("📈 Iniciando Analytics...");
    cargarDatosDashboard();
    inicializarGrafica();
}

// Para que el HTML o admin-dashboard.js la encuentren si la buscan globalmente
window.iniciarAnalytics = iniciarAnalytics;

// Elementos del DOM (KPIs)
const totalUsersEl = document.getElementById('totalUsers');
const newUsersEl = document.getElementById('newUsers');
const activeUsersEl = document.getElementById('activeUsers');

// --- C. CARGAR DATOS (KPIs) ---
async function cargarDatosDashboard() {
    try {

        // 1. Usuarios Totales
        const { count: total, error: errTotal } = await client
            .from('usuarios')
            .select('*', { count: 'exact', head: true });
        
        if (!errTotal) animarNumero(totalUsersEl, 0, total || 0, 2000);

        // 2. Usuarios Nuevos (Hoy)
        const hoy = new Date();
        hoy.setHours(0,0,0,0);
        const hoyISO = hoy.toISOString();

        const { count: nuevos, error: errNuevos } = await client
            .from('usuarios')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', hoyISO); 
            
        if (!errNuevos) animarNumero(newUsersEl, 0, nuevos || 0, 2000);

        // 3. Usuarios Activos (Simulación)
        const activos = Math.floor((total || 0) * 0.8);
        animarNumero(activeUsersEl, 0, activos, 2000);

    } catch (error) {
        console.error("Error cargando KPIs:", error);
    }
}

// Función helper para animar numeritos
function animarNumero(elemento, inicio, fin, duracion) {
    if (!elemento) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duracion, 1);
        elemento.innerHTML = Math.floor(progress * (fin - inicio) + inicio);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// --- D. GRÁFICA REAL CON PYTHON ---
async function inicializarGrafica() {
    const ctx = document.getElementById('growthChart');
    if (!ctx) return; 

    let chartData = { labels: [], values: [] };
    
    try {
        // Nota: Esto fallará en Cancún si no corres el Python localmente, 
        // pero entrará al CATCH y mostrará datos dummy. ¡Es normal!
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); 

        const response = await fetch('http://127.0.0.1:5000/api/growth', { signal: controller.signal });
        clearTimeout(timeoutId);
        
        const data = await response.json();
        
        if (data.labels && data.data) {
            chartData.labels = data.labels;
            chartData.values = data.data;
        }
    } catch (error) {
        console.warn("Python API no disponible (usando datos dummy):");
        // Datos Dummy
        chartData.labels = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
        chartData.values = [12, 19, 3, 5, 2, 3, 10];
    }

    // Pintamos la gráfica (Chart.js)
    if(typeof Chart === 'undefined') return; // Protección por si no cargó Chart.js

    const context = ctx.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(44, 194, 149, 0.5)'); 
    gradient.addColorStop(1, 'rgba(44, 194, 149, 0.0)'); 

    // Destruir gráfica previa si existe para evitar bugs visuales
    if (window.myGrowthChart) window.myGrowthChart.destroy();

    window.myGrowthChart = new Chart(context, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Usuarios Nuevos',
                data: chartData.values,
                borderColor: '#2CC295',
                backgroundColor: gradient,
                borderWidth: 2,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#2CC295',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
            }
        }
    });
}