import {
  authUserSchema,
  meSchema,
  updateMeSchema,
  type AuthUser,
  type Me,
  type UpdateMeInput,
} from "@tripic/shared";

import { requestJson } from "@/shared/api";

export const meQueryKey = ["users", "me"] as const;

export async function getMe(): Promise<Me> {
  const response = await requestJson("/users/me", { auth: true });

  return meSchema.parse(response);
}

export async function updateMe(input: UpdateMeInput): Promise<AuthUser> {
  const body = updateMeSchema.parse(input);
  const response = await requestJson("/users/me", {
    auth: true,
    body,
    method: "PATCH",
  });

  return authUserSchema.parse(response);
}

export async function deleteMe(): Promise<void> {
  await requestJson("/users/me", {
    auth: true,
    method: "DELETE",
  });
}
