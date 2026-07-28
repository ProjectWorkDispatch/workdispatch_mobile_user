import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { WD } from '../../constants/theme';

interface StarRatingProps {
  value?: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: number;
}

export function StarRating({ value = 0, onChange, readOnly = false, size = 28 }: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <View style={styles.row}>
      {stars.map((star) => {
        const filled = star <= value;
        return (
          <TouchableOpacity key={star} disabled={readOnly} onPress={() => onChange?.(star)} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
            <Ionicons name={filled ? 'star' : 'star-outline'} size={size} color={filled ? WD.yellow : '#D1D5DB'} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});