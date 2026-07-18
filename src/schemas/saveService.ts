import { z } from 'zod';

export const saveServiceResultSchema = z.object({
  service_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
});

export type SaveServiceResult = z.infer<typeof saveServiceResultSchema>;
