import { StyleSheet, Text, View } from 'react-native';
import { FileText, PlusCircle } from 'lucide-react-native';

import { Badge, Button, Card } from '../ui';
import { colors, spacing } from '../../theme';
import { formatDate } from '../../utils/formatDate';
import { formatMoney } from '../../utils/formatMoney';
import { type VehicleHistoryItem } from '../../types/vehicles';

type VehicleHistoryCardProps = {
  item: VehicleHistoryItem;
  onDetailPress: () => void;
  onNewServicePress: () => void;
};

function getPaymentBadge(item: VehicleHistoryItem) {
  if (item.paymentStatus === 'paid') {
    return { label: 'Ödənilib', variant: 'paid' as const };
  }

  if (item.paymentStatus === 'partially_paid') {
    return { label: 'Qismən ödənilib', variant: 'partial' as const };
  }

  if (item.paymentStatus === 'cancelled') {
    return { label: 'Ləğv edilib', variant: 'neutral' as const };
  }

  return { label: 'Ödənilməyib', variant: 'unpaid' as const };
}

export function VehicleHistoryCard({ item, onDetailPress, onNewServicePress }: VehicleHistoryCardProps) {
  const badge = getPaymentBadge(item);

  return (
    <Card>
      <View style={styles.header}>
        <View>
          <Text style={styles.date}>{formatDate(item.serviceDate)}</Text>
          <Text style={styles.mileage}>{item.mileage.toLocaleString('en-US')} km</Text>
        </View>
        <Badge label={badge.label} variant={badge.variant} />
      </View>

      <View style={styles.injectorRow}>
        <Metric label="Injector sayı" value={String(item.injectorCount)} />
        <Metric label="Injector şirkəti" value={item.injectorCompany} />
        <Metric label="Injector kodu" value={item.injectorCode} />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Injector xülasəsi</Text>
        <Text style={styles.value}>{item.injectorSummary ?? '-'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Görülən işlər</Text>
        <Text style={styles.value}>{item.workPerformed ?? '-'}</Text>
      </View>

      <View style={styles.moneyRow}>
        <Metric label="Yekun məbləğ" value={formatMoney(item.finalTotal)} />
        <Metric label="Ödənilən" value={formatMoney(item.paidAmount)} success />
        <Metric label="Qalan" value={formatMoney(item.remainingAmount)} danger={item.remainingAmount > 0} />
      </View>

      <View style={styles.actions}>
        <Button title="Xidmət detalı" variant="secondary" icon={FileText} onPress={onDetailPress} style={styles.action} />
        <Button title="Yeni xidmət" icon={PlusCircle} onPress={onNewServicePress} style={styles.action} />
      </View>
    </Card>
  );
}

type MetricProps = {
  label: string;
  value: string;
  success?: boolean;
  danger?: boolean;
};

function Metric({ label, value, success, danger }: MetricProps) {
  return (
    <View style={styles.metric}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, success && styles.success, danger && styles.danger]}>{value}</Text>
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
  date: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  mileage: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  injectorRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
  },
  section: {
    marginTop: spacing.md,
  },
  moneyRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
  },
  metric: {
    minWidth: 112,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  value: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  success: {
    color: colors.success,
  },
  danger: {
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
    minWidth: 150,
  },
});
