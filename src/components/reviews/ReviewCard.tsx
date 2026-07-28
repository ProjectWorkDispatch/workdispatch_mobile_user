import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Review } from '../../types/social';
import { Card, CardContent } from '../ui/Card';
import { StarRating } from './StarRating';

interface ReviewCardProps {
  review: Review;
  direction: 'given' | 'received';
}

export function ReviewCard({ review, direction }: ReviewCardProps) {
  const person = direction === 'given' ? review.revieweredId : review.reviewerId;
  const fullName = `${person?.firstName || ''} ${person?.lastName || ''}`.trim() || 'Usuario';

  return (
    <Card style={styles.card}>
      <CardContent>
        <View style={styles.top}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{direction === 'given' ? 'Calificaste a' : 'Te calificó'}</Text>
            <Text style={styles.name}>{fullName}</Text>
          </View>
          <StarRating value={review.Rating} readOnly size={16} />
        </View>
        <Text style={styles.comment}>{review.Comment}</Text>
        <Text style={styles.date}>{new Date(review.createdAt).toLocaleDateString()}</Text>
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  label: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase' },
  name: { fontSize: 15, fontWeight: '700', color: '#111827' },
  comment: { fontSize: 13, color: '#6B7280', marginTop: 10, lineHeight: 19 },
  date: { fontSize: 11, color: '#9CA3AF', marginTop: 10 },
});