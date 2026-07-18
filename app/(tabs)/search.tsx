import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Car, Search } from 'lucide-react-native';

import { Header, PagePanel, Screen } from '../../src/components/layout';
import { Button, Card, FilterPill, Input } from '../../src/components/ui';
import { SearchVehicleCard } from '../../src/components/cards';
import { searchVehicles } from '../../src/services/vehicles';
import { useDebouncedValue } from '../../src/hooks/useDebouncedValue';
import { colors, spacing } from '../../src/theme';
import { type VehicleSearchFilter } from '../../src/types/vehicles';
import { useState } from 'react';

const filters: Array<{ label: string; key: VehicleSearchFilter }> = [
  { label: 'Hamısı', key: 'all' },
  { label: 'Problemli', key: 'problem' },
  { label: 'Borcu olanlar', key: 'debt' },
  { label: 'Ödənilməyib', key: 'unpaid' },
  { label: 'Qismən ödənilib', key: 'partially_paid' },
  { label: 'Son xidmətlər', key: 'recent' },
];

export default function SearchScreen() {
  const [searchText, setSearchText] = useState('');
  const [filterKey, setFilterKey] = useState<VehicleSearchFilter>('all');
  const debouncedSearchText = useDebouncedValue(searchText, 300);

  const vehiclesQuery = useQuery({
    queryKey: ['vehicles', 'search', debouncedSearchText, filterKey],
    queryFn: () => searchVehicles({ searchText: debouncedSearchText, filterKey, limit: 30 }),
  });

  return (
    <Screen noBottomPadding backgroundColor={colors.surface}>
      <Header title="Axtarış" icon={Search} compact />
      <PagePanel edgeToEdge compact fill>
        <Input
          icon={Search}
          onChangeText={setSearchText}
          placeholder="Nömrə, telefon, marka axtar..."
          size="compact"
          value={searchText}
        />
        <ScrollView
          horizontal
          style={styles.filterStrip}
          contentContainerStyle={styles.filters}
          showsHorizontalScrollIndicator={false}
        >
          {filters.map((filter) => (
            <FilterPill
              key={filter.key}
              label={filter.label}
              active={filter.key === filterKey}
              onPress={() => setFilterKey(filter.key)}
              size="compact"
            />
          ))}
        </ScrollView>

        {vehiclesQuery.isLoading ? <LoadingState /> : null}
        {vehiclesQuery.isError ? <ErrorState onRetry={() => vehiclesQuery.refetch()} /> : null}
        {vehiclesQuery.data?.length === 0 ? <EmptyState /> : null}

        <View style={styles.results}>
          {vehiclesQuery.data?.map((vehicle) => (
            <SearchVehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              onCallPress={() => Linking.openURL(`tel:${vehicle.phone}`)}
              onDetailsPress={() => router.push(`/vehicles/${vehicle.id}`)}
              onHistoryPress={() => router.push(`/vehicles/${vehicle.id}/history`)}
              onNewServicePress={() => router.push({ pathname: '/new', params: { vehicleId: vehicle.id } })}
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
        <Car color={colors.primary} size={34} />
        <Text style={styles.stateText}>Nəticə tapılmadı</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  filterStrip: {
    maxHeight: 64,
  },
  filters: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  results: {
    gap: spacing.md,
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
