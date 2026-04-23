import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Todo lo que exporte este módulo estará disponible en TODA la app
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Esto permite que AuthService (y futuros servicios) lo usen
})
export class PrismaModule {}