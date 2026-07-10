import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service'; 
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto'; // Necesario para generar un UID temporal

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async findUserByUid(uid: string) {
    return this.prisma.user.findUnique({
      where: { uid },
      include: {
        playlists: true, 
      }
    });
  }

  // 1. Cambiamos 'username' por 'nombre' en los parámetros
  async register(nombre: string, correo: string, password: string) {
    
    // 2. Ajustamos el 'where' para que busque por los campos reales
    const userExists = await this.prisma.user.findFirst({
      where: { OR: [{ correo }, { nombre }] } 
    });

    if (userExists) {
      throw new ConflictException('Ese usuario o correo ya está registrado, mai');
    }

    // Nota: Aunque encriptemos la contraseña aquí, Prisma no la va a guardar en public.usuarios.
    // (En el futuro ideal, usaremos el SDK de Supabase para registrar el auth real).
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log('Password encriptado (listo para auth.users):', hashedPassword);

    // 3. Guardar en Supabase (Solo el Perfil Público)
    return this.prisma.user.create({
      data: {
        uid: crypto.randomUUID(), // Prisma exige el UID, le damos uno temporal
        nombre,
        correo,
      },
    });
  }
}