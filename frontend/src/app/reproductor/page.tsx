'use client'; 

import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase'; 
import Swal from 'sweetalert2';

export default function ReproductorPage() { // <--- Nombre cambiado para orden
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      router.push('/');
      
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });

      Toast.fire({
        icon: 'success',
        title: 'Sesión cerrada. ¡Nos vemos, Usuario!'
      });

    } catch (error: any) {
      console.error("Error al cerrar sesión:", error.message);
      Swal.fire('Error', 'No se pudo cerrar la sesión correctamente.', 'error');
    }
  };

  return (
    <div style={{ padding: '50px', textAlign: 'center', minHeight: '100vh' }}>
      <h1 style={{ color: 'white', marginBottom: '30px' }}>
        🎵 Bienvenido al Reproductor
      </h1>

      <p style={{ color: 'var(--text-muted)', marginBottom: '40px' }}>
        Aquí pronto verás tus playlists y canciones desde el Búnker.
      </p>
      
      <button 
        onClick={handleLogout}
        className="btn-login" 
        style={{ maxWidth: '200px', margin: '0 auto', backgroundColor: '#e74c3c' }}
      >
        <i className="bi bi-box-arrow-left" style={{ marginRight: '10px' }}></i>
        Cerrar Sesión
      </button>
    </div>
  );
}