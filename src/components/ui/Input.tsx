import { ComponentType } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { LucideProps } from 'lucide-react-native';

import { colors, radii, spacing } from '../../theme';

type InputProps = TextInputProps & {
  label?: string;
  required?: boolean;
  error?: string;
  icon?: ComponentType<LucideProps>;
  size?: 'default' | 'compact';
};

export function Input({ label, required, error, icon: Icon, style, size = 'default', ...props }: InputProps) {
  const isCompact = size === 'compact';

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? ' *' : ''}
        </Text>
      ) : null}
      <View style={[styles.inputShell, isCompact && styles.compactInputShell, error && styles.inputError]}>
        {Icon ? <Icon color={colors.textMuted} size={isCompact ? 20 : 22} strokeWidth={2.2} /> : null}
        <TextInput
          placeholderTextColor={colors.textMuted}
          style={[styles.input, isCompact && styles.compactInput, style]}
          {...props}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  inputShell: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  compactInputShell: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  inputError: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    letterSpacing: 0,
    paddingVertical: spacing.md,
  },
  compactInput: {
    fontSize: 15,
    paddingVertical: spacing.sm,
  },
  error: {
    color: colors.danger,
    fontSize: 12,
  },
});
