import { ComponentProps } from 'react';

import { Input } from '../ui';
import { normalizePlate } from '../../utils/normalizePlate';

type PlateInputProps = Omit<ComponentProps<typeof Input>, 'onChangeText' | 'autoCapitalize'> & {
  onChangeText: (value: string) => void;
};

export function PlateInput({ onChangeText, ...props }: PlateInputProps) {
  return (
    <Input
      autoCapitalize="characters"
      onChangeText={(value) => onChangeText(normalizePlate(value))}
      {...props}
    />
  );
}
