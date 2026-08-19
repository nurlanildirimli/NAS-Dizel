import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAudioPlayer,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { router, useLocalSearchParams } from 'expo-router';
import { FileText, Mic, Play, PlusCircle, Sparkles, Square, Trash2 } from 'lucide-react-native';

import { PlateInput } from '../../src/components/forms';
import { Header, PagePanel, Screen, StepHeader } from '../../src/components/layout';
import { Button, Card, Input, Modal, Toggle } from '../../src/components/ui';
import { newServiceVehicleSchema } from '../../src/schemas/newService';
import { findInjectorModel, getModelPrices, getPriceCatalog } from '../../src/services/catalog';
import { buildTextServiceLineItems, saveService } from '../../src/services/newService';
import { generateProfessionalServiceNote } from '../../src/services/professionalServiceNote';
import { transcribeServiceNoteAudio } from '../../src/services/serviceNoteTranscription';
import { markServiceDraftSaved, saveServiceDraft } from '../../src/services/serviceDrafts';
import { checkVehicleByPlate, getVehicleSummary } from '../../src/services/vehicles';
import {
  addVoiceRecording,
  deleteVoiceRecording,
  deleteVoiceRecordingsForKey,
  listVoiceRecordings,
  updateVoiceRecording,
} from '../../src/services/voiceRecordings';
import { useNewServiceStore } from '../../src/store/newServiceStore';
import { colors, spacing } from '../../src/theme';
import { type NewServiceLineItemDraft, type NewServiceNoteDraft } from '../../src/types/newService';
import { type VehicleSummary } from '../../src/types/vehicles';
import { type VoiceRecordingDraft } from '../../src/types/voiceRecordings';
import { calculateNewServiceTotals } from '../../src/utils/calculateNewServiceTotals';
import { formatAiError } from '../../src/utils/aiErrors';
import { formatDate } from '../../src/utils/formatDate';
import { formatMoney } from '../../src/utils/formatMoney';
import {
  buildProfessionalNotePriceSuggestion,
  type ProfessionalNotePricingResult,
} from '../../src/utils/professionalNotePricing';
import { reconcileServiceLineItemsForConfirmedPrice } from '../../src/utils/reconcileServiceLineItems';

const vehicleBrandOptions = [
  'Toyota',
  'Mercedes',
  'Hyundai',
  'Kia',
  'Ford',
  'BMW',
  'Audi',
  'Volkswagen',
  'Nissan',
  'Mitsubishi',
  'Opel',
  'Chevrolet',
  'Renault',
  'Peugeot',
  'Citroen',
  'Fiat',
  'Iveco',
  'Isuzu',
  'MAN',
  'DAF',
  'Volvo',
  'Scania',
] as const;

type FieldErrors = Record<string, string>;

