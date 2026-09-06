import { updateMeSchema } from "@tripic/shared";
import { useRouter, type Href } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { updateMe } from "@/entities/user";
import { useAuthSession } from "@/features/auth-session";
import {
  radii,
  semanticColors,
  spacing,
  typography,
} from "@/shared/config/theme";
import { AppText, PrimaryButton, Screen } from "@/shared/ui";

export function NicknamePage() {
  const router = useRouter();
  const { replaceUser, status } = useAuthSession();
  const [nickname, setNickname] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null,
  );

  const validation = useMemo(
    () => updateMeSchema.safeParse({ nickname }),
    [nickname],
  );

  const submitNickname = async () => {
    if (isSubmitting) {
      return;
    }

    if (!validation.success) {
      setValidationMessage("닉네임은 공백을 제외하고 2~20자로 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setValidationMessage(null);

    try {
      const updatedUser = await updateMe(validation.data);
      replaceUser(updatedUser);
      router.replace("/" as Href);
    } catch (error) {
      Alert.alert(
        "닉네임을 저장하지 못했어요",
        error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? spacing.lg : 0}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
        >
          <View style={styles.content}>
            <View style={styles.heading}>
              <AppText variant="heading02">어떻게 불러드릴까요?</AppText>
              <AppText tone="tertiary" variant="body02">
                Tripic에서 사용할 닉네임을 입력해 주세요.
              </AppText>
            </View>

            <View style={styles.fieldGroup}>
              <TextInput
                accessibilityLabel="닉네임"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
                maxLength={20}
                onChangeText={(value) => {
                  setNickname(value);
                  setValidationMessage(null);
                }}
                onSubmitEditing={() => void submitNickname()}
                placeholder="2~20자"
                placeholderTextColor={semanticColors.text.disabled}
                returnKeyType="done"
                selectionColor={semanticColors.brand.primary}
                style={styles.input}
                value={nickname}
              />
              {validationMessage ? (
                <AppText
                  accessibilityLiveRegion="polite"
                  style={styles.validationMessage}
                  variant="caption02"
                >
                  {validationMessage}
                </AppText>
              ) : null}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            disabled={status !== "authenticated"}
            label="시작하기"
            loading={isSubmitting}
            onPress={() => void submitNickname()}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: {
    marginHorizontal: spacing.md,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: 72,
  },
  fieldGroup: {
    gap: spacing.xs,
    marginTop: spacing.xxl,
  },
  heading: {
    gap: spacing.sm,
  },
  input: {
    ...typography.body01,
    backgroundColor: semanticColors.background.surface,
    borderColor: semanticColors.border.default,
    borderRadius: radii.medium,
    borderWidth: 1,
    color: semanticColors.text.primary,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  keyboardView: {
    flex: 1,
    paddingBottom: spacing.md,
  },
  scrollContent: {
    flexGrow: 1,
  },
  scrollView: {
    flex: 1,
  },
  validationMessage: {
    color: semanticColors.feedback.error.level1,
    paddingHorizontal: spacing.xs,
  },
});
