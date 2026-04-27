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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MusicManagerResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const music_manager_service_1 = require("../../application/music-manager.service");
let MusicManagerResolver = class MusicManagerResolver {
    musicService;
    constructor(musicService) {
        this.musicService = musicService;
    }
    async getGeneros() {
        const generos = await this.musicService.obtenerGeneros();
        return JSON.stringify(generos, (key, value) => typeof value === 'bigint' ? value.toString() : value);
    }
    async getArtistas(generoId) {
        const artistas = await this.musicService.obtenerArtistas(generoId);
        return JSON.stringify(artistas, (key, value) => typeof value === 'bigint' ? value.toString() : value);
    }
    async getAlbums(artistaId) {
        const albums = await this.musicService.obtenerAlbums(artistaId);
        return JSON.stringify(albums, (key, value) => typeof value === 'bigint' ? value.toString() : value);
    }
    async getCanciones(albumId) {
        const canciones = await this.musicService.obtenerCanciones(albumId);
        return JSON.stringify(canciones, (key, value) => typeof value === 'bigint' ? value.toString() : value);
    }
    async createGenero(nombre, decada) {
        await this.musicService.crearGenero(nombre, decada);
        return true;
    }
    async createArtista(nombre, descripcion, generoId) {
        await this.musicService.crearArtista(nombre, descripcion, generoId);
        return true;
    }
    async createAlbum(titulo, fecha, tipo, num, artistaId) {
        await this.musicService.crearAlbum(titulo, fecha, tipo, num, artistaId);
        return true;
    }
    async updateAlbum(albumId, titulo, fecha, tipo, num) {
        await this.musicService.actualizarAlbum(albumId, titulo, fecha, tipo, num);
        return true;
    }
    async deleteCancion(cancionId) {
        await this.musicService.borrarCancion(cancionId);
        return true;
    }
    async nuclearDeleteAlbum(albumId) {
        await this.musicService.borradoNuclearAlbum(albumId);
        return true;
    }
    async updateCancionTitle(cancionId, titulo) {
        await this.musicService.actualizarTituloCancion(cancionId, titulo);
        return true;
    }
};
exports.MusicManagerResolver = MusicManagerResolver;
__decorate([
    (0, graphql_1.Query)(() => String, { description: 'Trae todos los géneros (en formato JSON stringificado por ahora)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MusicManagerResolver.prototype, "getGeneros", null);
__decorate([
    (0, graphql_1.Query)(() => String),
    __param(0, (0, graphql_1.Args)('generoId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MusicManagerResolver.prototype, "getArtistas", null);
__decorate([
    (0, graphql_1.Query)(() => String),
    __param(0, (0, graphql_1.Args)('artistaId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MusicManagerResolver.prototype, "getAlbums", null);
__decorate([
    (0, graphql_1.Query)(() => String),
    __param(0, (0, graphql_1.Args)('albumId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MusicManagerResolver.prototype, "getCanciones", null);
__decorate([
    (0, graphql_1.Mutation)(() => Boolean),
    __param(0, (0, graphql_1.Args)('nombre')),
    __param(1, (0, graphql_1.Args)('decada')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MusicManagerResolver.prototype, "createGenero", null);
__decorate([
    (0, graphql_1.Mutation)(() => Boolean),
    __param(0, (0, graphql_1.Args)('nombre')),
    __param(1, (0, graphql_1.Args)('descripcion')),
    __param(2, (0, graphql_1.Args)('generoId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], MusicManagerResolver.prototype, "createArtista", null);
__decorate([
    (0, graphql_1.Mutation)(() => Boolean),
    __param(0, (0, graphql_1.Args)('titulo')),
    __param(1, (0, graphql_1.Args)('fecha')),
    __param(2, (0, graphql_1.Args)('tipo')),
    __param(3, (0, graphql_1.Args)('num')),
    __param(4, (0, graphql_1.Args)('artistaId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Number, String]),
    __metadata("design:returntype", Promise)
], MusicManagerResolver.prototype, "createAlbum", null);
__decorate([
    (0, graphql_1.Mutation)(() => Boolean),
    __param(0, (0, graphql_1.Args)('albumId')),
    __param(1, (0, graphql_1.Args)('titulo')),
    __param(2, (0, graphql_1.Args)('fecha')),
    __param(3, (0, graphql_1.Args)('tipo')),
    __param(4, (0, graphql_1.Args)('num')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Number]),
    __metadata("design:returntype", Promise)
], MusicManagerResolver.prototype, "updateAlbum", null);
__decorate([
    (0, graphql_1.Mutation)(() => Boolean),
    __param(0, (0, graphql_1.Args)('cancionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MusicManagerResolver.prototype, "deleteCancion", null);
__decorate([
    (0, graphql_1.Mutation)(() => Boolean),
    __param(0, (0, graphql_1.Args)('albumId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MusicManagerResolver.prototype, "nuclearDeleteAlbum", null);
__decorate([
    (0, graphql_1.Mutation)(() => Boolean),
    __param(0, (0, graphql_1.Args)('cancionId')),
    __param(1, (0, graphql_1.Args)('titulo')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MusicManagerResolver.prototype, "updateCancionTitle", null);
exports.MusicManagerResolver = MusicManagerResolver = __decorate([
    (0, graphql_1.Resolver)(),
    __metadata("design:paramtypes", [music_manager_service_1.MusicManagerService])
], MusicManagerResolver);
//# sourceMappingURL=music.resolver.js.map