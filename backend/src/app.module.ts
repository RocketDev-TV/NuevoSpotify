import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { ConfigModule } from '@nestjs/config';

// Importamos el nuevo módulo global de Prisma
import { PrismaModule } from './prsima.module';
import { AuthModule } from './modules/auth/app.module';
import { MusicManagerModule } from './modules/music-manager/music-manager.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      playground: true,
    }),
    // Al conectar esto, NestJS ya sabe todo sobre tus Resolvers y Services
    ConfigModule.forRoot(),
    PrismaModule,
    AuthModule,
    MusicManagerModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}