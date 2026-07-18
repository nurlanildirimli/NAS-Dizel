import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, FileText } from 'lucide-react-native';

import { Header, PagePanel, Screen, StepHeader } from '../../src/components/layout';
import { Badge, Button, Card, Modal } from '../../src/components/ui';
import { getServiceDetail, softDeletePayment, softDeleteService } from '../../src/services/services';
import { colors, spacing } from '../../src/theme';
import { type ServicePayment } from '../../src/types/services';
import { type PaymentStatus } from '../../src/types/vehicles';
import { formatDate } from '../../src/utils/formatDate';
import { formatMoney } from '../../src/utils/formatMoney';

type ServiceRouteParams = {
  id?: string;
};

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<ServiceRouteParams>();
  const queryClient = useQueryClient();
  const [deleteServiceVisible, setDeleteServiceVisible] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<ServicePayment | null>(null);
  const serviceQuery = useQuery({
    queryKey: ['services', 'detail', id],
    queryFn: () => getServiceDetail(id ?? ''),
    enabled: Boolean(id),
  });
  const detail = serviceQuery.data;
  const invalidateAfterDelete = () => {
    queryClient.invalidateQueries({ queryKey: ['services'] });
    queryClient.invalidateQueries({ queryKey: ['payments'] });
    queryClient.invalidateQueries({ queryKey: ['income'] });
    queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    queryClient.invalidateQueries({ queryKey: ['reports'] });
  };
  const deleteServiceMutation = useMutation({
    mutationFn: () => softDeleteService(id ?? ''),
    onSuccess: () => {
      setDeleteServiceVisible(false);
      invalidateAfterDelete();
      router.replace('/search');
    },
  });
  const deletePaymentMutation = useMutation({
    mutationFn: () => softDeletePayment(paymentToDelete?.id ?? ''),
    onSuccess: () => {
      setPaymentToDelete(null);
      invalidateAfterDelete();
    },
  });

  return (
    <Screen>
      <Header title="Xidmət Detalı" icon={FileText} />
      <PagePanel>
        <Button title="Əvvəlki" variant="ghost" icon={ArrowLeft} onPress={() => router.back()} style={styles.backButton} />
        {serviceQuery.isLoading ? (
          <View style={styles.state}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null}
        {serviceQuery.isError || !detail ? (
          <Card>
            <View style={styles.state}>
              <Text style={styles.title}>Məlumat yüklənmədi</Text>
              <Button title="Yenidən yoxla" onPress={() => serviceQuery.refetch()} />
            </View>
          </Card>
        ) : null}
        {detail ? (
          <View style={styles.content}>
            <Card>
              <View style={styles.headerRow}>
                <View style={styles.flex}>
                  <Text style={styles.title}>#{detail.service.id.slice(0, 8)}</Text>
                  <Text style={styles.subtitle}>{formatDate(detail.service.serviceDate)}</Text>
                </View>
                <Badge {...getPaymentBadge(detail.service.paymentStatus)} />
              </View>
              <View style={styles.actions}>
                <Button
                  title="Sil"
                  variant="danger"
                  onPress={() => setDeleteServiceVisible(true)}
                  style={styles.actionButton}
                />
              </View>
              <View style={styles.section}>
                <Text style={styles.value}>{detail.vehicle.licensePlate} — {detail.vehicle.brand}</Text>
                <Text style={styles.subtitle}>Telefon: {detail.service.phone}</Text>
                <Text style={styles.subtitle}>Yürüş: {detail.service.mileage.toLocaleString('az-AZ')} km</Text>
                <Text style={styles.subtitle}>Problem təsviri: {detail.service.problemDescription}</Text>
                {detail.service.isProblemCustomerSnapshot ? (
                  <Text style={styles.danger}>Problemli müştəri: {detail.service.problemReasonSnapshot ?? '-'}</Text>
                ) : null}
              </View>
            </Card>

            <Card>
              <StepHeader title="Ümumi" />
              <View style={styles.section}>
                <Text style={styles.subtitle}>Injector: {detail.service.injectorCount} ədəd — {detail.service.injectorCompany} {detail.service.injectorCode}</Text>
                <Text style={styles.subtitle}>Seriya nömrəsi / qeyd: {detail.service.injectorSerialInfo ?? '-'}</Text>
                <Text style={styles.subtitle}>Injector xülasəsi: {detail.service.injectorSummary ?? '-'}</Text>
              </View>
            </Card>

            <Card>
              <StepHeader title="Injectorlar" />
              <View style={styles.list}>
                {detail.injectors.map((injector) => (
                  <View key={injector.id} style={styles.rowSurface}>
                    <Text style={styles.value}>Injector {injector.injectorNumber}</Text>
                    <Text style={styles.subtitle}>İlkin test: {injector.initialTestResult ?? '-'}</Text>
                    <Text style={styles.subtitle}>Son test: {injector.finalTestResult ?? '-'}</Text>
                    <Text style={styles.subtitle}>Status: {injector.injectorStatus ?? '-'}</Text>
                    <Text style={styles.subtitle}>Problem: {injector.problemFound.join(', ') || '-'}</Text>
                    <Text style={styles.subtitle}>Görülən iş: {injector.workDone.join(', ') || '-'}</Text>
                    <Text style={styles.subtitle}>Dəyişilən hissələr: {injector.partsReplaced.join(', ') || '-'}</Text>
                  </View>
                ))}
              </View>
            </Card>

            <Card>
              <StepHeader title="İşlər" />
              <LineItems items={detail.lineItems.filter((item) => item.itemType === 'labor')} />
            </Card>
            <Card>
              <StepHeader title="Hissələr" />
              <LineItems items={detail.lineItems.filter((item) => item.itemType === 'part')} />
            </Card>

            <Card>
              <StepHeader title="Qiymət" />
              <View style={styles.section}>
                <Text style={styles.subtitle}>Görülən işlər: {formatMoney(detail.service.laborTotal)}</Text>
                <Text style={styles.subtitle}>Hissələr: {formatMoney(detail.service.partsTotal)}</Text>
                <Text style={styles.subtitle}>Əlavə xidmətlər: {formatMoney(detail.service.extraTotal)}</Text>
                <Text style={styles.subtitle}>Endirim: {formatMoney(detail.service.discountAmount)}</Text>
                <Text style={styles.value}>Yekun: {formatMoney(detail.service.finalTotal)}</Text>
              </View>
            </Card>

            <Card>
              <StepHeader title="Ödəniş" />
              <View style={styles.section}>
                <Text style={styles.subtitle}>Ödənilən: {formatMoney(detail.service.paidAmount)}</Text>
                <Text style={styles.subtitle}>Qalan: {formatMoney(detail.service.remainingAmount)}</Text>
                <Text style={styles.subtitle}>Status: {getPaymentBadge(detail.service.paymentStatus).label}</Text>
                {detail.payments.map((payment) => (
                  <View key={payment.id} style={styles.paymentRow}>
                    <Text style={styles.subtitle}>
                      {formatDate(payment.paymentDate)} — {formatMoney(payment.paidAmount)}
                    </Text>
                    <Button
                      title="Sil"
                      variant="danger"
                      onPress={() => setPaymentToDelete(payment)}
                      style={styles.smallAction}
                    />
                  </View>
                ))}
              </View>
            </Card>

            <Card>
              <StepHeader title="Qeydlər" />
              <Text style={styles.subtitle}>{detail.service.technicalNotes ?? detail.service.workPerformed ?? '-'}</Text>
            </Card>
          </View>
        ) : null}
        <Modal
          cancelLabel="Əvvəlki"
          confirmLabel="Sil"
          onCancel={() => setDeleteServiceVisible(false)}
          onConfirm={() => deleteServiceMutation.mutate()}
          title="Bu xidməti silmək istəyirsiniz?"
          visible={deleteServiceVisible}
        >
          <Text style={styles.subtitle}>#{id}</Text>
          {deleteServiceMutation.isPending ? <ActivityIndicator color={colors.primary} /> : null}
        </Modal>
        <Modal
          cancelLabel="Əvvəlki"
          confirmLabel="Sil"
          onCancel={() => setPaymentToDelete(null)}
          onConfirm={() => deletePaymentMutation.mutate()}
          title="Bu ödənişi silmək istəyirsiniz?"
          visible={Boolean(paymentToDelete)}
        >
          <Text style={styles.subtitle}>{formatMoney(paymentToDelete?.paidAmount ?? 0)}</Text>
          {deletePaymentMutation.isPending ? <ActivityIndicator color={colors.primary} /> : null}
        </Modal>
      </PagePanel>
    </Screen>
  );
}

