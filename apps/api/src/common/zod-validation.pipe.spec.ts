import { describe, expect, it } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { updateMeSchema } from "@tripic/shared";
import { ZodValidationPipe } from "@/common/zod-validation.pipe";

describe("ZodValidationPipe", () => {
  const pipe = new ZodValidationPipe(updateMeSchema);

  it("유효한 입력은 파싱 결과를 반환한다 (trim 적용)", () => {
    expect(pipe.transform({ nickname: "  리민  " })).toEqual({
      nickname: "리민",
    });
  });

  it("검증 실패 시 400 + 필드별 issue를 담는다", () => {
    try {
      pipe.transform({ nickname: "a" });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const body = (error as BadRequestException).getResponse() as {
        issues: Array<{ path: string }>;
      };
      expect(body.issues[0].path).toBe("nickname");
    }
  });
});
