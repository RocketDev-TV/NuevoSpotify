import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './application/jwt.strategy';
import { AuthService } from './application/auth.service';
import { AuthResolver } from './infrestructure/graphql/auth.resolver';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  // Fíjate que aquí YA NO está PrismaService, porque ya es global
  providers: [AuthService, AuthResolver, JwtStrategy],
  exports: [PassportModule, JwtStrategy],
})
export class AuthModule {}