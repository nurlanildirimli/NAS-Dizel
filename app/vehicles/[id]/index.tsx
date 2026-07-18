import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Car } from 'lucide-react-native';

import { Header, PagePanel, Screen } from '../../../src/components/layout';
import { Button, Card, Modal } from '../../../src/components/ui';
import { VehicleHistoryHeader } from '../../../src/components/cards';
import { getVehicleSummary, softDeleteVehicle } from '../../../src/services/vehicles';
import { colors, spacing } from '../../../src/theme';

type VehicleRouteParams = {
  id?: string;
};

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<VehicleRouteParams>();
  const queryClient = useQueryClient();
  const vehicleId = typeof id === 'string' ? id : '';
  const [deleteVisible, setDeleteVisible] = useState(false);

  const vehicleQuery = useQuery({
    enabled: Boolean(vehicleId),
    queryKey: ['vehicles', 'detail', vehicleId],
    queryFn: () => getVehicleSummary(vehicleId),
  });
  const deleteVehicleMutation = useMutation({
    mutationFn: () => softDeleteVehicle(vehicleId),
    onSuccess: () => {
      setDeleteVisible(false);
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['income'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      router.replace('/vehicles');
    },
  });

  return (
    <Screen>
      <Header title="Detallar" icon={Car} />
      <PagePanel>
        <Button title="Əvvəlki" variant="ghost" icon={ArrowLeft} onPress={() => router.back()} style={styles.backButton} />
        {vehicleQuery.isLoading ? <LoadingState /> : null}
        {vehicleQuery.isError || !vehicleId ? <ErrorState onRetry={() => vehicleQuery.refetch()} /> : null}
        {vehicleQuery.data ? (
          <View style={styles.content}>
            <VehicleHistoryHeader vehicle={vehicleQuery.data} />
            <Button title="Sil" variant="danger" onPress={() => setDeleteVisible(true)} />
          </View>
        ) : null}
        {vehicleQuery.data === null ? <EmptyState /> : null}
        <Modal
          cancelLabel="Əvvəlki"
          confirmLabel="Sil"
          onCancel={() => setDeleteVisible(false)}
          onConfirm={() => deleteVehicleMutation.mutate()}
          title="Bu avtomobili silmək istəyirsiniz?"
          visible={deleteVisible}
        >
          <Text style={styles.stateText}>{vehicleQuery.data?.licensePlate}</Text>
          {deleteVehicleMutation.isPending ? <ActivityIndicator color={colors.primary} /> : null}
        </Modal>
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
        <Text style={styles.stateText}>Nəticə tapılmadı</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
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
