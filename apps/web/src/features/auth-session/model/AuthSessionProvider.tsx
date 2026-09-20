import type { AuthUser, Me } from "@tripic/shared";
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  requestJson,
  setAccessToken,
  subscribeToAccessToken,
} from "@/shared/api/http";

type AuthStatus = "loading" | "authenticated" | "anonymous";

type AuthSessionContextValue = {
  clearSession: () => void;
  completeLogin: (result: WebLoginResult) => void;
  logout: () => Promise<void>;
  status: AuthStatus;
  updateUser: (user: AuthUser) => void;
  user: AuthUser | null;
};

export type WebLoginResult = {
  accessToken: string;
  expiresIn: number;
  isNewUser: boolean;
  user: AuthUser;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

function previewSession() {
  const previewParam = new URLSearchParams(window.location.search).get(
    "preview",
  );
  if (import.meta.env.DEV && previewParam === "0") {
    sessionStorage.removeItem("tripic-preview");
    return false;
  }
  const fromQuery = import.meta.env.DEV && previewParam === "1";
  if (fromQuery) sessionStorage.setItem("tripic-preview", "1");
  return (
    fromQuery ||
    (import.meta.env.DEV && sessionStorage.getItem("tripic-preview") === "1")
  );
}

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [isPreview] = useState(previewSession);
  const [status, setStatus] = useState<AuthStatus>(
    isPreview ? "authenticated" : "loading",
  );
  const [user, setUser] = useState<AuthUser | null>(
    isPreview ? { id: "web-preview", nickname: "여행자" } : null,
  );

  const becomeAnonymous = useCallback(() => {
    queryClient.clear();
    setUser(null);
    setStatus("anonymous");
  }, [queryClient]);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    becomeAnonymous();
  }, [becomeAnonymous]);

  const loadProfile = useCallback(async () => {
    const profile = await requestJson<Me>("/users/me", { auth: true });
    setUser({ id: profile.id, nickname: profile.nickname });
    setStatus("authenticated");
  }, []);

  useEffect(() => {
    if (isPreview) return;
    void loadProfile().catch(becomeAnonymous);
  }, [becomeAnonymous, isPreview, loadProfile]);

  useEffect(() => {
    if (isPreview) return;
    return subscribeToAccessToken((token) => {
      if (!token && status === "authenticated") becomeAnonymous();
    });
  }, [becomeAnonymous, isPreview, status]);

  const completeLogin = useCallback(
    (result: WebLoginResult) => {
      queryClient.clear();
      setAccessToken(result.accessToken);
      setUser(result.user);
      setStatus("authenticated");
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await requestJson<void>("/auth/logout/web", {
        auth: true,
        method: "POST",
      });
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({
      clearSession,
      completeLogin,
      logout,
      status,
      updateUser: setUser,
      user,
    }),
    [clearSession, completeLogin, logout, status, user],
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession() {
  const session = useContext(AuthSessionContext);
  if (!session) throw new Error("AuthSessionProvider가 필요합니다.");
  return session;
}
