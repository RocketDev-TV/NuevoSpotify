// js/admin/analytics.js

function iniciarAnalytics() {
    console.log("📈 Iniciando Analytics...");
    cargarDatosDashboard();
    inicializarGrafica();
}

// Elementos del DOM (KPIs)
const totalUsersEl = document.getElementById('totalUsers');
const newUsersEl = document.getElementById('newUsers');
const activeUsersEl = document.getElementById('activeUsers');

// --- C. CARGAR DATOS (KPIs) ---
async function cargarDatosDashboard() {
    try {
        // 1. Usuarios Totales
        const { count: total, error: errTotal } = await _supabase
            .from('usuarios')
            .select('*', { count: 'exact', head: true });
        
        if (!errTotal) animarNumero(totalUsersEl, 0, total || 0, 2000);

        // 2. Usuarios Nuevos (Hoy)
        // Calculamos la fecha de hoy a las 00:00
        const hoy = new Date();
        hoy.setHours(0,0,0,0);
        const hoyISO = hoy.toISOString();

        const { count: nuevos, error: errNuevos } = await _supabase
            .from('usuarios')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', hoyISO); // Mayor o igual a hoy
            
        if (!errNuevos) animarNumero(newUsersEl, 0, nuevos || 0, 2000);

        // 3. Usuarios Activos (Ejemplo: Logueados recientemente o dummy por ahora)
        // Como no tenemos log de "última conexión", usaremos un % del total o un valor fijo por mientras
        // O si quieres ser estricto, cuenta los que tengan sesión activa (complicado en Supabase cliente).
        // Por ahora simularemos "activos" como el 80% de los totales para que se vea movimiento.
        const activos = Math.floor((total || 0) * 0.8);
        animarNumero(activeUsersEl, 0, activos, 2000);

    } catch (error) {
        console.error("Error cargando KPIs:", error);
    }
}

// Función helper para animar numeritos (Efecto Casino 🎰)
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
    if (!ctx) return; // Protección por si cambiamos de vista

    // 1. Pedimos los datos a Python
    let chartData = { labels: [], values: [] };
    
    try {
        // Asumimos que Python está corriendo en el puerto 5000
        // Usamos un timeout para que no se quede colgado si Python está apagado
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 segundos max

        const response = await fetch('http://127.0.0.1:5000/api/growth', { signal: controller.signal });
        clearTimeout(timeoutId);
        
        const data = await response.json();
        
        if (data.labels && data.data) {
            chartData.labels = data.labels;
            chartData.values = data.data;
        }
    } catch (error) {
        console.warn("Python API no disponible (usando datos dummy para diseño):", error);
        // Datos Dummy para que no se vea feo mientras prendes Python
        chartData.labels = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
        chartData.values = [12, 19, 3, 5, 2, 3, 10];
    }

    // 2. Pintamos la gráfica
    const context = ctx.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(44, 194, 149, 0.5)'); 
    gradient.addColorStop(1, 'rgba(44, 194, 149, 0.0)'); 

    new Chart(context, {
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
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleColor: '#2CC295',
                    bodyColor: '#fff',
                    padding: 10,
                    cornerRadius: 8,
                    displayColors: false
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#9aa8a5' }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#9aa8a5', stepSize: 1 },
                    beginAtZero: true
                }
            }
        }
    });
}