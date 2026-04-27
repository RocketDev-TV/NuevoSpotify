import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../../prisma.service'; // Ajusta la ruta a tu prisma.service
import { lastValueFrom } from 'rxjs';
import FormData from 'form-data';
import 'multer';

@Injectable()
export class MusicManagerService {
  private readonly logger = new Logger(MusicManagerService.name);
  
  // La ruta del bunker
  // Ahora lee la variable del .env, y si por algún error no la encuentra, usa localhost como plan B
    private readonly PYTHON_SERVER = process.env.PYTHON_SERVER_URL || 'http://localhost:3000';

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
  ) {}

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

  async crearAlbum(titulo: string, fecha: string, tipo: string, num: number, artistaId: string) {
    return this.prisma.album.create({
      data: {
        titulo_album: titulo,
        fecha_lanzamiento: fecha ? new Date(fecha) : null,
        tipo_lanzamiento: tipo,
        num_canciones: num,
        artista_id: BigInt(artistaId),
      }
    });
  }

  async actualizarAlbum(albumId: string, titulo: string, fecha: string, tipo: string, num: number) {
    return this.prisma.album.update({
      where: { id_album: BigInt(albumId) },
      data: {
        titulo_album: titulo,
        fecha_lanzamiento: fecha ? new Date(fecha) : null,
        tipo_lanzamiento: tipo,
        num_canciones: num,
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
}

