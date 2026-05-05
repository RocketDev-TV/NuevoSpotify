import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

const BACKEND_URL = 'http://localhost:4000'; // Ajusta a tu puerto de NestJS

export const useYoutubeUpload = () => {
  // --- ESTADOS DE YOUTUBE ---
  const [url, setUrl] = useState('');
  const [isConsulting, setIsConsulting] = useState(false);
  const [tracks, setTracks] = useState<any[]>([]);
  const [playlistName, setPlaylistName] = useState('');
  const [albumYear, setAlbumYear] = useState('2024');

  // --- ESTADOS DE CONTEXTO (CASCADA) ---
  const [genres, setGenres] = useState<any[]>([]);
  const [artists, setArtistas] = useState<any[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);

  const [genreId, setGenreId] = useState('');
  const [artistId, setArtistId] = useState('');
  const [albumId, setAlbumId] = useState('');

  // --- ESTADOS DE MODALES (REUTILIZADOS DEL MANUAL) ---
  const [activeModal, setActiveModal] = useState<'genero' | 'artista' | 'album' | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [formG, setFormG] = useState({ nombre: '', decada: '2020-01-01' });
  const [formArt, setFormArt] = useState({ nombre: '', desc: '' });
  const [formAlb, setFormAlb] = useState({
    titulo: '', fecha: '', tipo: 'ALBUM', num: 0, coverFile: null as File | null
  });

  // ==========================================
  // 1. CARGA DE DATOS (CASCADA)
  // ==========================================

  // Carga inicial de géneros
  const loadGeneros = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/music-manager/generos`);
      const data = await res.json();
      setGenres(Array.isArray(data) ? data : []);
    } catch (e) { console.error("Error cargando géneros", e); }
  };

  useEffect(() => { loadGeneros(); }, []);

  // Cargar artistas cuando cambie el género
  useEffect(() => {
    setArtistId(''); setAlbumId(''); setArtistas([]); setAlbums([]);
    if (!genreId) return;
    const loadArtistas = async () => {
      const res = await fetch(`${BACKEND_URL}/music-manager/artistas/${genreId}`);
      const data = await res.json();
      setArtistas(Array.isArray(data) ? data : []);
    };
    loadArtistas();
  }, [genreId]);

  // Cargar álbumes cuando cambie el artista
  useEffect(() => {
    setAlbumId(''); setAlbums([]);
    if (!artistId) return;
    const loadAlbums = async () => {
      const res = await fetch(`${BACKEND_URL}/music-manager/albums/${artistId}`);
      const data = await res.json();
      setAlbums(Array.isArray(data) ? data : []);
    };
    loadAlbums();
  }, [artistId]);

  // ==========================================
  // 2. FUNCIONES DE GUARDADO (MODALES)
  // ==========================================

  const saveGenero = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/music-manager/generos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre_genero: formG.nombre, decada: formG.decada })
      });
      const newGen = await res.json();
      setGenres(prev => [...prev, newGen]);
      setGenreId(newGen.id_gener); // Seleccionar automáticamente
      setActiveModal(null);
      Swal.fire('¡Listo!', 'Género creado.', 'success');
    } catch (e) { Swal.fire('Error', 'No se pudo crear el género', 'error'); }
  };

  const saveArtista = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/music-manager/artistas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: formArt.nombre, genero_id: genreId })
      });
      const newArt = await res.json();
      setArtistas(prev => [...prev, newArt]);
      setArtistId(newArt.id_artista);
      setActiveModal(null);
    } catch (e) { Swal.fire('Error', 'No se pudo crear el artista', 'error'); }
  };

  const saveAlbum = async () => {
    try {
      Swal.fire({ title: 'Guardando álbum...', didOpen: () => Swal.showLoading() });
      const formData = new FormData();
      formData.append('titulo_album', formAlb.titulo);
      formData.append('fecha_lanzamiento', formAlb.fecha);
      formData.append('tipo_lanzamiento', formAlb.tipo);
      formData.append('num_canciones', formAlb.num.toString());
      formData.append('artista_id', artistId);
      if (formAlb.coverFile) formData.append('portada', formAlb.coverFile);

      const res = await fetch(`${BACKEND_URL}/music-manager/albums`, {
        method: 'POST',
        body: formData // El navegador pone el Content-Type automáticamente
      });
      const newAlb = await res.json();

      setAlbums(prev => [...prev, newAlb]);
      setAlbumId(newAlb.id_album);

      // Sincronizar la UI de YouTube con el nuevo álbum
      setPlaylistName(newAlb.titulo_album);
      setAlbumYear(newAlb.fecha_lanzamiento.substring(0, 4));

      setActiveModal(null);
      setCoverPreview('');
      Swal.fire('¡Éxito!', 'Álbum creado con su portada.', 'success');
    } catch (e) { Swal.fire('Error', 'Fallo al guardar álbum', 'error'); }
  };

  // Pre-llenar el modal de álbum con los datos que nos dio YouTube
  const openAlbumModal = () => {
    if (!artistId) return Swal.fire('Aviso', 'Elige un artista primero', 'info');
    setFormAlb({
      titulo: playlistName,
      fecha: `${albumYear}-01-01`,
      tipo: 'ALBUM',
      num: tracks.length,
      coverFile: null
    });
    setActiveModal('album');
  };

  // ==========================================
  // 3. LÓGICA DE YOUTUBE (CONSULTA Y LIMPIEZA)
  // ==========================================

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

      const tracksWithSelection = data.tracks.map((t: any) => ({
        ...t,
        selected: true
      }));

      setTracks(tracksWithSelection);
      setPlaylistName(data.playlistName);
      setAlbumYear(data.year);
    } catch (e) {
      Swal.fire('Error', 'No se pudo conectar con el Búnker Python', 'error');
    } finally { setIsConsulting(false); }
  };

  const updateTrackTitle = (index: number, newTitle: string) => {
    setTracks(prev => {
      const next = [...prev];
      next[index].titulo = newTitle; // Actualizamos el título en la posición exacta
      return next;
    });
  };

  const toggleTrack = (index: number) => {
    setTracks(prev => {
      const next = [...prev];
      next[index].selected = !next[index].selected; // Permitir deseleccionar si no quieren una rola
      return next;
    });
  };

  const handleLimpiar = () => {
    setUrl('');
    setTracks([]);
    setPlaylistName('');
  };

  return {
    // YouTube
    url, setUrl, isConsulting, tracks, playlistName, setPlaylistName, albumYear, setAlbumYear, handleConsultar, handleLimpiar,
    // Contexto
    genres, artists, albums, genreId, setGenreId, artistId, setArtistId, albumId, setAlbumId,
    // Modales
    activeModal, setActiveModal, formG, setFormG, formArt, setFormArt, formAlb, setFormAlb,
    coverPreview, setCoverPreview, saveGenero, saveArtista, saveAlbum, openAlbumModal,
    updateTrackTitle, toggleTrack
  };
};