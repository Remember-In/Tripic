import { useQueryClient } from "@tanstack/react-query";
import {
  authTokensSchema,
  authUserSchema,
  type AuthTokens,
  type AuthUser,
} from "@tripic/shared";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";

import { getMe, meQueryKey, type Me } from "@/entities/user";
import { ApiError, configureApiAuth, requestJson } from "@/shared/api";
import {
  clearRefreshToken,
  readRefreshToken,
  writeRefreshToken,
} from "@/shared/lib/storage";

const refreshReuseGraceMs = 1_000;

export type AuthSessionStatus =
  "authenticated" | "restoring" | "unauthenticated" | "unavailable";

export type SessionTokensAndUser = AuthTokens & {
  user: AuthUser;
};

type AuthSessionContextValue = {
  clearLocalSession: () => Promise<void>;
  establishSession: (session: SessionTokensAndUser) => Promise<void>;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  replaceUser: (user: AuthUser) => void;
  retrySessionRestore: () => Promise<void>;
  status: AuthSessionStatus;
  user: AuthUser | null;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthSessionStatus>("restoring");
  const [user, setUser] = useState<AuthUser | null>(null);
  const accessTokenRef = useRef<string | null>(null);
  const establishPromiseRef = useRef<Promise<void> | null>(null);
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);
  const restorePromiseRef = useRef<Promise<void> | null>(null);
  const providerActiveRef = useRef(true);
  const recentRefreshRef = useRef<{
    accessToken: string;
    completedAt: number;
  } | null>(null);
  const sessionRevisionRef = useRef(0);

  const clearSession = useCallback(async () => {
    sessionRevisionRef.current += 1;
    accessTokenRef.current = null;
    recentRefreshRef.current = null;
    setUser(null);
    setStatus("unauthenticated");
    queryClient.clear();
    await clearRefreshToken();
  }, [queryClient]);

  const performRefresh = useCallback(async () => {
    const refreshToken = await readRefreshToken();

    if (!refreshToken) {
      return null;
    }

    const revision = sessionRevisionRef.current;
    let response: unknown;

    try {
      response = await requestJson("/auth/refresh", {
        auth: false,
        body: { refreshToken },
        method: "POST",
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await clearSession();
        return null;
      }

      throw error;
    }

    if (revision !== sessionRevisionRef.current) {
      return null;
    }

    let tokens: AuthTokens;

    try {
      tokens = authTokensSchema.parse(response);
      // 서버에서 기존 토큰은 이미 폐기됐으므로 새 refresh token을 먼저 보존한다.
      await writeRefreshToken(tokens.refreshToken);
    } catch (error) {
      await clearSession();
      throw error;
    }

    if (revision !== sessionRevisionRef.current) {
      await clearRefreshToken();
      return null;
    }

    accessTokenRef.current = tokens.accessToken;
    recentRefreshRef.current = {
      accessToken: tokens.accessToken,
      completedAt: Date.now(),
    };

    return tokens.accessToken;
  }, [clearSession]);

  const refreshAccessToken = useCallback(() => {
    const pendingEstablish = establishPromiseRef.current;

    if (pendingEstablish) {
      return pendingEstablish.then(() => accessTokenRef.current);
    }

    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const recentRefresh = recentRefreshRef.current;

    if (
      recentRefresh &&
      Date.now() - recentRefresh.completedAt < refreshReuseGraceMs
    ) {
      return Promise.resolve(recentRefresh.accessToken);
    }

    const pendingRefresh = performRefresh();
    const releaseRefresh = () => {
      if (refreshPromiseRef.current === pendingRefresh) {
        refreshPromiseRef.current = null;
      }
    };

    refreshPromiseRef.current = pendingRefresh;
    void pendingRefresh.then(releaseRefresh, releaseRefresh);

    return pendingRefresh;
  }, [performRefresh]);

  const retrySessionRestore = useCallback(() => {
    if (restorePromiseRef.current) {
      return restorePromiseRef.current;
    }

    const restoreRevision = sessionRevisionRef.current;
    const pendingRestore = (async () => {
      if (providerActiveRef.current) {
        setStatus("restoring");
      }

      try {
        const accessToken = await refreshAccessToken();

        if (
          !providerActiveRef.current ||
          restoreRevision !== sessionRevisionRef.current
        ) {
          return;
        }

        if (!accessToken) {
          await clearSession();
          return;
        }

        const restoredUser = await getMe();

        if (
          !providerActiveRef.current ||
          restoreRevision !== sessionRevisionRef.current
        ) {
          return;
        }

        queryClient.setQueryData(meQueryKey, restoredUser);
        setUser(restoredUser);
        setStatus("authenticated");
      } catch {
        if (
          !providerActiveRef.current ||
          restoreRevision !== sessionRevisionRef.current
        ) {
          return;
        }

        // 네트워크·서버의 일시 오류는 저장된 refresh token을 지우지 않는다.
        accessTokenRef.current = null;
        setUser(null);
        setStatus("unavailable");
      }
    })();

    const releaseRestore = () => {
      if (restorePromiseRef.current === pendingRestore) {
        restorePromiseRef.current = null;
      }
    };

    restorePromiseRef.current = pendingRestore;
    void pendingRestore.then(releaseRestore, releaseRestore);

    return pendingRestore;
  }, [clearSession, queryClient, refreshAccessToken]);

  const establishSession = useCallback(
    (session: SessionTokensAndUser) => {
      const tokens = authTokensSchema.parse(session);
      const nextUser = authUserSchema.parse(session.user);
      const previousEstablish = establishPromiseRef.current;

      const pendingEstablish = (async () => {
        if (previousEstablish) {
          try {
            await previousEstablish;
          } catch {
            // 새 로그인 결과가 있으므로 이전 세션 수립 실패와 관계없이 계속한다.
          }
        }

        const pendingRefresh = refreshPromiseRef.current;
        if (pendingRefresh) {
          try {
            // refresh의 SecureStore write/clear가 끝난 뒤 새 로그인 토큰을 쓴다.
            await pendingRefresh;
          } catch {
            // 새 로그인 결과로 대체할 수 있으므로 refresh 실패와 관계없이 계속한다.
          }
        }

        sessionRevisionRef.current += 1;
        accessTokenRef.current = null;
        recentRefreshRef.current = null;
        queryClient.clear();

        try {
          await writeRefreshToken(tokens.refreshToken);
        } catch (error) {
          await clearSession();
          throw error;
        }

        accessTokenRef.current = tokens.accessToken;
        setUser(nextUser);
        setStatus("authenticated");
      })();

      const releaseEstablish = () => {
        if (establishPromiseRef.current === pendingEstablish) {
          establishPromiseRef.current = null;
        }
      };

      establishPromiseRef.current = pendingEstablish;
      void pendingEstablish.then(releaseEstablish, releaseEstablish);

      return pendingEstablish;
    },
    [clearSession, queryClient],
  );

  const replaceUser = useCallback(
    (nextUser: AuthUser) => {
      const parsedUser = authUserSchema.parse(nextUser);
      setUser(parsedUser);
      setStatus("authenticated");

      const cachedMe = queryClient.getQueryData<Me>(meQueryKey);
      if (cachedMe) {
        queryClient.setQueryData<Me>(meQueryKey, {
          ...cachedMe,
          ...parsedUser,
        });
      }
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    if (establishPromiseRef.current) {
      try {
        await establishPromiseRef.current;
      } catch {
        // 세션 수립에 실패했어도 남은 로컬 인증 정보는 아래에서 정리한다.
      }
    }

    if (refreshPromiseRef.current) {
      try {
        await refreshPromiseRef.current;
      } catch {
        // 서버 로그아웃을 시도할 수 없더라도 로컬 세션은 아래에서 정리한다.
      }
    }

    try {
      const refreshToken = await readRefreshToken();

      if (accessTokenRef.current && refreshToken) {
        await requestJson("/auth/logout", {
          auth: true,
          body: { refreshToken },
          method: "POST",
        });
      }
    } finally {
      await clearSession();
    }
  }, [clearSession]);

  useEffect(() => {
    providerActiveRef.current = true;

    configureApiAuth({
      clearSession,
      getAccessToken: () => accessTokenRef.current,
      refreshAccessToken,
    });

    void retrySessionRestore();

    return () => {
      providerActiveRef.current = false;
      configureApiAuth(null);
    };
  }, [clearSession, refreshAccessToken, retrySessionRestore]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && status === "unavailable") {
        void retrySessionRestore();
      }
    });

    return () => subscription.remove();
  }, [retrySessionRestore, status]);

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      clearLocalSession: clearSession,
      establishSession,
      isAuthenticated: status === "authenticated",
      logout,
      replaceUser,
      retrySessionRestore,
      status,
      user,
    }),
    [
      clearSession,
      establishSession,
      logout,
      replaceUser,
      retrySessionRestore,
      status,
      user,
    ],
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext);

  if (!context) {
    throw new Error("useAuthSession must be used within AuthSessionProvider.");
  }

  return context;
}
