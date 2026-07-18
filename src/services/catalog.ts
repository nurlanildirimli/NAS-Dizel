import { z } from 'zod';

import { supabase } from '../lib/supabase';
import {
  injectorModelPriceRowSchema,
  injectorModelRowSchema,
  priceItemOptionRowSchema,
  priceItemRowSchema,
  type InjectorModelPriceRow,
  type InjectorModelRow,
  type PriceItemOptionRow,
  type PriceItemRow,
} from '../schemas/catalog';
import {
  type InjectorModel,
  type InjectorModelInput,
  type InjectorModelPrice,
  type ModelPriceInput,
  type PriceCatalog,
  type PriceItemInput,
  type PriceItem,
  type PriceItemOption,
} from '../types/catalog';

const injectorModelRowsSchema = z.array(injectorModelRowSchema);
const priceItemRowsSchema = z.array(priceItemRowSchema);
const priceItemOptionRowsSchema = z.array(priceItemOptionRowSchema);
const injectorModelPriceRowsSchema = z.array(injectorModelPriceRowSchema);

function mapInjectorModel(row: InjectorModelRow): InjectorModel {
  return {
    id: row.id,
    company: row.company,
    code: row.code,
    name: row.name,
    note: row.note,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPriceItemOption(row: PriceItemOptionRow): PriceItemOption {
  return {
    id: row.id,
    priceItemId: row.price_item_id,
    optionName: mapCatalogLabel(row.option_name),
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPriceItem(row: PriceItemRow, options: PriceItemOption[]): PriceItem {
  return {
    id: row.id,
    name: mapCatalogLabel(row.name),
    type: row.type,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    options,
  };
}

function mapCatalogLabel(value: string): string {
  return value
    .replaceAll('Müştərinin öz nozzle-i', 'Müştərinin öz iynəsi')
    .replaceAll('Nozzle', 'İynə')
    .replaceAll('nozzle', 'iynə')
    .replaceAll('Klapan', 'Qapaq')
    .replaceAll('klapan', 'qapaq');
}

function mapInjectorModelPrice(row: InjectorModelPriceRow): InjectorModelPrice {
  return {
    id: row.id,
    injectorModelId: row.injector_model_id,
    priceItemId: row.price_item_id,
    priceItemOptionId: row.price_item_option_id,
    itemType: row.item_type,
    defaultPrice: row.default_price,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function writeAuditLog(actionType: string, tableName: string, recordId: string, oldValue: unknown, newValue: unknown) {
  const { error } = await supabase.from('audit_logs').insert({
    action_type: actionType,
    table_name: tableName,
    record_id: recordId,
    old_value: oldValue,
    new_value: newValue,
  });

  if (error) {
    throw error;
  }
}

export async function getPriceCatalog(): Promise<PriceCatalog> {
  const [itemsResult, optionsResult] = await Promise.all([
    supabase
      .from('price_items')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    supabase
      .from('price_item_options')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('option_name', { ascending: true }),
  ]);

  if (itemsResult.error) {
    throw itemsResult.error;
  }

  if (optionsResult.error) {
    throw optionsResult.error;
  }

  const optionRows = priceItemOptionRowsSchema.parse(optionsResult.data ?? []);
  const options = optionRows.map(mapPriceItemOption);
  const items = priceItemRowsSchema.parse(itemsResult.data ?? []).map((row) => (
    mapPriceItem(row, options.filter((option) => option.priceItemId === row.id))
  ));

  return {
    labor: items.filter((item) => item.type === 'labor'),
    parts: items.filter((item) => item.type === 'part'),
    extras: items.filter((item) => item.type === 'extra'),
  };
}

export async function createPriceItem(input: PriceItemInput): Promise<PriceItem> {
  const { data: sortRows, error: sortError } = await supabase
    .from('price_items')
    .select('sort_order')
    .eq('type', input.type)
    .order('sort_order', { ascending: false })
    .limit(1);

  if (sortError) {
    throw sortError;
  }

  const nextSortOrder = ((sortRows?.[0]?.sort_order as number | undefined) ?? 0) + 10;
  const insertValue = {
    name: input.name.trim(),
    type: input.type,
    sort_order: nextSortOrder,
    is_active: true,
  };
  const { data, error } = await supabase
    .from('price_items')
    .insert(insertValue)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  const item = mapPriceItem(priceItemRowSchema.parse(data), []);
  await writeAuditLog('price_item_create', 'price_items', item.id, null, insertValue);
  return item;
}

export async function updatePriceItem(input: PriceItemInput & { id: string }): Promise<PriceItem> {
  const { data: existingData, error: existingError } = await supabase
    .from('price_items')
    .select('*')
    .eq('id', input.id)
    .single();

  if (existingError) {
    throw existingError;
  }

  const updateValue = {
    name: input.name.trim(),
  };
  const { data, error } = await supabase
    .from('price_items')
    .update(updateValue)
    .eq('id', input.id)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  const item = mapPriceItem(priceItemRowSchema.parse(data), []);
  await writeAuditLog('price_item_update', 'price_items', item.id, existingData, updateValue);
  await writeAuditLog('price_change', 'price_items', item.id, existingData, updateValue);
  return item;
}

export async function softDeletePriceItem(itemId: string): Promise<PriceItem> {
  const { data: existingData, error: existingError } = await supabase
    .from('price_items')
    .select('*')
    .eq('id', itemId)
    .single();

  if (existingError) {
    throw existingError;
  }

  const updateValue = {
    is_active: false,
  };
  const { data, error } = await supabase
    .from('price_items')
    .update(updateValue)
    .eq('id', itemId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  const item = mapPriceItem(priceItemRowSchema.parse(data), []);
  await writeAuditLog('price_item_delete', 'price_items', item.id, existingData, updateValue);
  await writeAuditLog('price_change', 'price_items', item.id, existingData, updateValue);
  return item;
}

export async function getInjectorModels(searchText = ''): Promise<InjectorModel[]> {
  let query = supabase
    .from('injector_models')
    .select('*')
    .eq('is_active', true)
    .order('company', { ascending: true })
    .order('code', { ascending: true });

  const search = searchText.trim();

  if (search) {
    query = query.or(`company.ilike.%${search}%,code.ilike.%${search}%,name.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return injectorModelRowsSchema.parse(data ?? []).map(mapInjectorModel);
}

export async function findInjectorModel(company: string, code: string): Promise<InjectorModel | null> {
  if (!company.trim() || !code.trim()) {
    return null;
  }

  const { data, error } = await supabase
    .from('injector_models')
    .select('*')
    .eq('is_active', true)
    .ilike('company', company.trim())
    .ilike('code', code.trim())
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapInjectorModel(injectorModelRowSchema.parse(data)) : null;
}

export async function createInjectorModel(input: InjectorModelInput): Promise<InjectorModel> {
  const insertValue = {
    company: input.company.trim(),
    code: input.code.trim(),
    name: input.name?.trim() || null,
    note: input.note?.trim() || null,
    is_active: input.isActive ?? true,
  };
  const { data, error } = await supabase
    .from('injector_models')
    .insert(insertValue)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  const model = mapInjectorModel(injectorModelRowSchema.parse(data));
  await writeAuditLog('injector_model_create', 'injector_models', model.id, null, insertValue);
  return model;
}

export async function updateInjectorModel(input: InjectorModelInput & { id: string }): Promise<InjectorModel> {
  const { data: existingData, error: existingError } = await supabase
    .from('injector_models')
    .select('*')
    .eq('id', input.id)
    .single();

  if (existingError) {
    throw existingError;
  }

  const updateValue = {
    company: input.company.trim(),
    code: input.code.trim(),
    name: input.name?.trim() || null,
    note: input.note?.trim() || null,
    is_active: input.isActive ?? true,
  };
  const { data, error } = await supabase
    .from('injector_models')
    .update(updateValue)
    .eq('id', input.id)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  const model = mapInjectorModel(injectorModelRowSchema.parse(data));
  await writeAuditLog('injector_model_update', 'injector_models', model.id, existingData, updateValue);
  return model;
}

export async function getModelPrices(modelId: string): Promise<InjectorModelPrice[]> {
  const { data, error } = await supabase
    .from('injector_model_prices')
    .select('*')
    .eq('injector_model_id', modelId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return injectorModelPriceRowsSchema.parse(data ?? []).map(mapInjectorModelPrice);
}

export async function upsertModelPrice(input: ModelPriceInput): Promise<InjectorModelPrice> {
  const existingQuery = supabase
    .from('injector_model_prices')
    .select('*')
    .eq('injector_model_id', input.injectorModelId)
    .eq('price_item_id', input.priceItemId)
    .eq('is_active', true);

  const { data: existingRows, error: existingError } = input.priceItemOptionId
    ? await existingQuery.eq('price_item_option_id', input.priceItemOptionId).limit(1)
    : await existingQuery.is('price_item_option_id', null).limit(1);

  if (existingError) {
    throw existingError;
  }

  const existing = injectorModelPriceRowsSchema.parse(existingRows ?? [])[0];
  const writeValue = {
    injector_model_id: input.injectorModelId,
    price_item_id: input.priceItemId,
    price_item_option_id: input.priceItemOptionId ?? null,
    item_type: input.itemType,
    default_price: input.defaultPrice,
    is_active: true,
  };

  if (existing) {
    const { data, error } = await supabase
      .from('injector_model_prices')
      .update(writeValue)
      .eq('id', existing.id)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    const price = mapInjectorModelPrice(injectorModelPriceRowSchema.parse(data));
    await writeAuditLog('model_price_update', 'injector_model_prices', price.id, existing, writeValue);
    await writeAuditLog('price_change', 'injector_model_prices', price.id, existing, writeValue);
    return price;
  }

  const { data, error } = await supabase
    .from('injector_model_prices')
    .insert(writeValue)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  const price = mapInjectorModelPrice(injectorModelPriceRowSchema.parse(data));
  await writeAuditLog('model_price_create', 'injector_model_prices', price.id, null, writeValue);
  await writeAuditLog('price_change', 'injector_model_prices', price.id, null, writeValue);
  return price;
}
