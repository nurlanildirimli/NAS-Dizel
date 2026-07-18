import { type QueryClient } from '@tanstack/react-query';
import { type RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from './supabase';

type WatchedTable =
  | 'vehicles'
  | 'service_records'
  | 'service_injectors'
  | 'service_line_items'
  | 'payments'
  | 'injector_models'
  | 'injector_model_prices'
  | 'price_items'
  | 'price_item_options'
  | 'allowed_devices'
  | 'settings'
  | 'audit_logs';

const watchedTables: WatchedTable[] = [
  'vehicles',
  'service_records',
  'service_injectors',
  'service_line_items',
  'payments',
  'injector_models',
  'injector_model_prices',
  'price_items',
  'price_item_options',
  'allowed_devices',
  'settings',
  'audit_logs',
];

const tableQueryKeys: Record<WatchedTable, string[]> = {
  vehicles: ['vehicles', 'reports'],
  service_records: ['vehicles', 'services', 'payments', 'income', 'reports'],
  service_injectors: ['vehicles', 'services', 'income', 'reports'],
  service_line_items: ['vehicles', 'services', 'income', 'reports'],
  payments: ['vehicles', 'services', 'payments', 'income', 'reports'],
  injector_models: ['catalog', 'reports'],
  injector_model_prices: ['catalog', 'reports'],
  price_items: ['catalog', 'reports'],
  price_item_options: ['catalog', 'reports'],
  allowed_devices: ['devices'],
  settings: ['settings'],
  audit_logs: ['reports'],
};

const INVALIDATION_DELAY_MS = 400;

export function startRealtimeInvalidation(queryClient: QueryClient): () => void {
  const pendingKeys = new Set<string>();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  function flushInvalidations() {
    const keys = Array.from(pendingKeys);
    pendingKeys.clear();
    timeoutId = null;

    keys.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: [key] });
    });
  }

  function scheduleInvalidation(table: WatchedTable) {
    tableQueryKeys[table].forEach((key) => pendingKeys.add(key));

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(flushInvalidations, INVALIDATION_DELAY_MS);
  }

  const channels: RealtimeChannel[] = watchedTables.map((table) => (
    supabase
      .channel(`db-changes-${table}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          scheduleInvalidation(table);
        },
      )
      .subscribe()
  ));

  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    channels.forEach((channel) => {
      supabase.removeChannel(channel);
    });
  };
}
