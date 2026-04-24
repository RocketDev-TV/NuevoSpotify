'use client'; // Necesario para usar clics y hooks

import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase'; // Ajusta la ruta según tu estructura
import Swal from 'sweetalert2';

export default function AdminPage() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Limpieza exitosa, mandamos al usuario al inicio
      router.push('/');
      
      // Opcional: Una notificación rápida
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });

      Toast.fire({
        icon: 'success',
        title: 'Sesión cerrada. ¡Nos vemos, Jefe!'
      });

    } catch (error: any) {
      console.error("Error al cerrar sesión:", error.message);
      Swal.fire('Error', 'No se pudo cerrar la sesión correctamente.', 'error');
    }
  };

  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h1 style={{ color: 'white', marginBottom: '30px' }}>
        👑 Bienvenido, Jefe (Dashboard)
      </h1>
      
      {/* Botón de Logout con tus estilos de Axiforma */}
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