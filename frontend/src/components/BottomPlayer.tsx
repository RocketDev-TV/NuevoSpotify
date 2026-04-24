'use client'; // 👈 Vital para que Next.js sepa que tiene movimiento

import { usePathname } from 'next/navigation';

export default function BottomPlayer() {
  const pathname = usePathname();

  // 🛡️ El Cadenero del Player: 
  // Si la ruta es "/" (el login), no dibujamos nada.
  if (pathname === '/') return null;

  return (
    <div className="bottom-player-container">
      <div className="player-controls">
        
        {/* Botón Play/Pause con tus iconos de Bootstrap */}
        <button className="play-btn">
          <i className="bi bi-play-fill"></i>
        </button>

        {/* Barra de progreso con tu estilo de Axiforma */}
        <div className="progress-container">
          <span className="time-label">0:00</span>
          <input 
            type="range" 
            className="progress-bar" 
            min="0" 
            max="100" 
            defaultValue="0" 
          />
          <span className="time-label">3:45</span>
        </div>

        {/* Iconos extras (Volumen, etc) */}
        <div className="volume-controls">
          <i className="bi bi-volume-up text-muted"></i>
        </div>

      </div>

      <style jsx>{`
        .bottom-player-container {
          position: fixed;
          bottom: 0;
          left: 0;
          width: 100%;
          background-color: var(--dark-green);
          border-top: 1px solid var(--bangladesh-green);
          padding: 15px 40px;
          z-index: 9999;
          display: flex;
          justify-content: center;
        }

        .player-controls {
          display: flex;
          align-items: center;
          gap: 25px;
          width: 100%;
          max-width: 800px;
        }

        .progress-container {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .time-label {
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 500;
        }

        .volume-controls {
          display: flex;
          align-items: center;
          gap: 10px;
        }
      `}</style>
    </div>
  );
}