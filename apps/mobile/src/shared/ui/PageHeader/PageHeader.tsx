import type { ComponentType } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import type { SvgProps } from "react-native-svg";

import { BackIcon } from "@/shared/assets/icons";
import { spacing } from "@/shared/config/theme";
import { AppText } from "@/shared/ui/AppText";
import { FloatingIconButton } from "@/shared/ui/FloatingIconButton";

export type PageHeaderProps = {
  actionAccessibilityLabel?: string;
  actionIcon?: ComponentType<SvgProps>;
  onActionPress?: () => void;
  onBackPress: () => void;
  style?: StyleProp<ViewStyle>;
  title: string;
};

export function PageHeader({
  actionAccessibilityLabel,
  actionIcon: ActionIcon,
  onActionPress,
  onBackPress,
  style,
  title,
}: PageHeaderProps) {
  return (
    <View style={[styles.header, style]}>
      <View style={styles.leading}>
        <FloatingIconButton
          accessibilityLabel="뒤로가기"
          icon={BackIcon}
          onPress={onBackPress}
        />
        <AppText
          lineBreakStrategyIOS="hangul-word"
          style={styles.title}
          variant="heading01"
        >
          {title}
        </AppText>
      </View>
      {ActionIcon && onActionPress && actionAccessibilityLabel ? (
        <FloatingIconButton
          accessibilityLabel={actionAccessibilityLabel}
          icon={ActionIcon}
          onPress={onActionPress}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    minHeight: 52,
    paddingVertical: spacing.xxs,
  },
  leading: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.md,
    minWidth: 0,
  },
  title: {
    flex: 1,
    minWidth: 0,
  },
});
