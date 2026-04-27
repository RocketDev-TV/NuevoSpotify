'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import Swal from 'sweetalert2';
import '../../styles/auth.css';

export default function CambiarPasswordPage() {
  const router = useRouter();

  // 1. Estados para los inputs y UI
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass1, setShowPass1] = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // 2. Seguridad: Verificar que el usuario tenga permiso (sesión activa del link)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/'); // Si no hay sesión, rebota al login
      } else {
        setIsAuthorized(true);
      }
    };
    checkSession();
  }, [router]);

  // 3. Validaciones en tiempo real (El semáforo)
  const reqLength = password.length >= 8;
  const reqUpper = /[A-Z]/.test(password);
  const reqNumber = /\d/.test(password);
  const reqSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const isPasswordSecure = reqLength && reqUpper && reqNumber && reqSymbol;

  // 4. Función para actualizar
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPass) {
      Swal.fire({ title: 'Error', text: 'Las contraseñas no coinciden.', icon: 'error', customClass: { popup: 'swal-popup-pro' }});
      return;
    }

    if (!isPasswordSecure) {
      Swal.fire({ title: 'Contraseña débil', text: 'Cumple con todos los requisitos en rojo.', icon: 'warning', customClass: { popup: 'swal-popup-pro' }});
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      await Swal.fire({
        icon: 'success',
        title: '¡Listo!',
        text: 'Tu contraseña se actualizó correctamente.',
        confirmButtonColor: '#03624C',
        customClass: { popup: 'swal-popup-pro' }
      });

      // Cerramos sesión para que entre limpio con su nueva clave
      await supabase.auth.signOut();
      router.push('/');

    } catch (error: any) {
      Swal.fire({ title: 'Error', text: error.message, icon: 'error', customClass: { popup: 'swal-popup-pro' }});
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthorized) return null; // No renderiza nada hasta validar sesión

  return (
    <div className="login-card">
      <div className="header-text">
        <h1>Nueva Contraseña</h1>
        <p>Escribe tu nueva clave para asegurar tu cuenta.</p>
      </div>

      <form className="login-form" onSubmit={handleUpdate}>
        <div className="input-group">
          <input 
            type={showPass1 ? "text" : "password"} 
            placeholder="Nueva contraseña" 
            required 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <i className={`bi ${showPass1 ? 'bi-eye-slash' : 'bi-eye'} toggle-password`} onClick={() => setShowPass1(!showPass1)}></i>
        </div>

        <div className="input-group">
          <input 
            type={showPass2 ? "text" : "password"} 
            placeholder="Confirmar contraseña" 
            required 
            value={confirmPass}
            onChange={(e) => setConfirmPass(e.target.value)}
          />
          <i className={`bi ${showPass2 ? 'bi-eye-slash' : 'bi-eye'} toggle-password`} onClick={() => setShowPass2(!showPass2)}></i>
        </div>

        {/* Requisitos visuales */}
        <div className="password-requirements">
          <p>La contraseña debe tener:</p>
          <ul>
            <li className={reqLength ? 'valid' : 'invalid'}><i className={`bi ${reqLength ? 'bi-check-circle-fill' : 'bi-dot'}`}></i> Min. 8 caracteres</li>
            <li className={reqUpper ? 'valid' : 'invalid'}><i className={`bi ${reqUpper ? 'bi-check-circle-fill' : 'bi-dot'}`}></i> 1 Mayúscula</li>
            <li className={reqNumber ? 'valid' : 'invalid'}><i className={`bi ${reqNumber ? 'bi-check-circle-fill' : 'bi-dot'}`}></i> 1 Número</li>
            <li className={reqSymbol ? 'valid' : 'invalid'}><i className={`bi ${reqSymbol ? 'bi-check-circle-fill' : 'bi-dot'}`}></i> 1 Símbolo</li>
          </ul>
        </div>

        <button type="submit" className="btn-login" disabled={isLoading}>
          {isLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
        </button>
      </form>
    </div>
  );
}