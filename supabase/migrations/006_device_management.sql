-- Device management RPCs. Applies after 001_initial_schema.sql.

create or replace function public.list_allowed_devices(
  filter_key text default 'active'
)
returns table (
  id uuid,
  device_id text,
  device_name text,
  status text,
  is_active boolean,
  created_at timestamptz,
  last_seen_at timestamptz,
  note text,
  is_deleted boolean,
  deleted_at timestamptz
)
language sql
stable
as $$
  select
    ad.id,
    ad.device_id,
    ad.device_name,
    ad.status,
    ad.is_active,
    ad.created_at,
    ad.last_seen_at,
    ad.note,
    ad.is_deleted,
    ad.deleted_at
  from public.allowed_devices ad
  where (
    filter_key = 'all'
    or (filter_key = 'active' and ad.is_deleted = false and ad.status = 'active' and ad.is_active = true)
    or (filter_key = 'pending' and ad.is_deleted = false and ad.status = 'pending')
    or (filter_key = 'deactivated' and ad.is_deleted = false and ad.status = 'deactivated')
    or (filter_key = 'deleted' and ad.is_deleted = true)
  )
  order by
    ad.is_deleted asc,
    case ad.status
      when 'pending' then 1
      when 'active' then 2
      when 'deactivated' then 3
      else 4
    end,
    ad.last_seen_at desc nulls last,
    ad.created_at desc;
$$;

create or replace function public.activate_device(
  device_uuid uuid,
  note_text text default null
)
returns jsonb
language plpgsql
as $$
declare
  v_old public.allowed_devices%rowtype;
  v_new public.allowed_devices%rowtype;
begin
  select * into v_old
  from public.allowed_devices
  where id = device_uuid
  for update;

  if not found then
    raise exception 'device not found';
  end if;

  update public.allowed_devices
  set
    status = 'active',
    is_active = true,
    note = coalesce(note_text, note),
    is_deleted = false,
    deleted_at = null
  where id = device_uuid
  returning * into v_new;

  insert into public.audit_logs(action_type, table_name, record_id, old_value, new_value, device_name)
  values ('device_activate', 'allowed_devices', device_uuid, to_jsonb(v_old), to_jsonb(v_new), v_new.device_name);

  return to_jsonb(v_new);
end;
$$;

create or replace function public.deactivate_device(
  device_uuid uuid,
  note_text text default null
)
returns jsonb
language plpgsql
as $$
declare
  v_old public.allowed_devices%rowtype;
  v_new public.allowed_devices%rowtype;
begin
  select * into v_old
  from public.allowed_devices
  where id = device_uuid
  for update;

  if not found then
    raise exception 'device not found';
  end if;

  update public.allowed_devices
  set
    status = 'deactivated',
    is_active = false,
    note = coalesce(note_text, note)
  where id = device_uuid
  returning * into v_new;

  insert into public.audit_logs(action_type, table_name, record_id, old_value, new_value, device_name)
  values ('device_deactivate', 'allowed_devices', device_uuid, to_jsonb(v_old), to_jsonb(v_new), v_new.device_name);

  return to_jsonb(v_new);
end;
$$;

create or replace function public.update_device_details(
  device_uuid uuid,
  device_name_text text,
  note_text text
)
returns jsonb
language plpgsql
as $$
declare
  v_old public.allowed_devices%rowtype;
  v_new public.allowed_devices%rowtype;
begin
  select * into v_old
  from public.allowed_devices
  where id = device_uuid
  for update;

  if not found then
    raise exception 'device not found';
  end if;

  update public.allowed_devices
  set
    device_name = nullif(trim(device_name_text), ''),
    note = nullif(trim(note_text), '')
  where id = device_uuid
  returning * into v_new;

  insert into public.audit_logs(action_type, table_name, record_id, old_value, new_value, device_name)
  values ('device_update', 'allowed_devices', device_uuid, to_jsonb(v_old), to_jsonb(v_new), v_new.device_name);

  return to_jsonb(v_new);
end;
$$;

create or replace function public.soft_delete_device(
  device_uuid uuid
)
returns jsonb
language plpgsql
as $$
declare
  v_old public.allowed_devices%rowtype;
  v_new public.allowed_devices%rowtype;
begin
  select * into v_old
  from public.allowed_devices
  where id = device_uuid
  for update;

  if not found then
    raise exception 'device not found';
  end if;

  update public.allowed_devices
  set
    status = 'deactivated',
    is_active = false,
    is_deleted = true,
    deleted_at = now()
  where id = device_uuid
  returning * into v_new;

  insert into public.audit_logs(action_type, table_name, record_id, old_value, new_value, device_name)
  values ('device_soft_delete', 'allowed_devices', device_uuid, to_jsonb(v_old), to_jsonb(v_new), v_new.device_name);

  return to_jsonb(v_new);
end;
$$;
