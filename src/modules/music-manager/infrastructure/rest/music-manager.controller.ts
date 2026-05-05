import { Controller, Get, Param, Post, Body, UseInterceptors, UploadedFiles, UploadedFile, HttpException, HttpStatus } from '@nestjs/common';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { MusicManagerService } from '../../application/music-manager.service';
import 'multer';

@Controller('music-manager')
export class MusicManagerController {
  constructor(private readonly musicService: MusicManagerService) { }

  @Get('generos')
  async getGeneros() {
    return await this.musicService.getGeneros();
  }

  @Get('artistas/:generoId')
  async getArtistas(@Param('generoId') generoId: string) {
    return await this.musicService.getArtistasByGenero(generoId);
  }

  @Get('albums/:artistaId')
  async getAlbums(@Param('artistaId') artistaId: string) {
    return await this.musicService.getAlbumsByArtista(artistaId);
  }

  @Post('generos')
  async createGenero(@Body() data: { nombre_genero: string, decada: string }) {
    return await this.musicService.createGenero(data);
  }

  @Post('artistas')
  async createArtista(@Body() data: { nombre: string, genero_id: string }) {
    return await this.musicService.createArtista(data);
  }

  @Post('albums')
  @UseInterceptors(FileInterceptor('portada'))
  async createAlbum(
    @Body() data: { titulo_album: string, artista_id: string, year: string, num_canciones: string, tipo_lanzamiento: string },
    @UploadedFile() file: Express.Multer.File
  ) {
    // Le pasamos el archivo y los datos al service[cite: 5, 6]
    return await this.musicService.createAlbum(data, file);
  }

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
  async downloadYoutube(@Body() data: any) {
    // data trae: url, tracks (los editados), genreId, artistId, albumId
    return await this.musicService.processYoutubeDownload(data);
  }
}