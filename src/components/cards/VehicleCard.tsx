import { StyleSheet, Text, View } from 'react-native';
import { Clock, History, Phone, PlusCircle, Route, Wrench } from 'lucide-react-native';

import { Badge, Button, Card } from '../ui';
import { colors, spacing } from '../../theme';
import { formatDate } from '../../utils/formatDate';
import { formatMoney } from '../../utils/formatMoney';
import { type VehicleSummary } from '../../types/vehicles';

type VehicleCardProps = {
  vehicle: VehicleSummary;
  onHistoryPress: () => void;
  onNewServicePress: () => void;
  onCallPress: () => void;
  onDetailsPress: () => void;
};

function getProblemBadge(vehicle: VehicleSummary) {
  return vehicle.isProblemCustomer
    ? { label: 'Problemli müştəri', variant: 'problem' as const }
    : { label: 'Normal müştəri', variant: 'normal' as const };
}

export function VehicleCard({
  vehicle,
  onHistoryPress,
  onNewServicePress,
  onCallPress,
  onDetailsPress,
}: VehicleCardProps) {
  const badge = getProblemBadge(vehicle);

  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.identity}>
          <Text style={styles.plate}>{vehicle.licensePlate}</Text>
          <Text style={styles.brand}>{vehicle.brand}</Text>
          <View style={styles.phoneRow}>
            <Phone color={colors.textMuted} size={16} />
            <Text style={styles.phone}>{vehicle.phone}</Text>
          </View>
        </View>
        <Badge label={badge.label} variant={badge.variant} />
      </View>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Route color={colors.textMuted} size={20} />
          <View>
            <Text style={styles.metricLabel}>Son yürüş</Text>
            <Text style={styles.metricValue}>{vehicle.lastMileage.toLocaleString('en-US')} km</Text>
          </View>
        </View>
        <View style={styles.metric}>
          <Clock color={colors.primary} size={20} />
          <View>
            <Text style={styles.metricLabel}>Son xidmət</Text>
            <Text style={styles.metricValue}>{formatDate(vehicle.lastServiceDate)}</Text>
          </View>
        </View>
        <View style={styles.metric}>
          <Wrench color={colors.primary} size={20} />
          <View>
            <Text style={styles.metricLabel}>Xidmət sayı</Text>
            <Text style={styles.metricValue}>{vehicle.serviceCount} xidmət</Text>
          </View>
        </View>
      </View>

      <View style={styles.debtRow}>
        <Text style={styles.metricLabel}>Qalan borc</Text>
        <Text style={[styles.debt, vehicle.remainingDebt > 0 && styles.debtOpen]}>
          {formatMoney(vehicle.remainingDebt)}
        </Text>
      </View>

      <View style={styles.actions}>
        <Button title="Tarixçə" variant="secondary" icon={History} onPress={onHistoryPress} style={styles.action} />
        <Button title="Yeni xidmət" variant="secondary" icon={PlusCircle} onPress={onNewServicePress} style={styles.action} />
        <Button title="Zəng et" variant="secondary" icon={Phone} onPress={onCallPress} style={styles.action} />
        <Button title="Detallar" variant="secondary" onPress={onDetailsPress} style={styles.action} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  identity: {
    flex: 1,
    minWidth: 0,
  },
  plate: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '900',
  },
  brand: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  phoneRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  phone: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  metrics: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
  },
  metric: {
    flexDirection: 'row',
    gap: spacing.sm,
    minWidth: 130,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  metricValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  debtRow: {
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
  },
  debt: {
    color: colors.success,
    fontSize: 15,
    fontWeight: '900',
  },
  debtOpen: {
    color: colors.danger,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  action: {
    flexGrow: 1,
    minWidth: 128,
  },
});
