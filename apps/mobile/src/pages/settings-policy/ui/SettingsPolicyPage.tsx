import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";

import { palette, radii, semanticColors, spacing } from "@/shared/config/theme";
import { AppText, PageHeader, Screen } from "@/shared/ui";

import type { PolicyDocument } from "../model/policyDocuments";

type SettingsPolicyPageProps = {
  document: PolicyDocument;
};

export function SettingsPolicyPage({ document }: SettingsPolicyPageProps) {
  const router = useRouter();

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/settings");
  };

  return (
    <Screen>
      <View style={styles.page}>
        <PageHeader onBackPress={goBack} title={document.title} />

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.introduction}>
            {document.badge ? (
              <View style={styles.badge}>
                <AppText
                  selectable
                  style={styles.badgeText}
                  variant="caption02"
                >
                  {document.badge}
                </AppText>
              </View>
            ) : null}

            <AppText selectable tone="secondary" variant="body02">
              {document.description}
            </AppText>
            <View style={styles.effectiveDate}>
              <AppText tone="tertiary" variant="caption02">
                시행일
              </AppText>
              <AppText selectable variant="caption02">
                {document.effectiveDate}
              </AppText>
            </View>
          </View>

          {document.sections.map((section) => (
            <View key={section.title} style={styles.section}>
              <AppText selectable variant="subtitle03">
                {section.title}
              </AppText>

              {section.paragraphs?.map((paragraph) => (
                <AppText
                  key={paragraph}
                  selectable
                  tone="secondary"
                  variant="body02"
                >
                  {paragraph}
                </AppText>
              ))}

              {section.bullets?.map((bullet) => (
                <View key={bullet} style={styles.bulletRow}>
                  <AppText
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                    style={styles.bullet}
                    tone="tertiary"
                    variant="body02"
                  >
                    •
                  </AppText>
                  <AppText
                    accessibilityLabel={bullet}
                    selectable
                    style={styles.bulletCopy}
                    tone="secondary"
                    variant="body02"
                  >
                    {bullet}
                  </AppText>
                </View>
              ))}

              {section.fields ? (
                <View style={styles.fields}>
                  {section.fields.map((field) => (
                    <View key={field.label} style={styles.fieldRow}>
                      <AppText
                        style={styles.fieldLabel}
                        tone="tertiary"
                        variant="caption02"
                      >
                        {field.label}
                      </AppText>
                      <AppText
                        selectable
                        style={styles.fieldValue}
                        tone="secondary"
                        variant="body02"
                      >
                        {field.value}
                      </AppText>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    backgroundColor: palette.secondary[50],
    borderColor: palette.secondary[300],
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    color: palette.secondary[900],
  },
  bullet: {
    width: spacing.sm,
  },
  bulletCopy: {
    flex: 1,
  },
  bulletRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.xxs,
  },
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.md,
  },
  effectiveDate: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  fieldLabel: {
    width: 92,
  },
  fieldRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
  },
  fields: {
    backgroundColor: semanticColors.background.canvas,
    borderRadius: radii.medium,
    gap: spacing.sm,
    padding: spacing.md,
  },
  fieldValue: {
    flex: 1,
  },
  introduction: {
    backgroundColor: semanticColors.background.surface,
    borderRadius: radii.large,
    gap: spacing.md,
    padding: spacing.lg,
  },
  page: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: 3,
  },
  section: {
    backgroundColor: semanticColors.background.surface,
    borderRadius: radii.large,
    gap: spacing.sm,
    padding: spacing.lg,
  },
});
