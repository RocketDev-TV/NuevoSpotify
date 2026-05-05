import { useState } from 'react';
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
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // 🎵 Estados de Contexto (Género y Artista)
  const [genreId, setGenreId] = useState('');
  const [artistId, setArtistId] = useState(''); 
  const [albumId, setAlbumId] = useState('');
  
  // 💿 Estados del Álbum
  const [playlistName, setPlaylistName] = useState('');
  const [albumYear, setAlbumYear] = useState(new Date().getFullYear().toString());
  const [tracks, setTracks] = useState<YTTrack[]>([]);
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');

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
    if (!playlistName || !albumYear) return Swal.fire('Ojo', 'Falta el nombre del álbum o el año', 'warning');

    setIsDownloading(true);
    setProgress(0);
    let exitosas = 0;
    let albumIdGenerado = null; 

    for (let i = 0; i < selectedTracks.length; i++) {
      const track = selectedTracks[i];
      const porcentaje = Math.round(((i + 1) / selectedTracks.length) * 100);
      
      setProgressText(`Procesando ${i + 1}/${selectedTracks.length}: ${track.titulo}`);
      setProgress(porcentaje);

      try {
        const payload: any = {
          artista_id: artistId,
          artista_nombre: "Artista Youtube", 
          album_titulo: playlistName,
          album_year: albumYear,
          imagen_url: track.thumbnail, 
          track: track,
          index: i + 1,
          total: selectedTracks.length,
          new_album_id: albumIdGenerado 
        };

        const res: Response = await fetch(`${BACKEND_URL}/music-manager/youtube-download`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result: any = await res.json();
        if (result.success) {
          albumIdGenerado = result.album_id; 
          exitosas++;
        }
      } catch (err) {
        console.error(`Error en rola ${track.titulo}`, err);
      }
    }

    setIsDownloading(false);
    Swal.fire({ 
        title: '¡Descarga Completa!', 
        text: `Álbum guardado con ${exitosas} canciones en el servidor y BD.`, 
        icon: 'success', 
        customClass: { popup: 'swal-popup-pro' }
    });
    resetTab();
  };

  const resetTab = () => {
    setUrl(''); setPlaylistName(''); setTracks([]); setProgress(0); setGenreId(''); setArtistId('');
  };

  return {
    url, setUrl, isLoading, playlistName, setPlaylistName, albumYear, setAlbumYear,
    genreId, setGenreId, artistId, setArtistId,
    tracks, isDownloading, progress, progressText,
    fetchMetadata, toggleTrack, updateTrackTitle, downloadSelected, resetTab,
    albumId, setAlbumId
  };
};