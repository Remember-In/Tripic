import { Module } from "@nestjs/common";
import { UsersController } from "@/users/users.controller";
import { UsersService } from "@/users/users.service";
import { USERS_REPOSITORY } from "@/users/ports/users-repository.port";
import { PrismaUsersAdapter } from "@/users/adapters/prisma-users.adapter";

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    { provide: USERS_REPOSITORY, useClass: PrismaUsersAdapter },
  ],
})
export class UsersModule {}
