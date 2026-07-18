export type InjectorCompany =
  | 'Bosch'
  | 'Delphi'
  | 'Denso'
  | 'Siemens';

export type NewServiceVehicleDraft = {
  selectedVehicleId: string | null;
  previousMileage: number | null;
  licensePlate: string;
  brand: string;
  phone: string;
  mileage: string;
  problemDescription: string;
  isProblemCustomer: boolean;
  problemReason: string;
};

export type InjectorDraftItem = {
  injectorNumber: number;
  initialTestResult: string;
  finalTestResult: string;
  injectorStatus: string;
  problemFound: string[];
  workDone: string[];
  partsReplaced: string[];
  note: string;
};

export type NewServiceInjectorDraft = {
  injectorCount: number;
  injectorCompany: InjectorCompany | '';
  injectorCode: string;
  injectorSerialInfo: string;
  injectorModelId: string | null;
  useManualPricing: boolean;
  injectors: InjectorDraftItem[];
};

export type NewServiceApplyTarget =
  | 'all_injectors'
  | 'single_injector'
  | 'selected_injectors'
  | 'general_service';

export type NewServicePriceSource =
  | 'model_price'
  | 'manual_price'
  | 'global_default'
  | 'company_default';

export type NewServicePaymentMethod = 'cash' | 'card' | 'transfer' | 'debt' | 'mixed' | '';

export type NewServiceLineItemDraft = {
  id: string;
  itemType: 'labor' | 'part' | 'extra';
  itemName: string;
  optionName: string | null;
  applyTarget: NewServiceApplyTarget;
  selectedInjectorNumbers: number[];
  quantity: string;
  defaultUnitPrice: string;
  actualUnitPrice: string;
  priceSource: NewServicePriceSource;
  note: string;
};

export type NewServicePaymentDraft = {
  discountedPrice: string;
  discountAmount: string;
  paidAmount: string;
  paymentMethod: NewServicePaymentMethod;
  note: string;
};

export type NewServiceTotals = {
  laborTotal: number;
  partsTotal: number;
  extraTotal: number;
  calculatedTotal: number;
  discountAmount: number;
  finalTotal: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: 'paid' | 'partially_paid' | 'unpaid';
};

export type NewServiceStep = 'vehicle' | 'injectors' | 'confirm';
