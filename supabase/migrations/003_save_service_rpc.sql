-- Atomic new-service save RPC. Applies after 001_initial_schema.sql and
-- 002_vehicle_read_models.sql.

create or replace function public.save_service(payload jsonb)
returns table (
  service_id uuid,
  vehicle_id uuid
)
language plpgsql
as $$
declare
  v_vehicle jsonb := payload -> 'vehicle';
  v_injector jsonb := payload -> 'injector';
  v_payment jsonb := payload -> 'payment';
  v_line_items jsonb := coalesce(payload -> 'line_items', '[]'::jsonb);
  v_injectors jsonb := coalesce(v_injector -> 'injectors', '[]'::jsonb);
  v_vehicle_id uuid;
  v_existing_vehicle public.vehicles%rowtype;
  v_old_vehicle jsonb;
  v_service_id uuid;
  v_model_id uuid;
  v_model_company text := trim(v_injector ->> 'company');
  v_model_code text := trim(v_injector ->> 'code');
  v_injector_count integer := (v_injector ->> 'count')::integer;
  v_mileage integer := (v_vehicle ->> 'mileage')::integer;
  v_discount numeric(12,2) := coalesce((v_payment ->> 'discount_amount')::numeric, 0);
  v_paid numeric(12,2) := coalesce((v_payment ->> 'paid_amount')::numeric, 0);
  v_labor_total numeric(12,2) := 0;
  v_parts_total numeric(12,2) := 0;
  v_extra_total numeric(12,2) := 0;
  v_calculated_total numeric(12,2) := 0;
  v_final_total numeric(12,2) := 0;
  v_remaining numeric(12,2) := 0;
  v_payment_status text := 'unpaid';
  v_payment_method text := nullif(v_payment ->> 'payment_method', '');
  v_item jsonb;
  v_injector_item jsonb;
  v_quantity integer;
  v_default_price numeric(12,2);
  v_actual_price numeric(12,2);
  v_total_price numeric(12,2);
  v_item_type text;
  v_apply_target text;
  v_selected integer[];
  v_service_injector_id uuid;
