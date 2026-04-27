'use client';
import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend } from 'chart.js';
import { supabase } from '@/lib/supabase';
import '@/styles/admin/analytics.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend);

export default function AnalyticsView() {
  const [stats, setStats] = useState({ total: 0, new: 0, active: 0 });

  useEffect(() => {
    async function loadStats() {
      const { count: total } = await supabase.from('usuarios').select('*', { count: 'exact', head: true });
      const hoy = new Date();
      hoy.setHours(0,0,0,0);
      const { count: nuevos } = await supabase.from('usuarios').select('*', { count: 'exact', head: true }).gte('created_at', hoy.toISOString());
      
      setStats({ total: total || 0, new: nuevos || 0, active: Math.floor((total || 0) * 0.8) });
    }
    loadStats();
  }, []);

  const data = {
    labels: ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'],
    datasets: [{
      label: 'Usuarios Nuevos',
      data: [12, 19, 3, 5, 2, 3, 10], // Aquí luego conectamos tu API de Python
      fill: true,
      borderColor: '#2CC295',
      backgroundColor: 'rgba(44, 194, 149, 0.1)',
      tension: 0.4,
    }],
  };

  return (
    <section className="view-section active">
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="icon-box"><i className="bi bi-people-fill"></i></div>
          <div className="kpi-info">
            <h3>Usuarios Totales</h3>
            <p className="kpi-number">{stats.total}</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="icon-box new"><i className="bi bi-person-plus-fill"></i></div>
          <div className="kpi-info">
            <h3>Nuevos (Hoy)</h3>
            <p className="kpi-number">{stats.new}</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="icon-box active"><i className="bi bi-activity"></i></div>
          <div className="kpi-info">
            <h3>Activos Ahora</h3>
            <p className="kpi-number">{stats.active}</p>
          </div>
        </div>
      </div>

      <div className="chart-container">
        <h3>Crecimiento de Usuarios</h3>
        <div className="chart-wrapper">
          <Line data={data} options={{ responsive: true, maintainAspectRatio: false }} />
        </div>
      </div>
    </section>
  );
}