import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class User {
  @Field(() => ID)
  uid!: string;

  @Field({ nullable: true })
  nombre?: string;

  @Field({ nullable: true })
  correo?: string;

  @Field({ nullable: true })
  rol?: string;
}