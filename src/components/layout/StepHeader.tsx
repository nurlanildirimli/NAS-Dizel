import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../../theme';

type StepHeaderProps = {
  title: string;
  stepLabel?: string;
};

export function StepHeader({ title, stepLabel }: StepHeaderProps) {
  return (
    <View style={styles.container}>
      {stepLabel ? <Text style={styles.step}>{stepLabel}</Text> : null}
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  step: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
});
