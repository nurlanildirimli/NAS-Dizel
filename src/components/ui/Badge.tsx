import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '../../theme';

type BadgeVariant = 'normal' | 'problem' | 'paid' | 'partial' | 'unpaid' | 'neutral';

type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
  size?: 'default' | 'compact';
};

export function Badge({ label, variant = 'neutral', size = 'default' }: BadgeProps) {
  const isCompact = size === 'compact';

  return (
    <View style={[styles.badge, isCompact && styles.compactBadge, styles[variant]]}>
      <Text style={[styles.text, isCompact && styles.compactText, styles[`${variant}Text`]]}>{label}</Text>
      <View style={[styles.dot, isCompact && styles.compactDot, styles[`${variant}Dot`]]} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 34,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
  },
  compactBadge: {
    gap: spacing.xs,
    minHeight: 28,
    paddingHorizontal: spacing.sm,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
  },
  compactText: {
    fontSize: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  compactDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  normal: { backgroundColor: colors.successSoft },
  problem: { backgroundColor: colors.dangerSoft },
  paid: { backgroundColor: colors.successSoft },
  partial: { backgroundColor: colors.purpleSoft },
  unpaid: { backgroundColor: colors.dangerSoft },
  neutral: { backgroundColor: colors.primarySoft },
  normalText: { color: colors.success },
  problemText: { color: colors.danger },
  paidText: { color: colors.success },
  partialText: { color: colors.purple },
  unpaidText: { color: colors.danger },
  neutralText: { color: colors.primary },
  normalDot: { backgroundColor: colors.success },
  problemDot: { backgroundColor: colors.danger },
  paidDot: { backgroundColor: colors.success },
  partialDot: { backgroundColor: colors.purple },
  unpaidDot: { backgroundColor: colors.danger },
  neutralDot: { backgroundColor: colors.primary },
});
