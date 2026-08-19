import { create } from 'zustand';

import {
  type InjectorDraftItem,
  type NewServiceInjectorDraft,
  type NewServiceLineItemDraft,
  type NewServiceNoteDraft,
  type NewServicePaymentDraft,
  type NewServiceStep,
  type NewServiceVehicleDraft,
} from '../types/newService';

type NewServiceStore = {
  currentStep: NewServiceStep;
  vehicle: NewServiceVehicleDraft;
  injector: NewServiceInjectorDraft;
  lineItems: NewServiceLineItemDraft[];
  payment: NewServicePaymentDraft;
  serviceNote: NewServiceNoteDraft;
  setStep: (step: NewServiceStep) => void;
  updateVehicle: (patch: Partial<NewServiceVehicleDraft>) => void;
  updateInjector: (patch: Partial<Omit<NewServiceInjectorDraft, 'injectors'>>) => void;
  setInjectorCount: (count: number) => void;
  updateInjectorItem: (injectorNumber: number, patch: Partial<InjectorDraftItem>) => void;
  setLineItems: (lineItems: NewServiceLineItemDraft[]) => void;
  addLineItem: (lineItem: NewServiceLineItemDraft) => void;
  removeLineItem: (id: string) => void;
  updateLineItem: (id: string, patch: Partial<NewServiceLineItemDraft>) => void;
  updatePayment: (patch: Partial<NewServicePaymentDraft>) => void;
  updateServiceNote: (patch: Partial<NewServiceNoteDraft>) => void;
  replaceDraft: (draft: {
    vehicle: NewServiceVehicleDraft;
    injector: NewServiceInjectorDraft;
    lineItems: NewServiceLineItemDraft[];
    payment: NewServicePaymentDraft;
    serviceNote?: NewServiceNoteDraft;
    currentStep?: NewServiceStep;
  }) => void;
  selectExistingVehicle: (vehicle: Omit<NewServiceVehicleDraft, 'problemDescription'>) => void;
  startNewVehicleRecord: () => void;
  reset: () => void;
};

const defaultVehicle: NewServiceVehicleDraft = {
  selectedVehicleId: null,
  previousMileage: null,
  licensePlate: '',
  brand: '',
  phone: '',
  mileage: '',
  problemDescription: '',
  isProblemCustomer: false,
  problemReason: '',
};

function createInjectorItem(injectorNumber: number): InjectorDraftItem {
  return {
    injectorNumber,
    initialTestResult: '',
    finalTestResult: '',
    injectorStatus: '',
    problemFound: [],
    workDone: [],
    partsReplaced: [],
    note: '',
  };
}

function createInjectors(count: number, existing: InjectorDraftItem[] = []): InjectorDraftItem[] {
  return Array.from({ length: count }, (_, index) => {
    const injectorNumber = index + 1;
    return existing.find((item) => item.injectorNumber === injectorNumber) ?? createInjectorItem(injectorNumber);
  });
}

function normalizeLineItemsForInjectorCount(
  lineItems: NewServiceLineItemDraft[],
  count: number,
): NewServiceLineItemDraft[] {
  return lineItems
    .map((lineItem) => {
      if (lineItem.applyTarget === 'all_injectors') {
        return {
          ...lineItem,
          quantity: String(count),
        };
      }

      if (
        lineItem.applyTarget !== 'single_injector'
        && lineItem.applyTarget !== 'selected_injectors'
      ) {
        return lineItem;
      }

      const selectedInjectorNumbers = lineItem.selectedInjectorNumbers.filter((injectorNumber) => (
        injectorNumber >= 1 && injectorNumber <= count
      ));

      if (selectedInjectorNumbers.length === 0) {
        return null;
      }

      return {
        ...lineItem,
        selectedInjectorNumbers,
        quantity: lineItem.applyTarget === 'selected_injectors'
          ? String(selectedInjectorNumbers.length)
          : lineItem.quantity,
      };
    })
    .filter((lineItem): lineItem is NewServiceLineItemDraft => Boolean(lineItem));
}

const defaultInjector: NewServiceInjectorDraft = {
  injectorCount: 4,
  injectorCompany: '',
  injectorCode: '',
  injectorSerialInfo: '',
  injectorModelId: null,
  useManualPricing: false,
  injectors: createInjectors(4),
};

const defaultPayment: NewServicePaymentDraft = {
  discountAmount: '0',
  paidAmount: '0',
  paymentMethod: '',
  note: '',
};

function createLocalRecordingKey() {
  return `voice-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createDefaultServiceNote(): NewServiceNoteDraft {
  return {
    draftId: null,
    localRecordingKey: createLocalRecordingKey(),
    rawNote: '',
    professionalText: '',
    warnings: [],
    missingInfo: [],
    detectedPriceLines: [],
    priceTotal: '0',
    detectedInjectorCount: null,
    detectedInjectorCompany: '',
    detectedInjectorCode: '',
  };
}

export const useNewServiceStore = create<NewServiceStore>((set) => ({
  currentStep: 'vehicle',
  vehicle: defaultVehicle,
  injector: defaultInjector,
  lineItems: [],
  payment: defaultPayment,
  serviceNote: createDefaultServiceNote(),
  setStep: (step) => set({ currentStep: step }),
  updateVehicle: (patch) => set((state) => ({ vehicle: { ...state.vehicle, ...patch } })),
  updateInjector: (patch) => set((state) => ({ injector: { ...state.injector, ...patch } })),
  setInjectorCount: (count) => set((state) => ({
    injector: {
      ...state.injector,
      injectorCount: count,
      injectors: createInjectors(count, state.injector.injectors),
    },
    lineItems: normalizeLineItemsForInjectorCount(state.lineItems, count),
  })),
  updateInjectorItem: (injectorNumber, patch) => set((state) => ({
    injector: {
      ...state.injector,
      injectors: state.injector.injectors.map((item) => (
        item.injectorNumber === injectorNumber ? { ...item, ...patch } : item
      )),
    },
  })),
  setLineItems: (lineItems) => set({ lineItems }),
  addLineItem: (lineItem) => set((state) => ({ lineItems: [...state.lineItems, lineItem] })),
  removeLineItem: (id) => set((state) => ({
    lineItems: state.lineItems.filter((lineItem) => lineItem.id !== id),
  })),
  updateLineItem: (id, patch) => set((state) => ({
    lineItems: state.lineItems.map((lineItem) => (
      lineItem.id === id ? { ...lineItem, ...patch } : lineItem
    )),
  })),
  updatePayment: (patch) => set((state) => ({ payment: { ...state.payment, ...patch } })),
  updateServiceNote: (patch) => set((state) => ({ serviceNote: { ...state.serviceNote, ...patch } })),
  replaceDraft: (draft) => set({
    currentStep: draft.currentStep ?? 'confirm',
    vehicle: draft.vehicle,
    injector: draft.injector,
    lineItems: draft.lineItems,
    payment: draft.payment,
    serviceNote: draft.serviceNote ?? createDefaultServiceNote(),
  }),
  selectExistingVehicle: (vehicle) => set((state) => ({
    vehicle: {
      ...state.vehicle,
      ...vehicle,
      problemDescription: state.vehicle.problemDescription,
    },
  })),
  startNewVehicleRecord: () => set((state) => ({
    vehicle: {
      ...state.vehicle,
      selectedVehicleId: null,
      previousMileage: null,
    },
  })),
  reset: () => set({
    currentStep: 'vehicle',
    vehicle: defaultVehicle,
    injector: defaultInjector,
    lineItems: [],
    payment: defaultPayment,
    serviceNote: createDefaultServiceNote(),
  }),
}));
