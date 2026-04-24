'use client'; 

import '../styles/auth.css';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import Swal from 'sweetalert2'; 

// ==============================================================
// 1. MINI-COMPONENTE: LOGIN
// ==============================================================
function LoginForm({ onSwitch }: { onSwitch: (view: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error: any) {
      Swal.fire({
        title: '¡Ups!',
        text: error.message.includes("Invalid login credentials") ? "Credenciales incorrectas." : "Error al iniciar sesión.",
        icon: 'error',
        customClass: { popup: 'swal-popup-pro' }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (error) {
      console.error("❌ Error Google:", error);
    }
  };

  const handleForgotPassword = async () => {
    const { value: resetEmail } = await Swal.fire({
        title: '<span class="swal-title-pro">¿Olvidaste tu contraseña?</span>',
        html: '<p class="swal-text-pro">Escribe tu correo...</p>',
        input: 'email',
        showCancelButton: true,
        confirmButtonText: 'Enviar enlace',
        cancelButtonText: 'Cancelar',
        buttonsStyling: false, 
        customClass: {
            popup: 'swal-popup-pro', input: 'swal-input-pro',
            confirmButton: 'btn-pro btn-pro-confirm', cancelButton: 'btn-pro btn-pro-cancel',
            actions: 'swal-actions-gap'
        }
    });

    if (resetEmail) {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
                redirectTo: window.location.origin + '/cambiar-password',
            });
            if (error) throw error;
            Swal.fire({ title: '¡Listo!', text: 'Revisa tu bandeja de entrada.', icon: 'success' });
        } catch (error: any) {
            Swal.fire({ title: 'Error', text: error.message, icon: 'error' });
        }
    }
  };

  return (
    <div className="login-card">
      <div className="header-text">
        <h1>Iniciar Sesión</h1>
        <p>¿Nuevo usuario? <a href="#" onClick={(e) => { e.preventDefault(); onSwitch('register'); }}>Crear cuenta</a></p>
      </div>

      <form className="login-form" onSubmit={handleEmailLogin}>
        <div className="input-group">
          <input type="email" placeholder="Correo electrónico" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div className="input-group">
          <input type={showPassword ? "text" : "password"} placeholder="Contraseña" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'} toggle-password`} onClick={() => setShowPassword(!showPassword)}></i>
        </div>

        <div className="forgot-link">
          <a href="#" onClick={(e) => { e.preventDefault(); handleForgotPassword(); }}>¿Olvidaste tu contraseña?</a>
        </div>

        <button type="submit" className="btn-login" disabled={isLoading}>
          {isLoading ? 'Iniciando...' : 'Entrar'}
        </button>
      </form>

      <div className="divider"><span>o continúa con</span></div>

      <div className="social-row">
        <button onClick={handleGoogleLogin} className="social-btn google" type="button">
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="G" width="24" height="24" />
          <span>Google</span>
        </button>
      </div>
    </div>
  );
}

