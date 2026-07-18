-- Service detail, payments, and income RPCs.

create or replace function public.get_service_detail(service_uuid uuid)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'service', to_jsonb(sr),
    'vehicle', to_jsonb(v),
    'injectors', coalesce((
      select jsonb_agg(to_jsonb(si) order by si.injector_number)
      from public.service_injectors si
      where si.service_id = sr.id
    ), '[]'::jsonb),
    'line_items', coalesce((
      select jsonb_agg(to_jsonb(sli) order by sli.created_at, sli.item_name)
      from public.service_line_items sli
      where sli.service_id = sr.id
    ), '[]'::jsonb),
    'payments', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.payment_date desc)
      from public.payments p
      where p.service_id = sr.id
        and p.is_deleted = false
    ), '[]'::jsonb)
  )
  from public.service_records sr
  join public.vehicles v on v.id = sr.vehicle_id
  where sr.id = service_uuid
    and sr.is_deleted = false
  limit 1;
$$;

create or replace function public.list_payments(
  filter_key text default 'all',
  result_limit integer default 50
)
returns table (
  service_id uuid,
  vehicle_id uuid,
  service_date timestamptz,
  license_plate text,
  brand text,
  phone text,
  final_total numeric(12,2),
  paid_amount numeric(12,2),
  remaining_amount numeric(12,2),
  payment_status text,
  payment_method text
)
language sql
stable
as $$
  select
    sr.id as service_id,
    sr.vehicle_id,
    sr.service_date,
    v.license_plate,
    v.brand,
    sr.phone,
    sr.final_total,
    sr.paid_amount,
    sr.remaining_amount,
    sr.payment_status,
    sr.payment_method
  from public.service_records sr
  join public.vehicles v on v.id = sr.vehicle_id
  where sr.is_deleted = false
    and (
      filter_key = 'all'
      or (filter_key = 'paid' and sr.payment_status = 'paid')
      or (filter_key = 'partially_paid' and sr.payment_status = 'partially_paid')
      or (filter_key = 'unpaid' and sr.payment_status = 'unpaid')
      or (filter_key = 'debt' and sr.remaining_amount > 0)
    )
  order by sr.service_date desc
  limit greatest(1, least(coalesce(result_limit, 50), 100));
$$;

create or replace function public.get_income_summary(period_key text default 'month')
returns jsonb
language plpgsql
stable
as $$
declare
  v_start timestamptz;
begin
  if period_key = 'today' then
    v_start := date_trunc('day', now());
  elsif period_key = 'week' then
    v_start := date_trunc('week', now());
  elsif period_key = 'year' then
    v_start := date_trunc('year', now());
  else
    v_start := date_trunc('month', now());
  end if;

  return jsonb_build_object(
    'period_key', period_key,
    'income_total', coalesce((
      select sum(p.paid_amount)
      from public.payments p
      where p.is_deleted = false
        and p.payment_date >= v_start
    ), 0),
    'debt_total', coalesce((
      select sum(sr.remaining_amount)
      from public.service_records sr
      where sr.is_deleted = false
    ), 0),
    'service_count', coalesce((
      select count(*)
      from public.service_records sr
      where sr.is_deleted = false
        and sr.service_date >= v_start
    ), 0),
    'vehicle_count', coalesce((
      select count(distinct sr.vehicle_id)
      from public.service_records sr
      where sr.is_deleted = false
        and sr.service_date >= v_start
    ), 0),
    'injector_count', coalesce((
      select sum(sr.injector_count)
      from public.service_records sr
      where sr.is_deleted = false
        and sr.service_date >= v_start
    ), 0)
  );
end;
$$;

create or replace function public.record_service_payment(
  service_uuid uuid,
  paid_amount numeric,
  payment_method text,
  note text default null
)
returns jsonb
language plpgsql
as $$
declare
  v_service public.service_records%rowtype;
  v_new_paid numeric(12,2);
  v_new_remaining numeric(12,2);
  v_status text;
  v_payment_id uuid;
begin
  if paid_amount <= 0 then
    raise exception 'invalid payment amount';
  end if;

  if payment_method not in ('cash','card','transfer','debt','mixed') then
    raise exception 'invalid payment method';
  end if;

  select * into v_service
  from public.service_records
  where id = service_uuid
    and is_deleted = false
  for update;

  if not found then
    raise exception 'service not found';
  end if;

  if paid_amount > v_service.remaining_amount then
    raise exception 'paid amount exceeds remaining amount';
  end if;

  v_new_paid := v_service.paid_amount + paid_amount;
  v_new_remaining := v_service.final_total - v_new_paid;
  v_status := case
    when v_new_paid = v_service.final_total and v_service.final_total > 0 then 'paid'
    when v_new_paid > 0 then 'partially_paid'
    else 'unpaid'
  end;

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
    v_service.id,
    v_service.vehicle_id,
    v_service.final_total,
    paid_amount,
    v_new_remaining,
    v_status,
    payment_method,
    note
  )
  returning id into v_payment_id;

  update public.service_records
  set
    paid_amount = v_new_paid,
    remaining_amount = v_new_remaining,
    payment_status = v_status,
    payment_method = record_service_payment.payment_method
  where id = v_service.id;

  insert into public.audit_logs(action_type, table_name, record_id, old_value, new_value)
  values (
    'payment_change',
    'payments',
    v_payment_id,
    to_jsonb(v_service),
    jsonb_build_object('paid_amount', paid_amount, 'payment_method', payment_method, 'remaining_amount', v_new_remaining)
  );

  return jsonb_build_object('service_id', v_service.id, 'payment_id', v_payment_id, 'payment_status', v_status);
end;
$$;

create or replace function public.mark_service_paid(
  service_uuid uuid,
  payment_method text default 'cash'
)
returns jsonb
language plpgsql
as $$
declare
  v_remaining numeric(12,2);
begin
  select remaining_amount into v_remaining
  from public.service_records
  where id = service_uuid
    and is_deleted = false;

  if not found then
    raise exception 'service not found';
  end if;

  if v_remaining <= 0 then
    return jsonb_build_object('service_id', service_uuid, 'payment_status', 'paid');
  end if;

  return public.record_service_payment(service_uuid, v_remaining, payment_method, 'Tam ödənildi kimi işarələ');
end;
$$;
