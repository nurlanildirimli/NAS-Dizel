import { z } from 'zod';

import { injectorCompanySchema } from './newService';

const nullableTextSchema = z.string().nullable();
const nullableMoneySchema = z.number().nonnegative().nullable();

export const aiCatalogHintSchema = z.object({
  label: z.string(),
  itemName: z.string(),
  optionName: z.string().nullable(),
  itemType: z.enum(['labor', 'part']),
});

export const aiFillDetailSchema = z.object({
  name: z.string(),
  optionName: nullableTextSchema,
  itemType: z.enum(['labor', 'part']).nullable(),
  injectorNumbers: z.array(z.number().int().min(1).max(8)),
  price: nullableMoneySchema,
});

export const aiFillProblemSchema = z.object({
  injectorNumbers: z.array(z.number().int().min(1).max(8)),
  problems: z.array(z.string()),
  note: nullableTextSchema,
});

export const aiFillNewServiceResponseSchema = z.object({
  vehicle: z.object({
    licensePlate: nullableTextSchema,
    brand: nullableTextSchema,
    phone: nullableTextSchema,
    mileage: z.number().int().positive().nullable(),
    problemDescription: nullableTextSchema,
  }),
  injector: z.object({
    count: z.number().int().min(1).max(8).nullable(),
    company: injectorCompanySchema.nullable(),
    code: nullableTextSchema,
  }),
  details: z.array(aiFillDetailSchema),
  injectorProblems: z.array(aiFillProblemSchema),
  payment: z.object({
    discountAmount: nullableMoneySchema,
    discountedPrice: nullableMoneySchema,
    paidAmount: nullableMoneySchema,
    note: nullableTextSchema,
  }),
  problemCustomer: z.object({
    isProblemCustomer: z.boolean().nullable(),
    problemReason: nullableTextSchema,
  }),
  warnings: z.array(z.string()),
});

export const aiFillNewServiceRequestSchema = z.object({
  instructions: z.string().trim().min(1, 'Bu sahə mütləqdir'),
  currentInjectorCount: z.number().int().min(1).max(8),
  catalogDetails: z.array(aiCatalogHintSchema),
});

export type AiCatalogHint = z.infer<typeof aiCatalogHintSchema>;
export type AiFillNewServiceRequest = z.infer<typeof aiFillNewServiceRequestSchema>;
export type AiFillNewServiceResponse = z.infer<typeof aiFillNewServiceResponseSchema>;
