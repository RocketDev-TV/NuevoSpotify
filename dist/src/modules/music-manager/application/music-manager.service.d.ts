import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../../prisma.service';
import 'multer';
export declare class MusicManagerService {
    private prisma;
    private httpService;
    private readonly logger;
    private readonly PYTHON_SERVER;
    constructor(prisma: PrismaService, httpService: HttpService);
    private cleanString;
    procesarCargaMasiva(albumId: bigint, artistaId: bigint, archivos: Express.Multer.File[], metadata: any[]): Promise<{
        success: boolean;
        procesadas: number;
        total: number;
        message: string;
    }>;
    private actualizarDuracionAlbum;
    obtenerGeneros(): Promise<{
        id_gener: bigint;
        nombre_genero: string;
        decada: Date;
    }[]>;
    obtenerArtistas(generoId: string): Promise<{
        nombre: string;
        id_artista: bigint;
        genero_id: bigint;
        descripcion: string | null;
        url_imagen_art: string | null;
    }[]>;
    obtenerAlbums(artistaId: string): Promise<{
        id_album: bigint;
        titulo_album: string;
        artista_id: bigint;
        fecha_lanzamiento: Date | null;
        duracion_album: number | null;
        num_canciones: number;
        imagen_url: string | null;
        tipo_lanzamiento: string | null;
    }[]>;
    obtenerCanciones(albumId: string): Promise<{
        idCancion: bigint;
        tituloCancion: string;
        imagenUrl: string | null;
        duracionCancion: number | null;
        reproducciones: number;
        audioPath: string | null;
        numeroTrack: number | null;
        artistaId: bigint;
        albumId: bigint | null;
    }[]>;
    crearGenero(nombre: string, decada: string): Promise<{
        id_gener: bigint;
        nombre_genero: string;
        decada: Date;
    }>;
    crearArtista(nombre: string, descripcion: string, generoId: string): Promise<{
        nombre: string;
        id_artista: bigint;
        genero_id: bigint;
        descripcion: string | null;
        url_imagen_art: string | null;
    }>;
    crearAlbum(titulo: string, fecha: string, tipo: string, num: number, artistaId: string, imagenUrl?: string): Promise<{
        id_album: bigint;
        titulo_album: string;
        artista_id: bigint;
        fecha_lanzamiento: Date | null;
        duracion_album: number | null;
        num_canciones: number;
        imagen_url: string | null;
        tipo_lanzamiento: string | null;
    }>;
    actualizarAlbum(albumId: string, titulo: string, fecha: string, tipo: string, num: number, imagenUrl?: string): Promise<{
        id_album: bigint;
        titulo_album: string;
        artista_id: bigint;
        fecha_lanzamiento: Date | null;
        duracion_album: number | null;
        num_canciones: number;
        imagen_url: string | null;
        tipo_lanzamiento: string | null;
    }>;
    actualizarTituloCancion(cancionId: string, nuevoTitulo: string): Promise<{
        idCancion: bigint;
        tituloCancion: string;
        imagenUrl: string | null;
        duracionCancion: number | null;
        reproducciones: number;
        audioPath: string | null;
        numeroTrack: number | null;
        artistaId: bigint;
        albumId: bigint | null;
    }>;
    borrarCancion(cancionId: string): Promise<{
        idCancion: bigint;
        tituloCancion: string;
        imagenUrl: string | null;
        duracionCancion: number | null;
        reproducciones: number;
        audioPath: string | null;
        numeroTrack: number | null;
        artistaId: bigint;
        albumId: bigint | null;
    }>;
    borradoNuclearAlbum(albumId: string): Promise<{
        id_album: bigint;
        titulo_album: string;
        artista_id: bigint;
        fecha_lanzamiento: Date | null;
        duracion_album: number | null;
        num_canciones: number;
        imagen_url: string | null;
        tipo_lanzamiento: string | null;
    }>;
    subirPortada(file: Express.Multer.File, artistaNombre: string, albumTitulo: string): Promise<any>;
    obtenerMetadataYoutube(url: string): Promise<any>;
    descargarCancionYoutube(payload: any): Promise<{
        success: boolean;
        album_id: any;
    }>;
    getGeneros(): Promise<{
        id_gener: bigint;
        nombre_genero: string;
        decada: Date;
    }[]>;
    getArtistasByGenero(generoId: string): Promise<{
        nombre: string;
        id_artista: bigint;
        genero_id: bigint;
        descripcion: string | null;
        url_imagen_art: string | null;
    }[]>;
    getAlbumsByArtista(artistaId: string): Promise<{
        id_album: bigint;
        titulo_album: string;
        artista_id: bigint;
        fecha_lanzamiento: Date | null;
        duracion_album: number | null;
        num_canciones: number;
        imagen_url: string | null;
        tipo_lanzamiento: string | null;
    }[]>;
    createGenero(data: any): Promise<{
        id_gener: bigint;
        nombre_genero: string;
        decada: Date;
    }>;
    createArtista(data: any): Promise<{
        nombre: string;
        id_artista: bigint;
        genero_id: bigint;
        descripcion: string | null;
        url_imagen_art: string | null;
    }>;
    createAlbum(data: any): Promise<{
        id_album: bigint;
        titulo_album: string;
        artista_id: bigint;
        fecha_lanzamiento: Date | null;
        duracion_album: number | null;
        num_canciones: number;
        imagen_url: string | null;
        tipo_lanzamiento: string | null;
    }>;
}
