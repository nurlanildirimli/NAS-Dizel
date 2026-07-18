import { z } from 'zod';

import { paymentStatusSchema } from './vehicles';

const numericValue = z.union([z.number(), z.string()]).transform((value) => Number(value));
const nullableString = z.string().nullable();
const paymentMethodSchema = z.enum(['cash', 'card', 'transfer', 'debt', 'mixed']).nullable();

export const serviceHeaderRowSchema = z.object({
  id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
  service_date: z.string(),
  mileage: z.number(),
  phone: z.string(),
  is_problem_customer_snapshot: z.boolean(),
  problem_reason_snapshot: nullableString,
  problem_description: z.string(),
  work_performed: nullableString,
  technical_notes: nullableString,
  injector_count: z.number(),
  injector_company: z.string(),
  injector_code: z.string(),
  injector_serial_info: nullableString,
  injector_summary: nullableString,
  labor_total: numericValue,
  parts_total: numericValue,
  extra_total: numericValue,
  calculated_total: numericValue,
  discount_amount: numericValue,
  final_total: numericValue,
  paid_amount: numericValue,
  remaining_amount: numericValue,
  payment_status: paymentStatusSchema,
  payment_method: paymentMethodSchema,
});

export const serviceVehicleRowSchema = z.object({
  id: z.string().uuid(),
  license_plate: z.string(),
  brand: z.string(),
  phone: z.string(),
  is_problem_customer: z.boolean(),
  problem_reason: nullableString,
  last_mileage: z.number(),
});

export const serviceInjectorRowSchema = z.object({
  id: z.string().uuid(),
  injector_number: z.number(),
  initial_test_result: nullableString,
  final_test_result: nullableString,
  injector_status: nullableString,
  problem_found: z.array(z.string()).nullable(),
  work_done: z.array(z.string()).nullable(),
  parts_replaced: z.array(z.string()).nullable(),
  note: nullableString,
});

export const serviceLineItemRowSchema = z.object({
  id: z.string().uuid(),
  item_type: z.enum(['labor', 'part', 'extra']),
  item_name: z.string(),
  option_name: nullableString,
  apply_target: z.string(),
  selected_injector_numbers: z.array(z.number()).nullable(),
  quantity: z.number(),
  default_unit_price: numericValue,
  actual_unit_price: numericValue,
  total_price: numericValue,
  price_source: z.string(),
  price_changed: z.boolean(),
  note: nullableString,
});

export const servicePaymentRowSchema = z.object({
  id: z.string().uuid(),
  payment_date: z.string(),
  total_amount: numericValue,
  paid_amount: numericValue,
  remaining_amount: numericValue,
  payment_status: paymentStatusSchema,
  payment_method: paymentMethodSchema,
  note: nullableString,
});

export const serviceDetailRowSchema = z.object({
  service: serviceHeaderRowSchema,
  vehicle: serviceVehicleRowSchema,
  injectors: z.array(serviceInjectorRowSchema),
  line_items: z.array(serviceLineItemRowSchema),
  payments: z.array(servicePaymentRowSchema),
});

export const paymentCardRowSchema = z.object({
  service_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
  service_date: z.string(),
  license_plate: z.string(),
  brand: z.string(),
  phone: z.string(),
  final_total: numericValue,
  paid_amount: numericValue,
  remaining_amount: numericValue,
  payment_status: paymentStatusSchema,
  payment_method: paymentMethodSchema,
});

export const incomeSummaryRowSchema = z.object({
  period_key: z.enum(['today', 'week', 'month', 'year']),
  income_total: numericValue,
  debt_total: numericValue,
  service_count: numericValue,
  vehicle_count: numericValue,
  injector_count: numericValue,
});

export const paymentMutationResultSchema = z.object({
  service_id: z.string().uuid(),
  payment_id: z.string().uuid().optional(),
  payment_status: paymentStatusSchema,
});

export const softDeleteResultSchema = z.object({
  service_id: z.string().uuid().optional(),
  vehicle_id: z.string().uuid().optional(),
  payment_id: z.string().uuid().optional(),
});

export type ServiceDetailRow = z.infer<typeof serviceDetailRowSchema>;
export type PaymentCardRow = z.infer<typeof paymentCardRowSchema>;
export type IncomeSummaryRow = z.infer<typeof incomeSummaryRowSchema>;
