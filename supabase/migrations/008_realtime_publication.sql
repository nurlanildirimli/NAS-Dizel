-- Enable Supabase Realtime for app data that should refresh open screens.

do $$
declare
  v_table text;
  v_tables text[] := array[
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
    'audit_logs'
  ];
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise notice 'publication supabase_realtime does not exist; skipping realtime setup';
    return;
  end if;

  foreach v_table in array v_tables loop
    execute format('alter table public.%I replica identity full', v_table);

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = v_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    end if;
  end loop;
end;
$$;
