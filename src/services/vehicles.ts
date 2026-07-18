import { z } from 'zod';

import {
  vehicleHistoryRowSchema,
  vehicleSummaryRowSchema,
  type VehicleHistoryRow,
  type VehicleSummaryRow,
} from '../schemas/vehicles';
import { supabase } from '../lib/supabase';
import {
  type VehicleHistoryItem,
  type VehicleSearchFilter,
  type VehicleSummary,
} from '../types/vehicles';

const softDeleteVehicleResultSchema = z.object({
  vehicle_id: z.string().uuid(),
});

type SearchVehiclesParams = {
  searchText?: string;
  filterKey?: VehicleSearchFilter;
  limit?: number;
};

const vehicleSummaryRowsSchema = z.array(vehicleSummaryRowSchema);
const vehicleHistoryRowsSchema = z.array(vehicleHistoryRowSchema);

function mapVehicleSummary(row: VehicleSummaryRow): VehicleSummary {
  return {
    id: row.id,
    licensePlate: row.license_plate,
    brand: row.brand,
    phone: row.phone,
    isProblemCustomer: row.is_problem_customer,
    problemReason: row.problem_reason,
    lastMileage: row.last_mileage,
    note: row.note,
    serviceCount: row.service_count,
    totalSpend: row.total_spend,
    remainingDebt: row.remaining_debt,
    lastServiceDate: row.last_service_date,
    latestPaymentStatus: row.latest_payment_status,
    latestInjectorCount: row.latest_injector_count,
    latestInjectorCompany: row.latest_injector_company,
    latestInjectorCode: row.latest_injector_code,
    latestInjectorSummary: row.latest_injector_summary,
    hasDebt: row.has_debt,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapVehicleHistoryItem(row: VehicleHistoryRow): VehicleHistoryItem {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    serviceDate: row.service_date,
    mileage: row.mileage,
    injectorCount: row.injector_count,
    injectorCompany: row.injector_company,
    injectorCode: row.injector_code,
    injectorSummary: row.injector_summary,
    workPerformed: row.work_performed,
    technicalNotes: row.technical_notes,
    laborTotal: row.labor_total,
    partsTotal: row.parts_total,
    extraTotal: row.extra_total,
    calculatedTotal: row.calculated_total,
    discountAmount: row.discount_amount,
    finalTotal: row.final_total,
    paidAmount: row.paid_amount,
    remainingAmount: row.remaining_amount,
    paymentStatus: row.payment_status,
  };
}

export async function searchVehicles({
  searchText = '',
  filterKey = 'all',
  limit = 30,
}: SearchVehiclesParams = {}): Promise<VehicleSummary[]> {
  const { data, error } = await supabase.rpc('search_vehicles', {
    search_text: searchText,
    filter_key: filterKey,
    result_limit: limit,
  });

  if (error) {
    throw error;
  }

  return vehicleSummaryRowsSchema.parse(data ?? []).map(mapVehicleSummary);
}

export async function checkVehicleByPlate(plate: string): Promise<VehicleSummary | null> {
  const { data, error } = await supabase.rpc('check_vehicle_by_plate', {
    plate_text: plate,
  });

  if (error) {
    throw error;
  }

  const rows = vehicleSummaryRowsSchema.parse(data ?? []);
  return rows[0] ? mapVehicleSummary(rows[0]) : null;
}

export async function getVehicleSummary(vehicleId: string): Promise<VehicleSummary | null> {
  const { data, error } = await supabase
    .from('vehicle_summaries')
    .select('*')
    .eq('id', vehicleId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapVehicleSummary(vehicleSummaryRowSchema.parse(data)) : null;
}

export async function getVehicleHistory(vehicleId: string): Promise<VehicleHistoryItem[]> {
  const { data, error } = await supabase.rpc('get_vehicle_history', {
    vehicle_uuid: vehicleId,
  });

  if (error) {
    throw error;
  }

  return vehicleHistoryRowsSchema.parse(data ?? []).map(mapVehicleHistoryItem);
}

export async function softDeleteVehicle(vehicleId: string) {
  const { data, error } = await supabase.rpc('soft_delete_vehicle', {
    vehicle_uuid: vehicleId,
  });

  if (error) {
    throw error;
  }

  return softDeleteVehicleResultSchema.parse(data);
}
