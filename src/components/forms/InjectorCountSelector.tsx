import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '../../theme';

type InjectorCountSelectorProps = {
  value: number;
  onChange: (value: number) => void;
};

const counts = [1, 2, 3, 4, 5, 6, 7, 8];

export function InjectorCountSelector({ value, onChange }: InjectorCountSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Injector sayı *</Text>
      <View style={styles.options}>
        {counts.map((count) => {
          const active = count === value;
          return (
            <Pressable
              accessibilityRole="button"
              key={count}
              onPress={() => onChange(count)}
              style={[styles.option, active && styles.optionActive]}
            >
              <Text style={[styles.optionText, active && styles.optionTextActive]}>{count}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  options: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  option: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  optionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  optionText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  optionTextActive: {
    color: colors.white,
  },
});
