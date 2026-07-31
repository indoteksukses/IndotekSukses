-- Optional sample catalog. Run only after creating the first owner and at least one store.
insert into public.categories(name) values
  ('Aksesori Komputer'),('Kabel'),('Jaringan'),('Power'),('Lainnya')
on conflict(name) do nothing;

insert into public.products(sku,barcode,name,unit,cost_price,selling_price,minimum_stock,is_active)
values
  ('MSE-LOG-001','899100000001','Mouse Wireless Logitech','pcs',65000,85000,5,true),
  ('HDMI-002','899100000002','Kabel HDMI 2 Meter','pcs',32000,50000,8,true),
  ('KEY-USB-001','899100000003','Keyboard USB Mechanical Lite','pcs',95000,135000,5,true),
  ('ADP-65W-001','899100000004','Adaptor Laptop Universal 65W','pcs',110000,155000,4,true),
  ('LAN-CAT6-5M','899100000005','Kabel LAN Cat6 5 Meter','pcs',27000,45000,6,true),
  ('HUB-USB3-004','899100000006','USB Hub 3.0 4 Port','pcs',75000,105000,5,true)
on conflict(sku) do update set
  barcode=excluded.barcode,name=excluded.name,unit=excluded.unit,cost_price=excluded.cost_price,
  selling_price=excluded.selling_price,minimum_stock=excluded.minimum_stock,is_active=true;

-- Give each active store a sample opening balance. Adjust or remove this block for production data.
insert into public.store_inventory(store_id,product_id,quantity_on_hand)
select s.id,p.id,
  case p.sku
    when 'MSE-LOG-001' then 10
    when 'HDMI-002' then 15
    when 'KEY-USB-001' then 8
    when 'ADP-65W-001' then 5
    when 'LAN-CAT6-5M' then 12
    when 'HUB-USB3-004' then 7
    else 0
  end
from public.stores s cross join public.products p
where s.is_active and p.is_active
on conflict(store_id,product_id) do nothing;
