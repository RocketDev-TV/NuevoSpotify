import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        ignoreExpiration: false,
        secretOrKey: process.env.SUPABASE_JWT_SECRET || 'llave-provisional-para-compilar', 
    });
  }

  async validate(payload: any) {
    // El payload contiene el 'sub' (que es el UID de Supabase)
    return { userId: payload.sub, email: payload.email };
  }
}