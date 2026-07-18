-- Initial catalog data only. No vehicles, services, payments, or devices.

insert into public.price_items (name, type, sort_order)
select name, type, sort_order
from (
  values
    ('Sökülmə', 'labor', 10),
    ('Ultrasəs təmizləmə', 'labor', 20),
    ('Kalibrləmə', 'labor', 30),
    ('Test', 'labor', 40),
    ('Kodlama', 'labor', 50),
    ('Nozzle', 'part', 10),
    ('Klapan', 'part', 20),
    ('Şayba', 'part', 30),
    ('Filter', 'part', 40),
    ('Elektrik hissəsi', 'part', 50),
    ('Digər', 'part', 60),
    ('Diagnostika', 'extra', 10),
    ('Ümumi yoxlama', 'extra', 20),
    ('Təcili xidmət', 'extra', 30)
) as seed_items(name, type, sort_order)
where not exists (
  select 1
  from public.price_items pi
  where pi.name = seed_items.name
    and pi.type = seed_items.type
);

insert into public.price_item_options (price_item_id, option_name, sort_order)
select pi.id, seed_options.option_name, seed_options.sort_order
from (
  values
    ('Nozzle', 'İşlənmiş nozzle', 10),
    ('Nozzle', 'Çin nozzle', 20),
    ('Nozzle', 'Original nozzle', 30),
    ('Nozzle', 'Müştərinin öz nozzle-i', 40),
    ('Klapan', 'Çin klapan', 10),
    ('Klapan', 'Original klapan', 20),
    ('Klapan', 'İşlənmiş klapan', 30),
    ('Şayba', 'Mis şayba', 10),
    ('Şayba', 'Original şayba', 20),
    ('Şayba', 'Adi şayba', 30)
) as seed_options(item_name, option_name, sort_order)
join public.price_items pi
  on pi.name = seed_options.item_name
 and pi.type = 'part'
where not exists (
  select 1
  from public.price_item_options pio
  where pio.price_item_id = pi.id
    and pio.option_name = seed_options.option_name
);
