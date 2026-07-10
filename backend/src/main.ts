import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors();

  // Sirve lo que antes servían music-server (Express) y Python (/musica/<path>)
  const storageRoot = process.env.STORAGE_ROOT || join(process.cwd(), 'storage_musica');
  app.useStaticAssets(storageRoot, { prefix: '/musica' });

  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
