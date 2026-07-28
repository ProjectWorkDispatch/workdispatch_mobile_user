import React from 'react';
import { StyleSheet, Text, View, type ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  variant?: 'default' | 'yellow' | 'gray';
}

export function Card({ children, style, variant = 'default', ...props }: CardProps) {
  return (
    <View style={[styles.card, variantStyles[variant], style]} {...props}>
      {children}
    </View>
  );
}

export function CardHeader({ children, style, ...props }: ViewProps) {
  return (
    <View style={[styles.header, style]} {...props}>
      {children}
    </View>
  );
}

export function CardTitle({ children, style }: { children: React.ReactNode; style?: any }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function CardDescription({ children, style }: { children: React.ReactNode; style?: any }) {
  return <Text style={[styles.description, style]}>{children}</Text>;
}

export function CardContent({ children, style, ...props }: ViewProps) {
  return (
    <View style={[styles.content, style]} {...props}>
      {children}
    </View>
  );
}

export function CardFooter({ children, style, ...props }: ViewProps) {
  return (
    <View style={[styles.footer, style]} {...props}>
      {children}
    </View>
  );
}

interface BadgeProps {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive';
  children: React.ReactNode;
  style?: any;
}

export function Badge({ variant = 'default', children, style }: BadgeProps) {
  return (
    <View style={[styles.badge, badgeVariants[variant], style]}>
      <Text style={[styles.badgeText, badgeTextVariants[variant]]}>{children}</Text>
    </View>
  );
}

const variantStyles = {
  default: {},
  yellow: { backgroundColor: '#FEF9C3', borderWidth: 1, borderColor: '#FDE68A' },
  gray: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
};

const badgeVariants = {
  default: { backgroundColor: '#EAB308' },
  secondary: { backgroundColor: '#F3F4F6' },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#D1D5DB' },
  destructive: { backgroundColor: '#DC2626' },
};

const badgeTextVariants = {
  default: { color: '#111827' },
  secondary: { color: '#374151' },
  outline: { color: '#374151' },
  destructive: { color: '#FFFFFF' },
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 24,
  },
  header: {
    flexDirection: 'column',
    gap: 6,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
