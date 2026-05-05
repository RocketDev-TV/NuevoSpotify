import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../../prisma.service'; // Ajusta la ruta a tu prisma.service
import { lastValueFrom } from 'rxjs';
import FormData from 'form-data';
import 'multer';
import axios from 'axios';

@Injectable()
export class MusicManagerService {
  private readonly logger = new Logger(MusicManagerService.name);

  // La ruta del bunker
  // Ahora lee la variable del .env, y si por algún error no la encuentra, usa localhost como plan B
  private readonly PYTHON_SERVER = process.env.PYTHON_SERVER_URL || 'http://localhost:3000';

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
  ) { }

  // Utilidad para limpiar los nombres y evitar errores de URLs
  private cleanString(str: string): string {
    return str.trim().replace(/\s+/g, '_').toLowerCase();
  }

  async procesarCargaMasiva(albumId: bigint, artistaId: bigint, archivos: Express.Multer.File[], metadata: any[]) {
    this.logger.log(`Iniciando subida masiva para el álbum ID: ${albumId}`);

    // 1. Validar que el artista y álbum existan en Prisma
    const artista = await this.prisma.artista.findUnique({ where: { id_artista: artistaId } });
    const album = await this.prisma.album.findUnique({ where: { id_album: albumId } });

    if (!artista || !album) {
      throw new HttpException('Artista o Álbum no encontrado', HttpStatus.NOT_FOUND);
    }

    const artistName = this.cleanString(artista.nombre);
    const albumName = this.cleanString(album.titulo_album);
    let exitosas = 0;

    // 2. Procesar cada archivo individualmente
    for (let i = 0; i < archivos.length; i++) {
      const file = archivos[i];
      // Buscamos la metadata que coincida con este archivo (título, duración, track)
      const meta = metadata[i];

      try {
        // A. Preparamos los nombres y la ruta para Python
        const extension = file.originalname.split('.').pop();
        const safeFileName = `${this.cleanString(meta.title)}.${extension}`;
        const relativePath = `${artistName}/${albumName}/${Date.now()}_${safeFileName}`;

        // B. Armamos el "Paquete" (FormData nativo de Node.js)
        const formData = new FormData();
        formData.append('ruta', relativePath);
        formData.append('file', file.buffer, { filename: file.originalname });

        // C. Disparamos a Python y ESPERAMOS a que termine
        await lastValueFrom(
          this.httpService.post(`${this.PYTHON_SERVER}/upload`, formData, {
            headers: formData.getHeaders(),
          })
        );

        // D. Si Python no falló, generamos la URL Pública
        const publicUrl = `${this.PYTHON_SERVER}/musica/${relativePath}`;

        // E. Guardamos el registro de la rola en Supabase (Prisma)
        await this.prisma.cancion.create({
          data: {
            tituloCancion: meta.title,
            artistaId: artistaId,
            albumId: albumId,
            audioPath: publicUrl,
            duracionCancion: parseFloat(meta.duration),
            numeroTrack: meta.trackNum,
            reproducciones: 0,
            imagenUrl: album.imagen_url // Heredamos la portada del álbum
          }
        });

        exitosas++;
      } catch (error) {
        this.logger.error(`Error procesando track ${meta.title}:`, error);
        // Seguimos con la siguiente canción aunque una falle
      }
    }

    // 3. Ya que se subieron todas, recalculamos la duración del disco completo
    await this.actualizarDuracionAlbum(albumId);

    return {
      success: true,
      procesadas: exitosas,
      total: archivos.length,
      message: 'Álbum procesado correctamente'
    };
  }

  // Función matemática para sumar minutos y segundos reales
  private async actualizarDuracionAlbum(albumId: bigint) {
    const canciones = await this.prisma.cancion.findMany({
      where: { albumId: albumId },
      select: { duracionCancion: true }
    });

    let totalSegundos = 0;
    canciones.forEach(c => {
      const dur = c.duracionCancion || 0;
      const min = Math.floor(dur);
      const sec = Math.round((dur - min) * 100);
      totalSegundos += (min * 60) + sec;
    });

    const finalFmt = parseFloat(`${Math.floor(totalSegundos / 60)}.${Math.floor(totalSegundos % 60).toString().padStart(2, '0')}`);

    await this.prisma.album.update({
      where: { id_album: albumId },
      data: { duracion_album: finalFmt }
    });
  }

  // ==========================================
  // LECTURAS (QUERIES)
  // ==========================================
  async obtenerGeneros() {
    return this.prisma.genero.findMany({ orderBy: { nombre_genero: 'asc' } });
  }

  async obtenerArtistas(generoId: string) {
    return this.prisma.artista.findMany({
      where: { genero_id: BigInt(generoId) },
      orderBy: { nombre: 'asc' }
    });
  }

  async obtenerAlbums(artistaId: string) {
    return this.prisma.album.findMany({
      where: { artista_id: BigInt(artistaId) },
      orderBy: { titulo_album: 'asc' }
    });
  }

  async obtenerCanciones(albumId: string) {
    return this.prisma.cancion.findMany({
      where: { albumId: BigInt(albumId) },
      orderBy: { numeroTrack: 'asc' }
    });
  }

  // ==========================================
  // ESCRITURAS (MUTATIONS)
  // ==========================================
  async crearGenero(nombre: string, decada: string) {
    return this.prisma.genero.create({
      data: { nombre_genero: nombre, decada: new Date(decada) }
    });
  }

  async crearArtista(nombre: string, descripcion: string, generoId: string) {
    return this.prisma.artista.create({
      data: { nombre, descripcion, genero_id: BigInt(generoId) }
    });
  }

  async crearAlbum(titulo: string, fecha: string, tipo: string, num: number, artistaId: string, imagenUrl?: string) {
    return this.prisma.album.create({
      data: {
        titulo_album: titulo,
        fecha_lanzamiento: fecha ? new Date(fecha) : null,
        tipo_lanzamiento: tipo,
        num_canciones: num,
        artista_id: BigInt(artistaId),
        imagen_url: imagenUrl
      }
    });
  }

  async actualizarAlbum(albumId: string, titulo: string, fecha: string, tipo: string, num: number, imagenUrl?: string) {
    return this.prisma.album.update({
      where: { id_album: BigInt(albumId) },
      data: {
        titulo_album: titulo,
        fecha_lanzamiento: fecha ? new Date(fecha) : null,
        tipo_lanzamiento: tipo,
        num_canciones: num,
        imagen_url: imagenUrl
      }
    });
  }

  async actualizarTituloCancion(cancionId: string, nuevoTitulo: string) {
    return this.prisma.cancion.update({
      where: { idCancion: BigInt(cancionId) }, // Prisma hace la magia aquí
      data: { tituloCancion: nuevoTitulo }
    });
  }

  async borrarCancion(cancionId: string) {
    // 1. Buscamos la canción para saber su ruta en Python
    const cancion = await this.prisma.cancion.findUnique({ where: { idCancion: BigInt(cancionId) } });
    if (!cancion) throw new HttpException('Canción no encontrada', HttpStatus.NOT_FOUND);

    // 2. Si tiene audio_path, le decimos a Python que lo borre físicamente
    if (cancion.audioPath) {
      const parts = cancion.audioPath.split('/musica/');
      if (parts.length > 1) {
        try {
          await lastValueFrom(this.httpService.post(`${this.PYTHON_SERVER}/delete`, { ruta: parts[1] }));
        } catch (err) {
          this.logger.error("Error borrando en Python:", err);
        }
      }
    }

    // 3. Borramos de Prisma
    return this.prisma.cancion.delete({ where: { idCancion: BigInt(cancionId) } });
  }

  async borradoNuclearAlbum(albumId: string) {
    const album = await this.prisma.album.findUnique({
      where: { id_album: BigInt(albumId) },
      include: { artista: true }
    });
    if (!album) throw new HttpException('Álbum no encontrado', HttpStatus.NOT_FOUND);

    // 1. Borrado físico en Python (Toda la carpeta)
    try {
      await lastValueFrom(
        this.httpService.post(`${this.PYTHON_SERVER}/api/delete_folder`, {
          ruta: `${this.cleanString(album.artista.nombre)}/${this.cleanString(album.titulo_album)}`
        })
      );
    } catch (err) {
      this.logger.error("Error borrando carpeta en Python:", err);
    }

    // 2. Borrado en cascada en Prisma (Borra canciones y luego el álbum)
    await this.prisma.cancion.deleteMany({ where: { albumId: BigInt(albumId) } });
    return this.prisma.album.delete({ where: { id_album: BigInt(albumId) } });
  }

  async subirPortada(file: Express.Multer.File, artistaNombre: string, albumTitulo: string) {
    const formData = new FormData();
    // Empacamos el archivo crudo
    formData.append('file', file.buffer, file.originalname);
    formData.append('artista_nombre', artistaNombre);
    formData.append('album_titulo', albumTitulo);

    try {
      const response = await axios.post(`${this.PYTHON_SERVER}/upload_cover`, formData, {
        headers: formData.getHeaders(),
      });
      // Regresamos la URL final que nos escupió Python
      return response.data.url;
    } catch (error) {
      console.error("Error enviando portada a Python:", (error as any).message);
      throw new Error("Fallo al subir la portada al Búnker");
    }
  }

  // --- YOUTUBE: Mandar a Python a explorar el link ---
  async obtenerMetadataYoutube(url: string) {
    try {
      // NestJS (4000) le pide la info a Python (3000)
      const response = await fetch('http://localhost:3000/api/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'El Búnker rechazó la petición');
      }

      // Le regresamos la data limpiecita al Controlador
      return data;
    } catch (error) {
      // Le decimos a TypeScript "(error as any)" para evitar berrinches
      console.error("Error contactando al Búnker (Python):", (error as any).message);

      // Lanzamos un error que NestJS pueda entender y mandar a React
      throw new Error("Fallo al obtener metadata de YouTube");
    }
  }

  //-------------------------------------
  // --- YOUTUBE: Descargar e Insertar --
  //-------------------------------------

  async processYoutubeDownload(data: any) {
    const { url, tracks, albumId, artistId } = data;
    const selectedTracks = tracks.filter((t: any) => t.selected === true);

    // BUSCAMOS LOS OBJETOS COMPLETOS PARA SACAR LOS NOMBRES (Carpetas)
    const artista = await this.prisma.artista.findUnique({ where: { id_artista: BigInt(artistId) } });
    const album = await this.prisma.album.findUnique({ where: { id_album: BigInt(albumId) } });

    if (!artista || !album) {
      throw new HttpException('Artista o Álbum no encontrado', HttpStatus.NOT_FOUND);
    }

    try {
      // 1. Descarga física en el Búnker
      await lastValueFrom(
        this.httpService.post(`${this.PYTHON_SERVER}/api/download_batch`, {
          url,
          tracks: selectedTracks.map((t: any) => ({ titulo: t.titulo, url_video: t.url_video })),
          artista_nombre: artista.nombre, // Ahora sí están definidos
          album_titulo: album.titulo_album
        })
      );

      // 2. BUSCAR EL ÚLTIMO NÚMERO DE TRACK[cite: 5]
      const lastTrack = await this.prisma.cancion.findFirst({
        where: { albumId: BigInt(albumId) },
        orderBy: { numeroTrack: 'desc' },
        select: { numeroTrack: true }
      });

      let startingTrackNumber = lastTrack?.numeroTrack || 0;

      // 3. INSERCIÓN EN PRISMA[cite: 5]
      for (const track of selectedTracks) {
        startingTrackNumber++;
        await this.prisma.cancion.create({
          data: {
            tituloCancion: track.titulo,
            duracionCancion: parseFloat(track.duracion_decimal || "0"),
            numeroTrack: startingTrackNumber,
            albumId: BigInt(albumId),
            artistaId: BigInt(artistId),
            // Usamos los nombres de los objetos que buscamos arriba[cite: 5]
            audioPath: `${this.PYTHON_SERVER}/musica/${artista.nombre}/${album.titulo_album}/${track.titulo}.mp3`,
            reproducciones: 0,
            imagenUrl: album.imagen_url
          }
        });
      }

      return { success: true, procesadas: selectedTracks.length };
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  // Métodos de creación con corrección de BigInt y Fechas[cite: 5]
  async createGenero(data: any) {
    return await this.prisma.genero.create({
      data: { nombre_genero: data.nombre_genero, decada: new Date(data.decada) }
    });
  }

  async createArtista(data: any) {
    return await this.prisma.artista.create({
      data: { nombre: data.nombre, genero_id: BigInt(data.genero_id) }
    });
  }

  async createAlbum(data: any, file?: Express.Multer.File) {
    let finalImageUrl = null;

    // 1. Si hay archivo, usamos la función que ya tienes programada
    if (file) {
      try {
        // Usamos la función interna 'subirPortada' que ya tienes en este mismo service
        // USAMOS EL NOMBRE QUE VIENE DEL FRONTEND
        finalImageUrl = await this.subirPortada(
          file,
          data.artista_nombre,
          data.titulo_album
        );
      } catch (e) {
        this.logger.error('Fallo al subir la portada del álbum');
      }
    }

    // 2. Creamos el registro con la URL que nos devolvió el Búnker[cite: 5]
    return await this.prisma.album.create({
      data: {
        titulo_album: data.titulo_album,
        fecha_lanzamiento: data.year ? new Date(`${data.year}-01-01`) : null,
        artista_id: BigInt(data.artista_id),
        num_canciones: data.num_canciones ? parseInt(data.num_canciones) : 1,
        tipo_lanzamiento: data.tipo_lanzamiento || "ALBUM",
        imagen_url: finalImageUrl
      }
    });
  }

  async descargarCancionYoutube(payload: any) {
    try {
      // 1. Mandamos al Minero (Python) a descargar
      const response = await fetch('http://localhost:3000/api/download_single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      // 2. Lógica de Prisma: Si es el track 1, creamos el Álbum
      let albumId = payload.new_album_id;
      if (!albumId) {
        const nuevoAlbum = await this.prisma.album.create({
          data: {
            titulo_album: payload.album_titulo,
            artista_id: BigInt(payload.artista_id),
            fecha_lanzamiento: new Date(`${payload.album_year}-01-01`),
            imagen_url: payload.imagen_url,
            num_canciones: payload.total,
            tipo_lanzamiento: "ALBUM"
          }
        });
        albumId = nuevoAlbum.id_album.toString();
      }

      // 3. Insertamos la canción usando los datos masticados por Python
      await this.prisma.cancion.create({
        data: {
          tituloCancion: payload.track.titulo,
          artistaId: BigInt(payload.artista_id),
          albumId: BigInt(albumId),
          audioPath: data.audio_url,
          duracionCancion: data.duracion_decimal,
          numeroTrack: payload.index,
          imagenUrl: payload.imagen_url,
          reproducciones: 0
        }
      });

      return { success: true, album_id: albumId };
    } catch (error) {
      console.error("Error en tubería YouTube:", error);
      throw new Error("Fallo al procesar descarga");
    }
  }

  // A. Traer todos los géneros para el primer combo
  async getGeneros() {
    return await this.prisma.genero.findMany({
      orderBy: { nombre_genero: 'asc' },
    });
  }

  async getArtistasByGenero(generoId: string) {
    // 1. Validamos que no llegue vacío o texto puro
    if (!generoId || isNaN(Number(generoId))) {
      return [];
    }

    return await this.prisma.artista.findMany({
      where: {
        // 2. Convertimos el string a BigInt para que Prisma no llore
        genero_id: BigInt(generoId)
      },
      orderBy: { nombre: 'asc' },
    });
  }

  // C. Traer álbumes filtrados por el artista elegido
  async getAlbumsByArtista(artistaId: string) {
    return await this.prisma.album.findMany({
      where: { artista_id: BigInt(artistaId) },
      orderBy: { titulo_album: 'asc' },
    });
  }
}

