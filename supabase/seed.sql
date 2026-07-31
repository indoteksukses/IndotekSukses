insert into public.products (sku,barcode,name,category_id,unit,cost_price,selling_price,minimum_stock,is_active)
select v.sku,v.barcode,v.name,c.id,'pcs',v.cost,v.price,v.minimum,true
from (values
 ('MSE-LOG-001','899100000001','Mouse Wireless Logitech','Aksesori Komputer',65000,85000,5),
 ('HDMI-002','899100000002','Kabel HDMI 2 Meter','Kabel',32000,50000,8),
 ('KEY-USB-001','899100000003','Keyboard USB Mechanical Lite','Aksesori Komputer',95000,135000,5),
 ('ADP-65W-001','899100000004','Adaptor Laptop Universal 65W','Power',110000,155000,4),
 ('LAN-CAT6-5M','899100000005','Kabel LAN Cat6 5 Meter','Jaringan',27000,45000,6),
 ('HUB-USB3-004','899100000006','USB Hub 3.0 4 Port','Aksesori Komputer',75000,105000,5)
) as v(sku,barcode,name,category,cost,price,minimum)
join public.categories c on c.name=v.category
on conflict(sku) do nothing;

insert into public.store_inventory(store_id,product_id,quantity_on_hand)
select s.id,p.id,case when s.code='IDS-01' then
 case p.sku when 'MSE-LOG-001' then 18 when 'HDMI-002' then 31 when 'KEY-USB-001' then 6 when 'ADP-65W-001' then 3 when 'LAN-CAT6-5M' then 22 else 10 end
else case p.sku when 'MSE-LOG-001' then 9 when 'HDMI-002' then 12 when 'KEY-USB-001' then 14 when 'ADP-65W-001' then 7 when 'LAN-CAT6-5M' then 19 else 4 end end
from public.stores s cross join public.products p
on conflict(store_id,product_id) do update set quantity_on_hand=excluded.quantity_on_hand;