function LineItems({ items }: { items: Array<{
  id: string;
  itemName: string;
  optionName: string | null;
  quantity: number;
  defaultUnitPrice: number;
  actualUnitPrice: number;
  totalPrice: number;
  priceChanged: boolean;
}> }) {
  return (
    <View style={styles.list}>
      {items.length === 0 ? <Text style={styles.subtitle}>Nəticə tapılmadı</Text> : null}
      {items.map((item) => (
        <View key={item.id} style={styles.rowSurface}>
          <Text style={styles.value}>{item.itemName}{item.optionName ? ` — ${item.optionName}` : ''}</Text>
          <Text style={styles.subtitle}>{item.quantity} × {formatMoney(item.actualUnitPrice)} = {formatMoney(item.totalPrice)}</Text>
          {item.priceChanged ? (
            <>
              <Text style={styles.subtitle}>Model qiyməti: {formatMoney(item.defaultUnitPrice)}</Text>
              <Text style={styles.subtitle}>Bu xidmət üçün: {formatMoney(item.actualUnitPrice)}</Text>
              <Text style={styles.danger}>Qiymət dəyişdirildi</Text>
            </>
          ) : null}
        </View>
      ))}
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
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  content: {
    gap: spacing.md,
  },
  state: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
    gap: spacing.md,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  actionButton: {
    flexGrow: 1,
  },
  smallAction: {
    minHeight: 40,
  },
  paymentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  section: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  list: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  rowSurface: {
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  value: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  danger: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '800',
  },
});
