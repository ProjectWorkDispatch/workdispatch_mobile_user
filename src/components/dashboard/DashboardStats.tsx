import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, CardContent } from '../ui/Card';

export type StatItem = {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  bg: string;
  border: string;
  color: string;
};

export function DashboardStats({ stats }: { stats: StatItem[] }) {
  return (
    <View style={styles.statsGrid}>
      {stats.map((stat) => (
        <Card key={stat.label} style={[styles.statCard, { backgroundColor: stat.bg, borderColor: stat.border }]}>
          <CardContent>
            <View style={styles.statContent}>
              <View>
                <Text style={styles.statLabel}>{stat.label}</Text>
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              </View>
              <Ionicons name={stat.icon} size={40} color={stat.color} />
            </View>
          </CardContent>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  statsGrid: {
    gap: 12,
  },
  statCard: {
    borderWidth: 2,
  },
  statContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '900',
    marginTop: 4,
  },
});
