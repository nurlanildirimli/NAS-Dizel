import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { PlusCircle } from 'lucide-react-native';

import { Header, PagePanel, Screen, StepHeader } from '../../src/components/layout';
import {
  InjectorCountSelector,
  MultiSelectChipGroup,
  OptionSelector,
  PlateInput,
} from '../../src/components/forms';
import { Button, Card, Input, Modal, Toggle } from '../../src/components/ui';
import {
  newServiceInjectorSchema,
  newServiceVehicleSchema,
} from '../../src/schemas/newService';
import { createInjectorModel, findInjectorModel, getModelPrices, getPriceCatalog } from '../../src/services/catalog';
import { saveService } from '../../src/services/newService';
import { checkVehicleByPlate, getVehicleSummary } from '../../src/services/vehicles';
import { useNewServiceStore } from '../../src/store/newServiceStore';
import { colors, spacing } from '../../src/theme';
import { type InjectorModelPrice, type PriceItem } from '../../src/types/catalog';
import {
  type InjectorCompany,
  type NewServiceApplyTarget,
  type NewServiceLineItemDraft,
  type NewServicePriceSource,
} from '../../src/types/newService';
import { type VehicleSummary } from '../../src/types/vehicles';
import { calculateNewServiceTotals } from '../../src/utils/calculateNewServiceTotals';
import { formatDate } from '../../src/utils/formatDate';
import { formatMoney } from '../../src/utils/formatMoney';

const injectorCompanies: readonly InjectorCompany[] = [
  'Bosch',
  'Delphi',
  'Denso',
  'Siemens',
];

const problemOptions = [
  'Geri axın çoxdur',
  'Geri axın az',
  'Sızma var',
  'İynə problemi',
  'Qapaq problemi',
  'Elektrik problemi',
  'Kodlama problemi',
  'Çirklənmə',
  'Mexaniki zədə',
  'Problem yoxdur',
  'Digər',
] as const;

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
type DetailPriceEdit = {
  row?: DetailRow;
  lineItemId?: string;
  title: string;
  value: string;
};

type CustomDetailDraft = {
  name: string;
  price: string;
};

type DetailRow = {
  id: string;
  itemType: 'labor' | 'part';
  itemName: string;
  optionName: string | null;
  label: string;
  defaultPrice: number;
  priceSource: NewServicePriceSource;
};

