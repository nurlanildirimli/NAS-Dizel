import { StyleSheet, Text, View } from 'react-native';
import { Calendar, Phone, Route, Wallet, Wrench } from 'lucide-react-native';

import { Badge, Card } from '../ui';
import { colors, spacing } from '../../theme';
import { formatDate } from '../../utils/formatDate';
import { formatMoney } from '../../utils/formatMoney';
import { type VehicleSummary } from '../../types/vehicles';

type VehicleHistoryHeaderProps = {
  vehicle: VehicleSummary;
};

export function VehicleHistoryHeader({ vehicle }: VehicleHistoryHeaderProps) {
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
        <Badge
          label={vehicle.isProblemCustomer ? 'Problemli müştəri' : 'Normal müştəri'}
          variant={vehicle.isProblemCustomer ? 'problem' : 'normal'}
        />
      </View>

      <View style={styles.grid}>
        <Metric icon={Wrench} label="Xidmət sayı" value={String(vehicle.serviceCount)} />
        <Metric icon={Route} label="Son yürüş" value={`${vehicle.lastMileage.toLocaleString('en-US')} km`} />
        <Metric icon={Wallet} label="Ümumi xərc" value={formatMoney(vehicle.totalSpend)} />
        <Metric icon={Wallet} label="Qalan borc" value={formatMoney(vehicle.remainingDebt)} danger={vehicle.remainingDebt > 0} />
        <Metric icon={Calendar} label="Son xidmət" value={formatDate(vehicle.lastServiceDate)} />
      </View>
    </Card>
  );
}

type MetricProps = {
  icon: typeof Wrench;
  label: string;
  value: string;
  danger?: boolean;
};

function Metric({ icon: Icon, label, value, danger }: MetricProps) {
  return (
    <View style={styles.metric}>
      <Icon color={danger ? colors.danger : colors.primary} size={20} />
      <View>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={[styles.metricValue, danger && styles.danger]}>{value}</Text>
      </View>
    </View>
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
  },
  plate: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  brand: {
    color: colors.text,
    fontSize: 20,
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
    fontSize: 15,
    fontWeight: '700',
  },
  grid: {
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
    fontSize: 15,
    fontWeight: '800',
  },
  danger: {
    color: colors.danger,
  },
});
