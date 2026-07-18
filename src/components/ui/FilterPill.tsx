import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radii, spacing } from '../../theme';

type FilterPillProps = {
  label: string;
  active?: boolean;
  onPress?: () => void;
  size?: 'default' | 'compact';
};

export function FilterPill({ label, active, onPress, size = 'default' }: FilterPillProps) {
  const isCompact = size === 'compact';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        isCompact && styles.compactPill,
        active && styles.activePill,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.text, isCompact && styles.compactText, active && styles.activeText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
  },
  compactPill: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  activePill: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  pressed: {
    opacity: 0.76,
  },
  text: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  compactText: {
    fontSize: 14,
  },
  activeText: {
    color: colors.white,
  },
});
