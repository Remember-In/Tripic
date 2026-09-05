import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import {
  type PropsWithChildren,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import {
  GUEST_LOCAL_RECORD_OWNER_KEY,
  createUserLocalRecordOwnerKey,
  type LocalRecordOwnerKey,
} from "@/entities/travel-record";
import { AppVersionGuard } from "@/features/app-version-guard";
import { recoverPendingWithdrawalCleanupOnAppStart } from "@/features/account-withdrawal";
import { AuthSessionProvider, useAuthSession } from "@/features/auth-session";
import { CreateRecordSessionProvider } from "@/features/create-record-session";
import {
  flushAllQueuedPhotoCleanup,
  flushQueuedPhotoCleanup,
  localRecordQueryKeys,
  LocalRecordsProvider,
} from "@/features/local-records";
import { fontAssets } from "@/shared/assets/fonts";
import {
  clearLastLocalUserId,
  readLastLocalUserId,
  writeLastLocalUserId,
} from "@/shared/lib/storage";

function LocalRecordScope({ children }: PropsWithChildren) {
  const { status, user } = useAuthSession();
  const queryClient = useQueryClient();
  const [lastUserId, setLastUserId] = useState<string | null>(null);
  const [isOwnerRestored, setOwnerRestored] = useState(false);
  const previousOwnerKey = useRef<LocalRecordOwnerKey | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        // 탈퇴 완료가 확인된 계정의 기록 정리를 먼저 복구해야 사진 정리 큐가 완성된다.
        await recoverPendingWithdrawalCleanupOnAppStart();
      } finally {
        await flushAllQueuedPhotoCleanup();
      }
    })().catch(() => undefined);
  }, []);

  useEffect(() => {
    let active = true;
    void readLastLocalUserId()
      .then((userId) => {
        if (active) {
          setLastUserId(userId);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) {
          setOwnerRestored(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (status === "authenticated" && user) {
      setLastUserId(user.id);
      void writeLastLocalUserId(user.id).catch(() => undefined);
      return;
    }

    if (status === "unauthenticated") {
      setLastUserId(null);
      void clearLastLocalUserId().catch(() => undefined);
    }
  }, [status, user]);

  const ownerKey = useMemo(() => {
    if (status === "authenticated" && user) {
      return createUserLocalRecordOwnerKey(user.id);
    }
    if (status === "unauthenticated") {
      return GUEST_LOCAL_RECORD_OWNER_KEY;
    }
    if (status === "unavailable" && isOwnerRestored && lastUserId) {
      return createUserLocalRecordOwnerKey(lastUserId);
    }
    return null;
  }, [isOwnerRestored, lastUserId, status, user]);

  useEffect(() => {
    const previousOwner = previousOwnerKey.current;
    if (previousOwner && previousOwner !== ownerKey) {
      queryClient.removeQueries({
        queryKey: localRecordQueryKeys.all(previousOwner),
      });
    }
    previousOwnerKey.current = ownerKey;

    if (ownerKey) {
      void flushQueuedPhotoCleanup(ownerKey).catch(() => undefined);
    }
  }, [ownerKey, queryClient]);

  return (
    <LocalRecordsProvider ownerKey={ownerKey}>{children}</LocalRecordsProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 2, staleTime: 60_000 },
        },
      }),
  );

  if (fontError) {
    throw fontError;
  }

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthSessionProvider>
          <LocalRecordScope>
            <CreateRecordSessionProvider>
              <Stack screenOptions={{ headerShown: false }} />
            </CreateRecordSessionProvider>
          </LocalRecordScope>
        </AuthSessionProvider>
        <AppVersionGuard />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
