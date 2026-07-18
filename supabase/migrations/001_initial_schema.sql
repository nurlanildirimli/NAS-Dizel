-- ============================================================
-- Common Rail Injector Service App — Initial Schema
-- Allowed tables ONLY: vehicles, service_records, service_injectors,
-- payments, injector_models, price_items, price_item_options,
-- injector_model_prices, service_line_items, allowed_devices,
-- settings, audit_logs.
-- Do NOT create: customers, users, technicians.
-- ============================================================

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 001: allowed_devices — approved-device access control.
-- Device delete is a soft delete; keep historical device/audit context.
create table public.allowed_devices (
  id uuid primary key default gen_random_uuid(),
  device_id text not null unique,
  device_name text,
  status text not null default 'pending'
    check (status in ('pending','active','deactivated')),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  note text,

  is_deleted boolean not null default false,
  deleted_at timestamptz
);

-- 002: vehicles — the main entity. No customer_id/name, no model/year/engine/vin,
-- no problem_description (that lives on service_records only).
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),

  license_plate text not null,
  brand text not null,
  phone text not null,
  is_problem_customer boolean not null default false,
  problem_reason text,
  last_mileage integer not null,
  note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  is_deleted boolean not null default false,
  deleted_at timestamptz
);

-- 003: injector_models — company + code identifies a model (e.g. Bosch 0445110006)
create table public.injector_models (
  id uuid primary key default gen_random_uuid(),

  company text not null,
  code text not null,
  name text,
  note text,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(company, code)
);

