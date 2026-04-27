import { MusicManagerService } from '../../application/music-manager.service';
export declare class MusicManagerResolver {
    private readonly musicService;
    constructor(musicService: MusicManagerService);
    getGeneros(): Promise<string>;
    getArtistas(generoId: string): Promise<string>;
    getAlbums(artistaId: string): Promise<string>;
    getCanciones(albumId: string): Promise<string>;
    createGenero(nombre: string, decada: string): Promise<boolean>;
    createArtista(nombre: string, descripcion: string, generoId: string): Promise<boolean>;
    createAlbum(titulo: string, fecha: string, tipo: string, num: number, artistaId: string): Promise<boolean>;
    updateAlbum(albumId: string, titulo: string, fecha: string, tipo: string, num: number): Promise<boolean>;
    deleteCancion(cancionId: string): Promise<boolean>;
    nuclearDeleteAlbum(albumId: string): Promise<boolean>;
    updateCancionTitle(cancionId: string, titulo: string): Promise<boolean>;
}
