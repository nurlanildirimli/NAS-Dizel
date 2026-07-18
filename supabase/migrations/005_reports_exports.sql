-- Reports and export RPCs.

create or replace function public.report_period_start(period_key text)
returns timestamptz
language plpgsql
stable
as $$
begin
  if period_key = 'today' then
    return date_trunc('day', now());
  elsif period_key = 'week' then
    return date_trunc('week', now());
  elsif period_key = 'year' then
    return date_trunc('year', now());
  end if;

  return date_trunc('month', now());
end;
$$;

create or replace function public.get_report_summary(
  report_key text,
  period_key text default 'month'
)
returns jsonb
language plpgsql
stable
as $$
declare
  v_start timestamptz := public.report_period_start(period_key);
begin
  if report_key = 'income' then
    return coalesce((
      select jsonb_agg(row_to_json(row_data))
      from (
        select
          'Gəlir' as label,
          coalesce(sum(p.paid_amount), 0)::numeric(12,2) as amount,
          count(*)::integer as count
        from public.payments p
        where p.is_deleted = false
          and p.payment_date >= v_start
      ) row_data
    ), '[]'::jsonb);
  elsif report_key = 'vehicles' then
    return coalesce((
      select jsonb_agg(row_to_json(row_data))
      from (
        select
          v.license_plate as label,
          v.brand,
          count(sr.id)::integer as service_count,
          coalesce(sum(sr.final_total), 0)::numeric(12,2) as total_amount,
          coalesce(sum(sr.remaining_amount), 0)::numeric(12,2) as remaining_amount
        from public.vehicles v
        left join public.service_records sr on sr.vehicle_id = v.id and sr.is_deleted = false
        where v.is_deleted = false
        group by v.id
        order by service_count desc, total_amount desc
        limit 50
      ) row_data
    ), '[]'::jsonb);
  elsif report_key = 'injectors' then
    return coalesce((
      select jsonb_agg(row_to_json(row_data))
      from (
        select
          sr.injector_company as company,
          sr.injector_code as code,
          count(*)::integer as service_count,
          avg(sr.final_total)::numeric(12,2) as average_amount
        from public.service_records sr
        where sr.is_deleted = false
          and sr.service_date >= v_start
        group by sr.injector_company, sr.injector_code
        order by service_count desc
        limit 50
      ) row_data
    ), '[]'::jsonb);
  elsif report_key = 'payments' then
    return coalesce((
      select jsonb_agg(row_to_json(row_data))
      from (
        select
          sr.payment_status as status,
          count(*)::integer as service_count,
          coalesce(sum(sr.final_total), 0)::numeric(12,2) as final_total,
          coalesce(sum(sr.paid_amount), 0)::numeric(12,2) as paid_amount,
          coalesce(sum(sr.remaining_amount), 0)::numeric(12,2) as remaining_amount
        from public.service_records sr
        where sr.is_deleted = false
          and sr.service_date >= v_start
        group by sr.payment_status
        order by sr.payment_status
      ) row_data
    ), '[]'::jsonb);
  elsif report_key = 'services' then
    return coalesce((
      select jsonb_agg(row_to_json(row_data))
      from (
        select
          sr.service_date,
          v.license_plate,
          v.brand,
          sr.injector_company,
          sr.injector_code,
          sr.final_total,
          sr.payment_status
        from public.service_records sr
        join public.vehicles v on v.id = sr.vehicle_id
        where sr.is_deleted = false
          and sr.service_date >= v_start
        order by sr.service_date desc
        limit 100
      ) row_data
    ), '[]'::jsonb);
  elsif report_key = 'parts' then
    return coalesce((
      select jsonb_agg(row_to_json(row_data))
      from (
        select
          sli.item_name,
          sli.option_name,
          sum(sli.quantity)::integer as quantity,
          coalesce(sum(sli.total_price), 0)::numeric(12,2) as total_amount
        from public.service_line_items sli
        join public.service_records sr on sr.id = sli.service_id
        where sr.is_deleted = false
          and sr.service_date >= v_start
          and sli.item_type = 'part'
        group by sli.item_name, sli.option_name
        order by quantity desc
        limit 50
      ) row_data
    ), '[]'::jsonb);
  elsif report_key = 'price_changes' then
    return coalesce((
      select jsonb_agg(row_to_json(row_data))
      from (
        select
          sr.service_date,
          v.license_plate,
          sli.item_name,
          sli.option_name,
          sli.default_unit_price,
          sli.actual_unit_price,
          (sli.actual_unit_price - sli.default_unit_price)::numeric(12,2) as difference
        from public.service_line_items sli
        join public.service_records sr on sr.id = sli.service_id
        join public.vehicles v on v.id = sr.vehicle_id
        where sr.is_deleted = false
          and sr.service_date >= v_start
          and sli.price_changed = true
        order by sr.service_date desc
        limit 100
      ) row_data
    ), '[]'::jsonb);
  elsif report_key = 'debts' then
    return coalesce((
      select jsonb_agg(row_to_json(row_data))
      from (
        select
          v.license_plate,
          v.brand,
          v.phone,
          sr.remaining_amount,
          sr.service_date
        from public.service_records sr
        join public.vehicles v on v.id = sr.vehicle_id
        where sr.is_deleted = false
          and sr.remaining_amount > 0
        order by sr.remaining_amount desc
        limit 100
      ) row_data
    ), '[]'::jsonb);
  elsif report_key = 'problem_vehicles' then
    return coalesce((
      select jsonb_agg(row_to_json(row_data))
      from (
        select
          v.license_plate,
          v.brand,
          v.phone,
          v.problem_reason,
          coalesce(sum(sr.remaining_amount), 0)::numeric(12,2) as remaining_amount,
          max(sr.service_date) as last_service_date
        from public.vehicles v
        left join public.service_records sr on sr.vehicle_id = v.id and sr.is_deleted = false
        where v.is_deleted = false
          and v.is_problem_customer = true
        group by v.id
        order by remaining_amount desc, last_service_date desc nulls last
        limit 100
      ) row_data
    ), '[]'::jsonb);
  end if;

  raise exception 'invalid report key';
