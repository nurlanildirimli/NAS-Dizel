import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Bot, FileText, MoreHorizontal, Smartphone, Wallet, Wrench } from 'lucide-react-native';

import { Header, PagePanel, Screen } from '../../src/components/layout';
import { Button, Card } from '../../src/components/ui';
import { colors, spacing } from '../../src/theme';

export default function MoreScreen() {
  return (
    <Screen noBottomPadding backgroundColor={colors.surface}>
      <Header title="Daha çox" icon={MoreHorizontal} compact />
      <PagePanel edgeToEdge compact fill>
        <View style={styles.menu}>
          <Card>
            <Text style={styles.title}>Ödənişlər</Text>
            <Button
              title="Detallar"
              variant="secondary"
              icon={Wallet}
              onPress={() => router.push('/payments')}
            />
          </Card>
          <Card>
            <Text style={styles.title}>Qiymət kataloqu</Text>
            <Button
              title="Detallar"
              variant="secondary"
              icon={Wrench}
              onPress={() => router.push('/price-catalog')}
            />
          </Card>
          <Card>
            <Text style={styles.title}>Hesabatlar</Text>
            <Button
              title="Detallar"
              variant="secondary"
              icon={FileText}
              onPress={() => router.push('/reports')}
            />
          </Card>
          <Card>
            <Text style={styles.title}>Cihazlar</Text>
            <Button
              title="Detallar"
              variant="secondary"
              icon={Smartphone}
              onPress={() => router.push('/devices')}
            />
          </Card>
          <Card>
            <Text style={styles.title}>AI istifadəsi</Text>
            <Button
              title="Detallar"
              variant="secondary"
              icon={Bot}
              onPress={() => router.push('/ai-usage')}
            />
          </Card>
        </View>
      </PagePanel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  menu: {
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
});
