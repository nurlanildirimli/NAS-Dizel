import { z } from 'zod';

export const allowedDeviceRowSchema = z.object({
  id: z.string().uuid(),
  device_id: z.string(),
  device_name: z.string().nullable(),
  status: z.enum(['pending', 'active', 'deactivated']),
  is_active: z.boolean(),
  created_at: z.string(),
  last_seen_at: z.string().nullable(),
  note: z.string().nullable(),
  is_deleted: z.boolean(),
  deleted_at: z.string().nullable(),
});

export const allowedDeviceRowsSchema = z.array(allowedDeviceRowSchema);
