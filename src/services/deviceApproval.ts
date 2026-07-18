import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { isSupabaseConfigured, supabase } from '../lib/supabase';

const DEVICE_ID_STORAGE_KEY = 'nas_dizel_device_id';
const DEVICE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export type DeviceApprovalState =
  | 'loading'
  | 'approved'
  | 'pending'
  | 'deactivated'
  | 'error';

export type DeviceApprovalResult = {
  state: Exclude<DeviceApprovalState, 'loading'>;
  deviceId: string;
  message?: string;
};

type AllowedDeviceRow = {
  device_id: string;
  status: 'pending' | 'active' | 'deactivated';
  is_active: boolean;
  is_deleted: boolean;
};

async function getStoredDeviceId(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY);
  }

  const isSecureStoreAvailable = await SecureStore.isAvailableAsync();

  if (!isSecureStoreAvailable) {
    return AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY);
  }

  return SecureStore.getItemAsync(DEVICE_ID_STORAGE_KEY);
}

async function setStoredDeviceId(deviceId: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
    return;
  }

  const isSecureStoreAvailable = await SecureStore.isAvailableAsync();

  if (!isSecureStoreAvailable) {
    await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
    return;
  }

  await SecureStore.setItemAsync(DEVICE_ID_STORAGE_KEY, deviceId);
}

function generateDeviceCode(): string {
  const randomCharacters = Array.from({ length: 8 }, () => {
    const index = Math.floor(Math.random() * DEVICE_CODE_ALPHABET.length);
    return DEVICE_CODE_ALPHABET[index];
  }).join('');

  return `${randomCharacters.slice(0, 4)}-${randomCharacters.slice(4)}`;
}

export async function getOrCreateDeviceId(): Promise<string> {
  const storedDeviceId = await getStoredDeviceId();

  if (storedDeviceId) {
    return storedDeviceId;
  }

  const deviceId = generateDeviceCode();
  await setStoredDeviceId(deviceId);

  return deviceId;
}

async function fetchDevice(deviceId: string): Promise<AllowedDeviceRow | null> {
  const { data, error } = await supabase
    .from('allowed_devices')
    .select('device_id,status,is_active,is_deleted')
    .eq('device_id', deviceId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function createPendingDevice(deviceId: string): Promise<void> {
  const { error } = await supabase.from('allowed_devices').insert({
    device_id: deviceId,
    status: 'pending',
    is_active: false,
  });

  if (error && error.code !== '23505') {
    throw error;
  }
}

async function updateLastSeen(deviceId: string): Promise<void> {
  const { error } = await supabase
    .from('allowed_devices')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('device_id', deviceId);

  if (error) {
    throw error;
  }
}

function getDeviceState(device: AllowedDeviceRow): DeviceApprovalResult['state'] {
  if (device.is_deleted || device.status === 'deactivated') {
    return 'deactivated';
  }

  if (device.status === 'active' && device.is_active) {
    return 'approved';
  }

  return 'pending';
}

export async function checkDeviceApproval(): Promise<DeviceApprovalResult> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase ayarları APK build-ə daxil edilməyib.');
  }

  const deviceId = await getOrCreateDeviceId();
  let device = await fetchDevice(deviceId);

  if (!device) {
    await createPendingDevice(deviceId);
    device = await fetchDevice(deviceId);
  }

  if (!device) {
    return { state: 'pending', deviceId };
  }

  const state = getDeviceState(device);

  if (state === 'approved') {
    await updateLastSeen(deviceId);
  }

  return { state, deviceId };
}
