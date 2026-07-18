import { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, layout, spacing } from '../../theme';

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  noBottomPadding?: boolean;
  backgroundColor?: string;
}>;

export function Screen({ children, scroll = true, noBottomPadding = false, backgroundColor = colors.background }: ScreenProps) {
  const backgroundStyle = { backgroundColor };

  if (!scroll) {
    return (
      <SafeAreaView style={[styles.safeArea, backgroundStyle]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.content, backgroundStyle]}
        >
          <View style={styles.frame}>{children}</View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, backgroundStyle]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.content, backgroundStyle]}
      >
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={[styles.scrollContent, noBottomPadding && styles.noBottomPadding]}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={[styles.scroll, backgroundStyle]}
        >
          <View style={styles.frame}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    alignItems: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  scroll: {
    width: '100%',
  },
  scrollContent: {
    alignItems: 'center',
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  noBottomPadding: {
    paddingBottom: 0,
  },
  frame: {
    flexGrow: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? layout.maxContentWidth : undefined,
  },
});
