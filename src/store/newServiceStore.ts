import { create } from 'zustand';

import {
  type InjectorDraftItem,
  type NewServiceInjectorDraft,
  type NewServiceLineItemDraft,
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
  setStep: (step: NewServiceStep) => void;
  updateVehicle: (patch: Partial<NewServiceVehicleDraft>) => void;
  updateInjector: (patch: Partial<Omit<NewServiceInjectorDraft, 'injectors'>>) => void;
  setInjectorCount: (count: number) => void;
  updateInjectorItem: (injectorNumber: number, patch: Partial<InjectorDraftItem>) => void;
  addLineItem: (lineItem: NewServiceLineItemDraft) => void;
  removeLineItem: (id: string) => void;
  updateLineItem: (id: string, patch: Partial<NewServiceLineItemDraft>) => void;
  updatePayment: (patch: Partial<NewServicePaymentDraft>) => void;
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
  discountedPrice: '',
  discountAmount: '0',
  paidAmount: '0',
  paymentMethod: '',
  note: '',
};

export const useNewServiceStore = create<NewServiceStore>((set) => ({
  currentStep: 'vehicle',
  vehicle: defaultVehicle,
  injector: defaultInjector,
  lineItems: [],
  payment: defaultPayment,
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
  }),
}));
