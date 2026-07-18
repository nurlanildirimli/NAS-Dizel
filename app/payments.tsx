import { useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowLeft, CreditCard, Wallet } from 'lucide-react-native';

import { Header, PagePanel, Screen } from '../src/components/layout';
import { Badge, Button, Card, FilterPill, Input, Modal } from '../src/components/ui';
import { listPayments, markServicePaid, recordServicePayment } from '../src/services/services';
import { colors, spacing } from '../src/theme';
import { type PaymentCardItem, type PaymentFilter } from '../src/types/services';
import { type PaymentStatus } from '../src/types/vehicles';
import { formatDate } from '../src/utils/formatDate';
import { formatMoney } from '../src/utils/formatMoney';

const filters: Array<{ label: string; key: PaymentFilter }> = [
  { label: 'Hamısı', key: 'all' },
  { label: 'Ödənilib', key: 'paid' },
  { label: 'Qismən ödənilib', key: 'partially_paid' },
  { label: 'Ödənilməyib', key: 'unpaid' },
  { label: 'Borcu olanlar', key: 'debt' },
];

export default function PaymentsScreen() {
  const queryClient = useQueryClient();
  const [filterKey, setFilterKey] = useState<PaymentFilter>('all');
  const [selectedPayment, setSelectedPayment] = useState<PaymentCardItem | null>(null);
  const [paidAmount, setPaidAmount] = useState('');
  const paymentsQuery = useQuery({
    queryKey: ['payments', filterKey],
    queryFn: () => listPayments(filterKey),
  });
  const recordPaymentMutation = useMutation({
    mutationFn: () => recordServicePayment({
      serviceId: selectedPayment?.serviceId ?? '',
      paidAmount: Number(paidAmount),
      paymentMethod: 'cash',
    }),
    onSuccess: () => {
      setSelectedPayment(null);
      setPaidAmount('');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['income'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
  const markPaidMutation = useMutation({
    mutationFn: (serviceId: string) => markServicePaid({ serviceId, paymentMethod: 'cash' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['income'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });

  return (
    <Screen noBottomPadding backgroundColor={colors.surface}>
      <Header
        title="Ödənişlər"
        icon={Wallet}
        compact
        action={(
          <Button title="Əvvəlki" variant="secondary" size="compact" icon={ArrowLeft} onPress={() => router.back()} />
        )}
      />
      <PagePanel edgeToEdge compact fill>
        <View style={styles.filters}>
          {filters.map((filter) => (
            <FilterPill
              active={filter.key === filterKey}
              key={filter.key}
              label={filter.label}
              onPress={() => setFilterKey(filter.key)}
              size="compact"
            />
          ))}
        </View>
        {paymentsQuery.isLoading ? (
          <View style={styles.state}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null}
        {paymentsQuery.isError ? (
          <Card>
            <View style={styles.state}>
              <Text style={styles.title}>Məlumat yüklənmədi</Text>
              <Button title="Yenidən yoxla" onPress={() => paymentsQuery.refetch()} />
            </View>
          </Card>
        ) : null}
        {paymentsQuery.data?.length === 0 ? (
          <Card>
            <View style={styles.state}>
              <CreditCard color={colors.primary} size={34} />
              <Text style={styles.title}>Nəticə tapılmadı</Text>
            </View>
          </Card>
        ) : null}
        <View style={styles.list}>
          {paymentsQuery.data?.map((item) => (
            <PaymentCard
              item={item}
              key={item.serviceId}
              onAddPayment={() => {
                setSelectedPayment(item);
                setPaidAmount(String(item.remainingAmount));
              }}
              onCall={() => Linking.openURL(`tel:${item.phone}`)}
              onHistory={() => router.push(`/vehicles/${item.vehicleId}/history`)}
              onMarkPaid={() => markPaidMutation.mutate(item.serviceId)}
              onServiceDetail={() => router.push(`/services/${item.serviceId}`)}
            />
          ))}
        </View>
        <Modal
          cancelLabel="Əvvəlki"
          confirmLabel="Yadda saxla"
          onCancel={() => setSelectedPayment(null)}
          onConfirm={() => recordPaymentMutation.mutate()}
          title="Ödəniş əlavə et"
          visible={Boolean(selectedPayment)}
        >
          <View style={styles.modalContent}>
            <Input
              keyboardType="numeric"
              label="Ödənilən"
              onChangeText={setPaidAmount}
              size="compact"
              value={paidAmount}
            />
            <Text style={styles.muted}>Ödəniş: Nağd</Text>
            {recordPaymentMutation.isPending ? <ActivityIndicator color={colors.primary} /> : null}
          </View>
        </Modal>
      </PagePanel>
    </Screen>
  );
}

function PaymentCard({
  item,
  onAddPayment,
  onMarkPaid,
  onServiceDetail,
  onHistory,
  onCall,
}: {
  item: PaymentCardItem;
  onAddPayment: () => void;
  onMarkPaid: () => void;
  onServiceDetail: () => void;
  onHistory: () => void;
  onCall: () => void;
}) {
  return (
    <Card>
      <View style={styles.cardHeader}>
        <View style={styles.flex}>
          <Text style={styles.title}>{item.licensePlate} — {item.brand}</Text>
          <Text style={styles.muted}>{formatDate(item.serviceDate)} · {item.phone}</Text>
        </View>
        <Badge {...getPaymentBadge(item.paymentStatus)} />
      </View>
      <View style={styles.metrics}>
        <Metric label="Yekun" value={formatMoney(item.finalTotal)} />
        <Metric label="Ödənilən" value={formatMoney(item.paidAmount)} />
        <Metric label="Qalan" value={formatMoney(item.remainingAmount)} danger={item.remainingAmount > 0} />
      </View>
      <View style={styles.actions}>
        <Button title="Ödəniş əlavə et" onPress={onAddPayment} style={styles.action} />
        <Button title="Tam ödənildi kimi işarələ" variant="secondary" onPress={onMarkPaid} style={styles.action} />
        <Button title="Xidmət detalı" variant="secondary" onPress={onServiceDetail} style={styles.action} />
        <Button title="Avtomobil tarixçəsi" variant="secondary" onPress={onHistory} style={styles.action} />
        <Button title="Zəng et" variant="ghost" onPress={onCall} style={styles.action} />
      </View>
    </Card>
  );
}

function Metric({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={[styles.metricValue, danger && styles.danger]}>{value}</Text>
    </View>
  );
}

function getPaymentBadge(status: PaymentStatus) {
  if (status === 'paid') {
    return { label: 'Ödənilib', variant: 'paid' as const };
  }

  if (status === 'partially_paid') {
    return { label: 'Qismən ödənilib', variant: 'partial' as const };
  }

  if (status === 'cancelled') {
    return { label: 'Ləğv edilib', variant: 'neutral' as const };
  }

  return { label: 'Ödənilməyib', variant: 'unpaid' as const };
}

const styles = StyleSheet.create({
  filters: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  list: {
    gap: spacing.md,
  },
  state: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
    gap: spacing.md,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  flex: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  muted: {
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
    minWidth: 96,
  },
  metricValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginTop: spacing.xs,
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
  modalContent: {
    gap: spacing.md,
  },
});
