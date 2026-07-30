import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WD } from '../../constants/theme';

type ButtonVariant = 'primary' | 'outline' | 'ghostDark' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const TEXT_SIZES: Record<ButtonSize, number> = {
  sm: 12,
  md: 14,
  lg: 16,
  icon: 14,
};

interface ButtonProps {
  children?: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  onPress,
  style,
  textStyle,
  icon,
  iconPosition = 'left',
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const sizeStyles = {
    sm: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
    md: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
    lg: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 8 },
    icon: { paddingVertical: 0, paddingHorizontal: 0, borderRadius: 999, width: 36, height: 36 },
  };

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        disabled={isDisabled}
        style={[
          fullWidth && { width: '100%' },
          isDisabled && { opacity: 0.5 },
          style,
        ]}
      >
        <LinearGradient
          colors={[WD.yellow, WD.yellowLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.base,
            sizeStyles[size],
            fullWidth && { width: '100%' },
          ]}
        >
          <Content
            variant={variant}
            size={size}
            loading={loading}
            icon={icon}
            iconPosition={iconPosition}
            textStyle={textStyle}
          >
            {children}
          </Content>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const variantBg: Record<ButtonVariant, ViewStyle> = {
    primary: {},
    outline: {
      borderWidth: 1,
      borderColor: WD.borderGray,
      backgroundColor: WD.white,
    },
    ghostDark: {
      backgroundColor: 'transparent',
    },
    ghost: {
      backgroundColor: 'transparent',
    },
    destructive: {
      backgroundColor: WD.red,
    },
  };

  const variantText: Record<ButtonVariant, TextStyle> = {
    primary: { color: WD.darkerGray },
    outline: { color: '#374151' },
    ghostDark: { color: '#D1D5DB' },
    ghost: { color: '#4B5563' },
    destructive: { color: WD.white },
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        sizeStyles[size],
        variantBg[variant],
        fullWidth && { width: '100%' },
        isDisabled && { opacity: 0.5 },
        style,
      ]}
    >
      <Content
        variant={variant}
        size={size}
        loading={loading}
        icon={icon}
        iconPosition={iconPosition}
        textStyle={textStyle}
      >
        {children}
      </Content>
    </TouchableOpacity>
  );
}

function Content({
  variant,
  size,
  loading,
  icon,
  iconPosition,
  textStyle,
  children,
}: {
  variant: ButtonVariant;
  size: ButtonSize;
  loading: boolean;
  icon?: React.ReactNode;
  iconPosition: 'left' | 'right';
  textStyle?: TextStyle;
  children?: React.ReactNode;
}) {
  const textColor =
    variant === 'primary' ? WD.darkerGray
    : variant === 'destructive' ? WD.white
    : variant === 'ghostDark' ? '#D1D5DB'
    : variant === 'ghost' ? '#4B5563'
    : '#374151';

  return (
    <>
      {loading && (
        <ActivityIndicator size="small" color={textColor} style={{ marginRight: children ? 8 : 0 }} />
      )}
      {!loading && icon && iconPosition === 'left' && (
        <React.Fragment>{icon}</React.Fragment>
      )}
      {React.Children.map(children, (child) => {
        if (typeof child === 'string' || typeof child === 'number') {
          return (
            <Text
              style={[
                { color: textColor, fontSize: TEXT_SIZES[size], fontWeight: '600' },
                textStyle,
              ]}
            >
              {child}
            </Text>
          );
        }
        return child;
      })}
      {!loading && icon && iconPosition === 'right' && (
        <React.Fragment>{icon}</React.Fragment>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
