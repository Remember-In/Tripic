import { type Href, useRouter } from "expo-router";
import { useMemo } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { type ItineraryDay, type TravelRecord } from "@/entities/travel-record";
import {
  type DraftPhoto,
  useCreateRecordSession,
} from "@/features/create-record-session";
import {
  type SaveLocalRecordDraftPhotoInput,
  useLocalRecordOwnerKey,
  useSaveLocalRecordDraftMutation,
} from "@/features/local-records";
import { spacing } from "@/shared/config/theme";
import { PageHeader, Screen } from "@/shared/ui";
import { RecordEditor, type RecordEditorValue } from "@/widgets/record-editor";

function groupPhotosByDate(
  photos: DraftPhoto[],
  getPhotoDate: (photoId: string) => string,
): ItineraryDay[] {
  const groups = new Map<string, DraftPhoto[]>();

  photos.forEach((photo) => {
    const date = getPhotoDate(photo.id);
    groups.set(date, [...(groups.get(date) ?? []), photo]);
  });

  let day = 1;
  return [...groups.entries()]
    .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
    .map(([date, datePhotos]) => {
      const itineraryDay: ItineraryDay = {
        date: date.replaceAll("-", "."),
        day,
        id: `draft-day-${date}`,
        photos: datePhotos.map((photo) => photo.source),
      };
      day += 1;
      return itineraryDay;
    });
}

export function RecordComposePage() {
  const router = useRouter();
  const { discardTransientGps, finishDraft, getPhotoDetails, photos } =
    useCreateRecordSession();
  const saveRecordDraft = useSaveLocalRecordDraftMutation();
  const ownerKey = useLocalRecordOwnerKey();

  const draftRecord = useMemo<TravelRecord>(() => {
    if (photos.length === 0) {
      return {
        days: [],
        id: "draft",
        place: {
          address: "주소를 확인해 주세요",
          category: "관광지",
          id: "draft-place",
          name: "방문 장소",
          photo: { uri: "" },
          region: "여행지",
          stampApplied: false,
          visitDate: "",
        },
        style: null,
        tags: [],
        theme: null,
        title: "",
      };
    }

    const firstPhoto = photos[0];
    const firstDetails = getPhotoDetails(firstPhoto.id);
    const place = firstDetails.place;
    const lastAddressPart = place?.address.split(" ").at(-1);
    const region = lastAddressPart?.replace(/(시|구|군)$/, "") ?? "여행지";

    return {
      days: groupPhotosByDate(
        photos,
        (photoId) => getPhotoDetails(photoId).date,
      ),
      id: "draft",
      place: {
        address: place?.address ?? "주소를 확인해 주세요",
        category: "관광지",
        id: place?.contentId ?? "draft-place",
        name: place?.name ?? "장소를 확인해 주세요",
        photo: firstPhoto.source,
        region,
        stampApplied: true,
        visitDate: firstDetails.date.replaceAll("-", "."),
      },
      style: null,
      tags: [],
      theme: null,
      title: "",
    };
  }, [getPhotoDetails, photos]);

  const completeRecord = async (value: RecordEditorValue) => {
    if (photos.length === 0) {
      router.replace("/records/new/photos" as Href);
      return;
    }

    if (!ownerKey) {
      Alert.alert(
        "기록을 저장할 수 없어요",
        "기록 저장공간 준비가 끝난 뒤 다시 시도해 주세요.",
      );
      return;
    }

    if (saveRecordDraft.isPending) {
      return;
    }

    const draftPhotos: SaveLocalRecordDraftPhotoInput[] = [];
    for (const photo of photos) {
      const details = getPhotoDetails(photo.id);
      if (!details.place) {
        Alert.alert(
          "장소 확인이 필요해요",
          "모든 사진의 방문 장소를 먼저 확인해 주세요.",
          [
            {
              onPress: () => router.replace("/records/new/places" as Href),
              text: "확인",
            },
          ],
        );
        return;
      }

      draftPhotos.push({
        assetId: photo.assetId,
        date: details.date,
        dimensions: { height: photo.height, width: photo.width },
        place: details.place,
        sourceUri: photo.uri,
      });
    }

    try {
      discardTransientGps();
      const savedRecord = await saveRecordDraft.mutateAsync({
        notesByDate: Object.fromEntries(
          draftPhotos.map(({ date }) => [
            date,
            value.notes[`draft-day-${date}`] ?? null,
          ]),
        ),
        ownerKey,
        photos: draftPhotos,
        style: null,
        tags: value.tags,
        theme: null,
        title: value.title,
      });

      finishDraft();
      router.replace({
        params: { recordId: savedRecord.id },
        pathname: "/records/[recordId]",
      });
      Alert.alert("기록을 만들었어요", "여행 기록에서 바로 확인할 수 있어요.");
    } catch (error) {
      Alert.alert(
        "기록을 저장하지 못했어요",
        error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.",
      );
    }
  };

  if (photos.length === 0) {
    return null;
  }

  return (
    <Screen>
      <View style={styles.page}>
        <PageHeader
          onBackPress={() => router.back()}
          style={styles.header}
          title="기록 생성"
        />
        <RecordEditor
          initialTags={[]}
          initialTitle=""
          onSubmit={completeRecord}
          record={draftRecord}
          submitting={saveRecordDraft.isPending}
          submitLabel="기록 완료"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.lg,
  },
  page: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: 3,
  },
});
