import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Modal } from './Modal';
import { Button } from './Button';
import { WD } from '../../constants/theme';

const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

interface WorkPlanSetupModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (payload: {
    estimatedStartDate: string;
    estimatedEndDate: string;
    generalPlan: string;
  }) => Promise<void>;
  initialStartDate?: string;
  initialEndDate?: string;
  initialGeneralPlan?: string;
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

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function getToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function WorkPlanSetupModal({
  visible,
  onClose,
  onSave,
  initialStartDate,
  initialEndDate,
  initialGeneralPlan,
}: WorkPlanSetupModalProps) {
  const today = new Date().toISOString();
  const [startDate, setStartDate] = useState(initialStartDate || today);
  const [endDate, setEndDate] = useState(initialEndDate || today);
  const [generalPlan, setGeneralPlan] = useState(initialGeneralPlan || '');
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'start' | 'end'>('start');

  const initCalendarDate = mode === 'start'
    ? new Date(startDate)
    : new Date(endDate);
  const [viewYear, setViewYear] = useState(initCalendarDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initCalendarDate.getMonth());

  const calendarDays = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);

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

  const isDayDisabled = (day: number): boolean => {
    const cellDate = new Date(viewYear, viewMonth, day);
    cellDate.setHours(0, 0, 0, 0);
    const todayDate = getToday();
    if (mode === 'start') {
      return cellDate.getTime() < todayDate.getTime();
    }
    const sDate = new Date(startDate);
    sDate.setHours(0, 0, 0, 0);
    return cellDate.getTime() < sDate.getTime();
  };

  const handleSelectDay = (day: number) => {
    if (isDayDisabled(day)) return;
    const d = new Date(viewYear, viewMonth, day);
    d.setHours(12, 0, 0, 0);
    if (mode === 'start') {
      setStartDate(d.toISOString());
      if (new Date(endDate).getTime() < d.getTime()) {
        setEndDate(d.toISOString());
      }
    } else {
      setEndDate(d.toISOString());
    }
  };

  const handleSave = async () => {
    if (!startDate || !endDate) return;
    setSaving(true);
    try {
      await onSave({
        estimatedStartDate: new Date(startDate).toISOString(),
        estimatedEndDate: new Date(endDate).toISOString(),
        generalPlan: generalPlan.trim(),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const valid = !!startDate && !!endDate;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-GT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  const selDay = mode === 'start'
    ? new Date(startDate).getDate()
    : new Date(endDate).getDate();
  const selMonth = mode === 'start'
    ? new Date(startDate).getMonth()
    : new Date(endDate).getMonth();
  const selYear = mode === 'start'
    ? new Date(startDate).getFullYear()
    : new Date(endDate).getFullYear();

  return (
    <Modal
      open={visible}
      onClose={onClose}
      title={initialStartDate ? 'Editar plan de trabajo' : 'Crear plan de trabajo'}
      size="lg"
      footer={
        <View style={styles.footer}>
          <Button variant="outline" onPress={onClose}>Cancelar</Button>
          <Button onPress={handleSave} disabled={!valid || saving} loading={saving}>
            Guardar
          </Button>
        </View>
      }
    >
      <View style={styles.field}>
        <Text style={styles.label}>Fecha de inicio estimada</Text>
        <Text style={styles.dateDisplay}>{formatDate(startDate)}</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Fecha de finalización estimada</Text>
        <Text style={styles.dateDisplay}>{formatDate(endDate)}</Text>
      </View>

      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'start' && styles.modeBtnActive]}
          onPress={() => { setMode('start'); setViewYear(new Date(startDate).getFullYear()); setViewMonth(new Date(startDate).getMonth()); }}
        >
          <Text style={[styles.modeBtnText, mode === 'start' && styles.modeBtnTextActive]}>Inicio</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'end' && styles.modeBtnActive]}
          onPress={() => { setMode('end'); setViewYear(new Date(endDate).getFullYear()); setViewMonth(new Date(endDate).getMonth()); }}
        >
          <Text style={[styles.modeBtnText, mode === 'end' && styles.modeBtnTextActive]}>Fin</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.calendar}>
        <View style={styles.monthHeader}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.arrowBtn}>
            <Ionicons name="chevron-back" size={20} color={WD.darkerGray} />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {MONTHS[viewMonth]} {viewYear}
          </Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.arrowBtn}>
            <Ionicons name="chevron-forward" size={20} color={WD.darkerGray} />
          </TouchableOpacity>
        </View>

        <View style={styles.weekRow}>
          {DAYS_OF_WEEK.map((d) => (
            <Text key={d} style={styles.weekLabel}>{d}</Text>
          ))}
        </View>

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
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Plan general (opcional)</Text>
        <Text style={styles.hint}>
          Describí el trabajo general que vas a realizar
        </Text>
        <TextInput
          style={styles.textArea}
          placeholder="Ej: Pintar todas las paredes y reparar marcos de puertas..."
          placeholderTextColor="#9CA3AF"
          value={generalPlan}
          onChangeText={setGeneralPlan}
          multiline
          numberOfLines={4}
          maxLength={1000}
        />
        <Text style={styles.counter}>{generalPlan.length}/1000</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    gap: 12,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: WD.darkerGray,
    marginBottom: 6,
  },
  hint: {
    fontSize: 11,
    color: WD.textGray,
    marginBottom: 6,
  },
  dateDisplay: {
    fontSize: 14,
    color: WD.darkerGray,
    fontWeight: '500',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: WD.borderGray,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 3,
    marginBottom: 12,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: WD.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  modeBtnTextActive: {
    color: WD.darkerGray,
  },
  calendar: {
    gap: 8,
    marginBottom: 16,
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
  textArea: {
    borderWidth: 1,
    borderColor: WD.borderGray,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: WD.darkerGray,
    backgroundColor: WD.white,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  counter: {
    fontSize: 11,
    color: WD.textGray,
    textAlign: 'right',
    marginTop: 4,
  },
});
