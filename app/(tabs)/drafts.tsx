import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { FileText } from 'lucide-react-native';

import { Header, PagePanel, Screen } from '../../src/components/layout';
import { Button, Card } from '../../src/components/ui';
import { deleteServiceDraft, listServiceDrafts } from '../../src/services/serviceDrafts';
import { deleteVoiceRecordingsForKey } from '../../src/services/voiceRecordings';
import { useNewServiceStore } from '../../src/store/newServiceStore';
import { colors, spacing } from '../../src/theme';
import { type NewServiceLineItemDraft } from '../../src/types/newService';
import { type ServiceDraft } from '../../src/types/serviceDrafts';
import { formatDate } from '../../src/utils/formatDate';

export default function DraftsScreen() {
  const queryClient = useQueryClient();
  const replaceDraft = useNewServiceStore((state) => state.replaceDraft);
  const draftsQuery = useQuery({
    queryKey: ['service-drafts'],
    queryFn: listServiceDrafts,
  });
  const deleteMutation = useMutation({
    mutationFn: async (draft: ServiceDraft) => {
      await deleteServiceDraft(draft.id);
      await deleteVoiceRecordingsForKey(draft.serviceNote.localRecordingKey);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-drafts'] });
    },
  });

  function handleContinue(draft: ServiceDraft) {
    replaceDraft({
      vehicle: draft.vehicle,
      injector: {
        injectorCount: draft.serviceNote.detectedInjectorCount ?? 1,
        injectorCompany: draft.serviceNote.detectedInjectorCompany || 'Unknown',
        injectorCode: draft.serviceNote.detectedInjectorCode || 'AI-NOTE',
        injectorSerialInfo: '',
        injectorModelId: null,
        useManualPricing: true,
        injectors: Array.from({ length: draft.serviceNote.detectedInjectorCount ?? 1 }, (_, index) => ({
          injectorNumber: index + 1,
          initialTestResult: '',
          finalTestResult: '',
          injectorStatus: '',
          problemFound: [],
          workDone: [],
          partsReplaced: [],
          note: draft.serviceNote.professionalText || draft.serviceNote.rawNote,
        })),
      },
      lineItems: draft.serviceNote.detectedPriceLines
        .map((line) => line.lineItem)
        .filter((lineItem): lineItem is NewServiceLineItemDraft => Boolean(lineItem)),
      payment: draft.payment,
      serviceNote: draft.serviceNote,
      currentStep: draft.serviceNote.professionalText ? 'confirm' : 'notes',
    });
    router.push('/new');
  }

  function handleDelete(draft: ServiceDraft) {
    Alert.alert(
      'Qeydi sil',
      `${draft.vehicle.licensePlate || 'Qeyd'} silinsin?`,
      [
        { text: 'Əvvəlki', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: () => deleteMutation.mutate(draft) },
      ],
    );
  }

  return (
    <Screen noBottomPadding backgroundColor={colors.surface}>
      <Header title="Yadda saxlanılanlar" icon={FileText} compact />
      <PagePanel edgeToEdge compact fill>
        {draftsQuery.isLoading ? (
          <View style={styles.state}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null}

        {draftsQuery.isError ? (
          <Card>
            <View style={styles.state}>
              <Text style={styles.stateText}>Məlumat yüklənmədi</Text>
              <Button title="Yenidən yoxla" onPress={() => draftsQuery.refetch()} />
            </View>
          </Card>
        ) : null}

        {draftsQuery.data?.length === 0 ? (
          <Card>
            <View style={styles.state}>
              <FileText color={colors.primary} size={34} />
              <Text style={styles.stateText}>Yadda saxlanılan qeyd yoxdur</Text>
            </View>
          </Card>
        ) : null}

        <View style={styles.list}>
          {draftsQuery.data?.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              onContinue={() => handleContinue(draft)}
              onDelete={() => handleDelete(draft)}
            />
          ))}
        </View>
      </PagePanel>
    </Screen>
  );
}

function DraftCard({
  draft,
  onContinue,
  onDelete,
}: {
  draft: ServiceDraft;
  onContinue: () => void;
  onDelete: () => void;
}) {
  const title = [
    draft.vehicle.licensePlate || 'Nömrəsiz',
    draft.vehicle.brand || null,
  ].filter(Boolean).join(' — ');
  const preview = draft.serviceNote.professionalText || draft.serviceNote.rawNote || 'Qeyd yoxdur';

  return (
    <Card>
      <View style={styles.cardHeader}>
        <View style={styles.textBlock}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.meta}>Yenilənib: {formatDate(draft.updatedAt)}</Text>
        </View>
        <Text style={styles.status}>{draft.status === 'ready' ? 'Hazır' : 'Qaralama'}</Text>
      </View>
      <Text numberOfLines={3} style={styles.preview}>{preview}</Text>
      <View style={styles.actions}>
        <Button title="Davam et" onPress={onContinue} style={styles.actionButton} />
        <Button title="Sil" variant="danger" onPress={onDelete} style={styles.actionButton} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  list: {
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
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  textBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  status: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  preview: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginTop: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
});
