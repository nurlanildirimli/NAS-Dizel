import { z } from 'zod';

import { supabase } from '../lib/supabase';
import {
  incomeSummaryRowSchema,
  paymentCardRowSchema,
  paymentMutationResultSchema,
  serviceDetailRowSchema,
  softDeleteResultSchema,
  type IncomeSummaryRow,
  type PaymentCardRow,
  type ServiceDetailRow,
} from '../schemas/services';
import {
  type IncomePeriod,
  type IncomeSummary,
  type PaymentCardItem,
  type PaymentFilter,
  type PaymentMethod,
  type ServiceDetail,
} from '../types/services';

const paymentCardRowsSchema = z.array(paymentCardRowSchema);

function mapServiceDetail(row: ServiceDetailRow): ServiceDetail {
  return {
    service: {
      id: row.service.id,
      vehicleId: row.service.vehicle_id,
      serviceDate: row.service.service_date,
      mileage: row.service.mileage,
      phone: row.service.phone,
      isProblemCustomerSnapshot: row.service.is_problem_customer_snapshot,
      problemReasonSnapshot: row.service.problem_reason_snapshot,
      problemDescription: row.service.problem_description,
      workPerformed: row.service.work_performed,
      technicalNotes: row.service.technical_notes,
      injectorCount: row.service.injector_count,
      injectorCompany: row.service.injector_company,
      injectorCode: row.service.injector_code,
      injectorSerialInfo: row.service.injector_serial_info,
      injectorSummary: row.service.injector_summary,
      laborTotal: row.service.labor_total,
      partsTotal: row.service.parts_total,
      extraTotal: row.service.extra_total,
      calculatedTotal: row.service.calculated_total,
      discountAmount: row.service.discount_amount,
      finalTotal: row.service.final_total,
      paidAmount: row.service.paid_amount,
      remainingAmount: row.service.remaining_amount,
      paymentStatus: row.service.payment_status,
      paymentMethod: row.service.payment_method,
    },
    vehicle: {
      id: row.vehicle.id,
      licensePlate: row.vehicle.license_plate,
      brand: row.vehicle.brand,
      phone: row.vehicle.phone,
      isProblemCustomer: row.vehicle.is_problem_customer,
      problemReason: row.vehicle.problem_reason,
      lastMileage: row.vehicle.last_mileage,
    },
    injectors: row.injectors.map((injector) => ({
      id: injector.id,
      injectorNumber: injector.injector_number,
      initialTestResult: injector.initial_test_result,
      finalTestResult: injector.final_test_result,
      injectorStatus: injector.injector_status,
      problemFound: injector.problem_found ?? [],
      workDone: injector.work_done ?? [],
      partsReplaced: injector.parts_replaced ?? [],
      note: injector.note,
    })),
    lineItems: row.line_items.map((item) => ({
      id: item.id,
      itemType: item.item_type,
      itemName: item.item_name,
      optionName: item.option_name,
      applyTarget: item.apply_target,
      selectedInjectorNumbers: item.selected_injector_numbers ?? [],
      quantity: item.quantity,
      defaultUnitPrice: item.default_unit_price,
      actualUnitPrice: item.actual_unit_price,
      totalPrice: item.total_price,
      priceSource: item.price_source,
      priceChanged: item.price_changed,
      note: item.note,
    })),
    payments: row.payments.map((payment) => ({
      id: payment.id,
      paymentDate: payment.payment_date,
      totalAmount: payment.total_amount,
      paidAmount: payment.paid_amount,
      remainingAmount: payment.remaining_amount,
      paymentStatus: payment.payment_status,
      paymentMethod: payment.payment_method,
      note: payment.note,
    })),
  };
}

function mapPaymentCard(row: PaymentCardRow): PaymentCardItem {
  return {
    serviceId: row.service_id,
    vehicleId: row.vehicle_id,
    serviceDate: row.service_date,
    licensePlate: row.license_plate,
    brand: row.brand,
    phone: row.phone,
    finalTotal: row.final_total,
    paidAmount: row.paid_amount,
    remainingAmount: row.remaining_amount,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
  };
}

function mapIncomeSummary(row: IncomeSummaryRow): IncomeSummary {
  return {
    periodKey: row.period_key,
    incomeTotal: row.income_total,
    debtTotal: row.debt_total,
    serviceCount: row.service_count,
    vehicleCount: row.vehicle_count,
    injectorCount: row.injector_count,
  };
}

export async function getServiceDetail(serviceId: string): Promise<ServiceDetail | null> {
  const { data, error } = await supabase.rpc('get_service_detail', {
    service_uuid: serviceId,
  });

  if (error) {
    throw error;
  }

  return data ? mapServiceDetail(serviceDetailRowSchema.parse(data)) : null;
}

export async function listPayments(filterKey: PaymentFilter = 'all', limit = 50): Promise<PaymentCardItem[]> {
  const { data, error } = await supabase.rpc('list_payments', {
    filter_key: filterKey,
    result_limit: limit,
  });

  if (error) {
    throw error;
  }

  return paymentCardRowsSchema.parse(data ?? []).map(mapPaymentCard);
}

export async function getIncomeSummary(periodKey: IncomePeriod = 'month'): Promise<IncomeSummary> {
  const { data, error } = await supabase.rpc('get_income_summary', {
    period_key: periodKey,
  });

  if (error) {
    throw error;
  }

  return mapIncomeSummary(incomeSummaryRowSchema.parse(data));
}

export async function recordServicePayment(params: {
  serviceId: string;
  paidAmount: number;
  paymentMethod: Exclude<PaymentMethod, null>;
  note?: string;
}) {
  const { data, error } = await supabase.rpc('record_service_payment', {
    service_uuid: params.serviceId,
    paid_amount: params.paidAmount,
    payment_method: params.paymentMethod,
    note: params.note ?? null,
  });

  if (error) {
    throw error;
  }

  return paymentMutationResultSchema.parse(data);
}

export async function markServicePaid(params: {
  serviceId: string;
  paymentMethod?: Exclude<PaymentMethod, null>;
}) {
  const { data, error } = await supabase.rpc('mark_service_paid', {
    service_uuid: params.serviceId,
    payment_method: params.paymentMethod ?? 'cash',
  });

  if (error) {
    throw error;
  }

  return paymentMutationResultSchema.parse(data);
}

export async function softDeleteService(serviceId: string) {
  const { data, error } = await supabase.rpc('soft_delete_service', {
    service_uuid: serviceId,
  });

  if (error) {
    throw error;
  }

  return softDeleteResultSchema.parse(data);
}

export async function softDeletePayment(paymentId: string) {
  const { data, error } = await supabase.rpc('soft_delete_payment', {
    payment_uuid: paymentId,
  });

  if (error) {
    throw error;
  }

  return softDeleteResultSchema.parse(data);
}
