import { Controller, Post, UseInterceptors, UploadedFiles, UploadedFile, Body, HttpException, HttpStatus } from '@nestjs/common';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
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

  @Post('upload-cover')
  @UseInterceptors(FileInterceptor('cover'))
  async uploadCover(
    @UploadedFile() file: Express.Multer.File,
    @Body('artistaNombre') artistaNombre: string,
    @Body('albumTitulo') albumTitulo: string,
  ) {
    const url = await this.musicService.subirPortada(file, artistaNombre, albumTitulo);
    return { url }; // Le regresamos a React un JSON con la URL lista
  }

  @Post('youtube-metadata')
  async getYoutubeMetadata(@Body('url') url: string) {
    if (!url) {
      throw new HttpException('No enviaste ninguna URL de YouTube', HttpStatus.BAD_REQUEST);
    }

    try {
      // Mandamos a llamar al servicio que acabamos de crear
      const metadata = await this.musicService.obtenerMetadataYoutube(url);
      return metadata; 
    } catch (error) {
      throw new HttpException('Fallo al explorar YouTube', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('youtube-download')
  async downloadYoutubeTrack(@Body() payload: any) {
    try {
      return await this.musicService.descargarCancionYoutube(payload);
    } catch (error) {
      throw new HttpException('Fallo al descargar pista', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}