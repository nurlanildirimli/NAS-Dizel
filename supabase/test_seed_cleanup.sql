-- Remove temporary full-app demo data.
-- This cleanup is intentionally hard-delete because these rows are test fixtures
-- marked with NAS_DIZEL_TEST_SEED / TEST-* identifiers, not real workshop data.

do $$
declare
  v_marker constant text := 'NAS_DIZEL_TEST_SEED';
begin
  delete from public.audit_logs
  where coalesce(old_value::text, '') like '%' || v_marker || '%'
     or coalesce(new_value::text, '') like '%' || v_marker || '%'
     or coalesce(device_name, '') like 'TEST-%'
     or record_id in (
       select id from public.vehicles where license_plate like 'TEST-%'
       union select id from public.service_records where technical_notes = v_marker or work_performed = v_marker
       union select id from public.payments where note = v_marker
       union select id from public.allowed_devices where device_id like 'TEST-%'
       union select id from public.injector_models where code in ('TEST-BOSCH-001', 'TEST-DELPHI-002')
     );

  delete from public.service_line_items
  where note = v_marker
     or service_id in (
       select sr.id
       from public.service_records sr
       join public.vehicles v on v.id = sr.vehicle_id
       where v.license_plate like 'TEST-%'
          or sr.technical_notes = v_marker
          or sr.work_performed = v_marker
     )
     or injector_model_id in (
       select id from public.injector_models where code in ('TEST-BOSCH-001', 'TEST-DELPHI-002')
     );

  delete from public.service_injectors
  where service_id in (
    select sr.id
    from public.service_records sr
    join public.vehicles v on v.id = sr.vehicle_id
    where v.license_plate like 'TEST-%'
       or sr.technical_notes = v_marker
       or sr.work_performed = v_marker
  );

  delete from public.payments
  where note = v_marker
     or service_id in (
       select sr.id
       from public.service_records sr
       join public.vehicles v on v.id = sr.vehicle_id
       where v.license_plate like 'TEST-%'
          or sr.technical_notes = v_marker
          or sr.work_performed = v_marker
     )
     or vehicle_id in (select id from public.vehicles where license_plate like 'TEST-%');

  delete from public.service_records
  where technical_notes = v_marker
     or work_performed = v_marker
     or vehicle_id in (select id from public.vehicles where license_plate like 'TEST-%');

  delete from public.vehicles
  where license_plate like 'TEST-%'
     or note = v_marker;

  delete from public.injector_model_prices
  where injector_model_id in (
    select id from public.injector_models where code in ('TEST-BOSCH-001', 'TEST-DELPHI-002')
  );

  delete from public.injector_models
  where code in ('TEST-BOSCH-001', 'TEST-DELPHI-002');

  delete from public.allowed_devices
  where device_id like 'TEST-%'
     or note = v_marker;

  delete from public.settings
  where key = 'test_seed_marker';
end;
$$;

select 'NAS_DIZEL_TEST_SEED cleaned' as result;
