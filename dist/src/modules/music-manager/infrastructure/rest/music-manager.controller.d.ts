import { MusicManagerService } from '../../application/music-manager.service';
import 'multer';
export declare class MusicManagerController {
    private readonly musicService;
    constructor(musicService: MusicManagerService);
    uploadAlbum(files: Express.Multer.File[], albumIdStr: string, artistaIdStr: string, metadataStr: string): Promise<{
        success: boolean;
        procesadas: number;
        total: number;
        message: string;
    }>;
    uploadCover(file: Express.Multer.File, artistaNombre: string, albumTitulo: string): Promise<{
        url: any;
    }>;
}
