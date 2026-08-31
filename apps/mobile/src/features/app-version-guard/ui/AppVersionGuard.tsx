import * as Application from "expo-application";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { useCallback, useMemo, useState } from "react";
import { Linking, Modal, Platform, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppVersionQuery } from "@/entities/app-version";
import { resolveRequiredAppUpdate } from "@/features/app-version-guard/model/requiredAppUpdate";
import { radii, semanticColors, spacing } from "@/shared/config/theme";
import { AppText, PrimaryButton } from "@/shared/ui";

export function AppVersionGuard() {
  const { data: versionPolicy } = useAppVersionQuery();
  const [isOpeningStore, setIsOpeningStore] = useState(false);
  const [openStoreError, setOpenStoreError] = useState<string | null>(null);
  const installedVersion =
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
      ? null
      : Application.nativeApplicationVersion;
  const requiredUpdate = useMemo(
    () =>
      resolveRequiredAppUpdate(versionPolicy, installedVersion, Platform.OS),
    [installedVersion, versionPolicy],
  );

  const openStore = useCallback(async () => {
    if (!requiredUpdate || isOpeningStore) {
      return;
    }

    setIsOpeningStore(true);
    setOpenStoreError(null);

    try {
      await Linking.openURL(requiredUpdate.updateUrl);
    } catch {
      setOpenStoreError(
        "스토어를 열지 못했어요. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.",
      );
    } finally {
      setIsOpeningStore(false);
    }
  }, [isOpeningStore, requiredUpdate]);

  if (!requiredUpdate) {
    return null;
  }

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => undefined}
      presentationStyle="fullScreen"
      statusBarTranslucent
      visible
    >
      <SafeAreaView accessibilityViewIsModal style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.symbol}>
            <AppText style={styles.symbolText} variant="heading02">
              ↑
            </AppText>
          </View>

          <View style={styles.copy}>
            <AppText style={styles.title} variant="heading03">
              업데이트가 필요해요
            </AppText>
            <AppText
              style={styles.description}
              tone="secondary"
              variant="body01"
            >
              더 안정적인 Tripic 이용을 위해 최신 버전으로 업데이트해 주세요.
            </AppText>
          </View>

          <View style={styles.action}>
            <PrimaryButton
              label="업데이트하러 가기"
              loading={isOpeningStore}
              onPress={() => void openStore()}
            />
            {openStoreError ? (
              <AppText
                accessibilityLiveRegion="polite"
                style={styles.error}
                variant="caption02"
              >
                {openStoreError}
              </AppText>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: semanticColors.background.surface,
    flex: 1,
  },
  content: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  symbol: {
    alignItems: "center",
    backgroundColor: semanticColors.brand.primary,
    borderRadius: radii.pill,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  symbolText: {
    color: semanticColors.text.inverse,
    lineHeight: 34,
  },
  copy: {
    alignItems: "center",
    marginTop: spacing.xl,
  },
  title: {
    textAlign: "center",
  },
  description: {
    marginTop: spacing.sm,
    maxWidth: 320,
    textAlign: "center",
  },
  action: {
    marginTop: spacing.xxl,
    maxWidth: 360,
    width: "100%",
  },
  error: {
    color: semanticColors.feedback.error.level1,
    marginTop: spacing.sm,
    textAlign: "center",
  },
});
