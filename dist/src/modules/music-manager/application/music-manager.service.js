"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var MusicManagerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MusicManagerService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const prisma_service_1 = require("../../../prisma.service");
const rxjs_1 = require("rxjs");
const form_data_1 = __importDefault(require("form-data"));
require("multer");
const axios_2 = __importDefault(require("axios"));
let MusicManagerService = MusicManagerService_1 = class MusicManagerService {
    prisma;
    httpService;
    logger = new common_1.Logger(MusicManagerService_1.name);
    PYTHON_SERVER = process.env.PYTHON_SERVER_URL || 'http://localhost:3000';
    constructor(prisma, httpService) {
        this.prisma = prisma;
        this.httpService = httpService;
    }
    cleanString(str) {
        return str.trim().replace(/\s+/g, '_').toLowerCase();
    }
    async procesarCargaMasiva(albumId, artistaId, archivos, metadata) {
        this.logger.log(`Iniciando subida masiva para el álbum ID: ${albumId}`);
        const artista = await this.prisma.artista.findUnique({ where: { id_artista: artistaId } });
        const album = await this.prisma.album.findUnique({ where: { id_album: albumId } });
        if (!artista || !album) {
            throw new common_1.HttpException('Artista o Álbum no encontrado', common_1.HttpStatus.NOT_FOUND);
        }
        const artistName = this.cleanString(artista.nombre);
        const albumName = this.cleanString(album.titulo_album);
        let exitosas = 0;
        for (let i = 0; i < archivos.length; i++) {
            const file = archivos[i];
            const meta = metadata[i];
            try {
                const extension = file.originalname.split('.').pop();
                const safeFileName = `${this.cleanString(meta.title)}.${extension}`;
                const relativePath = `${artistName}/${albumName}/${Date.now()}_${safeFileName}`;
                const formData = new form_data_1.default();
                formData.append('ruta', relativePath);
                formData.append('file', file.buffer, { filename: file.originalname });
                await (0, rxjs_1.lastValueFrom)(this.httpService.post(`${this.PYTHON_SERVER}/upload`, formData, {
                    headers: formData.getHeaders(),
                }));
                const publicUrl = `${this.PYTHON_SERVER}/musica/${relativePath}`;
                await this.prisma.cancion.create({
                    data: {
                        tituloCancion: meta.title,
                        artistaId: artistaId,
                        albumId: albumId,
                        audioPath: publicUrl,
                        duracionCancion: parseFloat(meta.duration),
                        numeroTrack: meta.trackNum,
                        reproducciones: 0,
                        imagenUrl: album.imagen_url
                    }
                });
                exitosas++;
            }
            catch (error) {
                this.logger.error(`Error procesando track ${meta.title}:`, error);
            }
        }
        await this.actualizarDuracionAlbum(albumId);
        return {
            success: true,
            procesadas: exitosas,
            total: archivos.length,
            message: 'Álbum procesado correctamente'
        };
    }
    async actualizarDuracionAlbum(albumId) {
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
    async obtenerGeneros() {
        return this.prisma.genero.findMany({ orderBy: { nombre_genero: 'asc' } });
    }
    async obtenerArtistas(generoId) {
        return this.prisma.artista.findMany({
            where: { genero_id: BigInt(generoId) },
            orderBy: { nombre: 'asc' }
        });
    }
    async obtenerAlbums(artistaId) {
        return this.prisma.album.findMany({
            where: { artista_id: BigInt(artistaId) },
            orderBy: { titulo_album: 'asc' }
        });
    }
    async obtenerCanciones(albumId) {
        return this.prisma.cancion.findMany({
            where: { albumId: BigInt(albumId) },
            orderBy: { numeroTrack: 'asc' }
        });
    }
    async crearGenero(nombre, decada) {
        return this.prisma.genero.create({
            data: { nombre_genero: nombre, decada: new Date(decada) }
        });
    }
    async crearArtista(nombre, descripcion, generoId) {
        return this.prisma.artista.create({
            data: { nombre, descripcion, genero_id: BigInt(generoId) }
        });
    }
    async crearAlbum(titulo, fecha, tipo, num, artistaId, imagenUrl) {
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
    async actualizarAlbum(albumId, titulo, fecha, tipo, num, imagenUrl) {
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
    async actualizarTituloCancion(cancionId, nuevoTitulo) {
        return this.prisma.cancion.update({
            where: { idCancion: BigInt(cancionId) },
            data: { tituloCancion: nuevoTitulo }
        });
    }
    async borrarCancion(cancionId) {
        const cancion = await this.prisma.cancion.findUnique({ where: { idCancion: BigInt(cancionId) } });
        if (!cancion)
            throw new common_1.HttpException('Canción no encontrada', common_1.HttpStatus.NOT_FOUND);
        if (cancion.audioPath) {
            const parts = cancion.audioPath.split('/musica/');
            if (parts.length > 1) {
                try {
                    await (0, rxjs_1.lastValueFrom)(this.httpService.post(`${this.PYTHON_SERVER}/delete`, { ruta: parts[1] }));
                }
                catch (err) {
                    this.logger.error("Error borrando en Python:", err);
                }
            }
        }
        return this.prisma.cancion.delete({ where: { idCancion: BigInt(cancionId) } });
    }
    async borradoNuclearAlbum(albumId) {
        const album = await this.prisma.album.findUnique({
            where: { id_album: BigInt(albumId) },
            include: { artista: true }
        });
        if (!album)
            throw new common_1.HttpException('Álbum no encontrado', common_1.HttpStatus.NOT_FOUND);
        try {
            await (0, rxjs_1.lastValueFrom)(this.httpService.post(`${this.PYTHON_SERVER}/api/delete_folder`, {
                ruta: `${this.cleanString(album.artista.nombre)}/${this.cleanString(album.titulo_album)}`
            }));
        }
        catch (err) {
            this.logger.error("Error borrando carpeta en Python:", err);
        }
        await this.prisma.cancion.deleteMany({ where: { albumId: BigInt(albumId) } });
        return this.prisma.album.delete({ where: { id_album: BigInt(albumId) } });
    }
    async subirPortada(file, artistaNombre, albumTitulo) {
        const formData = new form_data_1.default();
        formData.append('file', file.buffer, file.originalname);
        formData.append('artista_nombre', artistaNombre);
        formData.append('album_titulo', albumTitulo);
        try {
            const response = await axios_2.default.post(`${this.PYTHON_SERVER}/upload_cover`, formData, {
                headers: formData.getHeaders(),
            });
            return response.data.url;
        }
        catch (error) {
            console.error("Error enviando portada a Python:", error.message);
            throw new Error("Fallo al subir la portada al Búnker");
        }
    }
    async obtenerMetadataYoutube(url) {
        try {
            const response = await fetch('http://localhost:3000/api/metadata', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'El Búnker rechazó la petición');
            }
            return data;
        }
        catch (error) {
            console.error("Error contactando al Búnker (Python):", error.message);
            throw new Error("Fallo al obtener metadata de YouTube");
        }
    }
    async descargarCancionYoutube(payload) {
        try {
            const response = await fetch('http://localhost:3000/api/download_single', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok)
                throw new Error(data.error);
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
        }
        catch (error) {
            console.error("Error en tubería YouTube:", error);
            throw new Error("Fallo al procesar descarga");
        }
    }
};
exports.MusicManagerService = MusicManagerService;
exports.MusicManagerService = MusicManagerService = MusicManagerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        axios_1.HttpService])
], MusicManagerService);
//# sourceMappingURL=music-manager.service.js.map