'use client';

import { useState } from 'react';
import Sidebar from '@/components/admin/Sidebar';
import Topbar from '@/components/admin/Topbar';
import AnalyticsView from '@/components/admin/AnalyticsView';
import MusicManagerView from '@/components/admin/MusicManagerView';

// Estilos específicos
import '@/styles/admin/dashboard.css';

export default function AdminDashboard() {
  // Estado para la navegación
  const [activeView, setActiveView] = useState('analytics');

  return (
    <div className="admin-body">
      <div className="admin-container">
        
        {/* Lado Izquierdo: Menú */}
        <Sidebar activeView={activeView} setActiveView={setActiveView} />

        <main className="main-content">
          {/* Parte Superior: Saludo y Reloj */}
          <Topbar />

          {/* Vistas Dinámicas */}
          {activeView === 'analytics' && <AnalyticsView />}
          {activeView === 'music' && <MusicManagerView />}
          
          {activeView === 'users' && (
            <h2 style={{color: 'white'}}>👥 Sección de Usuarios (Próximamente)</h2>
          )}
        </main>

      </div>
    </div>
  );
}