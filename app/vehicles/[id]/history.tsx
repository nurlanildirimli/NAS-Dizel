import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Car } from 'lucide-react-native';

import { Header, PagePanel, Screen } from '../../../src/components/layout';
import { Button, Card } from '../../../src/components/ui';
import { VehicleHistoryCard, VehicleHistoryHeader } from '../../../src/components/cards';
import { getVehicleHistory, getVehicleSummary } from '../../../src/services/vehicles';
import { colors, spacing } from '../../../src/theme';

type VehicleRouteParams = {
  id?: string;
};

export default function VehicleHistoryScreen() {
  const { id } = useLocalSearchParams<VehicleRouteParams>();
  const vehicleId = typeof id === 'string' ? id : '';

  const vehicleQuery = useQuery({
    enabled: Boolean(vehicleId),
    queryKey: ['vehicles', 'detail', vehicleId],
    queryFn: () => getVehicleSummary(vehicleId),
  });

  const historyQuery = useQuery({
    enabled: Boolean(vehicleId),
    queryKey: ['vehicles', 'history', vehicleId],
    queryFn: () => getVehicleHistory(vehicleId),
  });

  return (
    <Screen>
      <Header title="Avtomobil tarixçəsi" icon={Car} />
      <PagePanel>
        <Button title="Əvvəlki" variant="ghost" icon={ArrowLeft} onPress={() => router.back()} style={styles.backButton} />

        {vehicleQuery.data ? <VehicleHistoryHeader vehicle={vehicleQuery.data} /> : null}

        {vehicleQuery.isLoading || historyQuery.isLoading ? <LoadingState /> : null}
        {vehicleQuery.isError || historyQuery.isError || !vehicleId ? (
          <ErrorState
            onRetry={() => {
              vehicleQuery.refetch();
              historyQuery.refetch();
            }}
          />
        ) : null}
        {historyQuery.data?.length === 0 ? <EmptyState /> : null}

        <View style={styles.timeline}>
          {historyQuery.data?.map((item) => (
            <VehicleHistoryCard
              key={item.id}
              item={item}
              onDetailPress={() => router.push(`/services/${item.id}`)}
              onNewServicePress={() => router.push({ pathname: '/new', params: { vehicleId } })}
            />
          ))}
        </View>
      </PagePanel>
    </Screen>
  );
}

function LoadingState() {
  return (
    <View style={styles.state}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <View style={styles.state}>
        <Text style={styles.stateText}>Məlumat yüklənmədi</Text>
        <Button title="Yenidən yoxla" onPress={onRetry} />
      </View>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card>
      <View style={styles.state}>
        <Text style={styles.stateText}>Xidmət tarixçəsi yoxdur</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  timeline: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  state: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
    gap: spacing.md,
  },
  stateText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
});
