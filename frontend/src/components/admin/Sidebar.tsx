'use client';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

export default function Sidebar({ activeView, setActiveView }: SidebarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      router.push('/');
      Swal.fire({ title: '¡Adiós!', text: 'Sesión cerrada.', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
    }
  };

  return (
    <aside className="sidebar">
      <div className="logo-area">
        <h2>AdminPanel</h2>
      </div>
      <nav className="menu">
        <button 
          className={`menu-btn ${activeView === 'analytics' ? 'active' : ''}`} 
          onClick={() => setActiveView('analytics')}
        >
          <i className="bi bi-graph-up-arrow"></i> Analíticas
        </button>
        <button 
          className={`menu-btn ${activeView === 'music' ? 'active' : ''}`} 
          onClick={() => setActiveView('music')}
        >
          <i className="bi bi-music-note-list"></i> Music manager
        </button>
        <button 
          className={`menu-btn ${activeView === 'users' ? 'active' : ''}`} 
          onClick={() => setActiveView('users')}
        >
          <i className="bi bi-people"></i> Usuarios
        </button>
      </nav>
      <div className="logout-area">
        <button onClick={handleLogout} className="menu-btn logout">
          <i className="bi bi-box-arrow-left"></i> Salir
        </button>
      </div>
    </aside>
  );
}