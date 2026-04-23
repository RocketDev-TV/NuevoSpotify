import { Query, Resolver, Mutation, Args } from '@nestjs/graphql';
import { AuthService } from '../../application/auth.service';
import { User } from '../../domain/user.entity'; // Asegúrate de que los campos aquí coincidan con Prisma
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from './gql-auth.guard';

@Resolver(() => User)
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => User)
  async register(
    @Args('nombre') nombre: string,      // Cambiamos 'username' por 'nombre'
    @Args('correo') correo: string,      // Cambiamos 'email' por 'correo'
    @Args('password') password: string,
  ) {
    // Le pasamos los datos al servicio con los nombres reales
    return this.authService.register(nombre, correo, password);
  }

  @Query(() => String)
  @UseGuards(GqlAuthGuard)
  async sayHello() {
    return '¡Qué onda! Estás dentro del búnker protegido.';
  }
  
  // Bonus: Una query para obtener el perfil del usuario logueado
  @Query(() => User)
  @UseGuards(GqlAuthGuard)
  async me(@Args('uid') uid: string) {
    // Aquí podrías usar el ID que viene en el token (JWT)
    // Pero por ahora, una búsqueda simple
    return this.authService.findUserByUid(uid);
  }
}