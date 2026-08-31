import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthSessionProvider } from "@/features/auth-session";
import { AppVersionGuard } from "@/features/app-version-guard";
import { CreateRecordSessionProvider } from "@/features/create-record-session";
import { fontAssets } from "@/shared/assets/fonts";

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
          <CreateRecordSessionProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </CreateRecordSessionProvider>
        </AuthSessionProvider>
        <AppVersionGuard />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
