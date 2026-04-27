'use client';
import { useState, useEffect } from 'react';

export default function Topbar() {
  const [time, setTime] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      
      const dateOptions: Intl.DateTimeFormatOptions = { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      };
      const formattedDate = now.toLocaleDateString('es-ES', dateOptions);
      setDateStr(formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1));
    };

    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="top-bar">
      <div className="welcome-text">
        <h1>Hola, <span>Admin</span> 👋</h1>
        <p>{dateStr}</p>
      </div>
      <div className="clock-card">
        <i className="bi bi-clock"></i> {/* Cambié a bi- por consistencia */}
        <span>{time}</span>
      </div>
    </header>
  );
}