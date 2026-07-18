import { PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Modal as NativeModal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radii, spacing, shadows } from '../../theme';
import { Button } from './Button';

type ModalProps = PropsWithChildren<{
  visible: boolean;
  title: string;
  confirmLabel?: string;
  cancelLabel: string;
  onConfirm?: () => void;
  onCancel: () => void;
}>;

export function Modal({
  visible,
  title,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  children,
}: ModalProps) {
  return (
    <NativeModal animationType="fade" transparent visible={visible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.backdrop}
      >
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
          <View style={styles.actions}>
            <Button title={cancelLabel} variant="secondary" onPress={onCancel} style={styles.action} />
            {confirmLabel && onConfirm ? (
              <Button title={confirmLabel} onPress={onConfirm} style={styles.action} />
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </NativeModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 27, 61, 0.44)',
    padding: spacing.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '86%',
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    ...shadows.card,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  content: {
    paddingTop: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  action: {
    flex: 1,
  },
});
