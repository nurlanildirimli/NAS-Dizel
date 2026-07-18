export type AllowedDeviceStatus = 'pending' | 'active' | 'deactivated';

export type DeviceFilterKey =
  | 'active'
  | 'pending'
  | 'deactivated'
  | 'deleted'
  | 'all';

export type AllowedDevice = {
  id: string;
  deviceId: string;
  deviceName: string | null;
  status: AllowedDeviceStatus;
  isActive: boolean;
  createdAt: string;
  lastSeenAt: string | null;
  note: string | null;
  isDeleted: boolean;
  deletedAt: string | null;
};