end;
$$;

create or replace function public.export_dataset(dataset_key text)
returns jsonb
language plpgsql
stable
as $$
begin
  if dataset_key = 'vehicles' then
    return coalesce((select jsonb_agg(row_to_json(t)) from (select * from public.vehicles order by created_at desc) t), '[]'::jsonb);
  elsif dataset_key = 'services' then
    return coalesce((select jsonb_agg(row_to_json(t)) from (select * from public.service_records order by service_date desc) t), '[]'::jsonb);
  elsif dataset_key = 'service_injectors' then
    return coalesce((select jsonb_agg(row_to_json(t)) from (select * from public.service_injectors order by created_at desc) t), '[]'::jsonb);
  elsif dataset_key = 'payments' then
    return coalesce((select jsonb_agg(row_to_json(t)) from (select * from public.payments order by payment_date desc) t), '[]'::jsonb);
  elsif dataset_key = 'price_catalog' then
    return coalesce((
      select jsonb_agg(row_to_json(t))
      from (
        select
          pi.id,
          pi.name,
          pi.type,
          pio.option_name,
          imp.injector_model_id,
          im.company,
          im.code,
          imp.default_price
        from public.price_items pi
        left join public.price_item_options pio on pio.price_item_id = pi.id
        left join public.injector_model_prices imp on imp.price_item_id = pi.id
          and (imp.price_item_option_id = pio.id or (imp.price_item_option_id is null and pio.id is null))
        left join public.injector_models im on im.id = imp.injector_model_id
        order by pi.type, pi.sort_order, pi.name
      ) t
    ), '[]'::jsonb);
  elsif dataset_key = 'service_line_items' then
    return coalesce((select jsonb_agg(row_to_json(t)) from (select * from public.service_line_items order by created_at desc) t), '[]'::jsonb);
  elsif dataset_key = 'devices' then
    return coalesce((select jsonb_agg(row_to_json(t)) from (select * from public.allowed_devices order by created_at desc) t), '[]'::jsonb);
  end if;

  raise exception 'invalid dataset key';
end;
$$;
