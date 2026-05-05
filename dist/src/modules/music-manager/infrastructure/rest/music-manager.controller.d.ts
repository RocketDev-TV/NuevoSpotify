import { MusicManagerService } from '../../application/music-manager.service';
import 'multer';
export declare class MusicManagerController {
    private readonly musicService;
    constructor(musicService: MusicManagerService);
    getGeneros(): Promise<{
        id_gener: bigint;
        nombre_genero: string;
        decada: Date;
    }[]>;
    getArtistas(generoId: string): Promise<{
        nombre: string;
        id_artista: bigint;
        genero_id: bigint;
        descripcion: string | null;
        url_imagen_art: string | null;
    }[]>;
    getAlbums(artistaId: string): Promise<{
        id_album: bigint;
        titulo_album: string;
        artista_id: bigint;
        fecha_lanzamiento: Date | null;
        duracion_album: number | null;
        num_canciones: number;
        imagen_url: string | null;
        tipo_lanzamiento: string | null;
    }[]>;
    createGenero(data: {
        nombre_genero: string;
        decada: string;
    }): Promise<{
        id_gener: bigint;
        nombre_genero: string;
        decada: Date;
    }>;
    createArtista(data: {
        nombre: string;
        genero_id: string;
    }): Promise<{
        nombre: string;
        id_artista: bigint;
        genero_id: bigint;
        descripcion: string | null;
        url_imagen_art: string | null;
    }>;
    createAlbum(data: {
        titulo_album: string;
        artista_id: string;
        year: string;
    }): Promise<{
        id_album: bigint;
        titulo_album: string;
        artista_id: bigint;
        fecha_lanzamiento: Date | null;
        duracion_album: number | null;
        num_canciones: number;
        imagen_url: string | null;
        tipo_lanzamiento: string | null;
    }>;
    uploadAlbum(files: Express.Multer.File[], albumIdStr: string, artistaIdStr: string, metadataStr: string): Promise<{
        success: boolean;
        procesadas: number;
        total: number;
        message: string;
    }>;
    uploadCover(file: Express.Multer.File, artistaNombre: string, albumTitulo: string): Promise<{
        url: any;
    }>;
    getYoutubeMetadata(url: string): Promise<any>;
    downloadYoutubeTrack(payload: any): Promise<{
        success: boolean;
        album_id: any;
    }>;
}
