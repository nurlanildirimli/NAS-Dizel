import { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing, shadows } from '../../theme';

type PagePanelProps = PropsWithChildren<{
  edgeToEdge?: boolean;
  compact?: boolean;
  fill?: boolean;
}>;

export function PagePanel({ children, edgeToEdge = false, compact = false, fill = false }: PagePanelProps) {
  return <View style={[styles.panel, edgeToEdge && styles.edgeToEdge, compact && styles.compact, fill && styles.fill]}>{children}</View>;
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    marginTop: -30,
    marginHorizontal: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    ...shadows.card,
  },
  edgeToEdge: {
    marginHorizontal: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  compact: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  fill: {
    minHeight: '100%',
  },
});
