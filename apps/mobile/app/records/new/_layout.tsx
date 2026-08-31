import { type Href, Stack, usePathname, useRouter } from "expo-router";
import { useEffect } from "react";

import { useCreateRecordSession } from "@/features/create-record-session";

const photoSelectionRoute = "/records/new/photos" as Href;

export default function CreateRecordLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { photos } = useCreateRecordSession();

  useEffect(() => {
    if (photos.length === 0 && pathname !== photoSelectionRoute) {
      router.replace(photoSelectionRoute);
    }
  }, [pathname, photos.length, router]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
