import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';

import { supabase } from '../lib/supabase';
import {
  type NewServiceNoteDraft,
  type NewServicePaymentDraft,
  type NewServiceVehicleDraft,
} from '../types/newService';
import { type ServiceDraft, type ServiceDraftStatus } from '../types/serviceDrafts';

const LOCAL_DRAFTS_KEY = 'nas_dizel_service_drafts';

const serviceDraftRowSchema = z.object({
  id: z.string().uuid(),
  selected_vehicle_id: z.string().uuid().nullable(),
  previous_mileage: z.number().nullable(),
  license_plate: z.string(),
  brand: z.string(),
  phone: z.string(),
  mileage: z.number().nullable(),
  problem_description: z.string().nullable(),
  is_problem_customer: z.boolean(),
  problem_reason: z.string().nullable(),
  raw_note: z.string(),
  local_recording_key: z.string().nullable().optional(),
  professional_text: z.string().nullable(),
  ai_warnings: z.array(z.string()),
  missing_info: z.array(z.string()),
  price_lines: z.array(z.object({
    name: z.string(),
    amount: z.number(),
    source: z.enum(['spoken', 'catalog', 'unmatched']).optional(),
    scope: z.string().optional(),
    sourceText: z.string().optional(),
    lineItem: z.object({
      id: z.string(),
      itemType: z.enum(['labor', 'part', 'extra']),
      itemName: z.string(),
      optionName: z.string().nullable(),
      applyTarget: z.enum(['all_injectors', 'single_injector', 'selected_injectors', 'general_service']),
      selectedInjectorNumbers: z.array(z.number()),
      quantity: z.string(),
      defaultUnitPrice: z.string(),
      actualUnitPrice: z.string(),
      priceSource: z.enum(['model_price', 'manual_price', 'global_default', 'company_default']),
      note: z.string(),
    }).optional(),
  })),
  price_total: z.number(),
  discount_amount: z.number(),
  paid_amount: z.number(),
  payment_note: z.string().nullable(),
  detected_injector_count: z.number().nullable(),
  detected_injector_company: z.string().nullable(),
  detected_injector_code: z.string().nullable(),
  status: z.enum(['draft', 'ready', 'saved']),
  created_at: z.string(),
  updated_at: z.string(),
});

const serviceDraftRowsSchema = z.array(serviceDraftRowSchema);

type ServiceDraftRow = z.infer<typeof serviceDraftRowSchema>;

type SaveServiceDraftInput = {
  id?: string | null;
  vehicle: NewServiceVehicleDraft;
  serviceNote: NewServiceNoteDraft;
  payment: NewServicePaymentDraft;
  status?: ServiceDraftStatus;
};

function fallbackLocalRecordingKey(id?: string | null) {
  return `voice-${id ?? Date.now()}`;
}

