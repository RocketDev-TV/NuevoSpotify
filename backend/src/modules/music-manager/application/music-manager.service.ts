import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../../prisma.service'; // Ajusta la ruta a tu prisma.service
import { lastValueFrom } from 'rxjs';
import * as fs from 'fs/promises';
import * as path from 'path';
import 'multer';

@Injectable()
export class MusicManagerService {
  private readonly logger = new Logger(MusicManagerService.name);

  // La ruta del bunker (Python) - solo para lo que necesita yt-dlp/ffmpeg
  // Ahora lee la variable del .env, y si por algún error no la encuentra, usa localhost como plan B
  private readonly PYTHON_SERVER = process.env.PYTHON_SERVER_URL || 'http://localhost:3000';

  // Carpeta compartida donde Nest escribe/sirve música (y donde Python descarga vía yt-dlp).
  // En Docker, STORAGE_ROOT viene seteado (/app/storage_musica) y ambos contenedores
  // comparten el mismo volumen. En dev local SIN Docker, Nest corre con cwd=backend/
  // pero Python corre con cwd=api/ y escribe en api/storage_musica (carpeta hermana) -
  // por eso el default apunta ahí y no a un 'storage_musica' inexistente dentro de backend/.
  private readonly STORAGE_ROOT = process.env.STORAGE_ROOT || path.join(process.cwd(), '..', 'api', 'storage_musica');

