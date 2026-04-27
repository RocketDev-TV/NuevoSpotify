import { Controller, Post, UseInterceptors, UploadedFiles, Body, HttpException, HttpStatus } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { MusicManagerService } from '../../application/music-manager.service';
import 'multer';

@Controller('music-manager')
export class MusicManagerController {
  constructor(private readonly musicService: MusicManagerService) {}

  @Post('upload-album')
  @UseInterceptors(FilesInterceptor('files'))
  async uploadAlbum(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('albumId') albumIdStr: string,
    @Body('artistaId') artistaIdStr: string,
    @Body('metadata') metadataStr: string 
  ) {
    if (!files || files.length === 0) {
      throw new HttpException('No se enviaron archivos', HttpStatus.BAD_REQUEST);
    }

    // Convertimos a BigInt porque así lo exige tu Prisma Schema
    const albumId = BigInt(albumIdStr);
    const artistaId = BigInt(artistaIdStr);
    
    // Parseamos la metadata que viene de React
    const metadata = JSON.parse(metadataStr);

    return await this.musicService.procesarCargaMasiva(albumId, artistaId, files, metadata);
  }
}