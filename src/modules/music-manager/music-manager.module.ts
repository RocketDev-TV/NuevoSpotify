import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MusicManagerController } from './infrastructure/rest/music-manager.controller';
import { MusicManagerService } from './application/music-manager.service';
import { MusicManagerResolver } from './infrastructure/graphql/music.resolver'; 
import { PrismaService } from '../../prisma.service'; // Ajusta tu ruta

@Module({
  imports: [HttpModule], // Necesario para hacer peticiones al servidor Python
  controllers: [MusicManagerController],
  providers: [MusicManagerService, PrismaService, MusicManagerResolver], // Registramos el cerebro y la BD
})
export class MusicManagerModule {}