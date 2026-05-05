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
exports.MusicManagerController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const music_manager_service_1 = require("../../application/music-manager.service");
require("multer");
let MusicManagerController = class MusicManagerController {
    musicService;
    constructor(musicService) {
        this.musicService = musicService;
    }
    async uploadAlbum(files, albumIdStr, artistaIdStr, metadataStr) {
        if (!files || files.length === 0) {
            throw new common_1.HttpException('No se enviaron archivos', common_1.HttpStatus.BAD_REQUEST);
        }
        const albumId = BigInt(albumIdStr);
        const artistaId = BigInt(artistaIdStr);
        const metadata = JSON.parse(metadataStr);
        return await this.musicService.procesarCargaMasiva(albumId, artistaId, files, metadata);
    }
    async uploadCover(file, artistaNombre, albumTitulo) {
        const url = await this.musicService.subirPortada(file, artistaNombre, albumTitulo);
        return { url };
    }
    async getYoutubeMetadata(url) {
        if (!url) {
            throw new common_1.HttpException('No enviaste ninguna URL de YouTube', common_1.HttpStatus.BAD_REQUEST);
        }
        try {
            const metadata = await this.musicService.obtenerMetadataYoutube(url);
            return metadata;
        }
        catch (error) {
            throw new common_1.HttpException('Fallo al explorar YouTube', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async downloadYoutubeTrack(payload) {
        try {
            return await this.musicService.descargarCancionYoutube(payload);
        }
        catch (error) {
            throw new common_1.HttpException('Fallo al descargar pista', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.MusicManagerController = MusicManagerController;
__decorate([
    (0, common_1.Post)('upload-album'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('files')),
    __param(0, (0, common_1.UploadedFiles)()),
    __param(1, (0, common_1.Body)('albumId')),
    __param(2, (0, common_1.Body)('artistaId')),
    __param(3, (0, common_1.Body)('metadata')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, String, String, String]),
    __metadata("design:returntype", Promise)
], MusicManagerController.prototype, "uploadAlbum", null);
__decorate([
    (0, common_1.Post)('upload-cover'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('cover')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)('artistaNombre')),
    __param(2, (0, common_1.Body)('albumTitulo')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], MusicManagerController.prototype, "uploadCover", null);
__decorate([
    (0, common_1.Post)('youtube-metadata'),
    __param(0, (0, common_1.Body)('url')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MusicManagerController.prototype, "getYoutubeMetadata", null);
__decorate([
    (0, common_1.Post)('youtube-download'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MusicManagerController.prototype, "downloadYoutubeTrack", null);
exports.MusicManagerController = MusicManagerController = __decorate([
    (0, common_1.Controller)('music-manager'),
    __metadata("design:paramtypes", [music_manager_service_1.MusicManagerService])
], MusicManagerController);
//# sourceMappingURL=music-manager.controller.js.map