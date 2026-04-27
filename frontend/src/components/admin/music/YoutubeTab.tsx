'use client';
import { useState } from 'react';
import Swal from 'sweetalert2';

export default function YoutubeTab() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleConsultar = async () => {
    if (!url) return Swal.fire('Ojo', 'Pega un link de YouTube', 'warning');
    setIsLoading(true);
    // Aquí irá tu fetch a http://100.115.34.116:3000/api/metadata
    setIsLoading(false);
    Swal.fire('Info', 'Conexión con Flask lista para programar', 'info');
  };

  return (
    <div className="music-tab active">
      <div className="glass-panel">
        <h3><i className="bi bi-youtube" style={{ color: '#ff0000' }}></i> Importador desde YouTube</h3>
        <p>Pega el link de una playlist o video para procesar.</p>
        <div className="input-group-row">
          <input 
            type="text" 
            placeholder="https://www.youtube.com/..." 
            value={url} 
            onChange={(e) => setUrl(e.target.value)} 
          />
          <button className="btn-primary" onClick={handleConsultar} disabled={isLoading}>
            {isLoading ? 'Buscando...' : 'Consultar'}
          </button>
        </div>
      </div>
    </div>
  );
}