import { Image, StyleSheet, Text, View } from 'react-native';
import {
  Calendar,
  ChevronRight,
  Gauge,
  History,
  Phone,
  PlusCircle,
  Wallet,
  Wrench,
} from 'lucide-react-native';

import { Button } from '../ui';
import { colors, radii, spacing, shadows } from '../../theme';
import { formatDate } from '../../utils/formatDate';
import { formatMoney } from '../../utils/formatMoney';
import { type VehicleSummary } from '../../types/vehicles';
import AzerbaijaniFlag from '../../../assets/azerbaijani_flag.png';

type SearchVehicleCardProps = {
  vehicle: VehicleSummary;
  onHistoryPress: () => void;
  onNewServicePress: () => void;
  onCallPress: () => void;
  onDetailsPress: () => void;
};

export function SearchVehicleCard({
  vehicle,
  onHistoryPress,
  onNewServicePress,
  onCallPress,
  onDetailsPress,
}: SearchVehicleCardProps) {
  const isProblemCustomer = vehicle.isProblemCustomer;

  return (
    <View style={[styles.card, isProblemCustomer && styles.problemCard]}>
      <View style={styles.header}>
        <PlateVisual plate={vehicle.licensePlate} />

        <View style={styles.identity}>
          <Text numberOfLines={1} style={styles.brand}>
            {vehicle.brand}
          </Text>
          <View style={styles.phoneRow}>
            <Phone color={colors.textMuted} size={18} strokeWidth={2.4} />
            <Text numberOfLines={1} style={styles.phone}>
              {vehicle.phone}
            </Text>
          </View>
        </View>

      </View>

      <View style={styles.divider} />

      <View style={styles.metricGrid}>
        <Metric icon={Gauge} label="Son yürüş" value={`${vehicle.lastMileage.toLocaleString('en-US')} km`} />
        <Metric icon={Wrench} label="Xidmət sayı" value={`${vehicle.serviceCount} xidmət`} iconColor={colors.primary} />
        <Metric icon={Calendar} label="Son xidmət tarixi" value={formatDate(vehicle.lastServiceDate)} />
        <Metric icon={Wallet} label="Ümumi xərc" value={formatMoney(vehicle.totalSpend)} iconColor={colors.purple} />
        <Metric
          icon={Wallet}
          label="Qalan borc"
          value={formatMoney(vehicle.remainingDebt)}
          iconColor={colors.warning}
          danger={vehicle.remainingDebt > 0}
          success={vehicle.remainingDebt <= 0}
        />
      </View>

      <View style={styles.divider} />

      <View style={styles.actions}>
        <Button title="Tarixçə" variant="secondary" icon={History} onPress={onHistoryPress} size="compact" style={styles.action} />
        <Button title="Yeni xidmət" variant="secondary" icon={PlusCircle} onPress={onNewServicePress} size="compact" style={styles.action} />
        <Button title="Zəng et" variant="secondary" icon={Phone} onPress={onCallPress} size="compact" style={styles.action} />
        <Button title="Detallar" variant="secondary" icon={ChevronRight} onPress={onDetailsPress} size="compact" style={styles.action} />
      </View>
    </View>
  );
}

function PlateVisual({ plate }: { plate: string }) {
  return (
    <View style={styles.plateBox}>
      <View style={styles.plateCountryBlock}>
        <Image source={AzerbaijaniFlag} style={styles.flag} resizeMode="cover" />
        <Text style={styles.country}>AZ</Text>
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.plateText}>
        {plate}
      </Text>
    </View>
  );
}

type MetricProps = {
  icon: typeof Gauge;
  label: string;
  value: string;
  iconColor?: string;
  danger?: boolean;
  success?: boolean;
};

function Metric({ icon: Icon, label, value, iconColor = colors.textMuted, danger, success }: MetricProps) {
  return (
    <View style={styles.metric}>
      <Icon color={iconColor} size={20} strokeWidth={2.2} />
      <View style={styles.metricText}>
        <Text numberOfLines={1} style={styles.metricLabel}>
          {label}
        </Text>
        <Text numberOfLines={1} style={[styles.metricValue, danger && styles.metricDanger, success && styles.metricSuccess]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    ...shadows.card,
  },
  problemCard: {
    borderColor: colors.danger,
    borderWidth: 2,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  plateBox: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#111111',
    borderRadius: 4,
    borderWidth: 2,
    flexDirection: 'row',
    gap: spacing.xs,
    height: 50,
    width: 174,
    paddingHorizontal: spacing.sm,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  plateCountryBlock: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 6,
    width: 25,
  },
  flag: {
    height: 9,
    width: 16,
  },
  country: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 11,
    marginTop: 1,
    textAlign: 'center',
  },
  plateText: {
    color: '#111111',
    flex: 1,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  identity: {
    flex: 1,
    minWidth: 118,
  },
  brand: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  phoneRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 2,
  },
  phone: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    backgroundColor: colors.border,
    height: 1,
    marginVertical: spacing.md,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.md,
  },
  metric: {
    alignItems: 'center',
    flexBasis: '50%',
    flexDirection: 'row',
    gap: spacing.sm,
    minWidth: 126,
    paddingRight: spacing.sm,
  },
  metricText: {
    flex: 1,
    minWidth: 0,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  metricValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 1,
  },
  metricDanger: {
    color: colors.danger,
  },
  metricSuccess: {
    color: colors.success,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  action: {
    flexGrow: 1,
    minHeight: 42,
    minWidth: 124,
    paddingHorizontal: spacing.md,
  },
});
