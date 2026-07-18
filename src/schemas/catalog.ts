import { z } from 'zod';

const numericValue = z.union([z.number(), z.string()]).transform((value) => Number(value));
const nullableString = z.string().nullable();

export const priceItemTypeSchema = z.enum(['labor', 'part', 'extra']);

export const injectorModelRowSchema = z.object({
  id: z.string().uuid(),
  company: z.string(),
  code: z.string(),
  name: nullableString,
  note: nullableString,
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const priceItemOptionRowSchema = z.object({
  id: z.string().uuid(),
  price_item_id: z.string().uuid(),
  option_name: z.string(),
  is_active: z.boolean(),
  sort_order: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const priceItemRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: priceItemTypeSchema,
  is_active: z.boolean(),
  sort_order: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const injectorModelPriceRowSchema = z.object({
  id: z.string().uuid(),
  injector_model_id: z.string().uuid(),
  price_item_id: z.string().uuid(),
  price_item_option_id: z.string().uuid().nullable(),
  item_type: priceItemTypeSchema,
  default_price: numericValue,
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type InjectorModelRow = z.infer<typeof injectorModelRowSchema>;
export type PriceItemOptionRow = z.infer<typeof priceItemOptionRowSchema>;
export type PriceItemRow = z.infer<typeof priceItemRowSchema>;
export type InjectorModelPriceRow = z.infer<typeof injectorModelPriceRowSchema>;
