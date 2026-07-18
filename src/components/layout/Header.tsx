import { ComponentType, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LucideProps } from 'lucide-react-native';

import { colors, radii, spacing } from '../../theme';

type HeaderProps = {
  title: string;
  icon: ComponentType<LucideProps>;
  action?: ReactNode;
  children?: ReactNode;
  compact?: boolean;
};

export function Header({ title, icon: Icon, action, children, compact }: HeaderProps) {
  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      <View style={[styles.titleRow, compact && styles.compactTitleRow]}>
        <View style={[styles.iconTile, compact && styles.compactIconTile]}>
          <Icon color={colors.white} size={compact ? 28 : 34} strokeWidth={2.2} />
        </View>
        <Text style={[styles.title, compact && styles.compactTitle]}>{title}</Text>
        {action ? <View style={styles.action}>{action}</View> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: 54,
  },
  compactContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 42,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
  },
  compactTitleRow: {
    gap: spacing.md,
  },
  iconTile: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
    height: 70,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.62)',
    borderRadius: radii.md,
  },
  compactIconTile: {
    width: 56,
    height: 56,
  },
  title: {
    color: colors.white,
    flex: 1,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0,
  },
  compactTitle: {
    fontSize: 26,
  },
  action: {
    flexShrink: 0,
  },
});
