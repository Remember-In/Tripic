import { type Href, useRouter } from "expo-router";
import { useMemo } from "react";
import { Alert, StyleSheet, View } from "react-native";

import {
  gyeongjuTravelRecord,
  type ItineraryDay,
  type TravelRecord,
} from "@/entities/travel-record";
import { DEFAULT_APP_CONFIG, useAppConfigQuery } from "@/entities/app-config";
import {
  mapRecordTripThemeToRecordTheme,
  mapRecordVoiceThemeToDiaryStyle,
  placeFixtures,
  type DraftPhoto,
  useCreateRecordSession,
} from "@/features/create-record-session";
import { SettingsIcon } from "@/shared/assets/icons";
import { spacing } from "@/shared/config/theme";
import { PageHeader, Screen } from "@/shared/ui";
import { RecordEditor, type RecordEditorValue } from "@/widgets/record-editor";

const completedRecordRoute = "/records/draft" as Href;
const recordSettingsRoute = "/records/new/ai-settings?returnTo=compose" as Href;

const tripThemeLabels = {
  completion: "지역 완주",
  food: "맛과 체험",
  history: "역사와 문화",
  nature: "자연과 풍경",
} as const;

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
  const { data: appConfig = DEFAULT_APP_CONFIG } = useAppConfigQuery();
  const { getPhotoDetails, photos, setCompletedRecord, tripTheme, voiceTheme } =
    useCreateRecordSession();

  const draftRecord = useMemo<TravelRecord>(() => {
    if (photos.length === 0) {
      return {
        ...gyeongjuTravelRecord,
        id: "draft",
        tags: [],
        title: "",
      };
    }

    const firstPhoto = photos[0];
    const firstDetails = getPhotoDetails(firstPhoto.id);
    const place = placeFixtures.find(
      (candidate) => candidate.name === firstDetails.place,
    );
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
        category: tripThemeLabels[tripTheme],
        id: "draft-place",
        name: firstDetails.place,
        photo: firstPhoto.source,
        region,
        stampApplied: true,
        visitDate: firstDetails.date.replaceAll("-", "."),
      },
      style: mapRecordVoiceThemeToDiaryStyle(voiceTheme),
      tags: [],
      theme: mapRecordTripThemeToRecordTheme(tripTheme),
      title: "",
    };
  }, [getPhotoDetails, photos, tripTheme, voiceTheme]);

  const completeRecord = (value: RecordEditorValue) => {
    if (photos.length === 0) {
      router.replace("/records/new/photos" as Href);
      return;
    }

    setCompletedRecord({
      ...draftRecord,
      days: draftRecord.days.map((day) => ({
        ...day,
        note: value.notes[day.id],
      })),
      tags: value.tags,
      title: value.title,
    });

    Alert.alert("기록을 만들었어요", "여행 기록에서 바로 확인할 수 있어요.", [
      {
        onPress: () => router.replace(completedRecordRoute),
        text: "확인",
      },
    ]);
  };

  if (photos.length === 0) {
    return null;
  }

  return (
    <Screen>
      <View style={styles.page}>
        <PageHeader
          actionAccessibilityLabel="기록 생성 설정"
          actionIcon={SettingsIcon}
          onActionPress={() => router.push(recordSettingsRoute)}
          onBackPress={() => router.back()}
          style={styles.header}
          title="기록 생성"
        />
        <RecordEditor
          aiGenerationEnabled={appConfig.features.aiDiary}
          generateNoteForDay={(day) => {
            const topic = tripThemeLabels[tripTheme];

            if (voiceTheme === "documentary") {
              return `${day}일차에는 ${topic}을 중심으로 여행했다.`;
            }

            if (voiceTheme === "friendly") {
              return `${day}일차 ${topic}, 사진보다 더 좋았다! 다음에 또 와야지.`;
            }

            return `${day}일차, ${topic}을 마주하며 오래 남을 여행의 순간을 기록했다.`;
          }}
          initialTags={[]}
          initialTitle=""
          onSubmit={completeRecord}
          record={draftRecord}
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