begin
  if v_vehicle is null or v_injector is null or v_payment is null then
    raise exception 'invalid payload';
  end if;

  if v_injector_count < 1 or v_injector_count > 8 then
    raise exception 'invalid injector count';
  end if;

  if jsonb_array_length(v_injectors) <> v_injector_count then
    raise exception 'injector rows do not match injector count';
  end if;

  if v_discount < 0 or v_paid < 0 then
    raise exception 'invalid payment amount';
  end if;

  for v_item in select * from jsonb_array_elements(v_line_items)
  loop
    v_item_type := v_item ->> 'item_type';
    v_apply_target := v_item ->> 'apply_target';
    v_quantity := (v_item ->> 'quantity')::integer;
    v_default_price := coalesce((v_item ->> 'default_unit_price')::numeric, 0);
    v_actual_price := coalesce((v_item ->> 'actual_unit_price')::numeric, 0);
    v_total_price := v_quantity * v_actual_price;

    if v_item_type not in ('labor', 'part', 'extra') then
      raise exception 'invalid item type';
    end if;

    if v_apply_target not in ('all_injectors', 'single_injector', 'selected_injectors', 'general_service') then
      raise exception 'invalid apply target';
    end if;

    if v_quantity < 1 or v_default_price < 0 or v_actual_price < 0 then
      raise exception 'invalid line item amount';
    end if;

    if v_item_type = 'labor' then
      v_labor_total := v_labor_total + v_total_price;
    elsif v_item_type = 'part' then
      v_parts_total := v_parts_total + v_total_price;
    else
      v_extra_total := v_extra_total + v_total_price;
    end if;
  end loop;

  v_calculated_total := v_labor_total + v_parts_total + v_extra_total;
  v_final_total := greatest(v_calculated_total - v_discount, 0);

  if v_paid > v_final_total then
    raise exception 'paid amount exceeds final total';
  end if;

  v_remaining := v_final_total - v_paid;
  if v_paid = v_final_total and v_final_total > 0 then
    v_payment_status := 'paid';
  elsif v_paid > 0 and v_paid < v_final_total then
    v_payment_status := 'partially_paid';
  else
    v_payment_status := 'unpaid';
  end if;

  select *
  into v_existing_vehicle
  from public.vehicles
  where is_deleted = false
    and regexp_replace(upper(license_plate), '[^A-Z0-9]', '', 'g')
      = regexp_replace(upper(v_vehicle ->> 'license_plate'), '[^A-Z0-9]', '', 'g')
  limit 1;

  if found then
    v_vehicle_id := v_existing_vehicle.id;
    v_old_vehicle := to_jsonb(v_existing_vehicle);

    update public.vehicles
    set
      license_plate = v_vehicle ->> 'license_plate',
      brand = v_vehicle ->> 'brand',
      phone = v_vehicle ->> 'phone',
      last_mileage = v_mileage,
      is_problem_customer = coalesce((v_vehicle ->> 'is_problem_customer')::boolean, false),
      problem_reason = nullif(v_vehicle ->> 'problem_reason', '')
    where id = v_vehicle_id;

    insert into public.audit_logs(action_type, table_name, record_id, old_value, new_value)
    values ('vehicle_update', 'vehicles', v_vehicle_id, v_old_vehicle, v_vehicle);
  else
    insert into public.vehicles (
      license_plate,
      brand,
      phone,
      last_mileage,
      is_problem_customer,
      problem_reason
    )
    values (
      v_vehicle ->> 'license_plate',
      v_vehicle ->> 'brand',
      v_vehicle ->> 'phone',
      v_mileage,
      coalesce((v_vehicle ->> 'is_problem_customer')::boolean, false),
      nullif(v_vehicle ->> 'problem_reason', '')
    )
    returning id into v_vehicle_id;

    insert into public.audit_logs(action_type, table_name, record_id, old_value, new_value)
    values ('vehicle_create', 'vehicles', v_vehicle_id, null, v_vehicle);
  end if;

  if nullif(v_injector ->> 'injector_model_id', '') is not null then
    v_model_id := (v_injector ->> 'injector_model_id')::uuid;
  else
    select id into v_model_id
    from public.injector_models
    where company = v_model_company
      and code = v_model_code
    limit 1;

    if v_model_id is null then
      insert into public.injector_models(company, code)
      values (v_model_company, v_model_code)
      returning id into v_model_id;

      insert into public.audit_logs(action_type, table_name, record_id, old_value, new_value)
      values ('injector_model_create', 'injector_models', v_model_id, null, jsonb_build_object('company', v_model_company, 'code', v_model_code));
    end if;
  end if;

  insert into public.service_records (
    vehicle_id,
    mileage,
    phone,
    is_problem_customer_snapshot,
    problem_reason_snapshot,
    problem_description,
    injector_count,
    injector_model_id,
    injector_company,
    injector_code,
    injector_serial_info,
    injector_summary,
    labor_total,
    parts_total,
    extra_total,
    calculated_total,
    discount_amount,
    final_total,
    paid_amount,
    remaining_amount,
    payment_status,
    payment_method
  )
  values (
    v_vehicle_id,
    v_mileage,
    v_vehicle ->> 'phone',
    coalesce((v_vehicle ->> 'is_problem_customer')::boolean, false),
    nullif(v_vehicle ->> 'problem_reason', ''),
    v_vehicle ->> 'problem_description',
    v_injector_count,
    v_model_id,
    v_model_company,
    v_model_code,
    nullif(v_injector ->> 'serial_info', ''),
    concat(v_injector_count, ' ədəd — ', v_model_company, ' ', v_model_code),
    v_labor_total,
    v_parts_total,
    v_extra_total,
    v_calculated_total,
    v_discount,
    v_final_total,
    v_paid,
    v_remaining,
    v_payment_status,
    v_payment_method
  )
  returning id into v_service_id;

  insert into public.audit_logs(action_type, table_name, record_id, old_value, new_value)
  values ('service_create', 'service_records', v_service_id, null, payload);

  for v_injector_item in select * from jsonb_array_elements(v_injectors)
  loop
    insert into public.service_injectors (
      service_id,
      vehicle_id,
      injector_number,
      initial_test_result,
      final_test_result,
      injector_status,
      problem_found,
      work_done,
      parts_replaced,
      note
    )
    values (
      v_service_id,
      v_vehicle_id,
      (v_injector_item ->> 'injector_number')::integer,
      nullif(v_injector_item ->> 'initial_test_result', ''),
      nullif(v_injector_item ->> 'final_test_result', ''),
      nullif(v_injector_item ->> 'injector_status', ''),
      array(select jsonb_array_elements_text(coalesce(v_injector_item -> 'problem_found', '[]'::jsonb))),
      array(select jsonb_array_elements_text(coalesce(v_injector_item -> 'work_done', '[]'::jsonb))),
      array(select jsonb_array_elements_text(coalesce(v_injector_item -> 'parts_replaced', '[]'::jsonb))),
      nullif(v_injector_item ->> 'note', '')
    );
  end loop;

  for v_item in select * from jsonb_array_elements(v_line_items)
  loop
    v_apply_target := v_item ->> 'apply_target';
    v_selected := array(select jsonb_array_elements_text(coalesce(v_item -> 'selected_injector_numbers', '[]'::jsonb))::integer);
    v_service_injector_id := null;

    if v_apply_target = 'single_injector' and array_length(v_selected, 1) = 1 then
      select si.id into v_service_injector_id
      from public.service_injectors si
      where si.service_id = v_service_id
        and si.injector_number = v_selected[1]
      limit 1;
    end if;

    v_quantity := (v_item ->> 'quantity')::integer;
    v_default_price := coalesce((v_item ->> 'default_unit_price')::numeric, 0);
    v_actual_price := coalesce((v_item ->> 'actual_unit_price')::numeric, 0);
    v_total_price := v_quantity * v_actual_price;

    insert into public.service_line_items (
      service_id,
      service_injector_id,
      injector_model_id,
      item_type,
      item_name,
      option_name,
      apply_target,
      selected_injector_numbers,
      quantity,
      default_unit_price,
      actual_unit_price,
      total_price,
      price_source,
      price_changed,
      note
    )
    values (
      v_service_id,
      v_service_injector_id,
      v_model_id,
      v_item ->> 'item_type',
      v_item ->> 'item_name',
      nullif(v_item ->> 'option_name', ''),
      v_apply_target,
      v_selected,
      v_quantity,
      v_default_price,
      v_actual_price,
      v_total_price,
      v_item ->> 'price_source',
      v_default_price <> v_actual_price,
      nullif(v_item ->> 'note', '')
    );
  end loop;

  insert into public.payments (
    service_id,
    vehicle_id,
    total_amount,
    paid_amount,
    remaining_amount,
    payment_status,
    payment_method,
    note
  )
  values (
    v_service_id,
    v_vehicle_id,
    v_final_total,
    v_paid,
    v_remaining,
    v_payment_status,
    v_payment_method,
    nullif(v_payment ->> 'note', '')
  );

  insert into public.audit_logs(action_type, table_name, record_id, old_value, new_value)
  values ('payment_create', 'payments', v_service_id, null, v_payment);

  service_id := v_service_id;
  vehicle_id := v_vehicle_id;
  return next;
end;
$$;
