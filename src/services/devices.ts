import { z } from 'zod';

import { supabase } from '../lib/supabase';
import { allowedDeviceRowSchema, allowedDeviceRowsSchema } from '../schemas/devices';
import { type AllowedDevice, type DeviceFilterKey } from '../types/devices';

type AllowedDeviceRow = z.infer<typeof allowedDeviceRowSchema>;

function mapAllowedDevice(row: AllowedDeviceRow): AllowedDevice {
  return {
    id: row.id,
    deviceId: row.device_id,
    deviceName: row.device_name,
    status: row.status,
    isActive: row.is_active,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    note: row.note,
    isDeleted: row.is_deleted,
    deletedAt: row.deleted_at,
  };
}

async function parseDeviceRpcResult(data: unknown): Promise<AllowedDevice> {
  return mapAllowedDevice(allowedDeviceRowSchema.parse(data));
}

export async function listAllowedDevices(filterKey: DeviceFilterKey): Promise<AllowedDevice[]> {
  const { data, error } = await supabase.rpc('list_allowed_devices', {
    filter_key: filterKey,
  });

  if (error) {
    throw error;
  }

  return allowedDeviceRowsSchema.parse(data ?? []).map(mapAllowedDevice);
}

export async function activateDevice(deviceId: string, note?: string): Promise<AllowedDevice> {
  const { data, error } = await supabase.rpc('activate_device', {
    device_uuid: deviceId,
    note_text: note ?? null,
  });

  if (error) {
    throw error;
  }

  return parseDeviceRpcResult(data);
}

export async function deactivateDevice(deviceId: string, note?: string): Promise<AllowedDevice> {
  const { data, error } = await supabase.rpc('deactivate_device', {
    device_uuid: deviceId,
    note_text: note ?? null,
  });

  if (error) {
    throw error;
  }

  return parseDeviceRpcResult(data);
}

export async function updateDeviceDetails(input: {
  id: string;
  deviceName: string;
  note: string;
}): Promise<AllowedDevice> {
  const { data, error } = await supabase.rpc('update_device_details', {
    device_uuid: input.id,
    device_name_text: input.deviceName,
    note_text: input.note,
  });

  if (error) {
    throw error;
  }

  return parseDeviceRpcResult(data);
}

export async function softDeleteDevice(deviceId: string): Promise<AllowedDevice> {
  const { data, error } = await supabase.rpc('soft_delete_device', {
    device_uuid: deviceId,
  });

  if (error) {
    throw error;
  }

  return parseDeviceRpcResult(data);
}
