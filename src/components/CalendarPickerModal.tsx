import React, { useState, useMemo, useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  RotateCcw,
} from 'lucide-react-native';
import Animated, {
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Press } from '../motion';
import { C, shadow } from '../theme';
import { useLanguage } from '../i18n';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const toIso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

interface CalendarPickerModalProps {
  visible: boolean;
  startDate?: string;
  endDate?: string;
  onApply: (start: string, end: string) => void;
  onClose: () => void;
  title?: string;
  allowRange?: boolean;
}

export function CalendarPickerModal({
  visible,
  startDate = '',
  endDate = '',
  onApply,
  onClose,
  title,
  allowRange = true,
}: CalendarPickerModalProps) {
  const { tr } = useLanguage();

  const initialDate = useMemo(() => {
    if (startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return new Date(`${startDate}T12:00:00`);
    }
    return new Date();
  }, [startDate]);

  const [year, setYear] = useState<number>(initialDate.getFullYear());
  const [month, setMonth] = useState<number>(initialDate.getMonth());
  const [rangeStart, setRangeStart] = useState<string>(startDate);
  const [rangeEnd, setRangeEnd] = useState<string>(endDate);
  const [viewMode, setViewMode] = useState<'days' | 'monthYear'>('days');
  const [yearPageBase, setYearPageBase] = useState<number>(
    Math.floor(initialDate.getFullYear() / 12) * 12
  );

  useEffect(() => {
    if (visible) {
      setRangeStart(startDate);
      setRangeEnd(endDate);
      setViewMode('days');
      const d = startDate ? new Date(`${startDate}T12:00:00`) : new Date();
      if (!isNaN(d.getTime())) {
        setYear(d.getFullYear());
        setMonth(d.getMonth());
        setYearPageBase(Math.floor(d.getFullYear() / 12) * 12);
      }
    }
  }, [visible, startDate, endDate]);

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const todayIso = useMemo(() => {
    const now = new Date();
    return toIso(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const calendarGrid = useMemo(() => {
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
    const totalDays = new Date(year, month + 1, 0).getDate();

    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    const rows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }
    return rows;
  }, [year, month]);

  const yearChoices = useMemo(
    () => Array.from({ length: 12 }, (_, idx) => yearPageBase + idx),
    [yearPageBase]
  );

  const handleSelectDay = (dayIso: string) => {
    if (!allowRange) {
      setRangeStart(dayIso);
      setRangeEnd(dayIso);
      return;
    }

    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(dayIso);
      setRangeEnd('');
    } else {
      if (dayIso < rangeStart) {
        setRangeEnd(rangeStart);
        setRangeStart(dayIso);
      } else {
        setRangeEnd(dayIso);
      }
    }
  };

  const handleApply = () => {
    if (rangeStart && !rangeEnd) {
      onApply(rangeStart, rangeStart);
    } else {
      onApply(rangeStart, rangeEnd);
    }
    onClose();
  };

  const handleClear = () => {
    setRangeStart('');
    setRangeEnd('');
    onApply('', '');
    onClose();
  };

  const setPreset = (type: 'today' | 'week' | 'month' | 'year') => {
    const now = new Date();
    const today = toIso(now.getFullYear(), now.getMonth(), now.getDate());
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    setViewMode('days');

    if (type === 'today') {
      setRangeStart(today);
      setRangeEnd(today);
    } else if (type === 'week') {
      const past = new Date(now.getTime() - 6 * 86400000);
      setRangeStart(toIso(past.getFullYear(), past.getMonth(), past.getDate()));
      setRangeEnd(today);
    } else if (type === 'month') {
      const first = toIso(now.getFullYear(), now.getMonth(), 1);
      setRangeStart(first);
      setRangeEnd(today);
    } else if (type === 'year') {
      const first = toIso(now.getFullYear(), 0, 1);
      setRangeStart(first);
      setRangeEnd(today);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissOverlay} onPress={onClose} />
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={styles.cardContainer}
        >
          {/* Clean, Light Surface Card (Not overly colored) */}
          <View style={styles.lightCard}>
            {/* Header: Title & Close */}
            <View style={styles.topRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.headerIconBadge}>
                  <CalendarDays size={18} color={C.primary} />
                </View>
                <Text style={styles.headerTitle}>
                  {title ||
                    (allowRange
                      ? tr('Select Date Range', 'ជ្រើសរើសចន្លោះកាលបរិច្ឆេទ')
                      : tr('Select Date', 'ជ្រើសរើសកាលបរិច្ឆេទ'))}
                </Text>
              </View>
              <Press onPress={onClose} style={styles.iconCircleBtn}>
                <X size={18} color={C.muted} />
              </Press>
            </View>

            {/* Quick Presets */}
            {allowRange && (
              <View style={styles.presetsRow}>
                <Press
                  onPress={() => setPreset('today')}
                  style={styles.presetChip}
                >
                  <Text style={styles.presetChipText}>{tr('Today', 'ថ្ងៃនេះ')}</Text>
                </Press>
                <Press
                  onPress={() => setPreset('week')}
                  style={styles.presetChip}
                >
                  <Text style={styles.presetChipText}>{tr('7 Days', '៧ ថ្ងៃ')}</Text>
                </Press>
                <Press
                  onPress={() => setPreset('month')}
                  style={styles.presetChip}
                >
                  <Text style={styles.presetChipText}>{tr('This Month', 'ខែនេះ')}</Text>
                </Press>
                <Press
                  onPress={() => setPreset('year')}
                  style={styles.presetChip}
                >
                  <Text style={styles.presetChipText}>{tr('This Year', 'ឆ្នាំនេះ')}</Text>
                </Press>
              </View>
            )}

            {/* Month & Year Navigation Bar with Interactive Month/Year Picker Toggle */}
            <View style={styles.monthNavRow}>
              <Press
                onPress={() => {
                  if (viewMode === 'days') prevMonth();
                  else setYearPageBase((b) => b - 12);
                }}
                style={styles.navChevron}
              >
                <ChevronLeft size={20} color={C.text} />
              </Press>

              <Press
                onPress={() => {
                  setYearPageBase(Math.floor(year / 12) * 12);
                  setViewMode((v) => (v === 'days' ? 'monthYear' : 'days'));
                }}
                style={[
                  styles.monthYearTrigger,
                  viewMode === 'monthYear' && styles.monthYearTriggerActive,
                ]}
              >
                <Text
                  style={[
                    styles.monthLabel,
                    viewMode === 'monthYear' && { color: C.primary },
                  ]}
                >
                  {MONTH_NAMES[month]} {year}
                </Text>
                {viewMode === 'monthYear' ? (
                  <ChevronUp size={16} color={C.primary} />
                ) : (
                  <ChevronDown size={16} color={C.muted} />
                )}
              </Press>

              <Press
                onPress={() => {
                  if (viewMode === 'days') nextMonth();
                  else setYearPageBase((b) => b + 12);
                }}
                style={styles.navChevron}
              >
                <ChevronRight size={20} color={C.text} />
              </Press>
            </View>

            {viewMode === 'monthYear' ? (
              /* Fast Month & Year Selector View */
              <Animated.View
                entering={FadeIn.duration(160)}
                style={styles.monthYearContainer}
              >
                {/* Year Grid */}
                <Text style={styles.pickerSubLabel}>
                  {tr('Pick Year', 'ជ្រើសរើសឆ្នាំ')} ({yearChoices[0]} –{' '}
                  {yearChoices[yearChoices.length - 1]})
                </Text>
                <View style={styles.yearGrid}>
                  {yearChoices.map((y) => {
                    const active = y === year;
                    return (
                      <Press
                        key={y}
                        onPress={() => setYear(y)}
                        style={[
                          styles.yearCell,
                          active && styles.yearCellActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.yearCellText,
                            active && styles.yearCellTextActive,
                          ]}
                        >
                          {y}
                        </Text>
                      </Press>
                    );
                  })}
                </View>

                {/* Month Grid */}
                <Text style={[styles.pickerSubLabel, { marginTop: 12 }]}>
                  {tr('Pick Month', 'ជ្រើសរើសខែ')}
                </Text>
                <View style={styles.monthGrid}>
                  {SHORT_MONTHS.map((mName, mIdx) => {
                    const active = mIdx === month;
                    return (
                      <Press
                        key={mName}
                        onPress={() => {
                          setMonth(mIdx);
                          setViewMode('days');
                        }}
                        style={[
                          styles.monthCell,
                          active && styles.monthCellActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.monthCellText,
                            active && styles.monthCellTextActive,
                          ]}
                        >
                          {mName}
                        </Text>
                      </Press>
                    );
                  })}
                </View>
              </Animated.View>
            ) : (
              /* Standard Calendar Days View */
              <Animated.View entering={FadeIn.duration(160)}>
                {/* Weekday Row */}
                <View style={styles.weekdayRow}>
                  {WEEK_DAYS.map((d) => (
                    <View key={d} style={styles.weekdayCell}>
                      <Text style={styles.weekdayText}>{d}</Text>
                    </View>
                  ))}
                </View>

                {/* Days Grid */}
                <View style={styles.gridContainer}>
                  {calendarGrid.map((row, rIdx) => (
                    <View key={rIdx} style={styles.gridRow}>
                      {row.map((dayNum, cIdx) => {
                        if (dayNum === null) {
                          return <View key={cIdx} style={styles.dayCellEmpty} />;
                        }
                        const cellIso = toIso(year, month, dayNum);
                        const isStart = cellIso === rangeStart;
                        const isEnd = cellIso === rangeEnd;
                        const isSelected = isStart || isEnd;
                        const inRange =
                          rangeStart &&
                          rangeEnd &&
                          cellIso > rangeStart &&
                          cellIso < rangeEnd;
                        const isToday = cellIso === todayIso;

                        return (
                          <Pressable
                            key={cIdx}
                            onPress={() => handleSelectDay(cellIso)}
                            style={[
                              styles.dayCell,
                              inRange && styles.dayCellInRange,
                            ]}
                          >
                            <View
                              style={[
                                styles.dayCircle,
                                isSelected && styles.dayCircleSelected,
                                isToday && !isSelected && styles.dayCircleToday,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.dayNumberText,
                                  inRange && styles.dayNumberTextInRange,
                                  isSelected && styles.dayNumberTextSelected,
                                  isToday && !isSelected && styles.dayNumberTextToday,
                                ]}
                              >
                                {dayNum}
                              </Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}

            {/* Selected Range Summary */}
            <View style={styles.selectionSummary}>
              <Text style={styles.summaryLabel}>
                {rangeStart ? (
                  rangeEnd && rangeEnd !== rangeStart ? (
                    `${rangeStart}  →  ${rangeEnd}`
                  ) : (
                    rangeStart
                  )
                ) : (
                  tr('Tap a date above to select', 'ចុចជ្រើសរើសកាលបរិច្ឆេទខាងលើ')
                )}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              <Press onPress={handleClear} style={styles.clearBtn}>
                <RotateCcw size={15} color={C.muted} />
                <Text style={styles.clearBtnText}>{tr('Clear', 'សម្អាត')}</Text>
              </Press>
              <Press onPress={handleApply} style={styles.applyBtn}>
                <Check size={17} color="#FFFFFF" />
                <Text style={styles.applyBtnText}>{tr('Apply', 'អនុវត្ត')}</Text>
              </Press>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

/** Single unified filter button that opens the CalendarPickerModal */
export function DateRangeFilterButton({
  startDate,
  endDate,
  onApply,
  onClear,
  label = 'Date Filter',
}: {
  startDate: string;
  endDate: string;
  onApply: (start: string, end: string) => void;
  onClear: () => void;
  label?: string;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const isActive = Boolean(startDate || endDate);

  const displayText = useMemo(() => {
    if (!startDate && !endDate) return label;
    if (startDate && endDate && startDate !== endDate) {
      return `${startDate.slice(5)} → ${endDate.slice(5)}`;
    }
    return startDate || endDate;
  }, [startDate, endDate, label]);

  return (
    <>
      <View style={styles.filterButtonWrap}>
        <Press
          onPress={() => setModalOpen(true)}
          style={[
            styles.filterTrigger,
            isActive && styles.filterTriggerActive,
          ]}
        >
          <CalendarDays
            size={16}
            color={isActive ? C.primary : C.muted}
          />
          <Text
            numberOfLines={1}
            style={[
              styles.filterTriggerText,
              isActive && styles.filterTriggerTextActive,
            ]}
          >
            {displayText}
          </Text>
        </Press>
        {isActive && (
          <Press onPress={onClear} style={styles.clearTriggerBtn}>
            <X size={13} color={C.primary} />
          </Press>
        )}
      </View>

      <CalendarPickerModal
        visible={modalOpen}
        startDate={startDate}
        endDate={endDate}
        onApply={onApply}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 13, 38, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dismissOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 380,
  },
  lightCard: {
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    ...shadow.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: C.pale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: C.text,
    fontWeight: '800',
    fontSize: 16.5,
  },
  iconCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  presetChip: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  presetChipText: {
    color: C.text,
    fontSize: 11.5,
    fontWeight: '700',
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navChevron: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthYearTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  monthYearTriggerActive: {
    backgroundColor: C.pale,
    borderColor: C.paleStrong,
  },
  monthLabel: {
    color: C.text,
    fontSize: 15.5,
    fontWeight: '800',
  },
  monthYearContainer: {
    marginBottom: 12,
    paddingVertical: 4,
  },
  pickerSubLabel: {
    color: C.muted,
    fontSize: 11.5,
    fontWeight: '700',
    marginBottom: 8,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  yearCell: {
    width: '23%',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  yearCellActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  yearCellText: {
    color: C.text,
    fontSize: 13,
    fontWeight: '700',
  },
  yearCellTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  monthCell: {
    width: '23%',
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  monthCellActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  monthCellText: {
    color: C.text,
    fontSize: 13,
    fontWeight: '700',
  },
  monthCellTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekdayText: {
    color: C.muted,
    fontSize: 11.5,
    fontWeight: '700',
  },
  gridContainer: {
    marginBottom: 10,
  },
  gridRow: {
    flexDirection: 'row',
    marginVertical: 2,
  },
  dayCellEmpty: {
    flex: 1,
    height: 38,
  },
  dayCell: {
    flex: 1,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellInRange: {
    backgroundColor: C.pale,
    borderRadius: 8,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleSelected: {
    backgroundColor: C.primary,
  },
  dayCircleToday: {
    borderWidth: 1.5,
    borderColor: C.primary,
  },
  dayNumberText: {
    color: C.text,
    fontSize: 13.5,
    fontWeight: '600',
  },
  dayNumberTextInRange: {
    color: C.primary,
    fontWeight: '700',
  },
  dayNumberTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dayNumberTextToday: {
    color: C.primary,
    fontWeight: '800',
  },
  selectionSummary: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  summaryLabel: {
    color: C.text,
    fontSize: 12.5,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 13,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  clearBtnText: {
    color: C.text,
    fontSize: 13,
    fontWeight: '700',
  },
  applyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 13,
    backgroundColor: C.primary,
    ...shadow.sm,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  // DateRangeFilterButton styles
  filterButtonWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 13,
    padding: 3,
  },
  filterTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  filterTriggerActive: {
    backgroundColor: C.pale,
  },
  filterTriggerText: {
    color: C.text,
    fontSize: 12.5,
    fontWeight: '600',
  },
  filterTriggerTextActive: {
    color: C.primary,
    fontWeight: '800',
  },
  clearTriggerBtn: {
    backgroundColor: C.paleStrong,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
    marginLeft: 2,
  },
});