-- 004: service_records — one row per workshop visit.
-- phone / is_problem_customer_snapshot / problem_reason_snapshot are SNAPSHOTS
-- of the vehicle at time of service, because the vehicle's live values may
-- change later. Do not treat these as the source of truth for current status.
create table public.service_records (
  id uuid primary key default gen_random_uuid(),

  vehicle_id uuid not null references public.vehicles(id),

  service_date timestamptz not null default now(),
  mileage integer not null,
  phone text not null,

  is_problem_customer_snapshot boolean not null default false,
  problem_reason_snapshot text,

  problem_description text not null,
  work_performed text,
  technical_notes text,

  injector_count integer not null check (injector_count between 1 and 8),
  injector_model_id uuid references public.injector_models(id),
  injector_company text not null,
  injector_code text not null,
  injector_serial_info text,
  injector_summary text,

  labor_total numeric(12,2) not null default 0,
  parts_total numeric(12,2) not null default 0,
  extra_total numeric(12,2) not null default 0,
  calculated_total numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  final_total numeric(12,2) not null default 0,
  paid_amount numeric(12,2) not null default 0,
  remaining_amount numeric(12,2) not null default 0,

  payment_status text not null default 'unpaid'
    check (payment_status in ('paid','partially_paid','unpaid','cancelled')),
  payment_method text check (payment_method in ('cash','card','transfer','debt','mixed')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  is_deleted boolean not null default false,
  deleted_at timestamptz
);

-- 005: service_injectors — one row per physical injector tested in a service
create table public.service_injectors (
  id uuid primary key default gen_random_uuid(),

  service_id uuid not null references public.service_records(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id),

  injector_number integer not null,

  initial_test_result text,
  final_test_result text,
  injector_status text,
  problem_found text[],
  work_done text[],
  parts_replaced text[],
  note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 006: price_items — names of labor / part / extra offerings (not model-specific)
create table public.price_items (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  type text not null check (type in ('labor', 'part', 'extra')),
  is_active boolean not null default true,
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- price_item_options — variants of a part (e.g. Nozzle -> Çin/Original/İşlənmiş)
create table public.price_item_options (
  id uuid primary key default gen_random_uuid(),

  price_item_id uuid not null references public.price_items(id) on delete cascade,
  option_name text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- injector_model_prices — default price of a given item/option for a given model
create table public.injector_model_prices (
  id uuid primary key default gen_random_uuid(),

  injector_model_id uuid not null references public.injector_models(id) on delete cascade,
  price_item_id uuid not null references public.price_items(id) on delete cascade,
  price_item_option_id uuid references public.price_item_options(id) on delete cascade,

  item_type text not null check (item_type in ('labor', 'part', 'extra')),
  default_price numeric(12,2) not null default 0,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 007: service_line_items — every labor/part/extra actually applied in a visit.
-- Both default_unit_price (catalog) and actual_unit_price (charged) are stored;
-- never collapse into one field, even if they match.
create table public.service_line_items (
  id uuid primary key default gen_random_uuid(),

  service_id uuid not null references public.service_records(id) on delete cascade,
  service_injector_id uuid references public.service_injectors(id),
  injector_model_id uuid references public.injector_models(id),

  item_type text not null check (item_type in ('labor', 'part', 'extra')),
  item_name text not null,
  option_name text,

  apply_target text not null check (
    apply_target in (
      'all_injectors',
      'single_injector',
      'selected_injectors',
      'general_service'
    )
  ),

  selected_injector_numbers integer[],
  quantity integer not null default 1 check (quantity >= 1),

  default_unit_price numeric(12,2) not null default 0,
  actual_unit_price numeric(12,2) not null default 0,
  total_price numeric(12,2) not null default 0,

  price_source text not null default 'manual_price'
    check (price_source in ('model_price','manual_price','global_default','company_default')),
  price_changed boolean not null default false,

  note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 008: payments
create table public.payments (
  id uuid primary key default gen_random_uuid(),

  service_id uuid not null references public.service_records(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id),

  payment_date timestamptz not null default now(),

  total_amount numeric(12,2) not null default 0,
  paid_amount numeric(12,2) not null default 0,
  remaining_amount numeric(12,2) not null default 0,

  payment_status text not null default 'unpaid'
    check (payment_status in ('paid','partially_paid','unpaid','cancelled')),
  payment_method text check (payment_method in ('cash','card','transfer','debt','mixed')),
  note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  is_deleted boolean not null default false,
  deleted_at timestamptz
);

-- 009: audit_logs
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),

  action_type text not null,
  table_name text not null,
  record_id uuid,
  old_value jsonb,
  new_value jsonb,
  device_name text,

  created_at timestamptz not null default now()
);

-- 010: settings — generic key/value config
create table public.settings (
  id uuid primary key default gen_random_uuid(),

  key text not null unique,
  value jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 011: indexes
create index idx_vehicles_license_plate on public.vehicles(license_plate);
create unique index idx_vehicles_normalized_plate_active
  on public.vehicles ((regexp_replace(upper(license_plate), '[^A-Z0-9]', '', 'g')))
  where is_deleted = false;
create index idx_vehicles_brand on public.vehicles(brand);
create index idx_vehicles_phone on public.vehicles(phone);
create index idx_vehicles_problem on public.vehicles(is_problem_customer);

create index idx_service_records_vehicle_id on public.service_records(vehicle_id);
create index idx_service_records_service_date on public.service_records(service_date);
create index idx_service_records_payment_status on public.service_records(payment_status);
create index idx_service_records_injector_company on public.service_records(injector_company);
create index idx_service_records_injector_code on public.service_records(injector_code);
create index idx_service_records_injector_model_id on public.service_records(injector_model_id);

create index idx_payments_vehicle_id on public.payments(vehicle_id);
create index idx_payments_payment_status on public.payments(payment_status);

create index idx_injector_models_company on public.injector_models(company);
create index idx_injector_models_code on public.injector_models(code);

create index idx_service_line_items_service_id on public.service_line_items(service_id);
create index idx_service_line_items_item_type on public.service_line_items(item_type);
create index idx_service_line_items_item_name on public.service_line_items(item_name);
create index idx_service_line_items_option_name on public.service_line_items(option_name);
create index idx_service_line_items_apply_target on public.service_line_items(apply_target);

create index idx_allowed_devices_device_id on public.allowed_devices(device_id);
create index idx_allowed_devices_status on public.allowed_devices(status);
create index idx_allowed_devices_is_active on public.allowed_devices(is_active);
create index idx_allowed_devices_is_deleted on public.allowed_devices(is_deleted);

-- 012: updated_at triggers
create trigger trg_vehicles_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();

create trigger trg_injector_models_updated_at
  before update on public.injector_models
  for each row execute function public.set_updated_at();

create trigger trg_service_records_updated_at
  before update on public.service_records
  for each row execute function public.set_updated_at();

create trigger trg_service_injectors_updated_at
  before update on public.service_injectors
  for each row execute function public.set_updated_at();

create trigger trg_price_items_updated_at
  before update on public.price_items
  for each row execute function public.set_updated_at();

create trigger trg_price_item_options_updated_at
  before update on public.price_item_options
  for each row execute function public.set_updated_at();

create trigger trg_injector_model_prices_updated_at
  before update on public.injector_model_prices
  for each row execute function public.set_updated_at();

create trigger trg_service_line_items_updated_at
  before update on public.service_line_items
  for each row execute function public.set_updated_at();

create trigger trg_payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

create trigger trg_settings_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();
