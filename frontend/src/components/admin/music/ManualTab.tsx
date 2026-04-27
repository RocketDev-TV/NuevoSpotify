'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';
import Sortable from 'sortablejs';

const PYTHON_SERVER = 'http://100.115.34.116:3000';

// 🛠️ Limpiador de strings para las carpetas del servidor
const cleanString = (str: string) => {
  return str.trim().replace(/\s+/g, '_').toLowerCase();
};

// 🛠️ Función Helper para obtener la duración del archivo al vuelo
const getAudioDuration = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const audio = new Audio(objectUrl);
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      const min = Math.floor(audio.duration / 60);
      const sec = Math.floor(audio.duration % 60);
      resolve(`${min}.${sec < 10 ? '0' : ''}${sec}`); // Formato BD: 4.05
    };
    audio.onerror = () => resolve('0.00');
  });
};

export default function ManualTab() {
  const [generos, setGeneros] = useState<any[]>([]);
  const [artistas, setArtistas] = useState<any[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);
  
  const [genreId, setGenreId] = useState('');
  const [artistId, setArtistId] = useState('');
  const [albumId, setAlbumId] = useState('');
  const [albumActual, setAlbumActual] = useState<any>(null);
  const [cancionesBD, setCancionesBD] = useState<any[]>([]);
  const [isLocked, setIsLocked] = useState(false);

  // ESTADO PARA ARCHIVOS EN ESPERA (STAGING)
  const [stagedFiles, setStagedFiles] = useState<any[]>([]);

  // Estados de Modales
  const [activeModal, setActiveModal] = useState<'genero' | 'artista' | 'album' | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formG, setFormG] = useState({ nombre: '', decada: '2020-01-01' });
  const [formArt, setFormArt] = useState({ nombre: '', desc: '' });
  const [formAlb, setFormAlb] = useState<{titulo: string, fecha: string, tipo: string, num: number, coverFile: File | null}>({ titulo: '', fecha: '', tipo: 'ALBUM', num: 0, coverFile: null });

  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  const tbodyStagingRef = useRef<HTMLTableSectionElement>(null); // Referencia para la tabla de espera

  // ==========================================
  // EFECTOS DE CARGA (Supabase)
  // ==========================================
  const loadGeneros = async () => {
    const { data } = await supabase.from('genero').select('*').order('nombre_genero');
    if (data) setGeneros(data);
  };
  useEffect(() => { loadGeneros(); }, []);

  useEffect(() => {
    setArtistId(''); setAlbumId(''); setArtistas([]); setAlbums([]); setAlbumActual(null);
    if (!genreId) return;
    const loadArtistas = async () => {
      const { data } = await supabase.from('artista').select('*').eq('genero_id', genreId).order('nombre');
      if (data) setArtistas(data);
    };
    loadArtistas();
  }, [genreId]);

  useEffect(() => {
    setAlbumId(''); setAlbums([]); setAlbumActual(null);
    if (!artistId) return;
    const loadAlbums = async () => {
      const { data } = await supabase.from('album').select('*').eq('artista_id', artistId).order('titulo_album');
      if (data) setAlbums(data);
    };
    loadAlbums();
  }, [artistId]);

  const loadCanciones = async () => {
    if (!albumId) return;
    const { data } = await supabase.from('canciones').select('*').eq('album_id', albumId).order('numero_track');
    if (data) setCancionesBD(data);
  };

  useEffect(() => {
    if (!albumId) { setAlbumActual(null); setCancionesBD([]); return; }
    const album = albums.find(a => a.id_album.toString() === albumId);
    setAlbumActual(album);
    loadCanciones();
  }, [albumId, albums]);

  // ==========================================
  // SORTABLE JS (Reordenar tablas)
  // ==========================================
  
  // 1. Tabla de Canciones del Álbum
  useEffect(() => {
    if (!tbodyRef.current || cancionesBD.length === 0) return;
    const sortable = Sortable.create(tbodyRef.current, {
      handle: '.drag-handle', animation: 150,
      onEnd: async (evt) => {
        if (evt.oldIndex === undefined || evt.newIndex === undefined) return;
        const newArr = [...cancionesBD];
        const [movedItem] = newArr.splice(evt.oldIndex, 1);
        newArr.splice(evt.newIndex, 0, movedItem);
        const updates = newArr.map((c, i) => ({ ...c, numero_track: i + 1 }));
        setCancionesBD(updates);
        updates.forEach(async (item) => {
          await supabase.from('canciones').update({ numero_track: item.numero_track }).eq('id_cancion', item.id_cancion);
        });
      }
    });
    return () => sortable.destroy();
  }, [cancionesBD]);

  // 2. 🆕 Tabla de Canciones en Espera (Staging)
  useEffect(() => {
    if (!tbodyStagingRef.current || stagedFiles.length === 0) return;
    const sortable = Sortable.create(tbodyStagingRef.current, {
      handle: '.drag-handle-staged', animation: 150,
      onEnd: (evt) => {
        if (evt.oldIndex === undefined || evt.newIndex === undefined) return;
        setStagedFiles(prev => {
            const newArr = [...prev];
            const [movedItem] = newArr.splice(evt.oldIndex!, 1);
            newArr.splice(evt.newIndex!, 0, movedItem);
            // Recalculamos los números de track
            return newArr.map((f, i) => ({ ...f, trackNum: cancionesBD.length + i + 1 }));
        });
      }
    });
    return () => sortable.destroy();
  }, [stagedFiles, cancionesBD.length]);


  // ==========================================
  // LÓGICA DE ARCHIVOS (STAGING)
  // ==========================================
  const procesarArchivosSeleccionados = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!isLocked) return Swal.fire('¡Alto ahí!', 'Bloquea el contexto (Candado) antes de agregar canciones.', 'warning');

    Swal.fire({ title: 'Procesando audios...', didOpen: () => Swal.showLoading() });

    const fileArray = Array.from(files);
    
    // Leemos la duración de cada archivo al vuelo
    const nuevosArchivos = await Promise.all(fileArray.map(async (file, index) => {
      const duration = await getAudioDuration(file);
      return {
        id_temp: Date.now() + index,
        file: file,
        title: file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "), // Limpia la extensión
        duration: duration,
        trackNum: cancionesBD.length + stagedFiles.length + index + 1
      };
    }));

    setStagedFiles((prev) => [...prev, ...nuevosArchivos]);
    Swal.close();
  };

  const quitarDeStaging = (id_temp: number) => {
    setStagedFiles(prev => {
        const filtrado = prev.filter(f => f.id_temp !== id_temp);
        return filtrado.map((f, i) => ({ ...f, trackNum: cancionesBD.length + i + 1 }));
    });
  };

  // 🆕 Editar el título antes de subir
  const editarNombreStaging = async (id_temp: number, currentTitle: string) => {
    const { value: newTitle } = await Swal.fire({
      title: 'Editar Título',
      input: 'text',
      inputValue: currentTitle,
      showCancelButton: true,
      customClass: { popup: 'swal-popup-pro', input: 'swal-input-pro' }
    });
    
    if (newTitle && newTitle !== currentTitle) {
       setStagedFiles(prev => prev.map(f => f.id_temp === id_temp ? { ...f, title: newTitle } : f));
    }
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); procesarArchivosSeleccionados(e.dataTransfer.files); };


  // ==========================================
  // FUNCIONES CRUD
  // ==========================================

  // FUNCIÓN MAESTRA DE SUBIDA (API + SUPABASE)
  const handleProcesarSubida = async () => {
    if (stagedFiles.length === 0) return;

    const artist = artistas.find(a => a.id_artista.toString() === artistId);
    if (!artist) return Swal.fire('Error', 'Artista no encontrado', 'error');

    const artistName = cleanString(artist.nombre);
    const albumName = cleanString(albumActual.titulo_album);
    const coverUrl = albumActual.imagen_url || null;

    // Alerta de progreso inicial
    Swal.fire({
      title: 'Subiendo al Búnker...',
      html: `Preparando envío de <b>${stagedFiles.length}</b> canciones.`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
      background: '#181818', color: '#fff', customClass: { popup: 'swal-popup-pro' }
    });

    let exitosas = 0;

    for (let i = 0; i < stagedFiles.length; i++) {
      const item = stagedFiles[i];
      
      // Actualizar el texto del SweetAlert en tiempo real
      Swal.update({ html: `Enviando track <b>${i + 1}</b> de ${stagedFiles.length}:<br/><span style="color:#2CC295">${item.title}</span>` });

      try {
        // 1. Subir al servidor Python
        const extension = item.file.name.split('.').pop(); 
        const safeFileName = cleanString(item.title) + '.' + extension;
        const relativePath = `${artistName}/${albumName}/${Date.now()}_${safeFileName}`;
        
        const formData = new FormData();
        formData.append('ruta', relativePath);
        formData.append('file', item.file);

        const pyRes = await fetch(`${PYTHON_SERVER}/upload`, {
          method: 'POST',
          body: formData
        });

        if (!pyRes.ok) throw new Error('Falló el servidor Python');

        // 2. URL Pública (ruta estática /musica/)
        const publicUrl = `${PYTHON_SERVER}/musica/${relativePath}`;

        // 3. Insertar en Supabase
        const { error: dbErr } = await supabase.from('canciones').insert([{
          titulo_cancion: item.title,
          artista_id: artistId,
          album_id: albumId,
          audio_path: publicUrl,
          reproducciones: 0,
          duracion_cancion: parseFloat(item.duration),
          imagen_url: coverUrl,
          numero_track: item.trackNum
        }]);

        if (dbErr) throw dbErr;
        exitosas++;

      } catch (err) {
        console.error("Error procesando:", item.title, err);
      }
    }

    // 4. Actualizar Duración Total del Álbum
    const { data: cancionesData } = await supabase.from('canciones').select('duracion_cancion').eq('album_id', albumId);
    if (cancionesData) {
        let totalSegundos = 0;
        cancionesData.forEach(c => {
            const min = Math.floor(c.duracion_cancion);
            const sec = Math.round((c.duracion_cancion - min) * 100);
            totalSegundos += (min * 60) + sec;
        });
        const finalFmt = parseFloat(`${Math.floor(totalSegundos / 60)}.${Math.floor(totalSegundos % 60).toString().padStart(2, '0')}`);
        await supabase.from('album').update({ duracion_album: finalFmt }).eq('id_album', albumId);
    }

    // 5. Limpieza y refresco
    setStagedFiles([]);
    loadCanciones(); // Recarga la tabla inferior
    
    // Si tienes un input con id 'inputFileAudio', lo limpiamos para evitar bugs si subes el mismo archivo
    const fileInput = document.getElementById('inputFileAudio') as HTMLInputElement;
    if (fileInput) fileInput.value = '';

    Swal.fire({
      title: '¡Misión Cumplida!',
      text: `Se subieron ${exitosas} canciones exitosamente.`,
      icon: 'success',
      showCancelButton: true,
      confirmButtonText: 'Seguir en este Álbum',
      cancelButtonText: 'Cambiar de Álbum',
      confirmButtonColor: '#1db954',
      cancelButtonColor: '#333',
      background: '#181818', color: '#fff', customClass: { popup: 'swal-popup-pro' }
    }).then((result) => {
      if (result.dismiss === Swal.DismissReason.cancel) {
        setIsLocked(false);
      }
    });
  };

  const handleReset = async () => {
    if (stagedFiles.length > 0 || isLocked) {
      const result = await Swal.fire({
        title: '¿Limpiar todo?', text: "Se desbloqueará el contexto y se limpiarán los archivos en espera.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', background: '#181818', color: '#fff', customClass: { popup: 'swal-popup-pro' }
      });
      if (!result.isConfirmed) return;
    }
    setIsLocked(false); setGenreId(''); setArtistId(''); setAlbumId(''); setStagedFiles([]);
    Swal.fire({ title: 'Limpio', icon: 'success', toast: true, position: 'top-end', timer: 1500, showConfirmButton: false, background: '#181818', color: '#fff' });
  };

  const handleBorradoNuclear = async () => {
    const { value: confirmWord } = await Swal.fire({ title: '☢️ ¿BORRADO NUCLEAR? ☢️', html: `Vas a destruir el disco <b>"${albumActual.titulo_album}"</b>.<br>Escribe <b>CANCELAR</b>:`, input: 'text', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', customClass: { popup: 'swal-popup-pro', input: 'swal-input-pro' }, preConfirm: (v) => v === 'CANCELAR' || Swal.showValidationMessage('Escribe CANCELAR en mayúsculas') });
    if (confirmWord) {
      Swal.fire({ title: 'Aniquilando...', didOpen: () => Swal.showLoading() });
      const artist = artistas.find(a => a.id_artista.toString() === artistId);
      try { await fetch(`${PYTHON_SERVER}/api/delete_folder`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ruta: `${artist.nombre}/${albumActual.titulo_album}` }) }); } catch (err) {}
      await supabase.from('canciones').delete().eq('album_id', albumId);
      await supabase.from('album').delete().eq('id_album', albumId);
      setGenreId(''); setIsLocked(false); setStagedFiles([]);
      Swal.fire('¡Listo!', 'El disco dejó de existir.', 'success');
    }
  };

  const handleBorrarCancion = async (id: number) => {
    const res = await Swal.fire({ title: '¿Borrar canción?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' });
    if (res.isConfirmed) {
      await supabase.from('canciones').delete().eq('id_cancion', id); loadCanciones();
      Swal.fire({ title: 'Eliminada', toast: true, position: 'top-end', timer: 1500, icon: 'success' });
    }
  };

  const saveGenero = async () => { const { error } = await supabase.from('genero').insert([{ nombre_genero: formG.nombre, decada: formG.decada }]); if (!error) { loadGeneros(); setActiveModal(null); } };
  const saveArtista = async () => { const { error } = await supabase.from('artista').insert([{ nombre: formArt.nombre, descripcion: formArt.desc, genero_id: genreId }]); if (!error) { const { data } = await supabase.from('artista').select('*').eq('genero_id', genreId).order('nombre'); setArtistas(data || []); setActiveModal(null); } };
  const saveAlbum = async () => { 
    const payload = { titulo_album: formAlb.titulo, artista_id: artistId, fecha_lanzamiento: formAlb.fecha, tipo_lanzamiento: formAlb.tipo, num_canciones: formAlb.num };
    if (isEditing) { await supabase.from('album').update(payload).eq('id_album', albumId); } else { await supabase.from('album').insert([payload]); }
    const { data } = await supabase.from('album').select('*').eq('artista_id', artistId).order('titulo_album'); setAlbums(data || []); setActiveModal(null); Swal.fire('¡Éxito!', `Disco guardado.`, 'success'); 
  };

  return (
    <div className="music-tab active">
      
      {/* 🆕 Inyectamos CSS solo para el Scrollbar Minimalista de Staging */}
      <style>{`
        .staging-scroll::-webkit-scrollbar { width: 6px; }
        .staging-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); border-radius: 4px; }
        .staging-scroll::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }
        .staging-scroll::-webkit-scrollbar-thumb:hover { background: #2CC295; }
      `}</style>

      <div className="grid-2-cols" style={{ display: 'flex', gap: '25px', alignItems: 'stretch' }}>
        
        {/* --- PANEL IZQUIERDO --- */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', flex: 1, margin: 0 }}>
          <h3>1. Definir contexto</h3>
          <form id="formMetadata">
            <label>Género Musical</label>
            <div className="input-group-row compact">
              <select value={genreId} onChange={(e) => setGenreId(e.target.value)} disabled={isLocked}>
                <option value="">Selecciona Género</option>
                {generos.map(g => <option key={g.id_gener} value={g.id_gener}>{g.nombre_genero}</option>)}
              </select>
              <button type="button" className="btn-icon" onClick={() => setActiveModal('genero')} disabled={isLocked}><i className="bi bi-plus"></i></button>
            </div>

            <label>Artista</label>
            <div className="input-group-row compact">
              <select value={artistId} onChange={(e) => setArtistId(e.target.value)} disabled={!genreId || isLocked}>
                <option value="">{genreId ? 'Selecciona Artista' : 'Elige género primero'}</option>
                {artistas.map(a => <option key={a.id_artista} value={a.id_artista}>{a.nombre}</option>)}
              </select>
              <button type="button" className="btn-icon" onClick={() => setActiveModal('artista')} disabled={!genreId || isLocked}><i className="bi bi-plus"></i></button>
            </div>

            <label>Álbum / EP</label>
            <div className="input-group-row compact">
              <select value={albumId} onChange={(e) => setAlbumId(e.target.value)} disabled={!artistId || isLocked}>
                <option value="">{artistId ? 'Selecciona Álbum' : 'Elige artista primero'}</option>
                {albums.map(al => <option key={al.id_album} value={al.id_album}>{al.titulo_album}</option>)}
              </select>
              <button type="button" className="btn-icon" onClick={() => { setFormAlb({ titulo: '', fecha: '', tipo: 'ALBUM', num: 0, coverFile: null }); setIsEditing(false); setActiveModal('album'); }} disabled={!artistId || isLocked}><i className="bi bi-plus"></i></button>
            </div>

            {albumActual && (
              <div style={{ marginTop: '15px', textAlign: 'center' }}>
                <img src={albumActual.imagen_url || "https://placehold.co/400x400?text=Sin+Portada"} alt="Cover" style={{ maxWidth: '150px', borderRadius: '8px', border: '2px solid #222' }} />
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button type="button" className={`btn-secondary ${isLocked ? 'btn-success' : ''}`} onClick={() => setIsLocked(!isLocked)} style={{ flexGrow: 1, backgroundColor: isLocked ? '#2CC295' : 'rgba(255,255,255,0.1)', color: isLocked ? '#000' : '#fff' }}>
                <i className={`bi ${isLocked ? 'bi-check-circle-fill' : 'bi-lock-fill'}`}></i> {isLocked ? 'Fijado' : 'Confirmar Contexto'}
              </button>
              
              <button type="button" className="btn-nuclear" onClick={handleReset} title="Limpiar todo">
                <i className="bi bi-arrow-counterclockwise"></i>
              </button>
            </div>
          </form>

          {/* INVENTARIO DE CANCIONES */}
          {albumActual && (
            <div className="animate__animated animate__fadeIn" style={{ marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h6 style={{ color: '#27ae60', textTransform: 'uppercase', margin: 0, fontSize: '0.75rem', letterSpacing: '1px' }}>
                    <i className="bi bi-disc"></i> En este álbum
                  </h6>
                  <span style={{ backgroundColor: '#111', color: '#888', border: '1px solid #444', padding: '4px 10px', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    {cancionesBD.length} tracks
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap', gap: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <h4 style={{ color: '#fff', margin: 0, fontWeight: 600, fontSize: '1.2rem', letterSpacing: '-0.5px' }}>{albumActual.titulo_album}</h4>
                    <span style={{ color: '#888', fontFamily: 'monospace', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '6px' }}>{albumActual.fecha_lanzamiento?.substring(0, 4) || '----'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => { setFormAlb({ titulo: albumActual.titulo_album, fecha: albumActual.fecha_lanzamiento, tipo: albumActual.tipo_lanzamiento, num: albumActual.num_canciones, coverFile: null }); setIsEditing(true); setActiveModal('album'); }} style={{ background: 'transparent', color: '#B3B3B3', border: '1px solid #444', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#2CC295'; e.currentTarget.style.background = 'rgba(44, 194, 149, 0.1)'; }} onMouseOut={(e) => { e.currentTarget.style.color = '#B3B3B3'; e.currentTarget.style.borderColor = '#444'; e.currentTarget.style.background = 'transparent'; }}>
                      <i className="bi bi-pencil-square"></i> Editar
                    </button>
                    <button onClick={handleBorradoNuclear} style={{ background: 'transparent', color: '#ff4d4d', border: '1px solid rgba(255, 77, 77, 0.3)', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.background = '#ff4d4d'; e.currentTarget.style.color = '#fff'; }} onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ff4d4d'; }}>
                      <i className="bi bi-trash3-fill"></i> Destruir
                    </button>
                  </div>
                </div>
              </div>

              <table className="table table-dark table-sm table-hover" style={{ width: '100%', background: 'transparent' }}>
                <thead>
                  <tr style={{ color: '#888', fontSize: '0.8rem' }}>
                    <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                    <th>Título</th>
                    <th style={{ width: '60px', textAlign: 'center' }}><i className="bi bi-clock"></i></th>
                    <th style={{ width: '80px', textAlign: 'center' }}><i className="bi bi-gear"></i></th>
                  </tr>
                </thead>
                <tbody ref={tbodyRef}>
                  {cancionesBD.length === 0 ? (
                    <tr><td colSpan={4} className="text-center text-muted py-3">Álbum vacío</td></tr>
                  ) : (
                    cancionesBD.map((c) => (
                      <tr key={c.id_cancion}>
                        <td className="text-center text-secondary">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <i className="bi bi-list drag-handle" style={{ cursor: 'grab', color: '#666' }}></i>
                            <span className="small font-monospace">{c.numero_track}</span>
                          </div>
                        </td>
                        <td style={{ color: '#fff', fontWeight: 'bold' }}>{c.titulo_cancion}</td>
                        <td style={{ fontFamily: 'monospace', color: '#bbb', textAlign: 'center' }}>{c.duracion_cancion}</td>
                        <td style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                          <i className="bi bi-pencil" style={{ cursor: 'pointer', color: '#B3B3B3', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color='#2CC295'} onMouseOut={(e) => e.currentTarget.style.color='#B3B3B3'} onClick={async () => { const { value } = await Swal.fire({title: 'Editar Título', input: 'text', inputValue: c.titulo_cancion, showCancelButton: true, customClass: { popup: 'swal-popup-pro', input: 'swal-input-pro' }}); if (value && value !== c.titulo_cancion) { await supabase.from('canciones').update({titulo_cancion: value}).eq('id_cancion', c.id_cancion); loadCanciones(); }}}></i>
                          <i className="bi bi-trash" style={{ cursor: 'pointer', color: '#B3B3B3', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color='#ff4d4d'} onMouseOut={(e) => e.currentTarget.style.color='#B3B3B3'} onClick={() => handleBorrarCancion(c.id_cancion)}></i>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* --- 🆕 PANEL DERECHO (ESTRUCTURADO Y BLINDADO) --- */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', flex: 1, margin: 0, height: '100%', maxHeight: 'calc(100vh - 150px)' }}>
          
          <div style={{ flex: 'none' }}>
            <h3>2. Carga masiva</h3>
            <p className="instruction-text">Usa el panel de la izquierda para definir el destino.</p>
            
            <div className="file-upload-wrapper" style={{ marginBottom: '15px' }}>
              <input type="file" id="inputFileAudio" accept="audio/*" multiple hidden disabled={!isLocked} onChange={(e) => procesarArchivosSeleccionados(e.target.files)} />
              <label htmlFor="inputFileAudio" className="custom-file-upload" style={{ opacity: isLocked ? 1 : 0.5, cursor: isLocked ? 'pointer' : 'not-allowed', width: '100%', display: 'block', textAlign: 'center', padding: '20px', border: '2px dashed #333', borderRadius: '12px', transition: 'all 0.3s' }} onDragOver={handleDragOver} onDrop={handleDrop}>
                <i className="bi bi-cloud-arrow-up" style={{ fontSize: '32px', color: isLocked ? '#2CC295' : '#555', marginBottom: '5px', display: 'block' }}></i>
                <p style={{ color: '#888', margin: 0, fontSize: '13px' }}>{isLocked ? "Click o arrastra tus canciones aquí" : "Bloquea el contexto para subir"}</p>
              </label>
            </div>
          </div>

          {/* 🆕 TABLA DE ESPERA (Con Altura Controlada y Scroll) */}
          <div className="file-list-area staging-scroll" style={{ flex: 1, minHeight: '200px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', overflowY: 'auto' }}>
            
            <table className="table table-dark table-sm table-hover mb-0 align-middle" style={{ width: '100%', background: 'transparent' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#121212', zIndex: 5, boxShadow: '0 2px 5px rgba(0,0,0,0.5)' }}>
                <tr style={{ color: '#888', fontSize: '0.8rem' }}>
                  <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                  <th>Título Listo para BD</th>
                  <th style={{ width: '60px', textAlign: 'center' }}><i className="bi bi-clock"></i></th>
                  <th style={{ width: '80px', textAlign: 'center' }}><i className="bi bi-gear"></i></th>
                </tr>
              </thead>
              <tbody ref={tbodyStagingRef}>
                {stagedFiles.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-muted" style={{ padding: '40px 0' }}>
                      <i className="bi bi-inbox fs-3 mb-2 d-block opacity-50"></i>
                      No hay archivos en espera
                    </td>
                  </tr>
                ) : (
                  stagedFiles.map((file) => (
                    <tr key={file.id_temp} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td className="text-center text-secondary">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <i className="bi bi-list drag-handle-staged" style={{ cursor: 'grab', color: '#666' }}></i>
                          <span className="small font-monospace">{file.trackNum}</span>
                        </div>
                      </td>
                      <td style={{ color: '#fff', fontWeight: '500', fontSize: '0.9rem' }}>
                        {file.title}
                      </td>
                      <td style={{ fontFamily: 'monospace', color: '#bbb', textAlign: 'center', fontSize: '0.85rem' }}>
                        {file.duration.replace('.', ':')}
                      </td>
                      <td style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                        {/* Botón Editar Staging */}
                        <i className="bi bi-pencil" style={{ cursor: 'pointer', color: '#B3B3B3', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color='#2CC295'} onMouseOut={(e) => e.currentTarget.style.color='#B3B3B3'} onClick={() => editarNombreStaging(file.id_temp, file.title)}></i>
                        {/* Botón Borrar Staging */}
                        <i className="bi bi-x-circle-fill" style={{ cursor: 'pointer', color: '#B3B3B3', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color='#ff4d4d'} onMouseOut={(e) => e.currentTarget.style.color='#B3B3B3'} onClick={() => quitarDeStaging(file.id_temp)}></i>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

          </div>

          <div style={{ flex: 'none', marginTop: '15px' }}>
            <button 
              className="btn-primary full-width" 
              disabled={stagedFiles.length === 0} 
              style={{ opacity: stagedFiles.length === 0 ? 0.5 : 1, padding: '14px', borderRadius: '10px', fontWeight: 'bold', border: 'none', background: '#2CC295', color: '#000', cursor: stagedFiles.length === 0 ? 'not-allowed' : 'pointer', width: '100%' }}
              onClick={handleProcesarSubida}
            >
              <i className="bi bi-upload" style={{ marginRight: '8px' }}></i> Procesar {stagedFiles.length} canciones
            </button>
          </div>
        </div>

      </div>

      {/* --- MODALES --- */}
      {activeModal && (
        <div className="modal-overlay active">
          <div className="modal-content">
            <h3>{activeModal === 'genero' ? 'Nuevo Género' : activeModal === 'artista' ? 'Nuevo Artista' : isEditing ? 'Editar Álbum' : 'Nuevo Álbum'}</h3>
            
            {activeModal === 'genero' && (
              <>
                <input type="text" placeholder="Ej. Rock" value={formG.nombre} onChange={e => setFormG({...formG, nombre: e.target.value})} />
                <select value={formG.decada} onChange={e => setFormG({...formG, decada: e.target.value})}>
                  <option value="2020-01-01">2020s</option><option value="2010-01-01">2010s</option><option value="2000-01-01">2000s</option>
                </select>
                <div className="modal-actions">
                  <button className="btn-cancel" onClick={() => setActiveModal(null)}>Cancelar</button>
                  <button className="btn-confirm" onClick={saveGenero}>Guardar</button>
                </div>
              </>
            )}

            {activeModal === 'artista' && (
              <>
                <input type="text" placeholder="Nombre Artista" value={formArt.nombre} onChange={e => setFormArt({...formArt, nombre: e.target.value})} />
                <textarea placeholder="Descripción" value={formArt.desc} onChange={e => setFormArt({...formArt, desc: e.target.value})} />
                <div className="modal-actions">
                  <button className="btn-cancel" onClick={() => setActiveModal(null)}>Cancelar</button>
                  <button className="btn-confirm" onClick={saveArtista}>Guardar</button>
                </div>
              </>
            )}

            {activeModal === 'album' && (
              <>
                <input type="text" placeholder="Título Álbum" value={formAlb.titulo} onChange={e => setFormAlb({...formAlb, titulo: e.target.value})} />
                
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ color: '#bbb', fontSize: '13px', display: 'block', marginBottom: '5px' }}>Portada del Disco</label>
                  <input type="file" accept="image/*" style={{ background: '#111', padding: '10px', borderRadius: '8px', border: '1px dashed #444', color: '#fff', width: '100%' }} onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setFormAlb({...formAlb, coverFile: e.target.files[0]});
                    }
                  }} />
                </div>

                <div className="row-dates">
                  <input type="date" value={formAlb.fecha} onChange={e => setFormAlb({...formAlb, fecha: e.target.value})} />
                  <input type="number" placeholder="Tracks" value={formAlb.num} onChange={e => setFormAlb({...formAlb, num: parseInt(e.target.value)})} />
                </div>
                <select value={formAlb.tipo} onChange={e => setFormAlb({...formAlb, tipo: e.target.value})}>
                  <option value="ALBUM">Álbum (LP)</option><option value="EP">EP</option><option value="SINGLE">Sencillo</option>
                </select>
                <div className="modal-actions">
                  <button className="btn-cancel" onClick={() => setActiveModal(null)}>Cancelar</button>
                  <button className="btn-confirm" onClick={saveAlbum}>{isEditing ? 'Actualizar' : 'Crear'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}