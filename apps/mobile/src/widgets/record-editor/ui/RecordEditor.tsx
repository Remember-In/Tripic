import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { recordTagOptions, type TravelRecord } from "@/entities/travel-record";
import {
  palette,
  radii,
  semanticColors,
  spacing,
  typography,
} from "@/shared/config/theme";
import { AppText, PrimaryButton } from "@/shared/ui";

export type RecordEditorValue = {
  notes: Readonly<Record<string, string>>;
  tags: readonly string[];
  title: string;
};

export type RecordEditorProps = {
  initialTags?: readonly string[];
  initialTitle?: string;
  onSubmit: (value: RecordEditorValue) => void;
  record: TravelRecord;
  submitting?: boolean;
  submitLabel?: string;
  titlePlaceholder?: string;
};

export function RecordEditor({
  record,
  initialTags = record.tags,
  initialTitle = record.title,
  onSubmit,
  submitLabel = "수정 완료",
  submitting = false,
  titlePlaceholder = "이 기록의 제목을 입력해 주세요.",
}: RecordEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(record.days.map((day) => [day.id, day.note ?? ""])),
  );
  const [selectedTags, setSelectedTags] = useState<string[]>([...initialTags]);

  const updateNote = (dayId: string, value: string) => {
    setNotes((current) => ({ ...current, [dayId]: value }));
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((selectedTag) => selectedTag !== tag)
        : [...current, tag],
    );
  };

  const submit = () => {
    if (submitting) {
      return;
    }

    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      Alert.alert("여행 이름을 입력해 주세요");
      return;
    }

    onSubmit({ notes, tags: selectedTags, title: normalizedTitle });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TextInput
          accessibilityLabel="여행 기록 제목"
          maxLength={50}
          onChangeText={setTitle}
          placeholder={titlePlaceholder}
          placeholderTextColor={semanticColors.text.placeholder}
          selectionColor={semanticColors.brand.primary}
          style={[typography.subtitle03, styles.titleInput]}
          value={title}
        />

        <View style={styles.days}>
          {record.days.map((day) => (
            <View key={day.id} style={styles.dayCard}>
              <View style={styles.dayTitleRow}>
                <AppText variant="subtitle02">{day.day}일차</AppText>
                <AppText tone="placeholder" variant="subtitle04">
                  {day.date}
                </AppText>
              </View>

              <View style={styles.photos}>
                {day.photos.map((photo, photoIndex) => (
                  <View
                    key={`${day.id}-${photoIndex}`}
                    style={styles.photoWrapper}
                  >
                    <Image
                      resizeMode="cover"
                      source={photo}
                      style={styles.photo}
                    />
                  </View>
                ))}
              </View>

              <TextInput
                accessibilityLabel={`${day.day}일차 여행 메모`}
                maxLength={5_000}
                multiline
                onChangeText={(value) => updateNote(day.id, value)}
                placeholder="여행 메모를 입력해 주세요"
                placeholderTextColor={semanticColors.text.placeholder}
                selectionColor={semanticColors.brand.primary}
                style={[typography.caption01, styles.noteInput]}
                value={notes[day.id]}
              />
            </View>
          ))}
        </View>

        <View style={styles.tagsSection}>
          <AppText
            style={styles.sectionTitle}
            tone="tertiary"
            variant="subtitle03"
          >
            해시태그
          </AppText>
          <View style={styles.tagsCard}>
            {recordTagOptions.map((tag) => {
              const isSelected = selectedTags.includes(tag);

              return (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                  key={tag}
                  onPress={() => toggleTag(tag)}
                  style={({ pressed }) => [
                    styles.tag,
                    isSelected ? styles.selectedTag : styles.unselectedTag,
                    pressed && styles.pressed,
                  ]}
                >
                  <AppText
                    tone={isSelected ? "inverse" : "placeholder"}
                    variant="caption02"
                  >
                    {tag}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={submitLabel}
          loading={submitting}
          onPress={submit}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
  titleInput: {
    backgroundColor: semanticColors.background.surface,
    borderRadius: radii.large,
    color: semanticColors.text.primary,
    minHeight: 51,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  days: {
    gap: spacing.lg,
  },
  dayCard: {
    backgroundColor: semanticColors.background.surface,
    borderRadius: radii.large,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  dayTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  photos: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  photoWrapper: {
    borderRadius: radii.medium,
    height: 72,
    overflow: "hidden",
    width: 72,
  },
  photo: {
    height: "100%",
    width: "100%",
  },
  noteInput: {
    backgroundColor: palette.primary[50],
    borderRadius: radii.small,
    color: semanticColors.text.secondary,
    marginTop: spacing.lg,
    minHeight: 43,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    textAlignVertical: "center",
  },
  tagsSection: {
    gap: spacing.xs,
  },
  sectionTitle: {
    paddingLeft: spacing.sm,
  },
  tagsCard: {
    backgroundColor: semanticColors.background.surface,
    borderRadius: radii.large,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 18,
  },
  tag: {
    alignItems: "center",
    borderRadius: radii.small,
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  selectedTag: {
    backgroundColor: semanticColors.brand.primary,
    borderColor: semanticColors.brand.primary,
    borderWidth: 0.5,
  },
  unselectedTag: {
    backgroundColor: semanticColors.background.surface,
    borderColor: semanticColors.border.disabled,
    borderWidth: 0.5,
  },
  footer: {
    paddingTop: spacing.xxs,
  },
  pressed: {
    opacity: 0.72,
  },
});
