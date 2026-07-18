export type PaymentStatus = 'paid' | 'partially_paid' | 'unpaid' | 'cancelled';

export type VehicleSearchFilter =
  | 'all'
  | 'problem'
  | 'debt'
  | 'unpaid'
  | 'partially_paid'
  | 'recent'
  | 'normal'
  | 'this_month'
  | 'frequent';

export type VehicleSummary = {
  id: string;
  licensePlate: string;
  brand: string;
  phone: string;
  isProblemCustomer: boolean;
  problemReason: string | null;
  lastMileage: number;
  note: string | null;
  serviceCount: number;
  totalSpend: number;
  remainingDebt: number;
  lastServiceDate: string | null;
  latestPaymentStatus: PaymentStatus | null;
  latestInjectorCount: number | null;
  latestInjectorCompany: string | null;
  latestInjectorCode: string | null;
  latestInjectorSummary: string | null;
  hasDebt: boolean;
  createdAt: string;
  updatedAt: string;
};

export type VehicleHistoryItem = {
  id: string;
  vehicleId: string;
  serviceDate: string;
  mileage: number;
  injectorCount: number;
  injectorCompany: string;
  injectorCode: string;
  injectorSummary: string | null;
  workPerformed: string | null;
  technicalNotes: string | null;
  laborTotal: number;
  partsTotal: number;
  extraTotal: number;
  calculatedTotal: number;
  discountAmount: number;
  finalTotal: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: PaymentStatus;
};
