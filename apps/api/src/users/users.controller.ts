import { Body, Controller, Delete, Get, HttpCode, Patch } from "@nestjs/common";
import { updateMeSchema, type UpdateMeInput } from "@tripic/shared";
import { CurrentUser } from "@/auth/current-user.decorator";
import { ZodValidationPipe } from "@/common/zod-validation.pipe";
import type { UserProfile } from "@/users/ports/users-repository.port";
import { UsersService } from "@/users/users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** GET /users/me — 내 프로필 (Bearer) */
  @Get("me")
  getMe(@CurrentUser() userId: string): Promise<UserProfile> {
    return this.users.getMe(userId);
  }

  /** PATCH /users/me — 닉네임 설정/변경 (Bearer) */
  @Patch("me")
  updateMe(
    @CurrentUser() userId: string,
    @Body(new ZodValidationPipe(updateMeSchema)) body: UpdateMeInput,
  ): Promise<{ id: string; nickname: string | null }> {
    return this.users.updateNickname(userId, body.nickname);
  }

  /** DELETE /users/me — 회원탈퇴, 즉시 파기 (Bearer, 204). 확인 UX 는 앱 책임 */
  @Delete("me")
  @HttpCode(204)
  async deleteMe(@CurrentUser() userId: string): Promise<void> {
    await this.users.withdraw(userId);
  }
}
