import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import {
  type RecordTripTheme,
  type RecordVoiceTheme,
  useCreateRecordSession,
} from "@/features/create-record-session";
import {
  RadioSelectedIcon,
  RadioUnselectedIcon,
} from "@/shared/assets/photo-flow";
import { radii, semanticColors, spacing } from "@/shared/config/theme";
import { AppText, PageHeader, PrimaryButton, Screen } from "@/shared/ui";

const composeRoute = "/records/new/compose" as Href;

const voiceOptions: readonly {
  description: string;
  label: string;
  value: RecordVoiceTheme;
}[] = [
  {
    description: "예) 동궁과 월지는 신라 왕궁의 별궁이었다고 한다.",
    label: "다큐 내레이션체",
    value: "documentary",
  },
  {
    description: "예) 석양이 물드는 경주 안압지를 걸었다.",
    label: "감성 에세이체",
    value: "emotional",
  },
  {
    description: "예) 진짜 사진보다 열배는 이쁘다! ㅋㅋ 다음에도 오고 싶다",
    label: "친구 대화체",
    value: "friendly",
  },
];

const tripThemeOptions: readonly {
  label: string;
  value: RecordTripTheme;
}[] = [
  { label: "자연・풍경", value: "nature" },
  { label: "역사・문화", value: "history" },
  { label: "음식・체험", value: "food" },
  { label: "지역 완주", value: "completion" },
];

export function AiRecordSettingsPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const { setTripTheme, setVoiceTheme, tripTheme, voiceTheme } =
    useCreateRecordSession();
  const returnTo = Array.isArray(params.returnTo)
    ? params.returnTo[0]
    : params.returnTo;

  const completeSettings = () => {
    if (returnTo === "compose" && router.canGoBack()) {
      router.back();
      return;
    }

    router.push(composeRoute);
  };

  return (
    <Screen>
      <View style={styles.container}>
        <PageHeader
          onBackPress={() => router.back()}
          title="AI 기록 생성 설정"
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <AppText
              style={styles.sectionLabel}
              tone="tertiary"
              variant="subtitle03"
            >
              테마
            </AppText>
            <View style={styles.optionCard}>
              {voiceOptions.map((option) => (
                <SelectionRow
                  description={option.description}
                  key={option.value}
                  label={option.label}
                  onPress={() => setVoiceTheme(option.value)}
                  selected={voiceTheme === option.value}
                />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <AppText
              style={styles.sectionLabel}
              tone="tertiary"
              variant="subtitle03"
            >
              테마
            </AppText>
            <View style={styles.optionCard}>
              {tripThemeOptions.map((option) => (
                <SelectionRow
                  key={option.value}
                  label={option.label}
                  onPress={() => setTripTheme(option.value)}
                  selected={tripTheme === option.value}
                />
              ))}
            </View>
          </View>
        </ScrollView>

        <PrimaryButton
          label="설정 완료"
          onPress={completeSettings}
          style={styles.bottomButton}
        />
      </View>
    </Screen>
  );
}

type SelectionRowProps = {
  description?: string;
  label: string;
  onPress: () => void;
  selected: boolean;
};

function SelectionRow({
  description,
  label,
  onPress,
  selected,
}: SelectionRowProps) {
  const RadioIcon = selected ? RadioSelectedIcon : RadioUnselectedIcon;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}
    >
      <View style={styles.optionCopy}>
        <AppText tone="secondary" variant="subtitle03">
          {label}
        </AppText>
        {description ? (
          <AppText tone="tertiary" variant="body02">
            {description}
          </AppText>
        ) : null}
      </View>
      <RadioIcon height={16} width={16} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bottomButton: {
    bottom: 0,
    left: spacing.md,
    position: "absolute",
    right: spacing.md,
    width: "auto",
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  optionCard: {
    backgroundColor: semanticColors.background.surface,
    borderRadius: radii.large,
    gap: spacing.md,
    overflow: "hidden",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  optionCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  optionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 44,
  },
  pressed: {
    opacity: 0.72,
  },
  scrollContent: {
    gap: spacing.lg,
    paddingBottom: 100,
    paddingTop: spacing.lg,
  },
  section: {
    gap: spacing.xs,
  },
  sectionLabel: {
    paddingLeft: spacing.sm,
  },
});
