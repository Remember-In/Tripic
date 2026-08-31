import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import {
  DateSelectedIcon,
  RemoveIcon,
  SheetCloseBackgroundIcon,
  SheetConfirmIcon,
} from "@/shared/assets/photo-flow";
import {
  palette,
  radii,
  semanticColors,
  shadows,
  spacing,
} from "@/shared/config/theme";
import { AppText } from "@/shared/ui";

type VisitDateSheetProps = {
  onClose: () => void;
  onConfirm: (value: string) => void;
  value: string;
  visible: boolean;
};

type CalendarDate = {
  day: number;
  month: number;
  year: number;
};

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const weekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function parseDate(value: string): CalendarDate {
  const [year = 2025, month = 4, day = 18] = value.split("-").map(Number);

  return { day, month: month - 1, year };
}

function formatDate(date: CalendarDate) {
  return `${date.year}-${String(date.month + 1).padStart(2, "0")}-${String(
    date.day,
  ).padStart(2, "0")}`;
}

export function VisitDateSheet({
  onClose,
  onConfirm,
  value,
  visible,
}: VisitDateSheetProps) {
  const parsedDate = parseDate(value);
  const [selectedDate, setSelectedDate] = useState(parsedDate);
  const [visibleMonth, setVisibleMonth] = useState({
    month: parsedDate.month,
    year: parsedDate.year,
  });

  useEffect(() => {
    if (!visible) {
      return;
    }

    const nextDate = parseDate(value);
    setSelectedDate(nextDate);
    setVisibleMonth({ month: nextDate.month, year: nextDate.year });
  }, [value, visible]);

  const days = useMemo(() => {
    const firstWeekday = new Date(
      visibleMonth.year,
      visibleMonth.month,
      1,
    ).getDay();
    const lastDay = new Date(
      visibleMonth.year,
      visibleMonth.month + 1,
      0,
    ).getDate();

    return Array.from({ length: 42 }, (_, index) => {
      const day = index - firstWeekday + 1;
      return day > 0 && day <= lastDay ? day : null;
    });
  }, [visibleMonth]);

  const shiftMonth = (offset: number) => {
    const nextMonth = new Date(
      visibleMonth.year,
      visibleMonth.month + offset,
      1,
    );
    setVisibleMonth({
      month: nextMonth.getMonth(),
      year: nextMonth.getFullYear(),
    });
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityLabel="방문 일자 선택 닫기"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.sheet, shadows.sheet]}>
          <View style={styles.grabber} />
          <View style={styles.sheetHeader}>
            <Pressable
              accessibilityLabel="방문 일자 선택 취소"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.sheetHeaderButton}
            >
              <SheetCloseBackgroundIcon
                height={44}
                style={StyleSheet.absoluteFill}
                width={44}
              />
              <RemoveIcon height={16} width={16} />
            </Pressable>
            <AppText variant="subtitle03">방문 일자</AppText>
            <Pressable
              accessibilityLabel="방문 일자 선택 완료"
              accessibilityRole="button"
              onPress={() => onConfirm(formatDate(selectedDate))}
              style={styles.sheetHeaderButton}
            >
              <SheetConfirmIcon height={44} width={44} />
            </Pressable>
          </View>

          <View style={[styles.calendarCard, shadows.floating]}>
            <View style={styles.calendarHeader}>
              <AppText variant="subtitle03">
                {monthNames[visibleMonth.month]} {visibleMonth.year}
              </AppText>
              <View style={styles.monthControls}>
                <Pressable
                  accessibilityLabel="이전 달"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => shiftMonth(-1)}
                >
                  <AppText style={styles.chevron}>‹</AppText>
                </Pressable>
                <Pressable
                  accessibilityLabel="다음 달"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => shiftMonth(1)}
                >
                  <AppText style={styles.chevron}>›</AppText>
                </Pressable>
              </View>
            </View>

            <View style={styles.weekdayRow}>
              {weekdays.map((weekday) => (
                <AppText
                  key={weekday}
                  style={styles.weekday}
                  tone="disabled"
                  variant="caption02"
                >
                  {weekday}
                </AppText>
              ))}
            </View>

            <View style={styles.daysGrid}>
              {days.map((day, index) => {
                const isSelected =
                  day !== null &&
                  selectedDate.day === day &&
                  selectedDate.month === visibleMonth.month &&
                  selectedDate.year === visibleMonth.year;

                return (
                  <Pressable
                    accessibilityLabel={
                      day ? `${visibleMonth.month + 1}월 ${day}일` : undefined
                    }
                    accessibilityRole={day ? "button" : undefined}
                    disabled={day === null}
                    key={`${visibleMonth.year}-${visibleMonth.month}-${index}`}
                    onPress={() => {
                      if (day) {
                        setSelectedDate({
                          day,
                          month: visibleMonth.month,
                          year: visibleMonth.year,
                        });
                      }
                    }}
                    style={styles.dayCell}
                  >
                    {isSelected ? (
                      <DateSelectedIcon
                        height={44}
                        style={StyleSheet.absoluteFill}
                        width={44}
                      />
                    ) : null}
                    {day ? (
                      <AppText
                        style={isSelected ? styles.selectedDayText : undefined}
                        variant="button04"
                      >
                        {day}
                      </AppText>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  calendarCard: {
    backgroundColor: semanticColors.background.surface,
    borderRadius: 13,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    overflow: "hidden",
    paddingBottom: spacing.sm,
  },
  calendarHeader: {
    alignItems: "center",
    flexDirection: "row",
    height: 48,
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
  },
  chevron: {
    color: semanticColors.feedback.information.level1,
    fontSize: 36,
    lineHeight: 40,
  },
  dayCell: {
    alignItems: "center",
    flexBasis: "14.2857%",
    height: 44,
    justifyContent: "center",
    maxWidth: "14.2857%",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.xs,
  },
  grabber: {
    alignSelf: "center",
    backgroundColor: palette.gray[300],
    borderRadius: radii.pill,
    height: 5,
    marginTop: 5,
    width: 36,
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  monthControls: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.lg,
  },
  selectedDayText: {
    color: semanticColors.feedback.information.level1,
  },
  sheet: {
    alignSelf: "center",
    backgroundColor: semanticColors.background.surface,
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    height: "69%",
    minHeight: 500,
    width: "92%",
  },
  sheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    height: 60,
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
  },
  sheetHeaderButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  weekday: {
    flexBasis: "14.2857%",
    maxWidth: "14.2857%",
    textAlign: "center",
  },
  weekdayRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.xs,
  },
});
