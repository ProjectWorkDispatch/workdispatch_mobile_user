import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WD } from '../../constants/theme';
import type { ReminderItem } from '../../utils/reminders';
import { Card, CardContent } from '../ui/Card';

const ICONS: Record<ReminderItem['kind'], keyof typeof Ionicons.glyphMap> = {
  meeting: 'videocam-outline',
  workLog: 'clipboard-outline',
  verifyDay: 'checkmark-done-outline',
};

export function RemindersCard({ items }: { items: ReminderItem[] }) {
  const router = useRouter();

  if (!items.length) return null;

  return (
    <Card>
      <CardContent style={styles.cardContent}>
        <View style={styles.headerRow}>
          <Ionicons name="alarm-outline" size={18} color={WD.mediumGray} />
          <Text style={styles.title}>Recordatorios</Text>
        </View>

        <View style={styles.list}>
          {items.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.7}
              style={styles.row}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[styles.iconWrap, item.overdue && styles.iconWrapOverdue]}>
                <Ionicons
                  name={ICONS[item.kind]}
                  size={18}
                  color={item.overdue ? WD.redDark : WD.yellowDark}
                />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.rowSubtitle} numberOfLines={1}>{item.subtitle}</Text>
              </View>
              <View style={[styles.badge, item.overdue && styles.badgeOverdue]}>
                <Text style={[styles.badgeText, item.overdue && styles.badgeTextOverdue]}>
                  {item.badge}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  cardContent: {
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF9C3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapOverdue: {
    backgroundColor: '#FEE2E2',
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  rowSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FEF9C3',
  },
  badgeOverdue: {
    backgroundColor: '#FEE2E2',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A16207',
  },
  badgeTextOverdue: {
    color: '#B91C1C',
  },
});