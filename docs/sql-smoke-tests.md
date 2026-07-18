# SQL Smoke Tests

Run these checks in the Supabase SQL Editor after applying migrations. They are
manual smoke tests, not seed data. Replace placeholder UUIDs with real IDs from
your project where noted.

## Schema and RPC Presence

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;

select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'search_vehicles',
    'check_vehicle_by_plate',
    'get_vehicle_history',
    'save_service',
    'get_service_detail',
    'list_payments',
    'get_income_summary',
    'record_service_payment',
    'mark_service_paid',
    'get_report_summary',
    'export_dataset',
    'list_allowed_devices',
    'activate_device',
    'deactivate_device',
    'update_device_details',
    'soft_delete_device',
    'soft_delete_service',
    'soft_delete_vehicle',
    'soft_delete_payment'
  )
order by routine_name;
```

Approved tables only:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('customers', 'users', 'technicians');
```

The forbidden-table query must return zero rows.

## Vehicle Read Models

```sql
select * from public.search_vehicles('', 'all', 30);
select * from public.search_vehicles('', 'problem', 30);
select * from public.search_vehicles('', 'debt', 30);
select * from public.check_vehicle_by_plate('90-PP-123');
```

For an existing vehicle ID:

```sql
select * from public.get_vehicle_history('00000000-0000-0000-0000-000000000000');
```

## Save Service Success

This payload should create or update one vehicle, one service, matching injectors,
line items, one payment, and audit rows.

```sql
select *
from public.save_service(
  '{
    "vehicle": {
      "license_plate": "90-TEST-001",
      "brand": "Mercedes",
      "phone": "+994501112233",
      "mileage": 250000,
      "problem_description": "Test smoke service",
      "is_problem_customer": false,
      "problem_reason": ""
    },
    "injector": {
      "count": 4,
      "company": "Bosch",
      "code": "0445110006",
      "serial_info": "",
      "injector_model_id": null,
      "injectors": [
        { "injector_number": 1, "initial_test_result": "", "final_test_result": "", "injector_status": "", "problem_found": [], "work_done": [], "parts_replaced": [], "note": "" },
        { "injector_number": 2, "initial_test_result": "", "final_test_result": "", "injector_status": "", "problem_found": [], "work_done": [], "parts_replaced": [], "note": "" },
        { "injector_number": 3, "initial_test_result": "", "final_test_result": "", "injector_status": "", "problem_found": [], "work_done": [], "parts_replaced": [], "note": "" },
        { "injector_number": 4, "initial_test_result": "", "final_test_result": "", "injector_status": "", "problem_found": [], "work_done": [], "parts_replaced": [], "note": "" }
      ]
    },
    "line_items": [
      {
        "item_type": "labor",
        "item_name": "Test",
        "option_name": "",
        "apply_target": "all_injectors",
        "selected_injector_numbers": [],
        "quantity": 4,
        "default_unit_price": 10,
        "actual_unit_price": 10,
        "price_source": "manual_price",
        "note": ""
      }
    ],
    "payment": {
      "discount_amount": 0,
      "paid_amount": 20,
      "payment_method": "cash",
      "note": "Smoke test"
    }
  }'::jsonb
);
```

Verify the created service:

```sql
select sr.id, v.license_plate, sr.final_total, sr.paid_amount, sr.remaining_amount, sr.payment_status
from public.service_records sr
join public.vehicles v on v.id = sr.vehicle_id
where v.license_plate = '90-TEST-001'
order by sr.created_at desc
limit 1;
```

## Save Service Rollback

Invalid injector count must fail and should not create partial rows:

```sql
select *
from public.save_service(
  '{
    "vehicle": {
      "license_plate": "90-BAD-001",
      "brand": "Mercedes",
      "phone": "+994501112233",
      "mileage": 250000,
      "problem_description": "Invalid smoke service",
      "is_problem_customer": false,
      "problem_reason": ""
    },
    "injector": {
      "count": 9,
      "company": "Bosch",
      "code": "BAD",
      "serial_info": "",
      "injector_model_id": null,
      "injectors": []
    },
    "line_items": [],
    "payment": {
      "discount_amount": 0,
      "paid_amount": 0,
      "payment_method": "cash",
      "note": ""
    }
  }'::jsonb
);
```

Then confirm no partial vehicle:

```sql
select *
from public.vehicles
where license_plate = '90-BAD-001';
```

