import { type PaymentStatus } from './vehicles';

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'debt' | 'mixed' | null;

export type ServiceHeader = {
  id: string;
  vehicleId: string;
  serviceDate: string;
  mileage: number;
  phone: string;
  isProblemCustomerSnapshot: boolean;
  problemReasonSnapshot: string | null;
  problemDescription: string;
  workPerformed: string | null;
  technicalNotes: string | null;
  injectorCount: number;
  injectorCompany: string;
  injectorCode: string;
  injectorSerialInfo: string | null;
  injectorSummary: string | null;
  laborTotal: number;
  partsTotal: number;
  extraTotal: number;
  calculatedTotal: number;
  discountAmount: number;
  finalTotal: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
};

export type ServiceVehicle = {
  id: string;
  licensePlate: string;
  brand: string;
  phone: string;
  isProblemCustomer: boolean;
  problemReason: string | null;
  lastMileage: number;
};

export type ServiceInjector = {
  id: string;
  injectorNumber: number;
  initialTestResult: string | null;
  finalTestResult: string | null;
  injectorStatus: string | null;
  problemFound: string[];
  workDone: string[];
  partsReplaced: string[];
  note: string | null;
};

export type ServiceLineItem = {
  id: string;
  itemType: 'labor' | 'part' | 'extra';
  itemName: string;
  optionName: string | null;
  applyTarget: string;
  selectedInjectorNumbers: number[];
  quantity: number;
  defaultUnitPrice: number;
  actualUnitPrice: number;
  totalPrice: number;
  priceSource: string;
  priceChanged: boolean;
  note: string | null;
};

export type ServicePayment = {
  id: string;
  paymentDate: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  note: string | null;
};

export type ServiceDetail = {
  service: ServiceHeader;
  vehicle: ServiceVehicle;
  injectors: ServiceInjector[];
  lineItems: ServiceLineItem[];
  payments: ServicePayment[];
};

export type PaymentFilter = 'all' | 'paid' | 'partially_paid' | 'unpaid' | 'debt';

export type PaymentCardItem = {
  serviceId: string;
  vehicleId: string;
  serviceDate: string;
  licensePlate: string;
  brand: string;
  phone: string;
  finalTotal: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
};

export type IncomePeriod = 'today' | 'week' | 'month' | 'year';

export type IncomeSummary = {
  periodKey: IncomePeriod;
  incomeTotal: number;
  debtTotal: number;
  serviceCount: number;
  vehicleCount: number;
  injectorCount: number;
};
