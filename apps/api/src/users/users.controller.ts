import { Body, Controller, Get, Patch } from "@nestjs/common";
import { updateMeSchema, type UpdateMeInput } from "@tripic/shared";
import { CurrentUser } from "@/auth/current-user.decorator";
import { ZodValidationPipe } from "@/common/zod-validation.pipe";
import { UsersService } from "@/users/users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** GET /users/me — 내 프로필 (Bearer) */
  @Get("me")
  getMe(@CurrentUser() userId: string) {
    return this.users.getMe(userId);
  }

  /** PATCH /users/me — 닉네임 설정/변경 (Bearer) */
  @Patch("me")
  updateMe(
    @CurrentUser() userId: string,
    @Body(new ZodValidationPipe(updateMeSchema)) body: UpdateMeInput,
  ) {
    return this.users.updateNickname(userId, body.nickname);
  }
}
