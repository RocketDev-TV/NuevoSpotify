import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';

// Importamos el nuevo módulo global de Prisma
import { PrismaModule } from './prsima.module';
import { AuthModule } from './modules/auth/app.module';
@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      playground: true, 
    }),
    // Al conectar esto, NestJS ya sabe todo sobre tus Resolvers y Services
    PrismaModule,
    AuthModule,
  ],
  controllers: [],
  providers: [], 
})
export class AppModule {}