import { Module } from "@nestjs/common";
import { AuthModule } from "@/auth/auth.module";
import { UsersController } from "@/users/users.controller";
import { UsersService } from "@/users/users.service";
import { USERS_REPOSITORY } from "@/users/ports/users-repository.port";
import { PrismaUsersAdapter } from "@/users/adapters/prisma-users.adapter";

@Module({
  // 탈퇴 전 Apple 연결 해제(SOCIAL_ACCOUNT_UNLINKER)를 AuthModule 에서 받는다
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    { provide: USERS_REPOSITORY, useClass: PrismaUsersAdapter },
  ],
})
export class UsersModule {}