export default function NewScreen() {
  const { vehicleId } = useLocalSearchParams<{ vehicleId?: string }>();
  const queryClient = useQueryClient();
  const {
    currentStep,
    vehicle,
    injector,
    lineItems,
    payment,
    serviceNote,
    setStep,
    updateVehicle,
    updatePayment,
    updateServiceNote,
    setLineItems,
    removeLineItem,
    updateLineItem,
    selectExistingVehicle,
    startNewVehicleRecord,
    reset,
  } = useNewServiceStore();
  const [vehicleErrors, setVehicleErrors] = useState<FieldErrors>({});
  const [noteErrors, setNoteErrors] = useState<FieldErrors>({});
  const [confirmErrors, setConfirmErrors] = useState<FieldErrors>({});
  const [lookupVehicle, setLookupVehicle] = useState<VehicleSummary | null>(null);
  const [lookupNotFound, setLookupNotFound] = useState(false);
  const [isCheckingVehicle, setIsCheckingVehicle] = useState(false);
  const [mileageWarningVisible, setMileageWarningVisible] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [restartModalVisible, setRestartModalVisible] = useState(false);
  const [transcriptModalVisible, setTranscriptModalVisible] = useState(false);
  const [transcriptDraft, setTranscriptDraft] = useState('');
  const [missingInfoModalVisible, setMissingInfoModalVisible] = useState(false);
  const [selectedMissingInfo, setSelectedMissingInfo] = useState('');
  const [missingInfoDraft, setMissingInfoDraft] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [prefillDisabled, setPrefillDisabled] = useState(false);
  const lastCheckedPlateRef = useRef('');
  const pendingTranscriptionWarningsRef = useRef<string[]>([]);

  const baseLineItems = useMemo(
    () => lineItems.length > 0 ? lineItems : buildTextServiceLineItems(serviceNote.priceTotal),
    [lineItems, serviceNote.priceTotal],
  );
  const reconciledService = useMemo(
    () => reconcileServiceLineItemsForConfirmedPrice(baseLineItems, payment, serviceNote.priceTotal),
    [baseLineItems, payment, serviceNote.priceTotal],
  );
  const totals = calculateNewServiceTotals(reconciledService.lineItems, reconciledService.payment);

  const prefillQuery = useQuery({
    queryKey: ['vehicles', 'summary', vehicleId],
    queryFn: () => getVehicleSummary(vehicleId ?? ''),
    enabled: Boolean(vehicleId),
  });

  const voiceRecordingsQuery = useQuery({
    queryKey: ['voice-recordings', serviceNote.localRecordingKey],
    queryFn: () => listVoiceRecordings(serviceNote.localRecordingKey),
  });

  useEffect(() => {
    if (prefillDisabled || !prefillQuery.data || vehicle.selectedVehicleId === prefillQuery.data.id) {
      return;
    }

    selectExistingVehicle(mapVehicleToDraft(prefillQuery.data));
  }, [prefillDisabled, prefillQuery.data, selectExistingVehicle, vehicle.selectedVehicleId]);

  useEffect(() => {
    const plate = vehicle.licensePlate.trim();

    if (!plate) {
      lastCheckedPlateRef.current = '';
      const timeoutId = setTimeout(() => {
        setLookupVehicle(null);
        setLookupNotFound(false);
        setIsCheckingVehicle(false);
      }, 0);

      return () => clearTimeout(timeoutId);
    }

    if (plate === lastCheckedPlateRef.current) {
      return;
    }

    let cancelled = false;
    const timeoutId = setTimeout(() => {
      lastCheckedPlateRef.current = plate;
      setLookupVehicle(null);
      setLookupNotFound(false);
      setIsCheckingVehicle(true);

      checkVehicleByPlate(plate)
        .then((foundVehicle) => {
          if (cancelled || vehicle.licensePlate.trim() !== plate) {
            return;
          }

          setLookupVehicle(foundVehicle);
          setLookupNotFound(!foundVehicle);

          if (foundVehicle) {
            selectExistingVehicle(mapVehicleToDraft(foundVehicle));
          } else if (vehicle.selectedVehicleId) {
            startNewVehicleRecord();
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsCheckingVehicle(false);
          }
        });
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [
    selectExistingVehicle,
    startNewVehicleRecord,
    vehicle.licensePlate,
    vehicle.selectedVehicleId,
  ]);

  const selectedPrefillVehicle = prefillQuery.data && vehicle.selectedVehicleId === prefillQuery.data.id
    ? prefillQuery.data
    : null;
  const displayedLookupVehicle = lookupVehicle ?? selectedPrefillVehicle;

  const generateNoteMutation = useMutation({
    mutationFn: (rawNote: string) => generateProfessionalServiceNote({
      vehicle: {
        licensePlate: vehicle.licensePlate,
        brand: vehicle.brand,
        phone: vehicle.phone,
        mileage: vehicle.mileage,
        problemDescription: vehicle.problemDescription,
      },
      rawNote,
    }),
    onSuccess: async (result) => {
      const pricing: ProfessionalNotePricingResult = await buildAiPricingSuggestion(result).catch((error) => ({
        priceLines: result.priceLines,
        priceTotal: result.priceTotal,
        warnings: [
          error instanceof Error ? error.message : 'AI qiymət hesablanmadı.',
        ],
      }));
      const generatedLineItems = pricing.priceLines
        .map((line) => line.lineItem)
        .filter((lineItem): lineItem is NewServiceLineItemDraft => Boolean(lineItem));
      updateServiceNote({
        professionalText: result.professionalText,
        warnings: [...pendingTranscriptionWarningsRef.current, ...result.warnings, ...pricing.warnings],
        missingInfo: result.missingInfo,
        detectedPriceLines: pricing.priceLines,
        priceTotal: String(pricing.priceTotal),
        detectedInjectorCount: result.injector.count,
        detectedInjectorCompany: result.injector.company ?? '',
        detectedInjectorCode: result.injector.code ?? '',
      });
      setLineItems(generatedLineItems);
      pendingTranscriptionWarningsRef.current = [];
      setNoteErrors({});
      setConfirmErrors({});
      setTranscriptModalVisible(false);
      setStep('confirm');
    },
  });

  async function buildAiPricingSuggestion(result: Awaited<ReturnType<typeof generateProfessionalServiceNote>>) {
    const catalog = await getPriceCatalog();
    const model = result.injector.company && result.injector.code
      ? await findInjectorModel(result.injector.company, result.injector.code)
      : null;
    const modelPrices = model ? await getModelPrices(model.id) : [];

    return buildProfessionalNotePriceSuggestion(result, catalog, modelPrices);
  }

  const draftMutation = useMutation({
    mutationFn: () => saveServiceDraft({
      id: serviceNote.draftId,
      vehicle,
      serviceNote,
      payment,
      status: serviceNote.professionalText ? 'ready' : 'draft',
    }),
    onSuccess: (draft) => {
      updateServiceNote({ draftId: draft.id });
      queryClient.invalidateQueries({ queryKey: ['service-drafts'] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => saveService({
      vehicle,
      injector,
      lineItems: reconciledService.lineItems,
      payment: reconciledService.payment,
      serviceNote,
    }),
    onSuccess: async (result) => {
      if (serviceNote.draftId) {
        await markServiceDraftSaved(serviceNote.draftId);
      }
      await deleteVoiceRecordingsForKey(serviceNote.localRecordingKey);

      reset();
      setSaveModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ['service-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['income'] });
      router.push(`/services/${result.service_id}`);
    },
  });

  function handleChangeVehicle(patch: Partial<typeof vehicle>) {
    updateVehicle(patch);

    const changedFields = Object.keys(patch);
    if (changedFields.length > 0) {
      setVehicleErrors((currentErrors) => {
        const nextErrors = { ...currentErrors };
        changedFields.forEach((field) => {
          delete nextErrors[field];
        });
        return nextErrors;
      });
    }

    if (Object.prototype.hasOwnProperty.call(patch, 'licensePlate')) {
      setLookupVehicle(null);
      setLookupNotFound(false);
    }
  }

  function handleSelectExisting(foundVehicle: VehicleSummary) {
    setPrefillDisabled(false);
    selectExistingVehicle(mapVehicleToDraft(foundVehicle));
    setLookupVehicle(foundVehicle);
    setLookupNotFound(false);
    setVehicleErrors({});
  }

  function handleContinueToNotes() {
    const result = newServiceVehicleSchema.safeParse(vehicle);

    if (!result.success) {
      setVehicleErrors(getFieldErrors(result.error.issues));
      return;
    }

    setVehicleErrors({});

    if (shouldWarnAboutLowerMileage()) {
      setMileageWarningVisible(true);
      return;
    }

    continueToNotes();
  }

  function continueToNotes() {
    setMileageWarningVisible(false);
    setStep('notes');
  }

  function shouldWarnAboutLowerMileage() {
    if (!vehicle.selectedVehicleId || vehicle.previousMileage === null) {
      return false;
    }

    return Number(vehicle.mileage) < vehicle.previousMileage;
  }

  async function handleVoiceRecordingAdded(recording: { uri: string; durationMs: number }) {
    await addVoiceRecording({
      localRecordingKey: serviceNote.localRecordingKey,
      uri: recording.uri,
      durationMs: recording.durationMs,
    });
    queryClient.invalidateQueries({ queryKey: ['voice-recordings', serviceNote.localRecordingKey] });
  }

  async function handleDeleteVoiceRecording(id: string) {
    await deleteVoiceRecording(id);
    queryClient.invalidateQueries({ queryKey: ['voice-recordings', serviceNote.localRecordingKey] });
  }

  async function buildReviewedTranscript() {
    const recordings = await listVoiceRecordings(serviceNote.localRecordingKey);
    const transcriptionWarnings: string[] = [];
    const transcripts: string[] = [];

    for (const recording of recordings) {
      if (recording.status === 'transcribed' && recording.transcript.trim()) {
        transcripts.push(recording.transcript.trim());
        transcriptionWarnings.push(...recording.warnings);
        continue;
      }

      await updateVoiceRecording(recording.id, { status: 'transcribing' });
      queryClient.invalidateQueries({ queryKey: ['voice-recordings', serviceNote.localRecordingKey] });

      try {
        const result = await transcribeServiceNoteAudio(recording.uri, recording.durationMs);
        await updateVoiceRecording(recording.id, {
          transcript: result.transcript,
          warnings: result.warnings,
          status: 'transcribed',
        });
        if (result.transcript.trim()) {
          transcripts.push(result.transcript.trim());
        }
        transcriptionWarnings.push(...result.warnings);
      } catch (error) {
        const message = formatAiError(error);
        await updateVoiceRecording(recording.id, {
          status: 'failed',
          warnings: [message],
        });
        throw error;
      } finally {
        queryClient.invalidateQueries({ queryKey: ['voice-recordings', serviceNote.localRecordingKey] });
      }
    }

    pendingTranscriptionWarningsRef.current = transcriptionWarnings;

    return [
      serviceNote.rawNote.trim(),
      ...transcripts.map((transcript, index) => `Səs qeydi ${index + 1}: ${transcript}`),
    ].filter(Boolean).join('\n\n');
  }

  async function handleGenerateProfessionalNote() {
    const recordings = await listVoiceRecordings(serviceNote.localRecordingKey);

    if (!serviceNote.rawNote.trim() && recordings.length === 0) {
      setNoteErrors({ rawNote: 'Bu sahə mütləqdir' });
      return;
    }

    setNoteErrors({});
    setIsTranscribing(true);

    try {
      const reviewedTranscript = await buildReviewedTranscript();
      setTranscriptDraft(reviewedTranscript);
      setTranscriptModalVisible(true);
    } catch (error) {
      const message = formatAiError(error);
      setNoteErrors({ rawNote: message });
    } finally {
      setIsTranscribing(false);
    }
  }

  function handleConfirmTranscript() {
    if (generateNoteMutation.isPending) {
      return;
    }

    const rawNote = transcriptDraft.trim();

    if (!rawNote) {
      setNoteErrors({ rawNote: 'Bu sahə mütləqdir' });
      return;
    }

    updateServiceNote({ rawNote });
    generateNoteMutation.mutate(rawNote);
  }

  function handleOpenMissingInfo(missingInfo: string) {
    setSelectedMissingInfo(missingInfo);
    setMissingInfoDraft('');
    setMissingInfoModalVisible(true);
  }

  function handleConfirmMissingInfo() {
    if (generateNoteMutation.isPending) {
      return;
    }

    const extraInfo = missingInfoDraft.trim();

    if (!extraInfo) {
      return;
    }

    const rawNote = [
      serviceNote.rawNote.trim(),
      `Əlavə məlumat (${selectedMissingInfo || 'AI qeydi'}): ${extraInfo}`,
    ].filter(Boolean).join('\n\n');

    pendingTranscriptionWarningsRef.current = [];
    updateServiceNote({ rawNote });
    setMissingInfoModalVisible(false);
    setMissingInfoDraft('');
    setSelectedMissingInfo('');
    generateNoteMutation.mutate(rawNote);
  }

  function handleContinueToConfirm() {
    if (!serviceNote.professionalText.trim()) {
      setNoteErrors({ professionalText: 'Əvvəlcə səliqəli servis mətni yaradın' });
      return;
    }

    setNoteErrors({});
    setStep('confirm');
  }

  function handleUpdateDetailPrice(id: string, actualUnitPrice: string) {
    updateLineItem(id, { actualUnitPrice });
    const nextLineItems = lineItems.map((lineItem) => (
      lineItem.id === id ? { ...lineItem, actualUnitPrice } : lineItem
    ));
    const nextPriceLines = serviceNote.detectedPriceLines.map((line) => {
      if (line.lineItem?.id !== id) {
        return line;
      }

      const updatedLineItem = {
        ...line.lineItem,
        actualUnitPrice,
      };
      const quantity = Math.max(1, Number(updatedLineItem.quantity) || 1);
      const amount = quantity * Math.max(0, Number(actualUnitPrice) || 0);

      return {
        ...line,
        amount,
        lineItem: updatedLineItem,
      };
    });

    updateServiceNote({
      detectedPriceLines: nextPriceLines,
      priceTotal: String(sumLineItems(nextLineItems)),
    });
  }

  function handleRemoveDetail(id: string) {
    removeLineItem(id);
    const nextLineItems = lineItems.filter((lineItem) => lineItem.id !== id);
    updateServiceNote({
      detectedPriceLines: serviceNote.detectedPriceLines.filter((line) => line.lineItem?.id !== id),
      priceTotal: String(sumLineItems(nextLineItems)),
    });
  }

  function handleSaveConfirm() {
    const vehicleResult = newServiceVehicleSchema.safeParse(vehicle);
    const paidAmount = Number(payment.paidAmount || 0);

    if (!vehicleResult.success) {
      setConfirmErrors(getFieldErrors(vehicleResult.error.issues));
      setStep('vehicle');
      return;
    }

    if (!serviceNote.professionalText.trim()) {
      setConfirmErrors({ professionalText: 'Servis mətni mütləqdir' });
      return;
    }

    if (vehicle.isProblemCustomer && vehicle.problemReason.trim().length === 0) {
      setConfirmErrors({ problemReason: 'Bu sahə mütləqdir' });
      return;
    }

    if (paidAmount > totals.finalTotal) {
      setConfirmErrors({ paidAmount: 'Ödənilən məbləğ yekundan çox ola bilməz' });
      return;
    }

    setConfirmErrors({});
    setSaveModalVisible(true);
  }

  function handleRestart() {
    deleteVoiceRecordingsForKey(serviceNote.localRecordingKey).catch(() => {});
    reset();
    setPrefillDisabled(true);
    setVehicleErrors({});
    setNoteErrors({});
    setConfirmErrors({});
    setLookupVehicle(null);
    setLookupNotFound(false);
    setIsCheckingVehicle(false);
    setMileageWarningVisible(false);
    setSaveModalVisible(false);
    setRestartModalVisible(false);
    lastCheckedPlateRef.current = '';
  }

  return (
    <Screen noBottomPadding backgroundColor={colors.surface}>
      <Header
        title="Yeni"
        icon={PlusCircle}
        compact
        action={(
          <Button
            title="Baştan başla"
            variant="secondary"
            size="compact"
            onPress={() => setRestartModalVisible(true)}
            style={styles.headerRestartButton}
          />
        )}
      />
      <PagePanel edgeToEdge compact fill>
        <View style={styles.stepTabs}>
          <Button
            title="Avtomobil"
            variant={currentStep === 'vehicle' ? 'primary' : 'secondary'}
            onPress={() => setStep('vehicle')}
            size="compact"
            style={styles.stepTab}
          />
          <Button
            title="Qeydlər"
            variant={currentStep === 'notes' ? 'primary' : 'secondary'}
            onPress={handleContinueToNotes}
            size="compact"
            style={styles.stepTab}
          />
          <Button
            title="Təsdiq"
            variant={currentStep === 'confirm' ? 'primary' : 'secondary'}
            onPress={handleContinueToConfirm}
            size="compact"
            style={styles.stepTab}
          />
        </View>

        {prefillQuery.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null}

        {currentStep === 'vehicle' ? (
          <VehicleStep
            errors={vehicleErrors}
            isCheckingVehicle={isCheckingVehicle}
            lookupNotFound={lookupNotFound}
            lookupVehicle={displayedLookupVehicle}
            onChange={handleChangeVehicle}
            onContinue={handleContinueToNotes}
            onSelectExisting={handleSelectExisting}
            onStartNew={() => {
              startNewVehicleRecord();
              setLookupVehicle(null);
              setLookupNotFound(false);
            }}
            vehicle={vehicle}
          />
        ) : null}

        {currentStep === 'notes' ? (
          <NotesStep
            errors={noteErrors}
            generateError={generateNoteMutation.isError}
            generateErrorMessage={generateNoteMutation.error ? formatAiError(generateNoteMutation.error) : ''}
            isGenerating={generateNoteMutation.isPending}
            isSavingDraft={draftMutation.isPending}
            isTranscribing={isTranscribing}
            onBack={() => setStep('vehicle')}
            onChange={updateServiceNote}
            onDeleteRecording={handleDeleteVoiceRecording}
            onGenerate={handleGenerateProfessionalNote}
            onNext={handleContinueToConfirm}
            onRecordingAdded={handleVoiceRecordingAdded}
            onSaveDraft={() => draftMutation.mutate()}
            recordings={voiceRecordingsQuery.data ?? []}
            serviceNote={serviceNote}
          />
        ) : null}

        {currentStep === 'confirm' ? (
          <ConfirmStep
            errors={confirmErrors}
            isGenerating={generateNoteMutation.isPending}
            isSavingDraft={draftMutation.isPending}
            onAddMissingInfo={handleOpenMissingInfo}
            onBack={() => setStep('notes')}
            onChangeNote={updateServiceNote}
            onChangePayment={updatePayment}
            onChangeVehicle={updateVehicle}
            onRemoveLineItem={handleRemoveDetail}
            onUpdateLineItemPrice={handleUpdateDetailPrice}
            onSave={handleSaveConfirm}
            onSaveDraft={() => draftMutation.mutate()}
            payment={payment}
            reconciliationNote={reconciledService.note}
            saveError={saveMutation.isError}
            serviceNote={serviceNote}
            lineItems={lineItems}
            totals={totals}
            vehicle={vehicle}
          />
        ) : null}

        <Modal
          cancelLabel="Bağla"
          confirmLabel={generateNoteMutation.isPending ? 'Hazırlanır...' : 'Təsdiqlə'}
          onCancel={() => setTranscriptModalVisible(false)}
          onConfirm={handleConfirmTranscript}
          title="Mətni təsdiqlə"
          visible={transcriptModalVisible}
        >
          <Text style={styles.lookupText}>
            Səs qeydlərindən alınan mətni yoxlayın. Lazımdırsa düzəliş edin.
          </Text>
          <Input
            multiline
            numberOfLines={10}
            onChangeText={setTranscriptDraft}
            size="compact"
            style={styles.transcriptInput}
            textAlignVertical="top"
            value={transcriptDraft}
          />
          {generateNoteMutation.isPending ? <ActivityIndicator color={colors.primary} /> : null}
        </Modal>
        <Modal
          cancelLabel="Bağla"
          confirmLabel={generateNoteMutation.isPending ? 'Hazırlanır...' : 'Təsdiqlə'}
          onCancel={() => setMissingInfoModalVisible(false)}
          onConfirm={handleConfirmMissingInfo}
          title="Əlavə məlumat"
          visible={missingInfoModalVisible}
        >
          <Text style={styles.lookupTitle}>{selectedMissingInfo}</Text>
          <Text style={styles.lookupText}>
            Bu məlumat servis qeydinə əlavə olunacaq və mətn yenidən hazırlanacaq.
          </Text>
          <Input
            multiline
            numberOfLines={6}
            onChangeText={setMissingInfoDraft}
            placeholder="Məsələn: 4 forsunka var, Delphi, kod 1..."
            size="compact"
            style={styles.missingInfoInput}
            textAlignVertical="top"
            value={missingInfoDraft}
          />
          {generateNoteMutation.isPending ? <ActivityIndicator color={colors.primary} /> : null}
        </Modal>
        <Modal
          cancelLabel="Əvvəlki"
          confirmLabel="Növbəti"
          onCancel={() => setMileageWarningVisible(false)}
          onConfirm={continueToNotes}
          title="Yeni yürüş əvvəlki yürüşdən azdır. Davam etmək istəyirsiniz?"
          visible={mileageWarningVisible}
        >
          <Text style={styles.lookupText}>
            Son yürüş: {vehicle.previousMileage?.toLocaleString('az-AZ')} km
          </Text>
          <Text style={styles.lookupText}>
            Yeni yürüş: {Number(vehicle.mileage || 0).toLocaleString('az-AZ')} km
          </Text>
        </Modal>
        <Modal
          cancelLabel="Əvvəlki"
          confirmLabel="Təsdiqlə və saxla"
          onCancel={() => setSaveModalVisible(false)}
          onConfirm={() => saveMutation.mutate()}
          title="Təsdiq"
          visible={saveModalVisible}
        >
          <Text style={styles.lookupText}>Yekun: {formatMoney(totals.finalTotal)}</Text>
          <Text style={styles.lookupText}>Ödənilən: {formatMoney(totals.paidAmount)}</Text>
          <Text style={styles.lookupText}>Qalan: {formatMoney(totals.remainingAmount)}</Text>
          {saveMutation.isPending ? <ActivityIndicator color={colors.primary} /> : null}
        </Modal>
        <Modal
          cancelLabel="Əvvəlki"
          confirmLabel="Baştan başla"
          onCancel={() => setRestartModalVisible(false)}
          onConfirm={handleRestart}
          title="Formu başdan başlamaq istəyirsiniz?"
          visible={restartModalVisible}
        >
          <Text style={styles.lookupText}>Daxil etdiyiniz xidmət məlumatları silinəcək.</Text>
        </Modal>
      </PagePanel>
    </Screen>
  );
}

function VehicleStep({
  vehicle,
  errors,
  lookupVehicle,
  lookupNotFound,
  isCheckingVehicle,
  onChange,
  onSelectExisting,
  onStartNew,
  onContinue,
}: {
  vehicle: ReturnType<typeof useNewServiceStore.getState>['vehicle'];
  errors: FieldErrors;
  lookupVehicle: VehicleSummary | null;
  lookupNotFound: boolean;
  isCheckingVehicle: boolean;
  onChange: (patch: Partial<typeof vehicle>) => void;
  onSelectExisting: (vehicle: VehicleSummary) => void;
  onStartNew: () => void;
  onContinue: () => void;
}) {
  return (
    <Card>
      <StepHeader title="Avtomobil" stepLabel="1 / 3" />
      <View style={styles.form}>
        <PlateInput
          error={errors.licensePlate}
          label="Dövlət nömrəsi"
          onChangeText={(licensePlate) => onChange({ licensePlate })}
          placeholder="90-PP-123"
          required
          value={vehicle.licensePlate}
        />
        {isCheckingVehicle ? (
          <View style={styles.lookupStatus}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.lookupText}>Avtomobil yoxlanılır...</Text>
          </View>
        ) : null}

        {lookupVehicle ? (
          <VehicleLookupCard
            vehicle={lookupVehicle}
            onSelectExisting={() => onSelectExisting(lookupVehicle)}
            onStartNew={onStartNew}
          />
        ) : null}

        {lookupNotFound ? (
          <View style={styles.lookupSurface}>
            <Text style={styles.lookupTitle}>Bu avtomobil bazada yoxdur.</Text>
            <Text style={styles.lookupText}>Yeni avtomobil kimi əlavə edin.</Text>
          </View>
        ) : null}

        <BrandSuggestInput
          error={errors.brand}
          label="Marka"
          onChangeText={(brand) => onChange({ brand })}
          placeholder="Toyota"
          required
          size="compact"
          value={vehicle.brand}
        />
        <Input
          error={errors.phone}
          keyboardType="phone-pad"
          label="Telefon"
          onChangeText={(phone) => onChange({ phone })}
          placeholder="050 123 45 67"
          required
          size="compact"
          value={vehicle.phone}
        />
        <Input
          error={errors.mileage}
          keyboardType="numeric"
          label="Yürüş"
          onChangeText={(mileage) => onChange({ mileage })}
          placeholder="214000"
          required
          size="compact"
          value={vehicle.mileage}
        />
        <Input
          error={errors.problemDescription}
          label="Problem təsviri"
          onChangeText={(problemDescription) => onChange({ problemDescription })}
          placeholder="Soyuqda gec işə düşür"
          size="compact"
          value={vehicle.problemDescription}
        />
        <Button title="Növbəti" onPress={onContinue} />
      </View>
    </Card>
  );
}

function NotesStep({
  serviceNote,
  recordings,
  errors,
  isGenerating,
  isTranscribing,
  isSavingDraft,
  generateError,
  generateErrorMessage,
  onChange,
  onRecordingAdded,
  onDeleteRecording,
  onBack,
  onGenerate,
  onSaveDraft,
  onNext,
}: {
  serviceNote: NewServiceNoteDraft;
  recordings: VoiceRecordingDraft[];
  errors: FieldErrors;
  isGenerating: boolean;
  isTranscribing: boolean;
  isSavingDraft: boolean;
  generateError: boolean;
  generateErrorMessage: string;
  onChange: (patch: Partial<NewServiceNoteDraft>) => void;
  onRecordingAdded: (recording: { uri: string; durationMs: number }) => Promise<void>;
  onDeleteRecording: (id: string) => Promise<void>;
  onBack: () => void;
  onGenerate: () => Promise<void>;
  onSaveDraft: () => void;
  onNext: () => void;
}) {
  const recorder = useAudioRecorder({
    ...RecordingPresets.LOW_QUALITY,
    directory: 'document',
  });
  const recorderState = useAudioRecorderState(recorder, 250);
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const [recordingError, setRecordingError] = useState('');
  const [activeRecordingActionId, setActiveRecordingActionId] = useState<string | null>(null);

  async function startRecording() {
    setRecordingError('');
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setRecordingError('Mikrofon icazəsi verilməyib.');
      return;
    }

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });
    await recorder.prepareToRecordAsync();
    recorder.record();
  }

  async function stopRecording() {
    setRecordingError('');
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false });
    const uri = recorder.uri ?? recorderState.url;

    if (!uri) {
      setRecordingError('Səs yazısı saxlanmadı.');
      return;
    }

    await onRecordingAdded({
      uri,
      durationMs: recorderState.durationMillis,
    });
  }

  function playRecording(uri: string) {
    playerRef.current?.pause();
    const player = createAudioPlayer(uri);
    playerRef.current = player;
    player.play();
  }

  async function deleteRecording(id: string) {
    setActiveRecordingActionId(id);
    try {
      await onDeleteRecording(id);
    } finally {
      setActiveRecordingActionId(null);
    }
  }

  return (
    <Card>
      <StepHeader title="Qeydlər" stepLabel="2 / 3" />
      <View style={styles.form}>
        <View style={styles.voicePanel}>
          <View style={styles.voiceHeader}>
            <View>
              <Text style={styles.modelTitle}>Səs qeydləri</Text>
              <Text style={styles.lookupText}>
                {recordings.length > 0 ? `${recordings.length} səs qeydi` : 'Səs qeydi yoxdur'}
              </Text>
            </View>
            <Button
              icon={recorderState.isRecording ? Square : Mic}
              title={recorderState.isRecording ? `Dayandır ${formatDuration(recorderState.durationMillis)}` : 'Səs yaz'}
              variant={recorderState.isRecording ? 'danger' : 'secondary'}
              size="compact"
              onPress={recorderState.isRecording ? stopRecording : startRecording}
              style={styles.recordButton}
            />
          </View>
          {recordingError ? <Text style={styles.errorText}>{recordingError}</Text> : null}
          {recordings.length > 0 ? (
            <View style={styles.recordingsList}>
              {recordings.map((recording, index) => (
                <View key={recording.id} style={styles.recordingRow}>
                  <View style={styles.recordingInfo}>
                    <Text style={styles.recordingTitle}>Səs qeydi {index + 1}</Text>
                    <Text style={styles.lookupText}>
                      {formatDuration(recording.durationMs)} • {getRecordingStatusLabel(recording.status)}
                    </Text>
                    {recording.transcript ? (
                      <Text numberOfLines={2} style={styles.recordingTranscript}>{recording.transcript}</Text>
                    ) : null}
                    {recording.status === 'failed' && recording.warnings.length > 0 ? (
                      <Text numberOfLines={3} style={styles.errorText}>{recording.warnings[0]}</Text>
                    ) : null}
                  </View>
                  <View style={styles.recordingActions}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => playRecording(recording.uri)}
                      style={styles.iconButton}
                    >
                      <Play color={colors.primary} size={18} strokeWidth={2.5} />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={activeRecordingActionId === recording.id}
                      onPress={() => deleteRecording(recording.id)}
                      style={styles.iconButton}
                    >
                      <Trash2 color={colors.danger} size={18} strokeWidth={2.5} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>
        <Input
          error={errors.rawNote}
          label="Servis qeydi"
          multiline
          numberOfLines={8}
          onChangeText={(rawNote) => onChange({ rawNote })}
          placeholder="Forsunkalar söküldü, stenddə yoxlanıldı..."
          required
          size="compact"
          style={styles.noteInput}
          textAlignVertical="top"
          value={serviceNote.rawNote}
        />
        <View style={styles.actions}>
          <Button
            icon={FileText}
            title={isSavingDraft ? 'Saxlanılır...' : 'Yadda saxla'}
            variant="secondary"
            onPress={onSaveDraft}
            disabled={isSavingDraft}
            style={styles.actionButton}
          />
          <Button
            icon={Sparkles}
            title={isTranscribing ? 'Səs mətnə çevrilir...' : isGenerating ? 'Hazırlanır...' : 'Səliqəli və peşəkar formada yaz'}
            onPress={onGenerate}
            disabled={isGenerating || isTranscribing}
            style={styles.actionButton}
          />
        </View>
        {isGenerating || isTranscribing ? <ActivityIndicator color={colors.primary} /> : null}
        {generateError ? (
          <Text style={styles.errorText}>{generateErrorMessage || 'AI servis mətnini hazırlaya bilmədi.'}</Text>
        ) : null}
        {serviceNote.professionalText ? (
          <View style={styles.lookupSurface}>
            <Text style={styles.lookupTitle}>Hazırlanmış mətn</Text>
            <Text style={styles.bodyText}>{serviceNote.professionalText}</Text>
          </View>
        ) : null}
        {errors.professionalText ? <Text style={styles.errorText}>{errors.professionalText}</Text> : null}
        <View style={styles.actions}>
          <Button title="Əvvəlki" variant="secondary" onPress={onBack} style={styles.actionButton} />
          <Button title="Təsdiqə keç" onPress={onNext} style={styles.actionButton} />
        </View>
      </View>
    </Card>
  );
}

function ConfirmStep({
  vehicle,
  serviceNote,
  lineItems,
  payment,
  totals,
  errors,
  saveError,
  isGenerating,
  isSavingDraft,
  reconciliationNote,
  onChangeNote,
  onChangePayment,
  onChangeVehicle,
  onUpdateLineItemPrice,
  onRemoveLineItem,
  onAddMissingInfo,
  onBack,
  onSaveDraft,
  onSave,
}: {
  vehicle: ReturnType<typeof useNewServiceStore.getState>['vehicle'];
  serviceNote: NewServiceNoteDraft;
  lineItems: ReturnType<typeof useNewServiceStore.getState>['lineItems'];
  payment: ReturnType<typeof useNewServiceStore.getState>['payment'];
  totals: ReturnType<typeof calculateNewServiceTotals>;
  errors: FieldErrors;
  saveError: boolean;
  isGenerating: boolean;
  isSavingDraft: boolean;
  reconciliationNote: string;
  onChangeNote: (patch: Partial<NewServiceNoteDraft>) => void;
  onChangePayment: (patch: Partial<typeof payment>) => void;
  onChangeVehicle: (patch: Partial<typeof vehicle>) => void;
  onUpdateLineItemPrice: (id: string, actualUnitPrice: string) => void;
  onRemoveLineItem: (id: string) => void;
  onAddMissingInfo: (missingInfo: string) => void;
  onBack: () => void;
  onSaveDraft: () => void;
  onSave: () => void;
}) {
  return (
    <Card>
      <StepHeader title="Təsdiq" stepLabel="3 / 3" />
      <View style={styles.confirmBlock}>
        <Text style={styles.modelTitle}>Avtomobil: {vehicle.licensePlate} — {vehicle.brand}</Text>
        <Text style={styles.lookupText}>Telefon: {vehicle.phone}</Text>
        <Text style={styles.lookupText}>Yürüş: {Number(vehicle.mileage || 0).toLocaleString('az-AZ')} km</Text>
      </View>

      <View style={styles.confirmBlock}>
        <Text style={styles.modelTitle}>Servis mətni</Text>
        <Text style={styles.bodyText}>{serviceNote.professionalText || 'Servis mətni yoxdur'}</Text>
        {errors.professionalText ? <Text style={styles.errorText}>{errors.professionalText}</Text> : null}
      </View>

      {serviceNote.rawNote ? (
        <View style={styles.confirmBlock}>
          <Text style={styles.modelTitle}>Mexanik qeydi</Text>
          <Text style={styles.lookupText}>{serviceNote.rawNote}</Text>
        </View>
      ) : null}

      {lineItems.length > 0 ? (
        <View style={styles.confirmBlock}>
          <Text style={styles.modelTitle}>Servis detalları</Text>
          <View style={styles.priceLineBox}>
            {lineItems.map((lineItem) => (
              <View key={lineItem.id} style={styles.editablePriceLineRow}>
                <View style={styles.priceLineTextBlock}>
                  <Text numberOfLines={2} style={styles.priceLineName}>{formatLineItemName(lineItem)}</Text>
                  <Text numberOfLines={1} style={styles.priceLineMeta}>
                    {[mapApplyTarget(lineItem), mapPriceSource(lineItem.priceSource), `${lineItem.quantity} ədəd`].join(' • ')}
                  </Text>
                </View>
                <Input
                  keyboardType="numeric"
                  onChangeText={(actualUnitPrice) => onUpdateLineItemPrice(lineItem.id, actualUnitPrice)}
                  size="compact"
                  style={styles.priceEditInput}
                  value={lineItem.actualUnitPrice}
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onRemoveLineItem(lineItem.id)}
                  style={styles.iconButton}
                >
                  <Trash2 color={colors.danger} size={17} strokeWidth={2.5} />
                </Pressable>
              </View>
            ))}
          </View>
          {reconciliationNote ? <Text style={styles.lookupText}>{reconciliationNote}</Text> : null}
        </View>
      ) : serviceNote.detectedPriceLines.length > 0 ? (
        <View style={styles.confirmBlock}>
          <Text style={styles.modelTitle}>AI qiymət detalları</Text>
          <View style={styles.priceLineBox}>
            {serviceNote.detectedPriceLines.map((line, index) => (
              <View key={`${line.name}-${index}`} style={styles.priceLineRow}>
                <View style={styles.priceLineTextBlock}>
                  <Text numberOfLines={2} style={styles.priceLineName}>{line.name}</Text>
                  <Text numberOfLines={1} style={styles.priceLineMeta}>
                    {[line.scope, mapPriceLineSource(line.source)].filter(Boolean).join(' • ')}
                  </Text>
                </View>
                <Text style={styles.priceLineAmount}>{formatMoney(line.amount)}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.confirmBlock}>
          <Text style={styles.modelTitle}>Servis detalları</Text>
          <Text style={styles.lookupText}>Qiymət tapılmadı.</Text>
        </View>
      )}

      {serviceNote.missingInfo.length > 0 ? (
        <View style={styles.warningBox}>
          <Text style={styles.lookupTitle}>Çatışmayan məlumatlar</Text>
          {serviceNote.missingInfo.map((missingInfo) => (
            <View key={missingInfo} style={styles.missingInfoCard}>
              <Text style={styles.lookupText}>{missingInfo}</Text>
              <Button
                title={isGenerating ? 'Hazırlanır...' : 'Məlumat əlavə et'}
                variant="secondary"
                size="compact"
                disabled={isGenerating}
                onPress={() => onAddMissingInfo(missingInfo)}
              />
            </View>
          ))}
        </View>
      ) : null}

      {serviceNote.warnings.length > 0 ? (
        <View style={styles.warningBox}>
          <Text style={styles.lookupTitle}>AI qeydləri</Text>
          {serviceNote.warnings.map((warning) => (
            <Text key={warning} style={styles.lookupText}>• {warning}</Text>
          ))}
        </View>
      ) : null}

      <View style={styles.confirmBlock}>
        <Input
          keyboardType="numeric"
          label="Qiymət"
          onChangeText={(priceTotal) => onChangeNote({ priceTotal })}
          placeholder="110"
          size="compact"
          value={serviceNote.priceTotal}
        />
        <Input
          keyboardType="numeric"
          label="Endirim"
          onChangeText={(discountAmount) => onChangePayment({ discountAmount })}
          placeholder="0"
          size="compact"
          value={payment.discountAmount}
        />
        <Input
          error={errors.paidAmount}
          keyboardType="numeric"
          label="Ödənilən"
          onChangeText={(paidAmount) => onChangePayment({ paidAmount })}
          placeholder="0"
          size="compact"
          value={payment.paidAmount}
        />
        <Input
          label="Qeyd"
          onChangeText={(note) => onChangePayment({ note })}
          placeholder="Ödəniş qeydi"
          size="compact"
          value={payment.note}
        />
      </View>

      <View style={styles.totals}>
        <Text style={styles.lookupText}>Hesablanan: {formatMoney(totals.calculatedTotal)}</Text>
        <Text style={styles.lookupText}>Endirim: {formatMoney(totals.discountAmount)}</Text>
        <Text style={styles.lookupText}>Yekun: {formatMoney(totals.finalTotal)}</Text>
        <Text style={styles.lookupText}>Ödənilən: {formatMoney(totals.paidAmount)}</Text>
        <Text style={styles.lookupText}>Qalan: {formatMoney(totals.remainingAmount)}</Text>
      </View>

      <View style={styles.confirmBlock}>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Problemli müştəri</Text>
          <Toggle
            value={vehicle.isProblemCustomer}
            onValueChange={(isProblemCustomer) => onChangeVehicle({ isProblemCustomer })}
          />
        </View>
        {vehicle.isProblemCustomer ? (
          <Input
            error={errors.problemReason}
            label="Problem səbəbi"
            onChangeText={(problemReason) => onChangeVehicle({ problemReason })}
            placeholder="Ödənişi gecikdirib"
            required
            size="compact"
            value={vehicle.problemReason}
          />
        ) : null}
      </View>

      {saveError ? <Text style={styles.errorText}>Xidmət saxlanmadı. Yenidən yoxlayın.</Text> : null}

      <View style={styles.actions}>
        <Button title="Əvvəlki" variant="secondary" onPress={onBack} style={styles.actionButton} />
        <Button
          title={isSavingDraft ? 'Saxlanılır...' : 'Yadda saxla'}
          variant="secondary"
          onPress={onSaveDraft}
          disabled={isSavingDraft}
          style={styles.actionButton}
        />
        <Button title="Təsdiqlə və saxla" onPress={onSave} style={styles.actionButton} />
      </View>
    </Card>
  );
}

function VehicleLookupCard({
  vehicle,
  onSelectExisting,
  onStartNew,
}: {
  vehicle: VehicleSummary;
  onSelectExisting: () => void;
  onStartNew: () => void;
}) {
  return (
    <View style={styles.lookupSurface}>
      <View style={styles.lookupCard}>
        <Text style={styles.lookupTitle}>Bu avtomobil bazada var</Text>
        <Text style={styles.lookupText}>Dövlət nömrəsi: {vehicle.licensePlate}</Text>
        <Text style={styles.lookupText}>Marka: {vehicle.brand}</Text>
        <Text style={styles.lookupText}>Telefon: {vehicle.phone}</Text>
        <Text style={styles.lookupText}>
          Status: {vehicle.isProblemCustomer ? 'Problemli müştəri' : 'Normal müştəri'}
        </Text>
        {vehicle.problemReason ? <Text style={styles.lookupText}>Səbəb: {vehicle.problemReason}</Text> : null}
        <Text style={styles.lookupText}>Son yürüş: {vehicle.lastMileage.toLocaleString('az-AZ')} km</Text>
        <Text style={styles.lookupText}>Son xidmət: {formatDate(vehicle.lastServiceDate)}</Text>
        <Text style={styles.lookupText}>Qalan borc: {formatMoney(vehicle.remainingDebt)}</Text>
        <View style={styles.actions}>
          <Button title="Mövcud avtomobili seç" onPress={onSelectExisting} style={styles.actionButton} />
          <Button title="Yeni qeyd yarat" variant="secondary" onPress={onStartNew} style={styles.actionButton} />
        </View>
      </View>
    </View>
  );
}

function BrandSuggestInput({
  value,
  label,
  required,
  error,
  placeholder,
  size,
  onChangeText,
}: {
  value: string;
  label: string;
  required?: boolean;
  error?: string;
  placeholder?: string;
  size?: 'default' | 'compact';
  onChangeText: (value: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const trimmedValue = value.trim().toLowerCase();
  const suggestions = useMemo(() => {
    if (!focused) {
      return [];
    }

    return vehicleBrandOptions
      .filter((brand) => (
        !trimmedValue || brand.toLowerCase().includes(trimmedValue)
      ))
      .filter((brand) => brand.toLowerCase() !== trimmedValue)
      .slice(0, 6);
  }, [focused, trimmedValue]);

  return (
    <View style={styles.brandSuggest}>
      <Input
        error={error}
        label={label}
        onBlur={() => {
          setTimeout(() => setFocused(false), 120);
        }}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        placeholder={placeholder}
        required={required}
        size={size}
        value={value}
      />
      {suggestions.length > 0 ? (
        <View style={styles.brandSuggestions}>
          {suggestions.map((brand) => (
            <Pressable
              accessibilityRole="button"
              key={brand}
              onPress={() => {
                onChangeText(brand);
                setFocused(false);
              }}
              style={styles.brandSuggestion}
            >
              <Text style={styles.brandSuggestionText}>{brand}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function mapVehicleToDraft(vehicle: VehicleSummary) {
  return {
    selectedVehicleId: vehicle.id,
    previousMileage: vehicle.lastMileage,
    licensePlate: vehicle.licensePlate,
    brand: vehicle.brand,
    phone: vehicle.phone,
    mileage: String(vehicle.lastMileage),
    isProblemCustomer: vehicle.isProblemCustomer,
    problemReason: vehicle.problemReason ?? '',
  };
}

function getFieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>): FieldErrors {
  return issues.reduce<FieldErrors>((errors, issue) => {
    const field = issue.path[0]?.toString();

    if (field && !errors[field]) {
      errors[field] = issue.message;
    }

    return errors;
  }, {});
}

function formatDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function getRecordingStatusLabel(status: VoiceRecordingDraft['status']) {
  if (status === 'transcribing') {
    return 'mətnə çevrilir';
  }
  if (status === 'transcribed') {
    return 'mətn hazırdır';
  }
  if (status === 'failed') {
    return 'xəta';
  }
  return 'saxlanılıb';
}

function mapPriceLineSource(source: NewServiceNoteDraft['detectedPriceLines'][number]['source']) {
  if (source === 'spoken') {
    return 'Mexanik qiyməti';
  }

  if (source === 'catalog') {
    return 'Kataloq qiyməti';
  }

  if (source === 'unmatched') {
    return 'Qiymət tapılmadı';
  }

  return '';
}

function formatLineItemName(lineItem: ReturnType<typeof useNewServiceStore.getState>['lineItems'][number]) {
  return lineItem.optionName ? `${lineItem.itemName} - ${lineItem.optionName}` : lineItem.itemName;
}

function mapApplyTarget(lineItem: ReturnType<typeof useNewServiceStore.getState>['lineItems'][number]) {
  if (lineItem.applyTarget === 'all_injectors') {
    return 'Bütün injectorlar';
  }

  if (lineItem.applyTarget === 'single_injector') {
    return `Injector ${lineItem.selectedInjectorNumbers[0] ?? ''}`.trim();
  }

  if (lineItem.applyTarget === 'selected_injectors') {
    return `Injector ${lineItem.selectedInjectorNumbers.join(', ')}`;
  }

  return 'Ümumi xidmət';
}

function mapPriceSource(source: ReturnType<typeof useNewServiceStore.getState>['lineItems'][number]['priceSource']) {
  if (source === 'model_price') {
    return 'Kataloq qiyməti';
  }

  if (source === 'manual_price') {
    return 'Mexanik qiyməti';
  }

  if (source === 'global_default') {
    return 'Ümumi qiymət';
  }

  return 'Şirkət qiyməti';
}

function sumLineItems(lineItems: ReturnType<typeof useNewServiceStore.getState>['lineItems']) {
  const total = lineItems.reduce((currentTotal, lineItem) => {
    const quantity = Math.max(1, Number(lineItem.quantity) || 1);
    const unitPrice = Math.max(0, Number(lineItem.actualUnitPrice) || 0);
    return currentTotal + (quantity * unitPrice);
  }, 0);

  return Math.round(total * 100) / 100;
}

const styles = StyleSheet.create({
  stepTabs: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  stepTab: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: spacing.xs,
  },
  headerRestartButton: {
    minWidth: 124,
    minHeight: 38,
    paddingHorizontal: spacing.sm,
  },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
  },
  form: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  noteInput: {
    minHeight: 170,
  },
  transcriptInput: {
    minHeight: 220,
  },
  missingInfoInput: {
    minHeight: 130,
    marginTop: spacing.sm,
  },
  voicePanel: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    gap: spacing.sm,
    padding: spacing.md,
  },
  voiceHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  recordButton: {
    minWidth: 118,
  },
  recordingsList: {
    gap: spacing.sm,
  },
  recordingRow: {
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  recordingInfo: {
    flex: 1,
    minWidth: 0,
  },
  recordingTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  recordingTranscript: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  recordingActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  iconButton: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  lookupCard: {
    gap: spacing.sm,
  },
  lookupSurface: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
  },
  lookupTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  lookupText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  bodyText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
  },
  lookupStatus: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    minWidth: 150,
  },
  brandSuggest: {
    gap: spacing.xs,
  },
  brandSuggestions: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  brandSuggestion: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  brandSuggestionText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  confirmBlock: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  modelTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  warningBox: {
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 8,
    backgroundColor: colors.warningSoft,
    gap: spacing.xs,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  missingInfoCard: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  priceLineBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  priceLineRow: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  editablePriceLineRow: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  priceLineName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  priceLineTextBlock: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  priceLineMeta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  priceLineAmount: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  priceEditInput: {
    minHeight: 38,
    width: 86,
  },
  totals: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    gap: spacing.xs,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
});
