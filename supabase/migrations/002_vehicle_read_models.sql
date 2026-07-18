-- Read models and RPCs for vehicle search, list, check, and history.

create or replace view public.vehicle_summaries as
with service_stats as (
  select
    sr.vehicle_id,
    count(*)::integer as service_count,
    coalesce(sum(sr.final_total), 0)::numeric(12,2) as total_spend,
    coalesce(sum(sr.remaining_amount), 0)::numeric(12,2) as remaining_debt,
    max(sr.service_date) as last_service_date
  from public.service_records sr
  where sr.is_deleted = false
  group by sr.vehicle_id
)
select
  v.id,
  v.license_plate,
  v.brand,
  v.phone,
  v.is_problem_customer,
  v.problem_reason,
  v.last_mileage,
  v.note,
  coalesce(ss.service_count, 0)::integer as service_count,
  coalesce(ss.total_spend, 0)::numeric(12,2) as total_spend,
  coalesce(ss.remaining_debt, 0)::numeric(12,2) as remaining_debt,
  ss.last_service_date,
  latest.payment_status as latest_payment_status,
  latest.injector_count as latest_injector_count,
  latest.injector_company as latest_injector_company,
  latest.injector_code as latest_injector_code,
  latest.injector_summary as latest_injector_summary,
  (coalesce(ss.remaining_debt, 0) > 0) as has_debt,
  v.created_at,
  v.updated_at
from public.vehicles v
left join service_stats ss on ss.vehicle_id = v.id
left join lateral (
  select
    sr.payment_status,
    sr.injector_count,
    sr.injector_company,
    sr.injector_code,
    sr.injector_summary
  from public.service_records sr
  where sr.vehicle_id = v.id
    and sr.is_deleted = false
  order by sr.service_date desc
  limit 1
) latest on true
where v.is_deleted = false;

create or replace function public.search_vehicles(
  search_text text default '',
  filter_key text default 'all',
  result_limit integer default 30
)
returns setof public.vehicle_summaries
language sql
stable
as $$
  select vs.*
  from public.vehicle_summaries vs
  where (
    coalesce(nullif(trim(search_text), ''), '') = ''
    or vs.license_plate ilike '%' || search_text || '%'
    or regexp_replace(upper(vs.license_plate), '[^A-Z0-9]', '', 'g')
      ilike '%' || regexp_replace(upper(search_text), '[^A-Z0-9]', '', 'g') || '%'
    or vs.phone ilike '%' || search_text || '%'
    or vs.brand ilike '%' || search_text || '%'
    or coalesce(vs.latest_injector_company, '') ilike '%' || search_text || '%'
    or coalesce(vs.latest_injector_code, '') ilike '%' || search_text || '%'
    or coalesce(vs.latest_injector_summary, '') ilike '%' || search_text || '%'
    or exists (
      select 1
      from public.service_records sr
      where sr.vehicle_id = vs.id
        and sr.is_deleted = false
        and (
          sr.problem_description ilike '%' || search_text || '%'
          or coalesce(sr.technical_notes, '') ilike '%' || search_text || '%'
        )
    )
  )
  and (
    filter_key = 'all'
    or (filter_key = 'problem' and vs.is_problem_customer = true)
    or (filter_key = 'debt' and vs.has_debt = true)
    or (filter_key = 'unpaid' and vs.latest_payment_status = 'unpaid')
    or (filter_key = 'partially_paid' and vs.latest_payment_status = 'partially_paid')
    or (filter_key = 'recent' and vs.last_service_date >= now() - interval '30 days')
    or (filter_key = 'normal' and vs.is_problem_customer = false)
    or (filter_key = 'this_month' and vs.last_service_date >= date_trunc('month', now()))
    or (filter_key = 'frequent' and vs.service_count >= 3)
  )
  order by
    vs.last_service_date desc nulls last,
    vs.updated_at desc
  limit greatest(1, least(coalesce(result_limit, 30), 50));
$$;

create or replace function public.check_vehicle_by_plate(plate_text text)
returns setof public.vehicle_summaries
language sql
stable
as $$
  select vs.*
  from public.vehicle_summaries vs
  where regexp_replace(upper(vs.license_plate), '[^A-Z0-9]', '', 'g')
    = regexp_replace(upper(coalesce(plate_text, '')), '[^A-Z0-9]', '', 'g')
  limit 1;
$$;

create or replace function public.get_vehicle_history(vehicle_uuid uuid)
returns table (
  id uuid,
  vehicle_id uuid,
  service_date timestamptz,
  mileage integer,
  injector_count integer,
  injector_company text,
  injector_code text,
  injector_summary text,
  work_performed text,
  technical_notes text,
  labor_total numeric(12,2),
  parts_total numeric(12,2),
  extra_total numeric(12,2),
  calculated_total numeric(12,2),
  discount_amount numeric(12,2),
  final_total numeric(12,2),
  paid_amount numeric(12,2),
  remaining_amount numeric(12,2),
  payment_status text
)
language sql
stable
as $$
  select
    sr.id,
    sr.vehicle_id,
    sr.service_date,
    sr.mileage,
    sr.injector_count,
    sr.injector_company,
    sr.injector_code,
    sr.injector_summary,
    sr.work_performed,
    sr.technical_notes,
    sr.labor_total,
    sr.parts_total,
    sr.extra_total,
    sr.calculated_total,
    sr.discount_amount,
    sr.final_total,
    sr.paid_amount,
    sr.remaining_amount,
    sr.payment_status
  from public.service_records sr
  where sr.vehicle_id = vehicle_uuid
    and sr.is_deleted = false
  order by sr.service_date desc;
$$;
