import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WD } from '../../constants/theme';
import Toast from 'react-native-toast-message';

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnBackdrop?: boolean;
  scrollEnabled?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  scrollEnabled = true,
}: ModalProps) {
  return (
    <RNModal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {closeOnBackdrop ? (
          <Pressable style={styles.backdropPressable} onPress={() => onClose?.()} />
        ) : null}

        <View style={[styles.container, sizeStyles[size]]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={2}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close-outline" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            scrollEnabled={scrollEnabled}
          >
            {children}
          </ScrollView>

          {/* Footer */}
          {footer && <View style={styles.footer}>{footer}</View>}
        </View>
      </View>
      <Toast />
    </RNModal>
  );
}

const sizeStyles = {
  sm: { width: '85%' as const },
  md: { width: '90%' as const },
  lg: { width: '95%' as const },
  xl: { width: '95%' as const },
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    backgroundColor: WD.white,
    borderRadius: 12,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    paddingRight: 12,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    maxHeight: '78%',
  },
  contentContainer: {
    paddingVertical: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
  },
});