  // URL alcanzable desde el NAVEGADOR para lo que Nest sirve en /musica - distinta de PYTHON_SERVER
  private readonly PUBLIC_BACKEND_URL = process.env.PUBLIC_BACKEND_URL || 'http://localhost:4000';

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
  ) { }

  // ÚNICA fuente de verdad para nombrar carpetas/archivos en disco.
  // Todo lo que toque el filesystem (subir portada, carga masiva, borrado nuclear,
  // descargas de YouTube, renombrado de álbum) debe pasar por aquí. Si esta función
  // cambia, cambia la forma en que se llaman TODAS las carpetas nuevas.
  private formatPath(str: string): string {
    return str.trim().replace(/\s+/g, '_').toLowerCase();
  }

  private parseDuracionFmt(fmt: string | undefined | null): number {
    if (!fmt) return 0;
    const partes = fmt.split(':').map((p) => parseInt(p, 10) || 0);

    let minutos: number;
    let segundos: number;

    if (partes.length === 3) {
      // h:mm:ss -> convertimos las horas a minutos
      minutos = partes[0] * 60 + partes[1];
      segundos = partes[2];
    } else if (partes.length === 2) {
      [minutos, segundos] = partes;
    } else {
      return 0;
    }

    return parseFloat(`${minutos}.${segundos.toString().padStart(2, '0')}`);
  }

  // Fallback matemático con prioridad: 1) duracion_seg (segundos crudos), si viene y es > 0;
  // 2) duracion_fmt ("mm:ss" / "h:mm:ss"). Solo cae a 0 si de verdad no llegó ninguno de los dos.
  private calcularDuracionDecimal(track: any): number {
    const seg = Number(track?.duracion_seg);
    if (!isNaN(seg) && seg > 0) {
      const minutos = Math.floor(seg / 60);
      const segundos = Math.floor(seg % 60);
      return parseFloat(`${minutos}.${segundos.toString().padStart(2, '0')}`);
    }

    if (track?.duracion_fmt) {
      return this.parseDuracionFmt(track.duracion_fmt);
    }

    return 0;
  }

  // Resuelve una ruta relativa dentro de STORAGE_ROOT, bloqueando path traversal
  // (porta el guard que antes solo existía del lado de Python)
  private resolveStoragePath(relativePath: string): string {
    const full = path.resolve(this.STORAGE_ROOT, relativePath);
    if (!full.startsWith(path.resolve(this.STORAGE_ROOT) + path.sep)) {
      throw new HttpException('Ruta inválida o maliciosa detectada', HttpStatus.FORBIDDEN);
    }
    return full;
  }

  async procesarCargaMasiva(albumId: bigint, artistaId: bigint, archivos: Express.Multer.File[], metadata: any[]) {
    this.logger.log(`Iniciando subida masiva para el álbum ID: ${albumId}`);

    // 1. Validar que el artista y álbum existan en Prisma
    const artista = await this.prisma.artista.findUnique({ where: { id_artista: artistaId } });
    const album = await this.prisma.album.findUnique({ where: { id_album: albumId } });

    if (!artista || !album) {
      throw new HttpException('Artista o Álbum no encontrado', HttpStatus.NOT_FOUND);
    }

    const artistName = this.formatPath(artista.nombre);
    const albumName = this.formatPath(album.titulo_album);
    let exitosas = 0;

    // 2. Procesar cada archivo individualmente
    for (let i = 0; i < archivos.length; i++) {
      const file = archivos[i];
      // Buscamos la metadata que coincida con este archivo (título, duración, track)
      const meta = metadata[i];

      try {
        // A. Preparamos los nombres y la ruta
        const extension = file.originalname.split('.').pop();
        const safeFileName = `${this.formatPath(meta.title)}.${extension}`;
        const relativePath = `${artistName}/${albumName}/${Date.now()}_${safeFileName}`;

        // B/C. Escribimos el archivo directo a disco (Nest ya tiene el buffer en memoria)
        const fullPath = this.resolveStoragePath(relativePath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, file.buffer);

        // D. Generamos la URL Pública (servida por Nest mismo vía /musica)
        const publicUrl = `${this.PUBLIC_BACKEND_URL}/musica/${relativePath}`;

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
    const albumActual = await this.prisma.album.findUnique({
      where: { id_album: BigInt(albumId) },
      include: { artista: true }
    });
    if (!albumActual) throw new HttpException('Álbum no encontrado', HttpStatus.NOT_FOUND);

    let finalImagenUrl = imagenUrl;

    // Si el título cambió, la carpeta física ya no coincide con formatPath(nuevoTitulo).
    // Sin esto, borradoNuclearAlbum y las próximas subidas apuntarían a una carpeta nueva
    // y vacía, dejando huérfana la carpeta vieja con los archivos reales (el bug de las
    // "carpetas duplicadas" tipo 'Morro prueba PL' vs 'morro_prueba_pl').
    if (titulo && titulo !== albumActual.titulo_album) {
      const artistFolder = this.formatPath(albumActual.artista.nombre);
      const oldAlbumFolder = this.formatPath(albumActual.titulo_album);
      const newAlbumFolder = this.formatPath(titulo);

      if (oldAlbumFolder !== newAlbumFolder) {
        const oldFolder = this.resolveStoragePath(`${artistFolder}/${oldAlbumFolder}`);
        const newFolder = this.resolveStoragePath(`${artistFolder}/${newAlbumFolder}`);
        const oldPrefix = `/musica/${artistFolder}/${oldAlbumFolder}/`;
        const newPrefix = `/musica/${artistFolder}/${newAlbumFolder}/`;

        try {
          await fs.rename(oldFolder, newFolder);

          // Las canciones ya subidas guardan la URL vieja en Prisma: la reescribimos
          // para que sigan resolviendo al archivo que Nest ahora sirve en la carpeta nueva.
          const canciones = await this.prisma.cancion.findMany({ where: { albumId: BigInt(albumId) } });
          await Promise.all(canciones.map((c) => this.prisma.cancion.update({
            where: { idCancion: c.idCancion },
            data: {
              audioPath: c.audioPath?.includes(oldPrefix) ? c.audioPath.replace(oldPrefix, newPrefix) : c.audioPath,
              imagenUrl: c.imagenUrl?.includes(oldPrefix) ? c.imagenUrl.replace(oldPrefix, newPrefix) : c.imagenUrl,
            }
          })));

          if (!finalImagenUrl && albumActual.imagen_url?.includes(oldPrefix)) {
            finalImagenUrl = albumActual.imagen_url.replace(oldPrefix, newPrefix);
          }
        } catch (err: any) {
          // Si la carpeta vieja nunca existió (álbum sin archivos aún) no es un error real.
          if (err.code !== 'ENOENT') {
            this.logger.error('Error moviendo la carpeta del álbum tras renombrar título:', err);
          }
        }
      }
    }

    return this.prisma.album.update({
      where: { id_album: BigInt(albumId) },
      data: {
        titulo_album: titulo,
        fecha_lanzamiento: fecha ? new Date(fecha) : null,
        tipo_lanzamiento: tipo,
        num_canciones: num,
        imagen_url: finalImagenUrl
      }
    });
  }

  async borrarCancion(cancionId: string) {
    // 1. Buscamos la canción para saber su ruta en Python
    const cancion = await this.prisma.cancion.findUnique({ where: { idCancion: BigInt(cancionId) } });
    if (!cancion) throw new HttpException('Canción no encontrada', HttpStatus.NOT_FOUND);

    // 2. Si tiene audio_path, borramos el archivo físico local
    if (cancion.audioPath) {
      const parts = cancion.audioPath.split('/musica/');
      if (parts.length > 1) {
        try {
          await fs.unlink(this.resolveStoragePath(parts[1]));
        } catch (err) {
          this.logger.error("Error borrando archivo local:", err);
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

    try {
      // 🌟 Usamos formatPath para que la ruta de borrado coincida con cómo se creó la carpeta
      const carpeta = `${this.formatPath(album.artista.nombre)}/${this.formatPath(album.titulo_album)}`;
      await fs.rm(this.resolveStoragePath(carpeta), { recursive: true, force: true });
    } catch (err) {
      this.logger.error("Error borrando carpeta local:", err);
    }

    await this.prisma.cancion.deleteMany({ where: { albumId: BigInt(albumId) } });
    return this.prisma.album.delete({ where: { id_album: BigInt(albumId) } });
  }

  async subirPortada(file: Express.Multer.File, artistaNombre: string, albumTitulo: string) {
    try {
      const ext = path.extname(file.originalname);
      // 🌟 Usamos formatPath para forzar las carpetas minúsculas en las portadas
      const relativePath = `${this.formatPath(artistaNombre)}/${this.formatPath(albumTitulo)}/cover${ext}`;
      const fullPath = this.resolveStoragePath(relativePath);
      const folder = path.dirname(fullPath);
      await fs.mkdir(folder, { recursive: true });

      const existentes = await fs.readdir(folder).catch(() => [] as string[]);
      await Promise.all(
        existentes
          .filter((f) => f.startsWith('cover.'))
          .map((f) => fs.unlink(path.join(folder, f)).catch(() => undefined)),
      );

      await fs.writeFile(fullPath, file.buffer);
      return `${this.PUBLIC_BACKEND_URL}/musica/${relativePath}`;
    } catch (error) {
      console.error("Error guardando portada:", (error as any).message);
      throw new Error("Fallo al subir la portada al Búnker");
    }
  }

  async actualizarTituloCancion(cancionId: string, nuevoTitulo: string) {
    return this.prisma.cancion.update({
      where: { idCancion: BigInt(cancionId) },
      data: { tituloCancion: nuevoTitulo.trim() }
    });
  }

  // --- YOUTUBE: Mandar a Python a explorar el link ---
  async obtenerMetadataYoutube(url: string) {
    try {
      // NestJS le pide la info a Python (vía PYTHON_SERVER_URL, no hardcodeado)
      const response = await fetch(`${this.PYTHON_SERVER}/api/metadata`, {
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
    // Eliminamos los espacios en blanco al inicio/final del nombre visual
    const selectedTracks = tracks
      .filter((t: any) => t.selected === true)
      .map((t: any) => ({ ...t, titulo: (t.titulo || '').trim() }));

    const artista = await this.prisma.artista.findUnique({ where: { id_artista: BigInt(artistId) } });
    const album = await this.prisma.album.findUnique({ where: { id_album: BigInt(albumId) } });

    if (!artista || !album) throw new HttpException('Artista o Álbum no encontrado', HttpStatus.NOT_FOUND);

    try {
      // Forzamos que LAS CARPETAS Y ARCHIVOS SIEMPRE SEAN EN MINÚSCULAS Y GUIONES (formatPath)
      const artistNameClean = this.formatPath(artista.nombre);
      const albumNameClean = this.formatPath(album.titulo_album);

      const lastTrack = await this.prisma.cancion.findFirst({
        where: { albumId: BigInt(albumId) },
        orderBy: { numeroTrack: 'desc' },
        select: { numeroTrack: true }
      });

      let startingTrackNumber = lastTrack?.numeroTrack || 0;
      let imagenUrl = album.imagen_url;

      for (const track of selectedTracks) {
        startingTrackNumber++;
        const cleanTitle = this.formatPath(track.titulo); // El nombre limpio para el archivo mp3

        const { data: singleResult } = await lastValueFrom(
          this.httpService.post(`${this.PYTHON_SERVER}/api/download_single`, {
            track: { titulo: cleanTitle, url_video: track.url_video },
            artista_nombre: artistNameClean,
            album_titulo: albumNameClean,
            thumbnail: track.thumbnail
          })
        );

        // Si es la primera rola y bajó la portada, la actualizamos en el disco
        if (singleResult?.cover_url && !imagenUrl) {
          imagenUrl = singleResult.cover_url;
          await this.prisma.album.update({
            where: { id_album: BigInt(albumId) },
            data: { imagen_url: imagenUrl }
          });
        }

        // Preferimos la duración REAL que Python midió con mutagen al bajar el MP3.
        // Si por lo que sea no llegó (Python falló al medir, campo ausente, etc.),
        // caemos al cálculo matemático a partir de duracion_seg/duracion_fmt del track
        // original (los que trajo /api/metadata) en vez de perder la duración a 0.
        const duracionMedida = Number(singleResult?.duracion_decimal);
        const duracionDecimal = !isNaN(duracionMedida) && duracionMedida > 0
          ? duracionMedida
          : this.calcularDuracionDecimal(track);

        this.logger.log(
          `[YT] Duración a insertar en Prisma para "${track.titulo}": ${duracionDecimal} ` +
          `(fuente: ${!isNaN(duracionMedida) && duracionMedida > 0 ? 'python(medida)' : 'fallback(calculada)'})`
        );

        await this.prisma.cancion.create({
          data: {
            tituloCancion: track.titulo, // Guardamos el título bonito con mayúsculas
            duracionCancion: duracionDecimal,
            numeroTrack: startingTrackNumber,
            albumId: BigInt(albumId),
            artistaId: BigInt(artistId),
            audioPath: `${this.PUBLIC_BACKEND_URL}/musica/${artistNameClean}/${albumNameClean}/${cleanTitle}.mp3`,
            reproducciones: 0,
            imagenUrl: imagenUrl
          }
        });
      }

      await this.actualizarDuracionAlbum(BigInt(albumId));
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
    let finalImageUrl: string | null = null;

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
      // 1. Mandamos al Minero (Python) a descargar (vía PYTHON_SERVER_URL, no hardcodeado)
      const response = await fetch(`${this.PYTHON_SERVER}/api/download_single`, {
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