// ==============================================================
// 2. MINI-COMPONENTE: REGISTRO
// ==============================================================
function RegisterForm({ onSwitch }: { onSwitch: (view: string) => void }) {
  const [nombre, setNombre] = useState('');
  const [paterno, setPaterno] = useState('');
  const [materno, setMaterno] = useState('');
  const [fecha, setFecha] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const [showPass1, setShowPass1] = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const reqLength = password.length >= 8;
  const reqUpper = /[A-Z]/.test(password);
  const reqNumber = /\d/.test(password);
  const reqSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const isPasswordSecure = reqLength && reqUpper && reqNumber && reqSymbol;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre || !paterno || !materno || !fecha || !email || !password) {
      Swal.fire({ title: '¡Faltan datos!', text: 'Llena todo el formulario.', icon: 'warning', customClass: { popup: 'swal-popup-pro' }});
      return;
    }
    if (password !== confirmPass) {
      Swal.fire({ title: 'Error', text: 'Las contraseñas no coinciden.', icon: 'error', customClass: { popup: 'swal-popup-pro' }});
      return;
    }
    if (!isPasswordSecure) {
      Swal.fire({ title: 'Contraseña débil', text: 'Revisa los requisitos abajo.', icon: 'warning', customClass: { popup: 'swal-popup-pro' }});
      return;
    }

    setIsLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email, password, options: { data: { full_name: `${nombre} ${paterno} ${materno}` } }
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: dbError } = await supabase.from('usuarios').upsert([{
          uid: authData.user.id, nombre, apellido_paterno: paterno, apellido_materno: materno, correo: email, fecha_de_nacimiento: fecha, rol: 'usuario'
        }]);

        if (dbError) throw dbError;

        Swal.fire({
          title: '¡Bienvenido al club!', text: 'Revisa tu correo para activar la cuenta.', icon: 'success', customClass: { popup: 'swal-popup-pro' }
        }).then(() => { onSwitch('login'); });
      }

    } catch (error: any) {
      let mensaje = error.message;
      if (mensaje.includes("already registered")) mensaje = "Este correo ya tiene cuenta. ¡Córrele a iniciar sesión!";
      Swal.fire({ title: '¡Ups!', text: mensaje, icon: 'error', customClass: { popup: 'swal-popup-pro' }});
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="split-container">
      <div className="brand-side">
        <div className="brand-content">
          <h1>Tu música,<br />tu mundo.</h1>
          <p>Únete a la comunidad y descubre millones de canciones sin límites.</p>
        </div>
        <div className="brand-overlay"></div>
      </div>

      <div className="form-side">
        <div className="register-card">
          <div className="header-text">
            <h2>Crear cuenta</h2>
            <p>¿Ya eres parte del club? <a href="#" onClick={(e) => { e.preventDefault(); onSwitch('login'); }}>Inicia sesión</a></p>
          </div>

          <form className="register-form" onSubmit={handleRegister}>
            <div className="input-group">
              <i className="bi bi-person input-icon-left"></i>
              <input type="text" placeholder="Nombre(s)" required value={nombre} onChange={e => setNombre(e.target.value)} />
            </div>

            <div className="row-inputs">
              <div className="input-group">
                <input type="text" placeholder="Paterno" required value={paterno} onChange={e => setPaterno(e.target.value)} />
              </div>
              <div className="input-group">
                <input type="text" placeholder="Materno" required value={materno} onChange={e => setMaterno(e.target.value)} />
              </div>
            </div>

            <div className="input-group">
              <i className="bi bi-calendar-event input-icon-left"></i>
              <input type="date" placeholder="Fecha de Nacimiento" required value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>

            <div className="input-group">
              <i className="bi bi-envelope input-icon-left"></i>
              <input type="email" placeholder="Correo electrónico" required value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            <div className="input-group">
              <i className="bi bi-lock input-icon-left"></i>
              <input type={showPass1 ? "text" : "password"} placeholder="Contraseña" required value={password} onChange={e => setPassword(e.target.value)} />
              <i className={`bi ${showPass1 ? 'bi-eye-slash' : 'bi-eye'} toggle-password`} onClick={() => setShowPass1(!showPass1)}></i>
            </div>

            <div className="input-group">
              <i className="bi bi-shield-lock input-icon-left"></i>
              <input type={showPass2 ? "text" : "password"} placeholder="Confirmar contraseña" required value={confirmPass} onChange={e => setConfirmPass(e.target.value)} />
              <i className={`bi ${showPass2 ? 'bi-eye-slash' : 'bi-eye'} toggle-password`} onClick={() => setShowPass2(!showPass2)}></i>
            </div>

            {password.length > 0 && (
              <div className="password-requirements">
                <p>La contraseña debe tener:</p>
                <ul>
                  <li className={reqLength ? 'valid' : 'invalid'}><i className={`bi ${reqLength ? 'bi-check-circle-fill' : 'bi-dot'}`}></i> Min. 8 caracteres</li>
                  <li className={reqUpper ? 'valid' : 'invalid'}><i className={`bi ${reqUpper ? 'bi-check-circle-fill' : 'bi-dot'}`}></i> 1 Mayúscula</li>
                  <li className={reqNumber ? 'valid' : 'invalid'}><i className={`bi ${reqNumber ? 'bi-check-circle-fill' : 'bi-dot'}`}></i> 1 Número</li>
                  <li className={reqSymbol ? 'valid' : 'invalid'}><i className={`bi ${reqSymbol ? 'bi-check-circle-fill' : 'bi-dot'}`}></i> 1 Símbolo</li>
                </ul>
              </div>
            )}

            <button type="submit" className="btn-register" disabled={isLoading}>
              {isLoading ? 'Creando perfil...' : 'Registrarme'}
            </button>
          </form>

          <div className="footer-terms">
            Al registrarte, aceptas nuestros <br /><a href="#">Términos de Servicio</a>.
          </div>
        </div>
      </div>
    </div>
  );
}

// ==============================================================
// 3. COMPONENTE PRINCIPAL (EL PADRE)
// ==============================================================
export default function EntryPage() {
  const router = useRouter();
  const [currentView, setCurrentView] = useState('login'); 

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        try {
          const { data: userData, error } = await supabase.from('usuarios').select('rol').eq('uid', session.user.id).single();
          if (error) throw error;
          if (userData?.rol === 'admin') router.push('/admin-dashboard');
          else router.push('/reproductor');
        } catch (error) {
          console.error("❌ Falló la verificación de rol:", error);
        }
      }
    });
    return () => { authListener.subscription.unsubscribe(); };
  }, [router]);

  return (
    <>
      {currentView === 'login' && <LoginForm onSwitch={setCurrentView} />}
      {currentView === 'register' && <RegisterForm onSwitch={setCurrentView} />}
    </>
  );
}