export default function NewScreen() {
  const { vehicleId } = useLocalSearchParams<{ vehicleId?: string }>();
  const {
    currentStep,
    vehicle,
    injector,
    lineItems,
    payment,
    setStep,
    updateVehicle,
    updateInjector,
    setInjectorCount,
    updateInjectorItem,
    addLineItem,
    removeLineItem,
    updateLineItem,
    updatePayment,
    selectExistingVehicle,
    startNewVehicleRecord,
    reset,
  } = useNewServiceStore();
  const [vehicleErrors, setVehicleErrors] = useState<FieldErrors>({});
  const [injectorErrors, setInjectorErrors] = useState<FieldErrors>({});
  const [confirmErrors, setConfirmErrors] = useState<FieldErrors>({});
  const [lookupVehicle, setLookupVehicle] = useState<VehicleSummary | null>(null);
  const [lookupNotFound, setLookupNotFound] = useState(false);
  const [isCheckingVehicle, setIsCheckingVehicle] = useState(false);
  const [mileageWarningVisible, setMileageWarningVisible] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [restartModalVisible, setRestartModalVisible] = useState(false);
  const [prefillDisabled, setPrefillDisabled] = useState(false);
  const lastCheckedPlateRef = useRef('');

  const prefillQuery = useQuery({
    queryKey: ['vehicles', 'summary', vehicleId],
    queryFn: () => getVehicleSummary(vehicleId ?? ''),
    enabled: Boolean(vehicleId),
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

  const canShowInjectorStep = currentStep === 'injectors';
  const canShowConfirmStep = currentStep === 'confirm';
  const selectedPrefillVehicle = prefillQuery.data && vehicle.selectedVehicleId === prefillQuery.data.id
    ? prefillQuery.data
    : null;
  const displayedLookupVehicle = lookupVehicle ?? selectedPrefillVehicle;
  const totals = calculateNewServiceTotals(lineItems, payment);
  const saveMutation = useMutation({
    mutationFn: () => saveService({ vehicle, injector, lineItems, payment }),
    onSuccess: (result) => {
      reset();
      setSaveModalVisible(false);
      router.push(`/services/${result.service_id}`);
    },
  });

  function handleSelectExisting(foundVehicle: VehicleSummary) {
    setPrefillDisabled(false);
    selectExistingVehicle(mapVehicleToDraft(foundVehicle));
    setLookupVehicle(foundVehicle);
    setLookupNotFound(false);
    setVehicleErrors({});
  }

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

  function handleContinueToInjectors() {
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

    continueToInjectors();
  }

  function continueToInjectors() {
    setMileageWarningVisible(false);
    setStep('injectors');
  }

  function shouldWarnAboutLowerMileage() {
    if (!vehicle.selectedVehicleId || vehicle.previousMileage === null) {
      return false;
    }

    return Number(vehicle.mileage) < vehicle.previousMileage;
  }

  function handleFinishStepTwo() {
    const result = newServiceInjectorSchema.safeParse(injector);

    if (!result.success) {
      setInjectorErrors(getFieldErrors(result.error.issues));
      return;
    }

    setInjectorErrors({});
    setStep('confirm');
  }

  function handleSaveConfirm() {
    if (vehicle.isProblemCustomer && vehicle.problemReason.trim().length === 0) {
      setConfirmErrors({ problemReason: 'Bu sahə mütləqdir' });
      return;
    }

    setConfirmErrors({});
    setSaveModalVisible(true);
  }

  function handleRestart() {
    reset();
    setPrefillDisabled(true);
    setVehicleErrors({});
    setInjectorErrors({});
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
            title="Injectorlar"
            variant={currentStep === 'injectors' ? 'primary' : 'secondary'}
            onPress={handleContinueToInjectors}
            size="compact"
            style={styles.stepTab}
          />
          <Button
            title="Təsdiq"
            variant={currentStep === 'confirm' ? 'primary' : 'secondary'}
            onPress={handleFinishStepTwo}
            size="compact"
            style={styles.stepTab}
          />
        </View>

        {prefillQuery.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null}

        {canShowConfirmStep ? (
          <ConfirmStep
            injector={injector}
            lineItems={lineItems}
            onBack={() => setStep('injectors')}
            onChangePayment={updatePayment}
            onChangeVehicle={updateVehicle}
            onSave={handleSaveConfirm}
            payment={payment}
            errors={confirmErrors}
            saveError={saveMutation.isError}
            totals={totals}
            vehicle={vehicle}
          />
        ) : null}

        {canShowInjectorStep ? (
          <InjectorStep
            errors={injectorErrors}
            injector={injector}
            lineItems={lineItems}
            onBack={() => setStep('vehicle')}
            onAddLineItem={addLineItem}
            onChangeCount={setInjectorCount}
            onChangeInjector={updateInjector}
            onChangeInjectorItem={updateInjectorItem}
            onNext={handleFinishStepTwo}
            onRemoveLineItem={removeLineItem}
            onUpdateLineItem={updateLineItem}
            totals={totals}
          />
        ) : null}

        {!canShowInjectorStep && !canShowConfirmStep ? (
          <VehicleStep
            errors={vehicleErrors}
            isCheckingVehicle={isCheckingVehicle}
            lookupNotFound={lookupNotFound}
            lookupVehicle={displayedLookupVehicle}
            onChange={handleChangeVehicle}
            onContinue={handleContinueToInjectors}
            onSelectExisting={handleSelectExisting}
            onStartNew={() => {
              startNewVehicleRecord();
              setLookupVehicle(null);
              setLookupNotFound(false);
            }}
            vehicle={vehicle}
          />
        ) : null}
        <Modal
          cancelLabel="Əvvəlki"
          confirmLabel="Növbəti"
          onCancel={() => setMileageWarningVisible(false)}
          onConfirm={continueToInjectors}
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
          cancelLabel="Bağla"
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
        <View style={styles.lookupActions}>
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

function InjectorStep({
  injector,
  lineItems,
  totals,
  errors,
  onChangeInjector,
  onChangeInjectorItem,
  onChangeCount,
  onAddLineItem,
  onRemoveLineItem,
  onUpdateLineItem,
  onBack,
  onNext,
}: {
  injector: ReturnType<typeof useNewServiceStore.getState>['injector'];
  lineItems: NewServiceLineItemDraft[];
  totals: ReturnType<typeof calculateNewServiceTotals>;
  errors: FieldErrors;
  onChangeInjector: (patch: Partial<Omit<typeof injector, 'injectors'>>) => void;
  onChangeInjectorItem: typeof useNewServiceStore.getState extends () => infer Store
    ? Store extends { updateInjectorItem: infer Update }
      ? Update
      : never
    : never;
  onChangeCount: (count: number) => void;
  onAddLineItem: (lineItem: NewServiceLineItemDraft) => void;
  onRemoveLineItem: (id: string) => void;
  onUpdateLineItem: (id: string, patch: Partial<NewServiceLineItemDraft>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const queryClient = useQueryClient();
  const [activeInjectorNumber, setActiveInjectorNumber] = useState(1);
  const [priceEdit, setPriceEdit] = useState<DetailPriceEdit | null>(null);
  const [customDetail, setCustomDetail] = useState<CustomDetailDraft | null>(null);
  const visibleInjectorNumber = Math.min(activeInjectorNumber, injector.injectorCount);
  const activeInjector = injector.injectors.find((item) => item.injectorNumber === visibleInjectorNumber)
    ?? injector.injectors[0];

  const modelLabel = useMemo(() => {
    if (!injector.injectorCompany || !injector.injectorCode.trim()) {
      return '';
    }

    return `${injector.injectorCompany} ${injector.injectorCode.trim()}`;
  }, [injector.injectorCode, injector.injectorCompany]);
  const modelQuery = useQuery({
    queryKey: ['catalog', 'injector-model', injector.injectorCompany, injector.injectorCode],
    queryFn: () => findInjectorModel(injector.injectorCompany, injector.injectorCode),
    enabled: Boolean(injector.injectorCompany && injector.injectorCode.trim()),
  });
  const catalogQuery = useQuery({
    queryKey: ['catalog', 'items'],
    queryFn: getPriceCatalog,
  });
  const priceModelId = modelQuery.data?.id ?? injector.injectorModelId;
  const pricesQuery = useQuery({
    queryKey: ['catalog', 'model-prices', priceModelId],
    queryFn: () => getModelPrices(priceModelId ?? ''),
    enabled: Boolean(priceModelId),
  });
  const detailRows = useMemo(() => (
    buildDetailRows(catalogQuery.data?.labor ?? [], catalogQuery.data?.parts ?? [], pricesQuery.data ?? [])
  ), [catalogQuery.data?.labor, catalogQuery.data?.parts, pricesQuery.data]);
  const activeCustomDetailItems = lineItems.filter((lineItem) => (
    lineItem.id.startsWith('injector-detail-custom-')
    && lineItem.selectedInjectorNumbers.includes(activeInjector?.injectorNumber ?? 1)
  ));
  const detailLineCount = lineItems.filter((lineItem) => lineItem.id.startsWith('injector-detail-')).length;
  const createModelMutation = useMutation({
    mutationFn: () => createInjectorModel({
      company: injector.injectorCompany,
      code: injector.injectorCode,
    }),
    onSuccess: (model) => {
      onChangeInjector({ injectorModelId: model.id, useManualPricing: false });
      queryClient.invalidateQueries({ queryKey: ['catalog', 'injector-model'] });
      queryClient.invalidateQueries({ queryKey: ['catalog', 'injector-models'] });
    },
  });

  function getDetailLineItem(row: DetailRow) {
    return lineItems.find((lineItem) => lineItem.id === getDetailLineItemId(activeInjector?.injectorNumber ?? 1, row));
  }

  function createDetailLineItem(row: DetailRow, price = String(row.defaultPrice)): NewServiceLineItemDraft {
    const injectorNumber = activeInjector?.injectorNumber ?? 1;

    return {
      id: getDetailLineItemId(injectorNumber, row),
      itemType: row.itemType,
      itemName: row.itemName,
      optionName: row.optionName,
      applyTarget: 'single_injector',
      selectedInjectorNumbers: [injectorNumber],
      quantity: '1',
      defaultUnitPrice: String(row.defaultPrice),
      actualUnitPrice: price,
      priceSource: row.priceSource,
      note: '',
    };
  }

  function toggleDetail(row: DetailRow) {
    const existingLineItem = getDetailLineItem(row);

    if (existingLineItem) {
      onRemoveLineItem(existingLineItem.id);
      return;
    }

    onAddLineItem(createDetailLineItem(row));
  }

  function confirmPriceEdit() {
    if (!priceEdit) {
      return;
    }

    if (priceEdit.lineItemId) {
      onUpdateLineItem(priceEdit.lineItemId, { actualUnitPrice: priceEdit.value });
      setPriceEdit(null);
      return;
    }

    if (!priceEdit.row) {
      return;
    }

    const existingLineItem = getDetailLineItem(priceEdit.row);

    if (existingLineItem) {
      onUpdateLineItem(existingLineItem.id, { actualUnitPrice: priceEdit.value });
    } else {
      onAddLineItem(createDetailLineItem(priceEdit.row, priceEdit.value));
    }

    setPriceEdit(null);
  }

  function addCustomDetail() {
    if (!customDetail) {
      return;
    }

    const name = customDetail.name.trim();
    const price = customDetail.price.trim() || '0';

    if (!name) {
      return;
    }

    const injectorNumber = activeInjector?.injectorNumber ?? 1;
    const safeKey = name.toLowerCase().replace(/[^a-z0-9əğıöşüç]+/gi, '-').replace(/^-|-$/g, '') || 'custom';

    onAddLineItem({
      id: `injector-detail-custom-${injectorNumber}-${Date.now()}-${safeKey}`,
      itemType: 'part',
      itemName: name,
      optionName: null,
      applyTarget: 'single_injector',
      selectedInjectorNumbers: [injectorNumber],
      quantity: '1',
      defaultUnitPrice: price,
      actualUnitPrice: price,
      priceSource: 'manual_price',
      note: '',
    });
    setCustomDetail(null);
  }

  function handleNext() {
    if (modelQuery.data) {
      onChangeInjector({ injectorModelId: modelQuery.data.id, useManualPricing: false });
    }

    onNext();
  }

  return (
    <View style={styles.injectorStep}>
      <Card>
        <StepHeader title="Injectorlar" stepLabel="2 / 3" />
        <View style={styles.form}>
          <InjectorCountSelector value={injector.injectorCount} onChange={onChangeCount} />
          <OptionSelector
            error={errors.injectorCompany}
            label="Injector şirkəti"
            onChange={(injectorCompany) => onChangeInjector({
              injectorCompany,
              injectorModelId: null,
              useManualPricing: false,
            })}
            options={injectorCompanies}
            required
            value={injector.injectorCompany}
          />
          <Input
            error={errors.injectorCode}
            label="Injector kodu"
            onChangeText={(injectorCode) => onChangeInjector({
              injectorCode,
              injectorModelId: null,
              useManualPricing: false,
            })}
            required
            value={injector.injectorCode}
          />
          <Text style={styles.note}>Bu məlumat bütün injectorlara tətbiq olunur.</Text>
          {modelLabel ? (
            <View style={styles.modelBox}>
              {modelQuery.isLoading ? (
                <ActivityIndicator color={colors.primary} />
              ) : null}
              {modelQuery.data ? (
                <>
                  <Text style={styles.modelText}>Model tapıldı: {modelLabel}</Text>
                  <Text style={styles.lookupText}>Qiymətlər bu modelə görə tətbiq olunacaq.</Text>
                </>
              ) : null}
              {!modelQuery.isLoading && !modelQuery.data ? (
                <>
                  <Text style={styles.modelText}>Bu model kataloqda yoxdur.</Text>
                  <View style={styles.lookupActions}>
                    <Button
                      disabled={createModelMutation.isPending}
                      title="Model kimi əlavə et"
                      onPress={() => createModelMutation.mutate()}
                      style={styles.actionButton}
                    />
                    <Button
                      title="Manual qiymətlə davam et"
                      variant="secondary"
                      onPress={() => onChangeInjector({ injectorModelId: null, useManualPricing: true })}
                      style={styles.actionButton}
                    />
                  </View>
                </>
              ) : null}
            </View>
          ) : null}
        </View>
      </Card>

      <View style={styles.injectorPicker}>
        {injector.injectors.map((item) => {
          const active = item.injectorNumber === activeInjector?.injectorNumber;

          return (
            <Pressable
              accessibilityRole="button"
              key={item.injectorNumber}
              onPress={() => setActiveInjectorNumber(item.injectorNumber)}
              style={[styles.injectorPickerOption, active && styles.injectorPickerOptionActive]}
            >
              <Text style={[styles.injectorPickerText, active && styles.injectorPickerTextActive]}>
                {item.injectorNumber}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {activeInjector ? (
        <Card>
          <View style={styles.injectorCard}>
            <Text style={styles.injectorTitle}>Injector {activeInjector.injectorNumber}</Text>
            <MultiSelectChipGroup
              label="Problem"
              onChange={(problemFound) => onChangeInjectorItem(activeInjector.injectorNumber, { problemFound })}
              options={problemOptions}
              values={activeInjector.problemFound}
            />
            <View style={styles.detailSection}>
              <View style={styles.detailHeaderRow}>
                <Text style={styles.detailTitle}>Detal</Text>
                <Button
                  title="Əlavə et"
                  variant="secondary"
                  size="compact"
                  onPress={() => setCustomDetail({ name: '', price: '0' })}
                  style={styles.detailEditButton}
                />
              </View>
              {catalogQuery.isLoading || pricesQuery.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
              {detailRows.length === 0 && !catalogQuery.isLoading ? (
                <Text style={styles.lookupText}>Detal siyahısı tapılmadı</Text>
              ) : null}
              {detailRows.map((row) => {
                const lineItem = getDetailLineItem(row);
                const checked = Boolean(lineItem);
                const price = lineItem?.actualUnitPrice ?? String(row.defaultPrice);

                return (
                  <View key={row.id} style={styles.detailRow}>
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked }}
                      onPress={() => toggleDetail(row)}
                      style={[styles.detailCheckbox, checked && styles.detailCheckboxActive]}
                    >
                      {checked ? <Text style={styles.detailCheckmark}>✓</Text> : null}
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => toggleDetail(row)}
                      style={styles.detailTextBlock}
                    >
                      <Text numberOfLines={2} style={styles.detailName}>{row.label}</Text>
                      <Text style={styles.detailPrice}>{formatMoney(Number(price) || 0)}</Text>
                    </Pressable>
                    <Button
                      title="Dəyiş"
                      variant="secondary"
                      size="compact"
                      onPress={() => setPriceEdit({ row, title: row.label, value: price })}
                      style={styles.detailEditButton}
                    />
                  </View>
                );
              })}
              {activeCustomDetailItems.map((lineItem) => (
                <View key={lineItem.id} style={styles.detailRow}>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: true }}
                    onPress={() => onRemoveLineItem(lineItem.id)}
                    style={[styles.detailCheckbox, styles.detailCheckboxActive]}
                  >
                    <Text style={styles.detailCheckmark}>✓</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => onRemoveLineItem(lineItem.id)}
                    style={styles.detailTextBlock}
                  >
                    <Text numberOfLines={2} style={styles.detailName}>{lineItem.itemName}</Text>
                    <Text style={styles.detailPrice}>{formatMoney(Number(lineItem.actualUnitPrice) || 0)}</Text>
                  </Pressable>
                  <Button
                    title="Dəyiş"
                    variant="secondary"
                    size="compact"
                    onPress={() => setPriceEdit({
                      lineItemId: lineItem.id,
                      title: lineItem.itemName,
                      value: lineItem.actualUnitPrice,
                    })}
                    style={styles.detailEditButton}
                  />
                </View>
              ))}
            </View>
            <Input
              label="Qeyd"
              onChangeText={(note) => onChangeInjectorItem(activeInjector.injectorNumber, { note })}
              value={activeInjector.note}
            />
          </View>
        </Card>
      ) : null}

      <Card>
        <StepHeader title="Ümumi qiymət" />
        <TotalsSummary totals={totals} />
        <Text style={styles.lookupText}>Seçilmiş detal: {detailLineCount}</Text>
      </Card>

      <View style={styles.footerActions}>
        <Button title="Əvvəlki" variant="secondary" onPress={onBack} style={styles.actionButton} />
        <Button title="Növbəti" onPress={handleNext} style={styles.actionButton} />
      </View>
      <Modal
        cancelLabel="Bağla"
        confirmLabel="Yadda saxla"
        onCancel={() => setPriceEdit(null)}
        onConfirm={confirmPriceEdit}
        title={priceEdit?.title ?? 'Qiymət'}
        visible={Boolean(priceEdit)}
      >
        <Input
          keyboardType="numeric"
          label="Qiymət"
          onChangeText={(value) => setPriceEdit((current) => (current ? { ...current, value } : current))}
          value={priceEdit?.value ?? ''}
        />
      </Modal>
      <Modal
        cancelLabel="Bağla"
        confirmLabel="Əlavə et"
        onCancel={() => setCustomDetail(null)}
        onConfirm={addCustomDetail}
        title="Yeni detal"
        visible={Boolean(customDetail)}
      >
        <View style={styles.form}>
          <Input
            label="Ad"
            onChangeText={(name) => setCustomDetail((current) => (current ? { ...current, name } : current))}
            value={customDetail?.name ?? ''}
          />
          <Input
            keyboardType="numeric"
            label="Qiymət"
            onChangeText={(price) => setCustomDetail((current) => (current ? { ...current, price } : current))}
            value={customDetail?.price ?? ''}
          />
        </View>
      </Modal>
    </View>
  );
}

function ConfirmStep({
  vehicle,
  injector,
  lineItems,
  payment,
  totals,
  errors,
  saveError,
  onChangePayment,
  onChangeVehicle,
  onBack,
  onSave,
}: {
  vehicle: ReturnType<typeof useNewServiceStore.getState>['vehicle'];
  injector: ReturnType<typeof useNewServiceStore.getState>['injector'];
  lineItems: NewServiceLineItemDraft[];
  payment: ReturnType<typeof useNewServiceStore.getState>['payment'];
  totals: ReturnType<typeof calculateNewServiceTotals>;
  errors: FieldErrors;
  saveError: boolean;
  onChangePayment: (patch: Partial<typeof payment>) => void;
  onChangeVehicle: (patch: Partial<typeof vehicle>) => void;
  onBack: () => void;
  onSave: () => void;
}) {
  return (
    <View style={styles.injectorStep}>
      <Card>
        <StepHeader title="Təsdiq" stepLabel="3 / 3" />
        <View style={styles.confirmBlock}>
          <Text style={styles.modelTitle}>Avtomobil: {vehicle.licensePlate} — {vehicle.brand}</Text>
          <Text style={styles.lookupText}>Telefon: {vehicle.phone}</Text>
          <Text style={styles.lookupText}>Yürüş: {Number(vehicle.mileage || 0).toLocaleString('az-AZ')} km</Text>
          <Text style={styles.lookupText}>Problem təsviri: {vehicle.problemDescription}</Text>
          <Text style={styles.lookupText}>
            Injector: {injector.injectorCount} ədəd — {injector.injectorCompany} {injector.injectorCode}
          </Text>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Problemli müştəri</Text>
            <Toggle
              value={vehicle.isProblemCustomer}
              onValueChange={(isProblemCustomer) => onChangeVehicle({
                isProblemCustomer,
                problemReason: isProblemCustomer ? vehicle.problemReason : '',
              })}
            />
          </View>
          {vehicle.isProblemCustomer ? (
            <Input
              error={errors.problemReason}
              label="Problem səbəbi"
              onChangeText={(problemReason) => onChangeVehicle({ problemReason })}
              placeholder="Ödənişi gecikdirib"
              value={vehicle.problemReason}
            />
          ) : null}
        </View>
      </Card>

      <LineItemsSummary lineItems={lineItems} />

      <Card>
        <StepHeader title="Qiymət" />
        <TotalsSummary totals={totals} />
      </Card>

      <Card>
        <StepHeader title="Ödəniş" />
        <View style={styles.form}>
          <Input
            keyboardType="numeric"
            label="Endirimli qiymət"
            onChangeText={(discountedPrice) => onChangePayment({ discountedPrice })}
            placeholder={String(totals.calculatedTotal)}
            value={payment.discountedPrice}
          />
          <Input
            keyboardType="numeric"
            label="Ödənilən"
            onChangeText={(paidAmount) => onChangePayment({ paidAmount })}
            value={payment.paidAmount}
          />
          <Input
            label="Qeyd"
            onChangeText={(note) => onChangePayment({ note })}
            value={payment.note}
          />
          <Text style={styles.lookupText}>Hesablanan: {formatMoney(totals.calculatedTotal)}</Text>
          <Text style={styles.lookupText}>Endirim: {formatMoney(totals.discountAmount)}</Text>
          <Text style={styles.lookupText}>Yekun: {formatMoney(totals.finalTotal)}</Text>
          <Text style={styles.lookupText}>Qalan: {formatMoney(totals.remainingAmount)}</Text>
          <Text style={styles.lookupText}>Status: {mapPaymentStatusLabel(totals.paymentStatus)}</Text>
        </View>
      </Card>

      {saveError ? (
        <View style={styles.lookupSurface}>
          <Text style={styles.lookupTitle}>Məlumat yüklənmədi</Text>
          <Text style={styles.lookupText}>Yenidən yoxla</Text>
        </View>
      ) : null}

      <View style={styles.footerActions}>
        <Button title="Əvvəlki" variant="secondary" onPress={onBack} style={styles.actionButton} />
        <Button title="Təsdiqlə və saxla" onPress={onSave} style={styles.actionButton} />
      </View>
    </View>
  );
}

function LineItemsSummary({
  lineItems,
  onRemoveLineItem,
}: {
  lineItems: NewServiceLineItemDraft[];
  onRemoveLineItem?: (id: string) => void;
}) {
  return (
    <Card>
      <StepHeader title="Görülən işlər" />
      <View style={styles.lineItems}>
        {lineItems.length === 0 ? <Text style={styles.lookupText}>Nəticə tapılmadı</Text> : null}
        {lineItems.map((lineItem) => {
          const total = (Number(lineItem.quantity) || 1) * (Number(lineItem.actualUnitPrice) || 0);
          return (
            <View key={lineItem.id} style={styles.lineItemRow}>
              <View style={styles.modelTextBlock}>
                <Text style={styles.modelTitle}>
                  {lineItem.itemName}{lineItem.optionName ? ` — ${lineItem.optionName}` : ''}
                </Text>
                <Text style={styles.lookupText}>
                  {mapApplyTargetLabel(lineItem.applyTarget)} — {lineItem.quantity} × {formatMoney(lineItem.actualUnitPrice)} = {formatMoney(total)}
                </Text>
                {Number(lineItem.defaultUnitPrice) !== Number(lineItem.actualUnitPrice) ? (
                  <Text style={styles.lookupText}>Qiymət dəyişdirildi</Text>
                ) : null}
              </View>
              {onRemoveLineItem ? (
                <Button title="Sil" variant="danger" onPress={() => onRemoveLineItem(lineItem.id)} />
              ) : null}
            </View>
          );
        })}
      </View>
    </Card>
  );
}

function TotalsSummary({ totals }: { totals: ReturnType<typeof calculateNewServiceTotals> }) {
  return (
    <View style={styles.confirmBlock}>
      <Text style={styles.lookupText}>Görülən işlər: {formatMoney(totals.laborTotal)}</Text>
      <Text style={styles.lookupText}>Hissələr: {formatMoney(totals.partsTotal)}</Text>
      <Text style={styles.lookupText}>Əlavə xidmətlər: {formatMoney(totals.extraTotal)}</Text>
      <Text style={styles.lookupText}>Endirim: {formatMoney(totals.discountAmount)}</Text>
      <Text style={styles.modelTitle}>Yekun: {formatMoney(totals.finalTotal)}</Text>
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

function buildDetailRows(laborItems: PriceItem[], partItems: PriceItem[], prices: InjectorModelPrice[]): DetailRow[] {
  return [...laborItems, ...partItems]
    .filter((item) => item.name !== 'Digər')
    .flatMap((item) => {
    const options = item.options.length > 0 ? item.options : [null];

    return options.map((option) => {
      const modelPrice = prices.find((price) => (
        price.priceItemId === item.id
        && price.priceItemOptionId === (option?.id ?? null)
      ));

      return {
        id: `${item.id}-${option?.id ?? 'base'}`,
        itemType: item.type === 'labor' ? 'labor' : 'part',
        itemName: item.name,
        optionName: option?.optionName ?? null,
        label: option ? `${item.name} - ${option.optionName}` : item.name,
        defaultPrice: modelPrice?.defaultPrice ?? 0,
        priceSource: modelPrice ? 'model_price' : 'manual_price',
      };
    });
  });
}

function getDetailLineItemId(injectorNumber: number, row: DetailRow): string {
  return `injector-detail-${injectorNumber}-${row.id}`;
}

function mapApplyTargetLabel(value: NewServiceApplyTarget): string {
  if (value === 'single_injector') {
    return 'Injector';
  }

  if (value === 'selected_injectors') {
    return 'Seçilmiş injectorlar';
  }

  if (value === 'general_service') {
    return 'Ümumi xidmət';
  }

  return 'Bütün injectorlara';
}

function mapPaymentStatusLabel(value: ReturnType<typeof calculateNewServiceTotals>['paymentStatus']): string {
  if (value === 'paid') {
    return 'Ödənilib';
  }

  if (value === 'partially_paid') {
    return 'Qismən ödənilib';
  }

  return 'Ödənilməyib';
}

function getFieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>): FieldErrors {
  return issues.reduce<FieldErrors>((errors, issue) => {
    const field = String(issue.path[0] ?? '');

    if (field && !errors[field]) {
      errors[field] = issue.message;
    }

    return errors;
  }, {});
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
  lookupCard: {
    gap: spacing.sm,
  },
  modelTextBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  lookupSurface: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.lg,
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
  lookupActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  lookupStatus: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    minWidth: 160,
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
  note: {
    color: colors.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
    fontWeight: '600',
  },
  modelBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
  },
  modelText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  modelTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  injectorStep: {
    gap: spacing.md,
  },
  injectorPicker: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  injectorPickerOption: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    height: 38,
    justifyContent: 'center',
  },
  injectorPickerOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  injectorPickerText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  injectorPickerTextActive: {
    color: colors.white,
  },
  injectorCard: {
    gap: spacing.md,
  },
  injectorTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  detailSection: {
    gap: spacing.sm,
  },
  detailHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  detailTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  detailRow: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  detailCheckbox: {
    alignItems: 'center',
    borderColor: colors.textMuted,
    borderRadius: 4,
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  detailCheckboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  detailCheckmark: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 18,
  },
  detailTextBlock: {
    flex: 1,
    gap: 2,
  },
  detailName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  detailPrice: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  detailEditButton: {
    minHeight: 36,
    minWidth: 74,
    paddingHorizontal: spacing.sm,
  },
  footerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  lineItems: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  lineItemRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
  },
  confirmBlock: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
