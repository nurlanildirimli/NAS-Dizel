import { ComponentType, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { LucideProps } from 'lucide-react-native';

import { colors, radii, spacing } from '../../theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

type ButtonProps = {
  title: string;
  variant?: ButtonVariant;
  icon?: ComponentType<LucideProps>;
  size?: 'default' | 'compact';
  disabled?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  children?: ReactNode;
};

export function Button({
  title,
  variant = 'primary',
  icon: Icon,
  size = 'default',
  disabled,
  onPress,
  style,
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isCompact = size === 'compact';
  const foreground = isPrimary || variant === 'danger' ? colors.white : colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isCompact && styles.compactBase,
        styles[variant],
        (pressed || disabled) && styles.pressed,
        style,
      ]}
    >
      {Icon ? <Icon color={foreground} size={isCompact ? 17 : 20} strokeWidth={2.4} /> : null}
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        numberOfLines={1}
        style={[styles.text, isCompact && styles.compactText, { color: foreground }]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 48,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
  },
  compactBase: {
    gap: spacing.xs,
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.76,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0,
  },
  compactText: {
    fontSize: 14,
  },
});
