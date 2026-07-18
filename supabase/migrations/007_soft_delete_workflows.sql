-- Soft-delete workflows for services, vehicles, and payments.

create or replace function public.recalculate_service_payment_totals(service_uuid uuid)
returns jsonb
language plpgsql
as $$
declare
  v_service public.service_records%rowtype;
  v_old_service jsonb;
  v_paid numeric(12,2);
  v_remaining numeric(12,2);
  v_status text;
  v_method text;
begin
  select * into v_service
  from public.service_records
  where id = service_uuid
  for update;

  if not found then
    raise exception 'service not found';
  end if;

  v_old_service := to_jsonb(v_service);

  select coalesce(sum(p.paid_amount), 0)::numeric(12,2)
  into v_paid
  from public.payments p
  where p.service_id = service_uuid
    and p.is_deleted = false;

  select p.payment_method
  into v_method
  from public.payments p
  where p.service_id = service_uuid
    and p.is_deleted = false
  order by p.payment_date desc
  limit 1;

  v_remaining := greatest(v_service.final_total - v_paid, 0);
  v_status := case
    when v_paid = v_service.final_total and v_service.final_total > 0 then 'paid'
    when v_paid > 0 then 'partially_paid'
    else 'unpaid'
  end;

  update public.service_records
  set
    paid_amount = v_paid,
    remaining_amount = v_remaining,
    payment_status = v_status,
    payment_method = v_method
  where id = service_uuid
  returning * into v_service;

  insert into public.audit_logs(action_type, table_name, record_id, old_value, new_value)
  values ('payment_change', 'service_records', service_uuid, v_old_service, to_jsonb(v_service));

  return to_jsonb(v_service);
end;
$$;

create or replace function public.soft_delete_payment(payment_uuid uuid)
returns jsonb
language plpgsql
as $$
declare
  v_payment public.payments%rowtype;
  v_new_payment public.payments%rowtype;
begin
  select * into v_payment
  from public.payments
  where id = payment_uuid
    and is_deleted = false
  for update;

  if not found then
    raise exception 'payment not found';
  end if;

  update public.payments
  set
    is_deleted = true,
    deleted_at = now()
  where id = payment_uuid
  returning * into v_new_payment;

  insert into public.audit_logs(action_type, table_name, record_id, old_value, new_value)
  values ('payment_delete', 'payments', payment_uuid, to_jsonb(v_payment), to_jsonb(v_new_payment));

  perform public.recalculate_service_payment_totals(v_payment.service_id);

  return jsonb_build_object(
    'payment_id', payment_uuid,
    'service_id', v_payment.service_id,
    'vehicle_id', v_payment.vehicle_id
  );
end;
$$;

create or replace function public.soft_delete_service(service_uuid uuid)
returns jsonb
language plpgsql
as $$
declare
  v_service public.service_records%rowtype;
  v_new_service public.service_records%rowtype;
begin
  select * into v_service
  from public.service_records
  where id = service_uuid
    and is_deleted = false
  for update;

  if not found then
    raise exception 'service not found';
  end if;

  update public.service_records
  set
    is_deleted = true,
    deleted_at = now()
  where id = service_uuid
  returning * into v_new_service;

  update public.payments
  set
    is_deleted = true,
    deleted_at = now()
  where service_id = service_uuid
    and is_deleted = false;

  insert into public.audit_logs(action_type, table_name, record_id, old_value, new_value)
  values ('service_delete', 'service_records', service_uuid, to_jsonb(v_service), to_jsonb(v_new_service));

  return jsonb_build_object(
    'service_id', service_uuid,
    'vehicle_id', v_service.vehicle_id
  );
end;
$$;

create or replace function public.soft_delete_vehicle(vehicle_uuid uuid)
returns jsonb
language plpgsql
as $$
declare
  v_vehicle public.vehicles%rowtype;
  v_new_vehicle public.vehicles%rowtype;
begin
  select * into v_vehicle
  from public.vehicles
  where id = vehicle_uuid
    and is_deleted = false
  for update;

  if not found then
    raise exception 'vehicle not found';
  end if;

  update public.vehicles
  set
    is_deleted = true,
    deleted_at = now()
  where id = vehicle_uuid
  returning * into v_new_vehicle;

  update public.service_records
  set
    is_deleted = true,
    deleted_at = now()
  where vehicle_id = vehicle_uuid
    and is_deleted = false;

  update public.payments
  set
    is_deleted = true,
    deleted_at = now()
  where vehicle_id = vehicle_uuid
    and is_deleted = false;

  insert into public.audit_logs(action_type, table_name, record_id, old_value, new_value)
  values ('vehicle_delete', 'vehicles', vehicle_uuid, to_jsonb(v_vehicle), to_jsonb(v_new_vehicle));

  return jsonb_build_object('vehicle_id', vehicle_uuid);
end;
$$;
