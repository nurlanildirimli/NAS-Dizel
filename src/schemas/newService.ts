import { z } from 'zod';

export const injectorCompanySchema = z.enum([
  'Bosch',
  'Delphi',
  'Denso',
  'Siemens',
]);

const requiredString = z.string().trim().min(1, 'Bu sahə mütləqdir');

export const newServiceVehicleSchema = z.object({
  selectedVehicleId: z.string().uuid().nullable(),
  licensePlate: requiredString,
  brand: requiredString,
  phone: requiredString,
  mileage: requiredString.refine((value) => Number(value) > 0, 'Düzgün dəyər daxil edin'),
  problemDescription: z.string(),
  isProblemCustomer: z.boolean(),
  problemReason: z.string(),
});

export const injectorDraftItemSchema = z.object({
  injectorNumber: z.number().int().min(1).max(8),
  initialTestResult: z.string(),
  finalTestResult: z.string(),
  injectorStatus: z.string(),
  problemFound: z.array(z.string()),
  workDone: z.array(z.string()),
  partsReplaced: z.array(z.string()),
  note: z.string(),
});

export const newServiceInjectorSchema = z.object({
  injectorCount: z.number().int().min(1, 'Düzgün dəyər daxil edin').max(8, 'Düzgün dəyər daxil edin'),
  injectorCompany: injectorCompanySchema.or(z.literal('')).refine(
    (value) => value !== '',
    'Bu sahə mütləqdir',
  ),
  injectorCode: requiredString,
  injectorSerialInfo: z.string(),
  injectorModelId: z.string().uuid().nullable(),
  useManualPricing: z.boolean(),
  injectors: z.array(injectorDraftItemSchema).min(1).max(8),
}).refine((value) => value.injectors.length === value.injectorCount, {
  path: ['injectors'],
  message: 'Düzgün dəyər daxil edin',
});

export type NewServiceVehicleInput = z.infer<typeof newServiceVehicleSchema>;
export type NewServiceInjectorInput = z.infer<typeof newServiceInjectorSchema>;
