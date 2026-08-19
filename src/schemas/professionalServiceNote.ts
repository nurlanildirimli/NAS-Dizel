import { z } from 'zod';

const moneySchema = z.number().nonnegative();
const detectedInjectorCompanySchema = z.enum(['Bosch', 'Delphi', 'Denso', 'Siemens']);

export const servicePriceLineSchema = z.object({
  name: z.string(),
  amount: moneySchema,
  source: z.enum(['spoken', 'catalog', 'unmatched']).optional(),
  scope: z.string().optional(),
});

export const detectedServiceOperationSchema = z.object({
  name: z.string(),
  itemType: z.enum(['labor', 'part', 'extra', 'unknown']).nullable(),
  injectorNumbers: z.array(z.number().int().min(1).max(8)),
  appliesToAllInjectors: z.boolean(),
  quantity: z.number().nonnegative().nullable(),
  statedPrice: moneySchema.nullable(),
  sourceText: z.string(),
});

export const professionalServiceNoteRequestSchema = z.object({
  vehicle: z.object({
    licensePlate: z.string(),
    brand: z.string(),
    phone: z.string(),
    mileage: z.string(),
    problemDescription: z.string(),
  }),
  rawNote: z.string().trim().min(1, 'Bu sahə mütləqdir'),
});

export const professionalServiceNoteResponseSchema = z.object({
  professionalText: z.string(),
  priceLines: z.array(servicePriceLineSchema),
  priceTotal: moneySchema,
  priceTotalSource: z.enum(['stated_total', 'stated_lines', 'catalog', 'none']).default('none'),
  detectedOperations: z.array(detectedServiceOperationSchema).default([]),
  warnings: z.array(z.string()),
  missingInfo: z.array(z.string()),
  injector: z.object({
    count: z.number().int().min(1).max(8).nullable(),
    company: detectedInjectorCompanySchema.nullable(),
    code: z.string().nullable(),
  }),
});

export type ProfessionalServiceNoteRequest = z.infer<typeof professionalServiceNoteRequestSchema>;
export type ProfessionalServiceNoteResponse = z.infer<typeof professionalServiceNoteResponseSchema>;
