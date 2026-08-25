import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/** 전역 JwtAuthGuard(default-deny)에서 이 라우트/컨트롤러를 인증 없이 허용한다 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
