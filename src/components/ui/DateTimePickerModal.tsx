import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WD } from '../../constants/theme';
import { Modal } from './Modal';
import { Button } from './Button';

const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MIN_HOURS_AHEAD = 12;

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (isoDate: string) => void;
  title?: string;
  initialDate?: string;
  mode?: 'datetime' | 'date';
};

function getMinDate(): Date {
  const d = new Date(Date.now() + MIN_HOURS_AHEAD * 60 * 60 * 1000);
  d.setSeconds(0, 0);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function getCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function DateTimePickerModal({
  visible,
  onClose,
  onConfirm,
  title = 'Seleccionar fecha y hora',
  initialDate,
  mode = 'datetime',
}: Props) {
  const minDate = useMemo(getMinDate, []);

  const initDate = initialDate ? new Date(initialDate) : minDate;
  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (initDate >= minDate) return initDate;
    return minDate;
  });
  const [selectedHour, setSelectedHour] = useState(initDate.getHours());
  const [selectedMinute, setSelectedMinute] = useState(
    Math.ceil(initDate.getMinutes() / 5) * 5
  );

  const [error, setError] = useState('');

  const calendarDays = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);

  const isDayDisabled = (day: number): boolean => {
    if (mode === 'date') return false;
    const d = new Date(viewYear, viewMonth, day, 23, 59, 59, 999);
    return d.getTime() < minDate.getTime();
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    if (isDayDisabled(day)) return;
    const d = new Date(viewYear, viewMonth, day);
    if (mode === 'date') {
      d.setHours(12, 0, 0, 0);
      setSelectedDate(d);
      setError('');
      return;
    }
    d.setHours(selectedHour, selectedMinute, 0, 0);
    if (d < minDate) {
      d.setHours(minDate.getHours(), minDate.getMinutes(), 0, 0);
      setSelectedHour(d.getHours());
      setSelectedMinute(d.getMinutes());
    }
    setSelectedDate(d);
    setError('');
  };

  const adjustHour = (delta: number) => {
    let h = selectedHour + delta;
    if (h > 23) h = 0;
    if (h < 0) h = 23;
    setSelectedHour(h);

    const d = new Date(selectedDate);
    d.setHours(h, selectedMinute, 0, 0);
    if (d < minDate) {
      const newD = new Date(minDate);
      setSelectedHour(newD.getHours());
      setSelectedMinute(newD.getMinutes());
      setSelectedDate(newD);
      return;
    }
    setSelectedDate(d);
    setError('');
  };

  const adjustMinute = (delta: number) => {
    let m = selectedMinute + delta * 5;
    if (m > 55) m = 0;
    if (m < 0) m = 55;
    setSelectedMinute(m);

    const d = new Date(selectedDate);
    d.setHours(selectedHour, m, 0, 0);
    if (d < minDate) {
      const newD = new Date(minDate);
      setSelectedHour(newD.getHours());
      setSelectedMinute(newD.getMinutes());
      setSelectedDate(newD);
      return;
    }
    setSelectedDate(d);
    setError('');
  };

  const handleConfirm = () => {
    if (mode === 'date') {
      const final = new Date(selectedDate);
      final.setHours(12, 0, 0, 0);
      setError('');
      onConfirm(final.toISOString());
      return;
    }

    const final = new Date(selectedDate);
    final.setHours(selectedHour, selectedMinute, 0, 0);

    if (final.getTime() < minDate.getTime()) {
      setError(`La entrevista debe ser al menos ${MIN_HOURS_AHEAD} horas después de ahora.`);
      return;
    }

    setError('');
    onConfirm(final.toISOString());
  };

  const currentMonthStart = new Date(viewYear, viewMonth, 1);
  const minMonthStart = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const canGoPrev = currentMonthStart.getTime() > minMonthStart.getTime();

  const selDay = selectedDate.getDate();
  const selMonth = selectedDate.getMonth();
  const selYear = selectedDate.getFullYear();

  const formattedDate = `${selDay} de ${MONTHS[selMonth]} de ${selYear}`;
  const formattedTime = `${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;

  return (
    <Modal open={visible} onClose={onClose} title={title} size="sm">
      <View style={styles.container}>
        {/* Month/Year Header */}
        <View style={styles.monthHeader}>
          <TouchableOpacity
            onPress={handlePrevMonth}
            disabled={!canGoPrev}
            style={[styles.arrowBtn, !canGoPrev && styles.arrowDisabled]}
          >
            <Ionicons name="chevron-back" size={20} color={canGoPrev ? WD.darkerGray : '#D1D5DB'} />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {MONTHS[viewMonth]} {viewYear}
          </Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.arrowBtn}>
            <Ionicons name="chevron-forward" size={20} color={WD.darkerGray} />
          </TouchableOpacity>
        </View>

        {/* Day-of-week headers */}
        <View style={styles.weekRow}>
          {DAYS_OF_WEEK.map((d) => (
            <Text key={d} style={styles.weekLabel}>{d}</Text>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.calendarGrid}>
          {calendarDays.map((day, i) => {
            if (day === null) return <View key={`e-${i}`} style={styles.dayCell} />;
            const disabled = isDayDisabled(day);
            const isToday = isSameDay(new Date(), new Date(viewYear, viewMonth, day));
            const isSelected = day === selDay && viewMonth === selMonth && viewYear === selYear;
            return (
              <TouchableOpacity
                key={`d-${day}`}
                onPress={() => handleSelectDay(day)}
                disabled={disabled}
                style={[
                  styles.dayCell,
                  isSelected && styles.daySelected,
                  isToday && !isSelected && styles.dayToday,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    isSelected && styles.dayTextSelected,
                    disabled && styles.dayTextDisabled,
                  ]}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected date summary */}
        <Text style={styles.selectedLabel}>
          {mode === 'date' ? formattedDate : `${formattedDate} - ${formattedTime}`}
        </Text>

        {/* Time spinner (only in datetime mode) */}
        {mode !== 'date' && (
          <View style={styles.timeRow}>
            <View style={styles.timeCol}>
              <TouchableOpacity onPress={() => adjustHour(1)} style={styles.spinnerBtn}>
                <Ionicons name="chevron-up" size={18} color={WD.darkerGray} />
              </TouchableOpacity>
              <View style={styles.spinnerValue}>
                <Text style={styles.spinnerText}>{String(selectedHour).padStart(2, '0')}</Text>
              </View>
              <TouchableOpacity onPress={() => adjustHour(-1)} style={styles.spinnerBtn}>
                <Ionicons name="chevron-down" size={18} color={WD.darkerGray} />
              </TouchableOpacity>
            </View>

            <Text style={styles.timeSeparator}>:</Text>

            <View style={styles.timeCol}>
              <TouchableOpacity onPress={() => adjustMinute(1)} style={styles.spinnerBtn}>
                <Ionicons name="chevron-up" size={18} color={WD.darkerGray} />
              </TouchableOpacity>
              <View style={styles.spinnerValue}>
                <Text style={styles.spinnerText}>{String(selectedMinute).padStart(2, '0')}</Text>
              </View>
              <TouchableOpacity onPress={() => adjustMinute(-1)} style={styles.spinnerBtn}>
                <Ionicons name="chevron-down" size={18} color={WD.darkerGray} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          <Button variant="ghost" onPress={onClose}>Cancelar</Button>
          <Button onPress={handleConfirm}>Confirmar</Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  arrowBtn: {
    padding: 6,
  },
  arrowDisabled: {
    opacity: 0.3,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: WD.darkerGray,
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    paddingVertical: 4,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: {
    backgroundColor: WD.yellow,
    borderRadius: 8,
  },
  dayToday: {
    borderWidth: 1,
    borderColor: WD.yellow,
    borderRadius: 8,
  },
  dayText: {
    fontSize: 14,
    color: WD.darkerGray,
  },
  dayTextSelected: {
    fontWeight: '700',
    color: WD.darkerGray,
  },
  dayTextDisabled: {
    color: '#D1D5DB',
  },
  selectedLabel: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: WD.darkerGray,
    marginVertical: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  timeCol: {
    alignItems: 'center',
  },
  spinnerBtn: {
    padding: 6,
  },
  spinnerValue: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  spinnerText: {
    fontSize: 20,
    fontWeight: '700',
    color: WD.darkerGray,
  },
  timeSeparator: {
    fontSize: 20,
    fontWeight: '700',
    color: WD.darkerGray,
    marginTop: -4,
  },
  error: {
    fontSize: 12,
    color: '#B91C1C',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
});
