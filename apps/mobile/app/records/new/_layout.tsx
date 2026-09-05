import { type Href, Stack, usePathname, useRouter } from "expo-router";
import { useEffect } from "react";

import { useCreateRecordSession } from "@/features/create-record-session";

const photoSelectionRoute = "/records/new/photos" as Href;

export default function CreateRecordLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { isDraftCommitted, photos, resetDraft } = useCreateRecordSession();

  useEffect(() => () => resetDraft(), [resetDraft]);

  useEffect(() => {
    if (
      photos.length === 0 &&
      !isDraftCommitted &&
      pathname !== photoSelectionRoute
    ) {
      router.replace(photoSelectionRoute);
    }
  }, [isDraftCommitted, pathname, photos.length, router]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
