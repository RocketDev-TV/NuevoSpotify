'use client';
import { useState } from 'react';
import YoutubeTab from './music/YoutubeTab';
import ManualTab from './music/ManualTab';
import '@/styles/admin/music-manager.css';

export default function MusicManagerView() {
  const [activeTab, setActiveTab] = useState('youtube');

  return (
    <section className="view-section active">
      <div className="manager-header">
        <h2>Gestor de Música</h2>
        <div className="tabs">
          <button 
            className={`tab-btn ${activeTab === 'youtube' ? 'active' : ''}`} 
            onClick={() => setActiveTab('youtube')}
          >
            Importar (YouTube)
          </button>
          <button 
            className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`} 
            onClick={() => setActiveTab('manual')}
          >
            Subida Manual
          </button>
        </div>
      </div>

      {activeTab === 'youtube' ? <YoutubeTab /> : <ManualTab />}
    </section>
  );
}