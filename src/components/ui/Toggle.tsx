import { Pressable, StyleSheet, View } from 'react-native';

import { colors } from '../../theme';

type ToggleProps = {
  value: boolean;
  onValueChange?: (value: boolean) => void;
};

export function Toggle({ value, onValueChange }: ToggleProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange?.(!value)}
      style={[styles.track, value && styles.trackActive]}
    >
      <View style={[styles.thumb, value && styles.thumbActive]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    justifyContent: 'center',
    width: 52,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.border,
    paddingHorizontal: 3,
  },
  trackActive: {
    backgroundColor: colors.primary,
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  thumbActive: {
    alignSelf: 'flex-end',
  },
});
