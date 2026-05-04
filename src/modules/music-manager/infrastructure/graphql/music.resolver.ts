import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { MusicManagerService } from '../../application/music-manager.service';

@Resolver()
export class MusicManagerResolver {
  constructor(private readonly musicService: MusicManagerService) {}

  // ==========================================
  // QUERIES (Traer datos)
  // ==========================================
  @Query(() => String, { description: 'Trae todos los géneros (en formato JSON stringificado por ahora)' })
  async getGeneros() {
    const generos = await this.musicService.obtenerGeneros();
    // GraphQL no soporta BigInt nativo sin un Custom Scalar, así que lo serializamos a String para el Frontend
    return JSON.stringify(generos, (key, value) => typeof value === 'bigint' ? value.toString() : value);
  }

  @Query(() => String)
  async getArtistas(@Args('generoId') generoId: string) {
    const artistas = await this.musicService.obtenerArtistas(generoId);
    return JSON.stringify(artistas, (key, value) => typeof value === 'bigint' ? value.toString() : value);
  }

  @Query(() => String)
  async getAlbums(@Args('artistaId') artistaId: string) {
    const albums = await this.musicService.obtenerAlbums(artistaId);
    return JSON.stringify(albums, (key, value) => typeof value === 'bigint' ? value.toString() : value);
  }

  @Query(() => String)
  async getCanciones(@Args('albumId') albumId: string) {
    const canciones = await this.musicService.obtenerCanciones(albumId);
    return JSON.stringify(canciones, (key, value) => typeof value === 'bigint' ? value.toString() : value);
  }

  // ==========================================
  // MUTATIONS (Modificar datos)
  // ==========================================
  @Mutation(() => Boolean)
  async createGenero(@Args('nombre') nombre: string, @Args('decada') decada: string) {
    await this.musicService.crearGenero(nombre, decada);
    return true;
  }

  @Mutation(() => Boolean)
  async createArtista(@Args('nombre') nombre: string, @Args('descripcion') descripcion: string, @Args('generoId') generoId: string) {
    await this.musicService.crearArtista(nombre, descripcion, generoId);
    return true;
  }

  @Mutation(() => Boolean)
  async createAlbum(
    @Args('titulo') titulo: string,
    @Args('fecha') fecha: string,
    @Args('tipo') tipo: string,
    @Args('num') num: number,
    @Args('artistaId') artistaId: string,
    @Args({ name: 'imagenUrl', nullable: true }) imagenUrl?: string
  ) {
    await this.musicService.crearAlbum(titulo, fecha, tipo, num, artistaId, imagenUrl);
    return true; 
  }

  @Mutation(() => Boolean)
  async updateAlbum(
    @Args('albumId') albumId: string,
    @Args('titulo') titulo: string, 
    @Args('fecha') fecha: string, 
    @Args('tipo') tipo: string, 
    @Args('num') num: number,
    @Args({ name: 'imagenUrl', nullable: true }) imagenUrl?: string 
  ) {
    await this.musicService.actualizarAlbum(albumId, titulo, fecha, tipo, num, imagenUrl);
    return true;
  }

  @Mutation(() => Boolean)
  async deleteCancion(@Args('cancionId') cancionId: string) {
    await this.musicService.borrarCancion(cancionId);
    return true;
  }

  @Mutation(() => Boolean)
  async nuclearDeleteAlbum(@Args('albumId') albumId: string) {
    await this.musicService.borradoNuclearAlbum(albumId);
    return true;
  }

  @Mutation(() => Boolean)
  async updateCancionTitle(@Args('cancionId') cancionId: string, @Args('titulo') titulo: string) {
    await this.musicService.actualizarTituloCancion(cancionId, titulo);
    return true;
  }


}