function toNumber(value: string): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function mapRow(row: ServiceDraftRow): ServiceDraft {
  return {
    id: row.id,
    vehicle: {
      selectedVehicleId: row.selected_vehicle_id,
      previousMileage: row.previous_mileage,
      licensePlate: row.license_plate,
      brand: row.brand,
      phone: row.phone,
      mileage: row.mileage ? String(row.mileage) : '',
      problemDescription: row.problem_description ?? '',
      isProblemCustomer: row.is_problem_customer,
      problemReason: row.problem_reason ?? '',
    },
    serviceNote: {
      draftId: row.id,
      localRecordingKey: row.local_recording_key ?? fallbackLocalRecordingKey(row.id),
      rawNote: row.raw_note,
      professionalText: row.professional_text ?? '',
      warnings: row.ai_warnings,
      missingInfo: row.missing_info,
      detectedPriceLines: row.price_lines,
      priceTotal: String(row.price_total),
      detectedInjectorCount: row.detected_injector_count,
      detectedInjectorCompany: row.detected_injector_company === 'Unknown'
        ? 'Unknown'
        : row.detected_injector_company === 'Bosch'
          || row.detected_injector_company === 'Delphi'
          || row.detected_injector_company === 'Denso'
          || row.detected_injector_company === 'Siemens'
          ? row.detected_injector_company
          : '',
      detectedInjectorCode: row.detected_injector_code ?? '',
    },
    payment: {
      discountAmount: String(row.discount_amount),
      paidAmount: String(row.paid_amount),
      paymentMethod: '',
      note: row.payment_note ?? '',
    },
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(input: SaveServiceDraftInput) {
  return {
    selected_vehicle_id: input.vehicle.selectedVehicleId,
    previous_mileage: input.vehicle.previousMileage,
    license_plate: input.vehicle.licensePlate,
    brand: input.vehicle.brand,
    phone: input.vehicle.phone,
    mileage: input.vehicle.mileage ? Number(input.vehicle.mileage) : null,
    problem_description: input.vehicle.problemDescription || null,
    is_problem_customer: input.vehicle.isProblemCustomer,
    problem_reason: input.vehicle.problemReason || null,
    raw_note: input.serviceNote.rawNote,
    local_recording_key: input.serviceNote.localRecordingKey,
    professional_text: input.serviceNote.professionalText || null,
    ai_warnings: input.serviceNote.warnings,
    missing_info: input.serviceNote.missingInfo,
    price_lines: input.serviceNote.detectedPriceLines,
    price_total: toNumber(input.serviceNote.priceTotal),
    discount_amount: toNumber(input.payment.discountAmount),
    paid_amount: toNumber(input.payment.paidAmount),
    payment_note: input.payment.note || null,
    detected_injector_count: input.serviceNote.detectedInjectorCount,
    detected_injector_company: input.serviceNote.detectedInjectorCompany || null,
    detected_injector_code: input.serviceNote.detectedInjectorCode || null,
    status: input.status ?? 'draft',
  };
}

export async function loadLocalServiceDrafts(): Promise<ServiceDraft[]> {
  const raw = await AsyncStorage.getItem(LOCAL_DRAFTS_KEY);
  if (!raw) {
    return [];
  }

  try {
    return (JSON.parse(raw) as ServiceDraft[]).map((draft) => ({
      ...draft,
      serviceNote: {
        ...draft.serviceNote,
        localRecordingKey: draft.serviceNote.localRecordingKey ?? fallbackLocalRecordingKey(draft.id),
      },
    }));
  } catch {
    return [];
  }
}

async function writeLocalServiceDrafts(drafts: ServiceDraft[]) {
  await AsyncStorage.setItem(LOCAL_DRAFTS_KEY, JSON.stringify(drafts));
}

async function upsertLocalDraft(draft: ServiceDraft) {
  const drafts = await loadLocalServiceDrafts();
  await writeLocalServiceDrafts([
    draft,
    ...drafts.filter((item) => item.id !== draft.id),
  ]);
}

export async function listServiceDrafts(): Promise<ServiceDraft[]> {
  const { data, error } = await supabase
    .from('service_drafts')
    .select('*')
    .neq('status', 'saved')
    .order('updated_at', { ascending: false });

  if (error) {
    return loadLocalServiceDrafts();
  }

  const drafts = serviceDraftRowsSchema.parse(data ?? []).map(mapRow);
  await writeLocalServiceDrafts(drafts);
  return drafts;
}

export async function saveServiceDraft(input: SaveServiceDraftInput): Promise<ServiceDraft> {
  const row = toRow(input);
  const query = input.id
    ? supabase.from('service_drafts').update(row).eq('id', input.id).select('*').single()
    : supabase.from('service_drafts').insert(row).select('*').single();

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const draft = mapRow(serviceDraftRowSchema.parse(data));
  await upsertLocalDraft(draft);
  return draft;
}

export async function deleteServiceDraft(id: string) {
  const { error } = await supabase
    .from('service_drafts')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }

  const drafts = await loadLocalServiceDrafts();
  await writeLocalServiceDrafts(drafts.filter((draft) => draft.id !== id));
}

export async function markServiceDraftSaved(id: string) {
  const { error } = await supabase
    .from('service_drafts')
    .update({ status: 'saved' })
    .eq('id', id);

  if (error) {
    throw error;
  }

  const drafts = await loadLocalServiceDrafts();
  await writeLocalServiceDrafts(drafts.filter((draft) => draft.id !== id));
}
