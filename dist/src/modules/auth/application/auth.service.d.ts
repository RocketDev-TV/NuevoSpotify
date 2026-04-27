import { PrismaService } from '../../../prisma.service';
export declare class AuthService {
    private prisma;
    constructor(prisma: PrismaService);
    findUserByUid(uid: string): Promise<({
        playlists: {
            uid: string;
            descripcion: string | null;
            imagen_url: string | null;
            idPlaylist: bigint;
            tituloPlaylist: string;
            duracion: number | null;
            created_at: Date;
        }[];
    } & {
        uid: string;
        correo: string | null;
        nombre: string | null;
        apellidoPaterno: string | null;
        apellidoMaterno: string | null;
        fechaNacimiento: Date | null;
        rol: string | null;
        createdAt: Date | null;
    }) | null>;
    register(nombre: string, correo: string, password: string): Promise<{
        uid: string;
        correo: string | null;
        nombre: string | null;
        apellidoPaterno: string | null;
        apellidoMaterno: string | null;
        fechaNacimiento: Date | null;
        rol: string | null;
        createdAt: Date | null;
    }>;
}
