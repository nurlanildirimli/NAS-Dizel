import { z } from 'zod';

import { supabase } from '../lib/supabase';
import { saveServiceResultSchema, type SaveServiceResult } from '../schemas/saveService';
import { type useNewServiceStore } from '../store/newServiceStore';
import { type NewServiceLineItemDraft } from '../types/newService';
import { calculateNewServiceTotals } from '../utils/calculateNewServiceTotals';

type NewServiceState = ReturnType<typeof useNewServiceStore.getState>;

const saveServiceResultsSchema = z.array(saveServiceResultSchema);

function toMoneyNumber(value: string): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export function buildTextServiceLineItems(priceTotal: string): NewServiceLineItemDraft[] {
  const amount = Math.max(0, toMoneyNumber(priceTotal));

  if (amount <= 0) {
    return [];
  }

  return [{
    id: 'text-service-total',
    itemType: 'extra',
    itemName: 'Servis yekunu',
    optionName: null,
    applyTarget: 'general_service',
    selectedInjectorNumbers: [],
    quantity: '1',
    defaultUnitPrice: String(amount),
    actualUnitPrice: String(amount),
    priceSource: 'manual_price',
    note: 'AI peşəkar servis qeydi üzrə yekun qiymət',
  }];
}

export async function saveService(draft: Pick<NewServiceState, 'vehicle' | 'injector' | 'lineItems' | 'payment' | 'serviceNote'>): Promise<SaveServiceResult> {
  const lineItems = draft.lineItems.length > 0
    ? draft.lineItems
    : buildTextServiceLineItems(draft.serviceNote.priceTotal);
  const injectorCount = draft.serviceNote.detectedInjectorCount ?? 1;
  const injectorCompany = draft.serviceNote.detectedInjectorCompany || draft.injector.injectorCompany || 'Unknown';
  const injectorCode = draft.serviceNote.detectedInjectorCode.trim() || draft.injector.injectorCode.trim() || 'AI-NOTE';
  const injectorRows = Array.from({ length: injectorCount }, (_, index) => ({
    injector_number: index + 1,
    initial_test_result: '',
    final_test_result: '',
    injector_status: '',
    problem_found: [],
    work_done: [],
    parts_replaced: [],
    note: draft.serviceNote.professionalText || draft.serviceNote.rawNote,
  }));
  const totals = calculateNewServiceTotals(lineItems, draft.payment);
  const payload = {
    service: {
      work_performed: draft.serviceNote.professionalText,
      technical_notes: draft.serviceNote.rawNote,
    },
    vehicle: {
      id: draft.vehicle.selectedVehicleId,
      license_plate: draft.vehicle.licensePlate,
      brand: draft.vehicle.brand,
      phone: draft.vehicle.phone,
      mileage: Number(draft.vehicle.mileage),
      problem_description: draft.vehicle.problemDescription || 'Servis qeydi',
      is_problem_customer: draft.vehicle.isProblemCustomer,
      problem_reason: draft.vehicle.problemReason,
    },
    injector: {
      count: injectorCount,
      company: injectorCompany,
      code: injectorCode,
      serial_info: draft.injector.injectorSerialInfo,
      injector_model_id: draft.injector.injectorModelId,
      injectors: injectorRows,
    },
    line_items: lineItems.map((lineItem) => ({
      item_type: lineItem.itemType,
      item_name: lineItem.itemName,
      option_name: lineItem.optionName,
      apply_target: lineItem.applyTarget,
      selected_injector_numbers: lineItem.selectedInjectorNumbers,
      quantity: Number(lineItem.quantity),
      default_unit_price: Number(lineItem.defaultUnitPrice),
      actual_unit_price: Number(lineItem.actualUnitPrice),
      price_source: lineItem.priceSource,
      note: lineItem.note,
    })),
    payment: {
      discount_amount: totals.discountAmount,
      paid_amount: Number(draft.payment.paidAmount),
      payment_method: null,
      note: draft.payment.note,
    },
  };

  const { data, error } = await supabase.rpc('save_service', { payload });

  if (error) {
    throw error;
  }

  const rows = saveServiceResultsSchema.parse(data ?? []);

  if (!rows[0]) {
    throw new Error('Service save did not return a result.');
  }

  return rows[0];
}
