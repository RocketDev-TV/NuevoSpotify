import { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import Sortable from 'sortablejs';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

// 🛠️ Mini-Cliente GraphQL Nativo (Sin librerías extra)
const fetchGQL = async (query: string, variables = {}) => {
  const res = await fetch(`${BACKEND_URL}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
};

// Helpers de utilidades
const cleanString = (str: string) => str.trim().replace(/\s+/g, '_').toLowerCase();
const getAudioDuration = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const audio = new Audio(objectUrl);
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      const min = Math.floor(audio.duration / 60);
      const sec = Math.floor(audio.duration % 60);
      resolve(`${min}.${sec < 10 ? '0' : ''}${sec}`); 
    };
    audio.onerror = () => resolve('0.00');
  });
};

export const useManualUpload = () => {
  const [generos, setGeneros] = useState<any[]>([]);
  const [artistas, setArtistas] = useState<any[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);
  const [genreId, setGenreId] = useState('');
  const [artistId, setArtistId] = useState('');
  const [albumId, setAlbumId] = useState('');
  const [albumActual, setAlbumActual] = useState<any>(null);
  const [cancionesBD, setCancionesBD] = useState<any[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<any[]>([]);

  const [activeModal, setActiveModal] = useState<'genero' | 'artista' | 'album' | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formG, setFormG] = useState({ nombre: '', decada: '2020-01-01' });
  const [formArt, setFormArt] = useState({ nombre: '', desc: '' });
  const [formAlb, setFormAlb] = useState<{titulo: string, fecha: string, tipo: string, num: number, coverFile: File | null}>({ titulo: '', fecha: '', tipo: 'ALBUM', num: 0, coverFile: null });

  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  const tbodyStagingRef = useRef<HTMLTableSectionElement>(null);

  // ==========================================
  // 1. EFECTOS (Ahora con GRAPHQL en vez de Supabase)
  // ==========================================
  const loadGeneros = async () => {
    try {
      const data = await fetchGQL(`query { getGeneros }`);
      setGeneros(JSON.parse(data.getGeneros));
    } catch (e) { console.error("Error GraphQL:", e); }
  };
  useEffect(() => { loadGeneros(); }, []);

  useEffect(() => {
    setArtistId(''); setAlbumId(''); setArtistas([]); setAlbums([]); setAlbumActual(null);
    if (!genreId) return;
    const loadArtistas = async () => {
      const data = await fetchGQL(`query { getArtistas(generoId: "${genreId}") }`);
      setArtistas(JSON.parse(data.getArtistas));
    };
    loadArtistas();
  }, [genreId]);

  useEffect(() => {
    setAlbumId(''); setAlbums([]); setAlbumActual(null);
    if (!artistId) return;
    const loadAlbums = async () => {
      const data = await fetchGQL(`query { getAlbums(artistaId: "${artistId}") }`);
      setAlbums(JSON.parse(data.getAlbums));
    };
    loadAlbums();
  }, [artistId]);

  const loadCanciones = async () => {
    if (!albumId) return;
    const data = await fetchGQL(`query { getCanciones(albumId: "${albumId}") }`);
    setCancionesBD(JSON.parse(data.getCanciones));
  };

  useEffect(() => {
    if (!albumId) { setAlbumActual(null); setCancionesBD([]); return; }
    const album = albums.find(a => (a.idAlbum || a.id_album).toString() === albumId);
    setAlbumActual(album);
    loadCanciones();
  }, [albumId, albums]);

  // ==========================================
  // 2. SORTABLE JS (Sin cambios)
  // ==========================================
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
        // FIXME: Aquí también deberíamos hacer un Mutation para guardar el orden, 
        // pero por ahora lo dejamos en memoria visual.
      }
    });
    return () => sortable.destroy();
  }, [cancionesBD]);

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
            return newArr.map((f, i) => ({ ...f, trackNum: cancionesBD.length + i + 1 }));
        });
      }
    });
    return () => sortable.destroy();
  }, [stagedFiles, cancionesBD.length]);

  // ==========================================
  // 3. FUNCIONES STAGING (Sin cambios)
  // ==========================================
  const procesarArchivosSeleccionados = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!isLocked) return Swal.fire('¡Alto ahí!', 'Bloquea el contexto (Candado) antes de agregar canciones.', 'warning');
    Swal.fire({ title: 'Procesando audios...', didOpen: () => Swal.showLoading() });
    const fileArray = Array.from(files);
    const nuevosArchivos = await Promise.all(fileArray.map(async (file, index) => {
      const duration = await getAudioDuration(file);
      return {
        id_temp: Date.now() + index, file: file,
        title: file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "),
        duration: duration, trackNum: cancionesBD.length + stagedFiles.length + index + 1
      };
    }));
    setStagedFiles((prev) => [...prev, ...nuevosArchivos]);
    Swal.close();
  };

  const quitarDeStaging = (id_temp: number) => setStagedFiles(prev => prev.filter(f => f.id_temp !== id_temp).map((f, i) => ({ ...f, trackNum: cancionesBD.length + i + 1 })));
  const editarNombreStaging = async (id_temp: number, currentTitle: string) => {
    const { value: newTitle } = await Swal.fire({ title: 'Editar Título', input: 'text', inputValue: currentTitle, showCancelButton: true, customClass: { popup: 'swal-popup-pro', input: 'swal-input-pro' } });
    if (newTitle && newTitle !== currentTitle) setStagedFiles(prev => prev.map(f => f.id_temp === id_temp ? { ...f, title: newTitle } : f));
  };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); procesarArchivosSeleccionados(e.dataTransfer.files); };

  // ==========================================
  // 4. EL PODER DE NESTJS (REST + GRAPHQL)
  // ==========================================
  
  // A) EL ENDPOINT REST QUE CREÍAS QUE NO ESTABA
  const handleProcesarSubida = async () => {
    if (stagedFiles.length === 0) return;
    if (!albumId || !artistId) return Swal.fire('Error', 'Falta contexto', 'error');
    Swal.fire({ title: 'Enviando al Búnker...', html: `Transfiriendo <b>${stagedFiles.length}</b> canciones a NestJS.<br>No cierres la pestaña.`, allowOutsideClick: false, didOpen: () => Swal.showLoading(), background: '#181818', color: '#fff', customClass: { popup: 'swal-popup-pro' }});
    try {
      const formData = new FormData();
      formData.append('albumId', albumId.toString());
      formData.append('artistaId', artistId.toString());
      const metadataParams = stagedFiles.map(file => ({ title: file.title, duration: file.duration, trackNum: file.trackNum }));
      formData.append('metadata', JSON.stringify(metadataParams));
      stagedFiles.forEach(item => formData.append('files', item.file));

      // ¡AQUÍ ESTÁ LA MAGIA DEL CONTROLLER REST!
      const res = await fetch(`${BACKEND_URL}/music-manager/upload-album`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error('El backend rechazó la petición');
      const data = await res.json();
      
      setStagedFiles([]); loadCanciones(); 
      const fileInput = document.getElementById('inputFileAudio') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      Swal.fire({ title: '¡Misión Cumplida!', text: `NestJS procesó ${data.procesadas} canciones.`, icon: 'success', showCancelButton: true, confirmButtonText: 'Seguir en este Álbum', cancelButtonText: 'Cambiar de Álbum', confirmButtonColor: '#1db954', cancelButtonColor: '#333', background: '#181818', color: '#fff', customClass: { popup: 'swal-popup-pro' }
      }).then((result) => {
        if (result.dismiss === Swal.DismissReason.cancel) { setIsLocked(false); setGenreId(''); setArtistId(''); setAlbumId(''); }
      });
    } catch (err) { Swal.fire('Error crítico', 'Fallo en la comunicación con NestJS.', 'error'); }
  };

  const handleReset = async () => {
    if (stagedFiles.length > 0 || isLocked) {
      const result = await Swal.fire({ title: '¿Limpiar todo?', text: "Se desbloqueará el contexto.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', background: '#181818', color: '#fff', customClass: { popup: 'swal-popup-pro' }});
      if (!result.isConfirmed) return;
    }
    setIsLocked(false); setGenreId(''); setArtistId(''); setAlbumId(''); setStagedFiles([]);
    Swal.fire({ title: 'Limpio', icon: 'success', toast: true, position: 'top-end', timer: 1500, showConfirmButton: false, background: '#181818', color: '#fff' });
  };

  // B) MUTATIONS DE GRAPHQL (Para borrar y crear)
  const handleBorradoNuclear = async () => {
    const { value: confirmWord } = await Swal.fire({ title: '☢️ ¿BORRADO NUCLEAR? ☢️', html: `Escribe <b>CANCELAR</b> para confirmar:`, input: 'text', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', customClass: { popup: 'swal-popup-pro', input: 'swal-input-pro' }, preConfirm: (v) => v === 'CANCELAR' || Swal.showValidationMessage('Escribe CANCELAR en mayúsculas') });
    if (confirmWord) {
      Swal.fire({ title: 'Aniquilando...', didOpen: () => Swal.showLoading() });
      try {
        await fetchGQL(`mutation { nuclearDeleteAlbum(albumId: "${albumId}") }`);
        setGenreId(''); setIsLocked(false); setStagedFiles([]); 
        Swal.fire('¡Listo!', 'El disco fue desintegrado por NestJS.', 'success');
      } catch(e) { Swal.fire('Error', 'Falló el borrado', 'error'); }
    }
  };

  const handleBorrarCancion = async (id: string) => {
    const res = await Swal.fire({ title: '¿Borrar canción?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' });
    if (res.isConfirmed) { 
      await fetchGQL(`mutation { deleteCancion(cancionId: "${id}") }`);
      loadCanciones(); 
      Swal.fire({ title: 'Eliminada', toast: true, position: 'top-end', timer: 1500, icon: 'success' }); 
    }
  };

  const handleEditarTitulo = async (id: string, currentTitle: string) => {
    const { value } = await Swal.fire({
      title: 'Editar Título', 
      input: 'text', 
      inputValue: currentTitle, 
      showCancelButton: true, 
      customClass: { popup: 'swal-popup-pro', input: 'swal-input-pro' }
    });

    if (value && value !== currentTitle) { 
      try {
        await fetchGQL(`mutation { updateCancionTitle(cancionId: "${id}", titulo: "${value}") }`);
        loadCanciones(); // Recargamos la lista para ver el cambio
        Swal.fire({ title: 'Actualizado', toast: true, position: 'top-end', timer: 1500, icon: 'success' }); 
      } catch (e) {
        Swal.fire('Error', 'Fallo al actualizar el título', 'error');
      }
    }
  };

  const saveGenero = async () => { 
    await fetchGQL(`mutation { createGenero(nombre: "${formG.nombre}", decada: "${formG.decada}") }`);
    loadGeneros(); setActiveModal(null); 
  };
  
  const saveArtista = async () => { 
    await fetchGQL(`mutation { createArtista(nombre: "${formArt.nombre}", descripcion: "${formArt.desc}", generoId: "${genreId}") }`);
    const data = await fetchGQL(`query { getArtistas(generoId: "${genreId}") }`);
    setArtistas(JSON.parse(data.getArtistas)); 
    setActiveModal(null); 
  };
  
  const saveAlbum = async () => {
    let finalImageUrl = ""; // Aquí guardaremos la URL si se sube una portada

    // 1. Si el usuario seleccionó una imagen, la disparamos por REST primero
    if (formAlb.coverFile) {
      Swal.fire({ title: 'Subiendo portada...', didOpen: () => Swal.showLoading(), customClass: { popup: 'swal-popup-pro' } });
      
      // Buscamos el nombre real del artista para que Python pueda crear la carpeta bien
      const artistaSelect = artistas.find(a => a.id_artista.toString() === artistId);
      const artistaNombre = artistaSelect ? artistaSelect.nombre : 'Desconocido';

      const formData = new FormData();
      formData.append('cover', formAlb.coverFile);
      formData.append('artistaNombre', artistaNombre);
      formData.append('albumTitulo', formAlb.titulo);

      try {
        const res = await fetch(`${BACKEND_URL}/music-manager/upload-cover`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        finalImageUrl = data.url; // URL publica
      } catch (e) {
        Swal.fire('Error', 'No se pudo enviar la foto al servidor', 'error');
        return; // Detenemos todo si la foto falló
      }
    }

    // 2. Preparamos el pedacito de GraphQL para la imagen (si existe)
    const imgArg = finalImageUrl ? `, imagenUrl: "${finalImageUrl}"` : '';

    // 3. Guardamos los datos oficiales en Prisma (Supabase)
    Swal.fire({ title: 'Guardando datos...', didOpen: () => Swal.showLoading(), customClass: { popup: 'swal-popup-pro' } });
    try {
      if (isEditing) {
        await fetchGQL(`mutation { updateAlbum(albumId: "${albumId}", titulo: "${formAlb.titulo}", fecha: "${formAlb.fecha}", tipo: "${formAlb.tipo}", num: ${formAlb.num} ${imgArg}) }`);
      } else {
        await fetchGQL(`mutation { createAlbum(titulo: "${formAlb.titulo}", fecha: "${formAlb.fecha}", tipo: "${formAlb.tipo}", num: ${formAlb.num}, artistaId: "${artistId}" ${imgArg}) }`);
      }
      
      const data = await fetchGQL(`query { getAlbums(artistaId: "${artistId}") }`);
      setAlbums(JSON.parse(data.getAlbums)); 
      setActiveModal(null); 
      setCoverPreview(''); // Limpiamos la vista previa local
      Swal.fire('¡Éxito!', `Álbum guardado con su portada en el Búnker.`, 'success'); 
    } catch (error) {
      Swal.fire('Error', 'Fallo al guardar el álbum en la base de datos', 'error');
    }
  };

  return {
    generos, artistas, albums, genreId, setGenreId, artistId, setArtistId, albumId, setAlbumId,
    albumActual, cancionesBD, isLocked, setIsLocked, stagedFiles,
    activeModal, setActiveModal, isEditing, setIsEditing, formG, setFormG, formArt, setFormArt, formAlb, setFormAlb,
    tbodyRef, tbodyStagingRef,
    procesarArchivosSeleccionados, quitarDeStaging, editarNombreStaging, handleDragOver, handleDrop,
    handleProcesarSubida, handleReset, handleBorradoNuclear, handleBorrarCancion, saveGenero, saveArtista, saveAlbum,
    handleEditarTitulo, coverPreview, setCoverPreview
  };
};