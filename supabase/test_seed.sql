-- Temporary full-app demo data for manual testing.
-- Run after migrations 001..007 and supabase/seed.sql.
-- Cleanup marker: NAS_DIZEL_TEST_SEED

do $$
declare
  v_marker constant text := 'NAS_DIZEL_TEST_SEED';
  v_bosch_model_id uuid;
  v_delphi_model_id uuid;
  v_service_id uuid;
  v_vehicle_id uuid;
  v_test_labor_id uuid;
  v_ultrasonic_labor_id uuid;
  v_calibration_labor_id uuid;
  v_nozzle_id uuid;
  v_nozzle_china_id uuid;
  v_klapan_id uuid;
  v_klapan_original_id uuid;
  v_filter_id uuid;
  v_diagnostika_id uuid;
  v_urgent_id uuid;
begin
  -- Make the seed idempotent by removing prior test fixtures first.
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

  delete from public.vehicles where license_plate like 'TEST-%' or note = v_marker;
  delete from public.injector_model_prices
  where injector_model_id in (
    select id from public.injector_models where code in ('TEST-BOSCH-001', 'TEST-DELPHI-002')
  );
  delete from public.injector_models where code in ('TEST-BOSCH-001', 'TEST-DELPHI-002');
  delete from public.allowed_devices where device_id like 'TEST-%' or note = v_marker;
  delete from public.settings where key = 'test_seed_marker';

  insert into public.allowed_devices (device_id, device_name, status, is_active, last_seen_at, note)
  values
    ('TEST-ACTIVE', 'Test aktiv cihaz', 'active', true, now(), v_marker),
    ('TEST-PENDING', 'Test gözləyən cihaz', 'pending', false, null, v_marker),
    ('TEST-DEACT', 'Test deaktiv cihaz', 'deactivated', false, now() - interval '5 days', v_marker);

  insert into public.injector_models (company, code, name, note, is_active)
  values ('Bosch', 'TEST-BOSCH-001', 'Test Bosch modeli', v_marker, true)
  on conflict (company, code) do update
    set name = excluded.name,
        note = excluded.note,
        is_active = excluded.is_active
  returning id into v_bosch_model_id;

  insert into public.injector_models (company, code, name, note, is_active)
  values ('Delphi', 'TEST-DELPHI-002', 'Test Delphi modeli', v_marker, true)
  on conflict (company, code) do update
    set name = excluded.name,
        note = excluded.note,
        is_active = excluded.is_active
  returning id into v_delphi_model_id;

  select id into v_test_labor_id from public.price_items where name = 'Test' and type = 'labor';
  select id into v_ultrasonic_labor_id from public.price_items where name = 'Ultrasəs təmizləmə' and type = 'labor';
  select id into v_calibration_labor_id from public.price_items where name = 'Kalibrləmə' and type = 'labor';
  select id into v_nozzle_id from public.price_items where name = 'Nozzle' and type = 'part';
  select id into v_klapan_id from public.price_items where name = 'Klapan' and type = 'part';
  select id into v_filter_id from public.price_items where name = 'Filter' and type = 'part';
  select id into v_diagnostika_id from public.price_items where name = 'Diagnostika' and type = 'extra';
  select id into v_urgent_id from public.price_items where name = 'Təcili xidmət' and type = 'extra';
  select id into v_nozzle_china_id
  from public.price_item_options
  where price_item_id = v_nozzle_id and option_name = 'Çin nozzle';
  select id into v_klapan_original_id
  from public.price_item_options
  where price_item_id = v_klapan_id and option_name = 'Original klapan';

  if v_test_labor_id is null
    or v_ultrasonic_labor_id is null
    or v_calibration_labor_id is null
    or v_nozzle_id is null
    or v_nozzle_china_id is null
    or v_klapan_id is null
    or v_klapan_original_id is null
    or v_filter_id is null
    or v_diagnostika_id is null
    or v_urgent_id is null then
    raise exception 'base catalog seed missing; run supabase/seed.sql before supabase/test_seed.sql';
  end if;

  insert into public.injector_model_prices (
    injector_model_id,
    price_item_id,
    price_item_option_id,
    item_type,
    default_price
  )
  values
    (v_bosch_model_id, v_test_labor_id, null, 'labor', 10),
    (v_bosch_model_id, v_ultrasonic_labor_id, null, 'labor', 15),
    (v_bosch_model_id, v_nozzle_id, v_nozzle_china_id, 'part', 35),
    (v_bosch_model_id, v_diagnostika_id, null, 'extra', 20),
    (v_delphi_model_id, v_calibration_labor_id, null, 'labor', 25),
    (v_delphi_model_id, v_klapan_id, v_klapan_original_id, 'part', 45),
    (v_delphi_model_id, v_filter_id, null, 'part', 20),
    (v_delphi_model_id, v_urgent_id, null, 'extra', 30);

  -- TEST-001: paid normal vehicle, 4 injectors, all/general apply targets.
  select service_id, vehicle_id into v_service_id, v_vehicle_id
  from public.save_service(jsonb_build_object(
    'vehicle', jsonb_build_object(
      'license_plate', 'TEST-001',
      'brand', 'Mercedes',
      'phone', '+994501110001',
      'mileage', 214000,
      'problem_description', 'Test seed paid normal service',
      'is_problem_customer', false,
      'problem_reason', ''
    ),
    'injector', jsonb_build_object(
      'count', 4,
      'company', 'Bosch',
      'code', 'TEST-BOSCH-001',
      'serial_info', v_marker,
      'injector_model_id', v_bosch_model_id,
      'injectors', jsonb_build_array(
        jsonb_build_object('injector_number', 1, 'initial_test_result', 'Zəif axın', 'final_test_result', 'Normaya salındı', 'injector_status', 'Təmir olundu', 'problem_found', jsonb_build_array('Çirklənmə'), 'work_done', jsonb_build_array('Test edildi'), 'parts_replaced', jsonb_build_array('Nozzle'), 'note', v_marker),
        jsonb_build_object('injector_number', 2, 'initial_test_result', 'Zəif axın', 'final_test_result', 'Normaya salındı', 'injector_status', 'Təmir olundu', 'problem_found', jsonb_build_array('Çirklənmə'), 'work_done', jsonb_build_array('Test edildi'), 'parts_replaced', jsonb_build_array('Nozzle'), 'note', v_marker),
        jsonb_build_object('injector_number', 3, 'initial_test_result', 'Normal', 'final_test_result', 'Normal', 'injector_status', 'Normal', 'problem_found', jsonb_build_array('Problem yoxdur'), 'work_done', jsonb_build_array('Test edildi'), 'parts_replaced', jsonb_build_array(), 'note', v_marker),
        jsonb_build_object('injector_number', 4, 'initial_test_result', 'Normal', 'final_test_result', 'Normal', 'injector_status', 'Normal', 'problem_found', jsonb_build_array('Problem yoxdur'), 'work_done', jsonb_build_array('Test edildi'), 'parts_replaced', jsonb_build_array(), 'note', v_marker)
      )
    ),
    'line_items', jsonb_build_array(
      jsonb_build_object('item_type', 'labor', 'item_name', 'Test', 'option_name', '', 'apply_target', 'all_injectors', 'selected_injector_numbers', jsonb_build_array(), 'quantity', 4, 'default_unit_price', 10, 'actual_unit_price', 10, 'price_source', 'model_price', 'note', v_marker),
      jsonb_build_object('item_type', 'part', 'item_name', 'Nozzle', 'option_name', 'Çin nozzle', 'apply_target', 'all_injectors', 'selected_injector_numbers', jsonb_build_array(), 'quantity', 4, 'default_unit_price', 35, 'actual_unit_price', 35, 'price_source', 'model_price', 'note', v_marker),
      jsonb_build_object('item_type', 'extra', 'item_name', 'Diagnostika', 'option_name', '', 'apply_target', 'general_service', 'selected_injector_numbers', jsonb_build_array(), 'quantity', 1, 'default_unit_price', 20, 'actual_unit_price', 20, 'price_source', 'model_price', 'note', v_marker)
    ),
    'payment', jsonb_build_object('discount_amount', 0, 'paid_amount', 200, 'payment_method', 'cash', 'note', v_marker)
  ));
  update public.service_records set service_date = now() - interval '2 days', work_performed = v_marker, technical_notes = v_marker where id = v_service_id;
  update public.payments set payment_date = now() - interval '2 days' where service_id = v_service_id;

  -- TEST-002: partially paid problem vehicle, debt, selected injectors, price override.
  select service_id, vehicle_id into v_service_id, v_vehicle_id
  from public.save_service(jsonb_build_object(
    'vehicle', jsonb_build_object(
      'license_plate', 'TEST-002',
      'brand', 'Toyota',
      'phone', '+994501110002',
      'mileage', 180500,
      'problem_description', 'Test seed problem customer with debt',
      'is_problem_customer', true,
      'problem_reason', 'NAS_DIZEL_TEST_SEED problemli müştəri'
    ),
    'injector', jsonb_build_object(
      'count', 4,
      'company', 'Delphi',
      'code', 'TEST-DELPHI-002',
      'serial_info', v_marker,
      'injector_model_id', v_delphi_model_id,
      'injectors', jsonb_build_array(
        jsonb_build_object('injector_number', 1, 'initial_test_result', 'Geri axın çoxdur', 'final_test_result', 'Qismən düzəldi', 'injector_status', 'Problemli', 'problem_found', jsonb_build_array('Klapan problemi'), 'work_done', jsonb_build_array('Klapan dəyişildi'), 'parts_replaced', jsonb_build_array('Klapan'), 'note', v_marker),
        jsonb_build_object('injector_number', 2, 'initial_test_result', 'Geri axın çoxdur', 'final_test_result', 'Qismən düzəldi', 'injector_status', 'Problemli', 'problem_found', jsonb_build_array('Klapan problemi'), 'work_done', jsonb_build_array('Klapan dəyişildi'), 'parts_replaced', jsonb_build_array('Klapan'), 'note', v_marker),
        jsonb_build_object('injector_number', 3, 'initial_test_result', 'Normal', 'final_test_result', 'Normal', 'injector_status', 'Normal', 'problem_found', jsonb_build_array('Problem yoxdur'), 'work_done', jsonb_build_array('Test edildi'), 'parts_replaced', jsonb_build_array(), 'note', v_marker),
        jsonb_build_object('injector_number', 4, 'initial_test_result', 'Normal', 'final_test_result', 'Normal', 'injector_status', 'Normal', 'problem_found', jsonb_build_array('Problem yoxdur'), 'work_done', jsonb_build_array('Test edildi'), 'parts_replaced', jsonb_build_array(), 'note', v_marker)
      )
    ),
    'line_items', jsonb_build_array(
      jsonb_build_object('item_type', 'labor', 'item_name', 'Ultrasəs təmizləmə', 'option_name', '', 'apply_target', 'all_injectors', 'selected_injector_numbers', jsonb_build_array(), 'quantity', 4, 'default_unit_price', 15, 'actual_unit_price', 15, 'price_source', 'model_price', 'note', v_marker),
      jsonb_build_object('item_type', 'part', 'item_name', 'Klapan', 'option_name', 'Original klapan', 'apply_target', 'selected_injectors', 'selected_injector_numbers', jsonb_build_array(1, 2), 'quantity', 2, 'default_unit_price', 45, 'actual_unit_price', 40, 'price_source', 'model_price', 'note', v_marker),
      jsonb_build_object('item_type', 'extra', 'item_name', 'Təcili xidmət', 'option_name', '', 'apply_target', 'general_service', 'selected_injector_numbers', jsonb_build_array(), 'quantity', 1, 'default_unit_price', 30, 'actual_unit_price', 30, 'price_source', 'model_price', 'note', v_marker)
    ),
    'payment', jsonb_build_object('discount_amount', 10, 'paid_amount', 60, 'payment_method', 'cash', 'note', v_marker)
  ));
  update public.service_records set service_date = now() - interval '1 day', work_performed = v_marker, technical_notes = v_marker where id = v_service_id;
  update public.payments set payment_date = now() - interval '1 day' where service_id = v_service_id;

  -- TEST-003: unpaid vehicle, one injector, single-injector apply target.
  select service_id, vehicle_id into v_service_id, v_vehicle_id
  from public.save_service(jsonb_build_object(
    'vehicle', jsonb_build_object(
      'license_plate', 'TEST-003',
      'brand', 'Ford',
      'phone', '+994501110003',
      'mileage', 99000,
      'problem_description', 'Test seed unpaid single injector',
      'is_problem_customer', false,
      'problem_reason', ''
    ),
    'injector', jsonb_build_object(
      'count', 1,
      'company', 'Delphi',
      'code', 'TEST-DELPHI-002',
      'serial_info', v_marker,
      'injector_model_id', v_delphi_model_id,
      'injectors', jsonb_build_array(
        jsonb_build_object('injector_number', 1, 'initial_test_result', 'İşləmir', 'final_test_result', 'Düzəlmədi', 'injector_status', 'Problemli', 'problem_found', jsonb_build_array('Elektrik problemi'), 'work_done', jsonb_build_array('Test edildi'), 'parts_replaced', jsonb_build_array('Filter'), 'note', v_marker)
      )
    ),
    'line_items', jsonb_build_array(
      jsonb_build_object('item_type', 'labor', 'item_name', 'Kalibrləmə', 'option_name', '', 'apply_target', 'single_injector', 'selected_injector_numbers', jsonb_build_array(1), 'quantity', 1, 'default_unit_price', 25, 'actual_unit_price', 25, 'price_source', 'model_price', 'note', v_marker),
      jsonb_build_object('item_type', 'part', 'item_name', 'Filter', 'option_name', '', 'apply_target', 'single_injector', 'selected_injector_numbers', jsonb_build_array(1), 'quantity', 1, 'default_unit_price', 20, 'actual_unit_price', 20, 'price_source', 'model_price', 'note', v_marker)
    ),
    'payment', jsonb_build_object('discount_amount', 0, 'paid_amount', 0, 'payment_method', 'debt', 'note', v_marker)
  ));
  update public.service_records set service_date = now() - interval '3 days', work_performed = v_marker, technical_notes = v_marker where id = v_service_id;
  update public.payments set payment_date = now() - interval '3 days' where service_id = v_service_id;

  -- TEST-004: frequent vehicle, three visits.
  for i in 1..3 loop
    select service_id, vehicle_id into v_service_id, v_vehicle_id
    from public.save_service(jsonb_build_object(
      'vehicle', jsonb_build_object(
        'license_plate', 'TEST-004',
        'brand', 'Hyundai',
        'phone', '+994501110004',
        'mileage', 120000 + (i * 1000),
        'problem_description', v_marker || ' frequent service ' || i,
        'is_problem_customer', false,
        'problem_reason', ''
      ),
      'injector', jsonb_build_object(
        'count', 4,
        'company', 'Bosch',
        'code', 'TEST-BOSCH-001',
        'serial_info', v_marker,
        'injector_model_id', v_bosch_model_id,
        'injectors', jsonb_build_array(
          jsonb_build_object('injector_number', 1, 'initial_test_result', 'Normal', 'final_test_result', 'Normal', 'injector_status', 'Normal', 'problem_found', jsonb_build_array('Problem yoxdur'), 'work_done', jsonb_build_array('Test edildi'), 'parts_replaced', jsonb_build_array(), 'note', v_marker),
          jsonb_build_object('injector_number', 2, 'initial_test_result', 'Normal', 'final_test_result', 'Normal', 'injector_status', 'Normal', 'problem_found', jsonb_build_array('Problem yoxdur'), 'work_done', jsonb_build_array('Test edildi'), 'parts_replaced', jsonb_build_array(), 'note', v_marker),
          jsonb_build_object('injector_number', 3, 'initial_test_result', 'Zəif axın', 'final_test_result', 'Normaya salındı', 'injector_status', 'Təmizləndi', 'problem_found', jsonb_build_array('Çirklənmə'), 'work_done', jsonb_build_array('Yuyuldu'), 'parts_replaced', jsonb_build_array(), 'note', v_marker),
          jsonb_build_object('injector_number', 4, 'initial_test_result', 'Zəif axın', 'final_test_result', 'Normaya salındı', 'injector_status', 'Təmizləndi', 'problem_found', jsonb_build_array('Çirklənmə'), 'work_done', jsonb_build_array('Yuyuldu'), 'parts_replaced', jsonb_build_array(), 'note', v_marker)
        )
      ),
      'line_items', jsonb_build_array(
        jsonb_build_object('item_type', 'labor', 'item_name', 'Test', 'option_name', '', 'apply_target', 'all_injectors', 'selected_injector_numbers', jsonb_build_array(), 'quantity', 4, 'default_unit_price', 10, 'actual_unit_price', 10, 'price_source', 'model_price', 'note', v_marker),
        jsonb_build_object('item_type', 'extra', 'item_name', 'Diagnostika', 'option_name', '', 'apply_target', 'general_service', 'selected_injector_numbers', jsonb_build_array(), 'quantity', 1, 'default_unit_price', 20, 'actual_unit_price', 20, 'price_source', 'model_price', 'note', v_marker)
      ),
      'payment', jsonb_build_object('discount_amount', 0, 'paid_amount', case when i = 3 then 0 else 60 end, 'payment_method', case when i = 3 then 'debt' else 'card' end, 'note', v_marker)
    ));

    update public.service_records
    set service_date = now() - ((i * 12) || ' days')::interval,
        work_performed = v_marker,
        technical_notes = v_marker
    where id = v_service_id;

    update public.payments
    set payment_date = now() - ((i * 12) || ' days')::interval
    where service_id = v_service_id;
  end loop;

  insert into public.settings (key, value)
  values ('test_seed_marker', jsonb_build_object('marker', v_marker, 'created_at', now()))
  on conflict (key) do update
    set value = excluded.value;
end;
$$;

select 'NAS_DIZEL_TEST_SEED applied' as result;
