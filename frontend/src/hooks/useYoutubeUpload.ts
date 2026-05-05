import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export interface YTTrack {
  titulo: string;
  url_video: string;
  duracion_fmt: string;
  thumbnail: string;
  selected: boolean;
}

export const useYoutubeUpload = () => {
  // 🔗 Estados de URL y Metadata
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tracks, setTracks] = useState<YTTrack[]>([]);

  // 🎵 Listas de datos reales del Backend
  const [genres, setGenres] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);

  // 🆔 IDs Seleccionados
  const [genreId, setGenreId] = useState('');
  const [artistId, setArtistId] = useState('');
  const [albumId, setAlbumId] = useState('');

  // 💿 Estados del Álbum (Para nuevos o edición)
  const [playlistName, setPlaylistName] = useState('');
  const [albumYear, setAlbumYear] = useState(new Date().getFullYear().toString());

  // 📊 Estados de progreso de descarga (¡Importante!)
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');

  // 📡 1. Cargar géneros al inicio
  useEffect(() => {
    fetch(`${BACKEND_URL}/music-manager/generos`)
      .then(res => res.json())
      .then(data => setGenres(data))
      .catch(err => console.error("Error cargando géneros", err));
  }, []);

  // 📡 2. Cargar artistas cuando cambie el género
  useEffect(() => {
    if (genreId) {
      fetch(`${BACKEND_URL}/music-manager/artistas/${genreId}`)
        .then(res => res.json())
        .then(data => {
          setArtists(data);
          setArtistId('');
          setAlbumId('');
        });
    } else {
      setArtists([]);
      setArtistId('');
      setAlbumId('');
    }
  }, [genreId]);

  useEffect(() => {
    if (artistId) {
      fetch(`${BACKEND_URL}/music-manager/albums/${artistId}`)
        .then(res => res.json())
        .then(data => {
          setAlbums(data);
          setAlbumId('');
        });
    } else {
      setAlbums([]);
      setAlbumId('');
    }
  }, [artistId]);

  const fetchMetadata = async () => {
    if (!url) return Swal.fire('Ojo', 'Pega un link de YouTube', 'warning');
    setIsLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/music-manager/youtube-metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setPlaylistName(data.playlist_name);
      setTracks(data.tracks.map((t: any) => ({ ...t, selected: true })));
    } catch (error) {
      Swal.fire('Error', 'No se pudo explorar el link.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTrack = (index: number) => {
    const newTracks = [...tracks];
    newTracks[index].selected = !newTracks[index].selected;
    setTracks(newTracks);
  };

  const updateTrackTitle = (index: number, newTitle: string) => {
    const newTracks = [...tracks];
    newTracks[index].titulo = newTitle;
    setTracks(newTracks);
  };

  const downloadSelected = async () => {
    const selectedTracks = tracks.filter(t => t.selected);

    if (selectedTracks.length === 0) return Swal.fire('Ojo', 'Selecciona al menos una pista', 'warning');
    if (!artistId) return Swal.fire('Ojo', 'Selecciona el Artista donde se guardará', 'warning');

    // Si no hay álbum seleccionado, el nombre y año son obligatorios para crear uno nuevo
    if (!albumId && (!playlistName || !albumYear)) {
      return Swal.fire('Ojo', 'Falta el nombre del álbum o el año para crear un disco nuevo', 'warning');
    }

    setIsDownloading(true);
    setProgress(0);
    let exitosas = 0;

    // El albumIdGenerado inicia con el valor del combo (si el usuario eligió uno existente)
    let currentAlbumId = albumId || null;

    for (let i = 0; i < selectedTracks.length; i++) {
      const track = selectedTracks[i];
      const porcentaje = Math.round(((i + 1) / selectedTracks.length) * 100);

      setProgressText(`Procesando ${i + 1}/${selectedTracks.length}: ${track.titulo}`);
      setProgress(porcentaje);

      try {
        const payload = {
          artista_id: artistId,
          album_titulo: playlistName,
          album_year: albumYear,
          imagen_url: track.thumbnail,
          track: track,
          index: i + 1,
          total: selectedTracks.length,
          new_album_id: currentAlbumId // Si enviamos un ID, el backend lo usa en vez de crear uno nuevo
        };

        const res = await fetch(`${BACKEND_URL}/music-manager/youtube-download`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await res.json();
        if (result.success) {
          // Guardamos el ID que nos devuelva el backend para las siguientes rolas del mismo proceso
          currentAlbumId = result.album_id;
          exitosas++;
        }
      } catch (err) {
        console.error(`Error en rola ${track.titulo}`, err);
      }
    }

    setIsDownloading(false);
    Swal.fire({
      title: '¡Descarga Completa!',
      text: `Se procesaron ${exitosas} canciones con éxito.`,
      icon: 'success',
      customClass: { popup: 'swal-popup-pro' }
    });
    resetTab();
  };

  const resetTab = () => {
    setUrl('');
    setPlaylistName('');
    setTracks([]);
    setProgress(0);
    setProgressText('');
    setGenreId('');
    setArtistId('');
    setAlbumId('');
  };

  return {
    url, setUrl, isLoading, playlistName, setPlaylistName, albumYear, setAlbumYear,
    genreId, setGenreId, artistId, setArtistId, albumId, setAlbumId,
    genres, artists, albums, // Listas para los combos
    tracks, isDownloading, progress, progressText,
    fetchMetadata, toggleTrack, updateTrackTitle, downloadSelected, resetTab
  };
};