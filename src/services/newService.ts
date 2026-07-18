import { z } from 'zod';

import { supabase } from '../lib/supabase';
import { saveServiceResultSchema, type SaveServiceResult } from '../schemas/saveService';
import { type useNewServiceStore } from '../store/newServiceStore';
import { calculateNewServiceTotals } from '../utils/calculateNewServiceTotals';

type NewServiceState = ReturnType<typeof useNewServiceStore.getState>;

const saveServiceResultsSchema = z.array(saveServiceResultSchema);

export async function saveService(draft: Pick<NewServiceState, 'vehicle' | 'injector' | 'lineItems' | 'payment'>): Promise<SaveServiceResult> {
  const totals = calculateNewServiceTotals(draft.lineItems, draft.payment);
  const payload = {
    vehicle: {
      id: draft.vehicle.selectedVehicleId,
      license_plate: draft.vehicle.licensePlate,
      brand: draft.vehicle.brand,
      phone: draft.vehicle.phone,
      mileage: Number(draft.vehicle.mileage),
      problem_description: draft.vehicle.problemDescription,
      is_problem_customer: draft.vehicle.isProblemCustomer,
      problem_reason: draft.vehicle.problemReason,
    },
    injector: {
      count: draft.injector.injectorCount,
      company: draft.injector.injectorCompany,
      code: draft.injector.injectorCode,
      serial_info: draft.injector.injectorSerialInfo,
      injector_model_id: draft.injector.injectorModelId,
      injectors: draft.injector.injectors.map((injector) => ({
        injector_number: injector.injectorNumber,
        initial_test_result: injector.initialTestResult,
        final_test_result: injector.finalTestResult,
        injector_status: injector.injectorStatus,
        problem_found: injector.problemFound,
        work_done: injector.workDone,
        parts_replaced: injector.partsReplaced,
        note: injector.note,
      })),
    },
    line_items: draft.lineItems.map((lineItem) => ({
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
