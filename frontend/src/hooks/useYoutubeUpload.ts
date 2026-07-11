import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export const useYoutubeUpload = () => {
  // --- ESTADOS DE YOUTUBE ---
  const [url, setUrl] = useState('');
  const [isConsulting, setIsConsulting] = useState(false);
  const [tracks, setTracks] = useState<any[]>([]);
  const [playlistName, setPlaylistName] = useState('');
  const [albumYear, setAlbumYear] = useState('2024');
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');

  // --- ESTADOS DE CONTEXTO ---
  const [genres, setGenres] = useState<any[]>([]);
  const [artists, setArtistas] = useState<any[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);
  const [genreId, setGenreId] = useState('');
  const [artistId, setArtistId] = useState('');
  const [albumId, setAlbumId] = useState('');
  const [loadingArtists, setLoadingArtists] = useState(false);
  const [loadingAlbums, setLoadingAlbums] = useState(false);

  // --- ESTADOS DE MODALES ---
  const [activeModal, setActiveModal] = useState<'genero' | 'artista' | 'album' | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [formG, setFormG] = useState({ nombre: '', decada: '2020-01-01' });
  const [formArt, setFormArt] = useState({ nombre: '', desc: '' });
  const [formAlbRaw, setFormAlbRaw] = useState({
    titulo: '', fecha: '', tipo: 'ALBUM', num: 0, coverFile: null as File | null
  });
  type FormAlbState = typeof formAlbRaw;

  // Blindaje: sin importar quién llame a setFormAlb (el hook o el componente), la fecha
  // siempre queda en formato yyyy-MM-dd. Evita el "undefined-01-01" / ISO completo que
  // truena en <input type="date">.
  const normalizarFecha = (fecha: string) => (fecha ? fecha.split('T')[0] : '');
  const setFormAlb = (value: FormAlbState | ((prev: FormAlbState) => FormAlbState)) => {
    setFormAlbRaw(prev => {
      const next = typeof value === 'function' ? (value as (p: FormAlbState) => FormAlbState)(prev) : value;
      return { ...next, fecha: normalizarFecha(next.fecha) };
    });
  };
  const formAlb = formAlbRaw;

  // 1. CARGA DE DATOS
  const loadGeneros = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/music-manager/generos`);
      const data = await res.json();
      setGenres(Array.isArray(data) ? data : []);
    } catch (e) { console.error("Error cargando géneros", e); }
  };

  useEffect(() => { loadGeneros(); }, []);

  useEffect(() => {
    setArtistId(''); setAlbumId(''); setArtistas([]); setAlbums([]);
    if (!genreId) return;

    let cancelado = false;
    setLoadingArtists(true);
    fetch(`${BACKEND_URL}/music-manager/artistas/${genreId}`)
      .then(res => res.json())
      .then(data => { if (!cancelado) setArtistas(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelado) setArtistas([]); })
      .finally(() => { if (!cancelado) setLoadingArtists(false); });

    // Evita que una respuesta vieja (de un género previo) sobreescriba la selección actual
    return () => { cancelado = true; };
  }, [genreId]);

  useEffect(() => {
    setAlbumId(''); setAlbums([]);
    if (!artistId) return;

    let cancelado = false;
    setLoadingAlbums(true);
    fetch(`${BACKEND_URL}/music-manager/albums/${artistId}`)
      .then(res => res.json())
      .then(data => { if (!cancelado) setAlbums(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelado) setAlbums([]); })
      .finally(() => { if (!cancelado) setLoadingAlbums(false); });

    return () => { cancelado = true; };
  }, [artistId]);

  // 2. MODALES (GUARDADO)
  const saveGenero = async () => {
    const res = await fetch(`${BACKEND_URL}/music-manager/generos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre_genero: formG.nombre, decada: formG.decada })
    });
    const newGen = await res.json();
    setGenres(prev => [...prev, newGen]);
    setGenreId(newGen.id_gener);
    setActiveModal(null);
  };

  const saveArtista = async () => {
    const res = await fetch(`${BACKEND_URL}/music-manager/artistas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: formArt.nombre, genero_id: genreId })
    });
    const newArt = await res.json();
    setArtistas(prev => [...prev, newArt]);
    setArtistId(newArt.id_artista);
    setActiveModal(null);
  };

  // useYoutubeUpload.ts

  const saveAlbum = async () => {
    if (!artistId) return Swal.fire('Error', 'Falta Artista', 'error');

    // BUSCAMOS EL NOMBRE REAL DEL ARTISTA
    const artistaSeleccionado = artists.find(a => a.id_artista.toString() === artistId.toString());
    const nombreArtista = artistaSeleccionado ? artistaSeleccionado.nombre : 'Desconocido';

    Swal.fire({ title: 'Creando álbum y subiendo portada...', didOpen: () => Swal.showLoading() });

    try {
      // EMPACAMOS TODO EN FORMDATA (Igual que en el manual)[cite: 3]
      const formData = new FormData();
      formData.append('titulo_album', formAlb.titulo);
      formData.append('year', formAlb.fecha.substring(0, 4));
      formData.append('artista_id', artistId);
      formData.append('num_canciones', formAlb.num.toString());
      formData.append('tipo_lanzamiento', formAlb.tipo);

      // MANDAMOS EL NOMBRE PARA LA CARPETA
      formData.append('artista_nombre', nombreArtista)

      // Si el usuario seleccionó una portada en el modal[cite: 1, 4]
      if (formAlb.coverFile) {
        formData.append('portada', formAlb.coverFile);
      }

      const res = await fetch(`${BACKEND_URL}/music-manager/albums`, {
        method: 'POST',
        // IMPORTANTE: No ponemos headers, el navegador lo hace solo con FormData[cite: 3]
        body: formData
      });

      const newAlb = await res.json();

      // Si la DB nos rebotó por el check constraint, newAlb traerá el error
      if (res.status !== 201) throw new Error(newAlb.message || 'Error en DB');

      setAlbums(prev => [...prev, newAlb]);
      setAlbumId(newAlb.id_album);
      setPlaylistName(newAlb.titulo_album);
      setActiveModal(null);
      setCoverPreview(''); // Limpiar preview

      Swal.fire('¡Chulada!', 'Álbum creado con su portada en el catálogo.', 'success');
    } catch (e: any) {
      Swal.fire('Error', `No se pudo crear el álbum: ${e.message}`, 'error');
    }
  };

  const openAlbumModal = () => {
    if (!artistId) return Swal.fire('Aviso', 'Elige un artista primero', 'info');
    
    let year = new Date().getFullYear().toString();
    if (albumYear && String(albumYear) !== "undefined") {
        const parsed = parseInt(String(albumYear), 10);
        if (!isNaN(parsed) && parsed > 1900) {
            year = parsed.toString();
        }
    }
    
    setFormAlb({ titulo: playlistName, fecha: `${year}-01-01`, tipo: 'ALBUM', num: tracks.length, coverFile: null });
    setActiveModal('album');
  };

  // 3. YOUTUBE ACTIONS[cite: 4]
  const handleConsultar = async () => {
    if (!url) return;
    setIsConsulting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/music-manager/youtube-metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      setTracks(data.tracks.map((t: any) => ({ ...t, selected: true })));
      // Python responde en snake_case (playlist_name) y no manda 'year' (YouTube no
      // expone un año real para playlists), así que armamos un fallback sano aquí.
      setPlaylistName(data.playlistName || data.playlist_name || '');
      setAlbumYear(data.year || new Date().getFullYear().toString());
    } finally { setIsConsulting(false); }
  };

  const downloadSelected = async () => {
    // .trim() para evitar espacios fantasma que corrompen el nombre del archivo en disco
    const toDownload = tracks
      .filter(t => t.selected)
      .map(t => ({ ...t, titulo: (t.titulo || '').trim() }));
    if (toDownload.length === 0) return Swal.fire('Aviso', 'Selecciona rolas', 'info');
    if (!albumId) return Swal.fire('Error', 'Debes seleccionar o crear un álbum primero', 'warning');

    setIsDownloading(true);
    setProgress(0);
    setProgressText(`Descargando (1/${toDownload.length}): ${toDownload[0].titulo}`);

    try {
      // Enviamos las canciones una por una para poder reportar progreso real
      for (let i = 0; i < toDownload.length; i++) {
        const track = toDownload[i];
        setProgressText(`Descargando (${i + 1}/${toDownload.length}): ${track.titulo}`);

        const res = await fetch(`${BACKEND_URL}/music-manager/youtube-download`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url,
            tracks: [track],
            albumId,
            artistId
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || `Fallo al descargar "${track.titulo}"`);
        }

        setProgress(Math.round(((i + 1) / toDownload.length) * 100));
      }

      setProgressText('¡Sincronización completa!');
      setTimeout(() => {
        Swal.fire('¡Éxito!', 'Catálogo actualizado.', 'success');
        handleLimpiar();
        setProgress(0);
        setIsDownloading(false);
      }, 800);
    } catch (e: any) {
      Swal.fire('Error', e.message || 'Falló la descarga', 'error');
      setIsDownloading(false);
      setProgress(0);
    }
  };

  const updateTrackTitle = (i: number, val: string) => {
    setTracks(prev => prev.map((t, idx) => idx === i ? { ...t, titulo: val } : t));
  };

  const toggleTrack = (i: number) => {
    setTracks(prev => prev.map((t, idx) => idx === i ? { ...t, selected: !t.selected } : t));
  };

  const handleLimpiar = () => {
    setUrl('');
    setTracks([]);
    setPlaylistName('');
    setAlbumId('');
    setArtistId(''); // Opcional: limpiar también el contexto
    setProgress(0);
    setProgressText('');
  };

  return {
    // YouTube
    url, setUrl, isConsulting, tracks, playlistName, setPlaylistName, albumYear, setAlbumYear,
    isDownloading, progress, progressText,
    handleConsultar, handleLimpiar: () => { setUrl(''); setTracks([]); }, downloadSelected,
    updateTrackTitle, toggleTrack,
    // Contexto
    genres, artists, albums, genreId, setGenreId, artistId, setArtistId, albumId, setAlbumId,
    loadingArtists, loadingAlbums,
    // Modales
    activeModal, setActiveModal, formG, setFormG, formArt, setFormArt, formAlb, setFormAlb,
    coverPreview, setCoverPreview, saveGenero, saveArtista, saveAlbum, openAlbumModal,
  };
};