## Service Detail and Payments

Use a real service ID:

```sql
select public.get_service_detail('00000000-0000-0000-0000-000000000000');
select * from public.list_payments('all', 50);
select public.get_income_summary('month');
```

For a service with remaining debt:

```sql
select public.record_service_payment(
  '00000000-0000-0000-0000-000000000000',
  10,
  'cash',
  'Smoke partial payment'
);

select public.mark_service_paid(
  '00000000-0000-0000-0000-000000000000',
  'cash'
);
```

Verify the service record and audit rows changed:

```sql
select paid_amount, remaining_amount, payment_status, payment_method
from public.service_records
where id = '00000000-0000-0000-0000-000000000000';

select action_type, table_name, record_id, created_at
from public.audit_logs
order by created_at desc
limit 20;
```

## Reports and Exports

```sql
select public.get_report_summary('income', 'month');
select public.get_report_summary('vehicles', 'month');
select public.get_report_summary('injectors', 'month');
select public.get_report_summary('payments', 'month');
select public.get_report_summary('services', 'month');
select public.get_report_summary('parts', 'month');
select public.get_report_summary('price_changes', 'month');
select public.get_report_summary('debts', 'month');
select public.get_report_summary('problem_vehicles', 'month');

select public.export_dataset('vehicles');
select public.export_dataset('services');
select public.export_dataset('service_injectors');
select public.export_dataset('payments');
select public.export_dataset('price_catalog');
select public.export_dataset('service_line_items');
select public.export_dataset('devices');
```

Invalid keys should fail:

```sql
select public.get_report_summary('invalid', 'month');
select public.export_dataset('invalid');
```

## Device Management

List devices by filter:

```sql
select * from public.list_allowed_devices('active');
select * from public.list_allowed_devices('pending');
select * from public.list_allowed_devices('deactivated');
select * from public.list_allowed_devices('deleted');
select * from public.list_allowed_devices('all');
```

Use a real `allowed_devices.id`:

```sql
select public.update_device_details(
  '00000000-0000-0000-0000-000000000000',
  'Test cihaz',
  'Smoke test note'
);

select public.activate_device(
  '00000000-0000-0000-0000-000000000000',
  'Smoke activate'
);

select public.deactivate_device(
  '00000000-0000-0000-0000-000000000000',
  'Smoke deactivate'
);

select public.soft_delete_device(
  '00000000-0000-0000-0000-000000000000'
);
```

Verify no hard delete occurred and audit rows were written:

```sql
select id, device_id, status, is_active, is_deleted, deleted_at
from public.allowed_devices
where id = '00000000-0000-0000-0000-000000000000';

select action_type, table_name, record_id, created_at
from public.audit_logs
where table_name = 'allowed_devices'
order by created_at desc
limit 20;
```

## Soft Delete Workflows

Use real IDs from a test service. Payment delete recalculates the parent service:

```sql
select public.soft_delete_payment('00000000-0000-0000-0000-000000000000');

select paid_amount, remaining_amount, payment_status, payment_method
from public.service_records
where id = '00000000-0000-0000-0000-000000000000';

select id, is_deleted, deleted_at
from public.payments
where id = '00000000-0000-0000-0000-000000000000';
```

Service delete hides the service and soft-deletes related payments:

```sql
select public.soft_delete_service('00000000-0000-0000-0000-000000000000');

select id, is_deleted, deleted_at
from public.service_records
where id = '00000000-0000-0000-0000-000000000000';

select id, is_deleted, deleted_at
from public.payments
where service_id = '00000000-0000-0000-0000-000000000000';
```

Vehicle delete hides the vehicle and soft-deletes its services/payments:

```sql
select public.soft_delete_vehicle('00000000-0000-0000-0000-000000000000');

select id, is_deleted, deleted_at
from public.vehicles
where id = '00000000-0000-0000-0000-000000000000';

select id, is_deleted, deleted_at
from public.service_records
where vehicle_id = '00000000-0000-0000-0000-000000000000';

select id, is_deleted, deleted_at
from public.payments
where vehicle_id = '00000000-0000-0000-0000-000000000000';
```

Verify audit rows:

```sql
select action_type, table_name, record_id, created_at
from public.audit_logs
where action_type in ('payment_delete', 'payment_change', 'service_delete', 'vehicle_delete')
order by created_at desc
limit 30;
```
