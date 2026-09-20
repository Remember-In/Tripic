import type { AuthUser } from "@tripic/shared";

import { requestJson } from "@/shared/api/http";

export function updateNickname(nickname: string) {
  return requestJson<AuthUser>("/users/me", {
    auth: true,
    body: JSON.stringify({ nickname }),
    method: "PATCH",
  });
}
