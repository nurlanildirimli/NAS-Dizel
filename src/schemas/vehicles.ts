import { z } from 'zod';

const nullableString = z.string().nullable();
const numericValue = z.union([z.number(), z.string()]).transform((value) => Number(value));

export const paymentStatusSchema = z.enum([
  'paid',
  'partially_paid',
  'unpaid',
  'cancelled',
]);

export const vehicleSummaryRowSchema = z.object({
  id: z.string().uuid(),
  license_plate: z.string(),
  brand: z.string(),
  phone: z.string(),
  is_problem_customer: z.boolean(),
  problem_reason: nullableString,
  last_mileage: z.number(),
  note: nullableString,
  service_count: z.number(),
  total_spend: numericValue,
  remaining_debt: numericValue,
  last_service_date: nullableString,
  latest_payment_status: paymentStatusSchema.nullable(),
  latest_injector_count: z.number().nullable(),
  latest_injector_company: nullableString,
  latest_injector_code: nullableString,
  latest_injector_summary: nullableString,
  has_debt: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const vehicleHistoryRowSchema = z.object({
  id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
  service_date: z.string(),
  mileage: z.number(),
  injector_count: z.number(),
  injector_company: z.string(),
  injector_code: z.string(),
  injector_summary: nullableString,
  work_performed: nullableString,
  technical_notes: nullableString,
  labor_total: numericValue,
  parts_total: numericValue,
  extra_total: numericValue,
  calculated_total: numericValue,
  discount_amount: numericValue,
  final_total: numericValue,
  paid_amount: numericValue,
  remaining_amount: numericValue,
  payment_status: paymentStatusSchema,
});

export type VehicleSummaryRow = z.infer<typeof vehicleSummaryRowSchema>;
export type VehicleHistoryRow = z.infer<typeof vehicleHistoryRowSchema>;
