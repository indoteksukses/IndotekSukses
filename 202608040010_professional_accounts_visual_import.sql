-- Indotek Sukses v2.5.0
-- Username login, safe employee deletion, visual source consistency,
-- and reliable product category/brand imports.

begin;

-- ------------------------------------------------------------------
-- Employee account metadata
-- ------------------------------------------------------------------
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists deleted_at timestamptz;
alter table public.profiles add column if not exists deleted_by uuid;

-- Generate stable usernames for existing accounts.
do $$
declare
  r record;
  v_base text;
  v_candidate text;
  v_suffix integer;
begin
  for r in
    select id,email,full_name
    from public.profiles
    where nullif(btrim(username),'') is null
    order by created_at,id
  loop
    v_base := lower(regexp_replace(coalesce(nullif(split_part(coalesce(r.email,''),'@',1),''),nullif(r.full_name,''),'user'),'[^a-zA-Z0-9._-]+','','g'));
    if length(v_base)<3 then v_base := 'user'; end if;
    v_base := left(v_base,24);
    v_candidate := v_base;
    v_suffix := 1;
    while exists(select 1 from public.profiles p where lower(p.username)=lower(v_candidate) and p.id<>r.id and p.deleted_at is null) loop
      v_suffix := v_suffix+1;
      v_candidate := left(v_base,24-length(v_suffix::text)-1)||'-'||v_suffix::text;
    end loop;
    update public.profiles set username=v_candidate where id=r.id;
  end loop;
end $$;

update public.profiles set username='user-'||left(replace(id::text,'-',''),8) where nullif(btrim(username),'') is null;
alter table public.profiles alter column username set not null;
create unique index if not exists profiles_username_active_unique on public.profiles(lower(username)) where deleted_at is null;
create index if not exists profiles_deleted_at_idx on public.profiles(deleted_at);

-- New Auth users receive a safe placeholder username; the admin/setup API
-- immediately replaces it with the requested username.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
declare
  v_base text;
  v_candidate text;
  v_suffix integer:=1;
begin
  v_base := lower(regexp_replace(coalesce(nullif(new.raw_user_meta_data->>'username',''),nullif(split_part(coalesce(new.email,''),'@',1),''),'user'),'[^a-zA-Z0-9._-]+','','g'));
  if length(v_base)<3 then v_base:='user'; end if;
  v_base:=left(v_base,24);
  v_candidate:=v_base;
  while exists(select 1 from public.profiles p where lower(p.username)=lower(v_candidate) and p.deleted_at is null) loop
    v_suffix:=v_suffix+1;
    v_candidate:=left(v_base,24-length(v_suffix::text)-1)||'-'||v_suffix::text;
  end loop;
  insert into public.profiles(id,full_name,email,username,role,primary_store_id,is_active)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),new.email,v_candidate,'cashier',null,true)
  on conflict(id) do nothing;
  return new;
end $$;

create or replace function public.current_user_role() returns public.user_role language sql stable security definer set search_path=public as $$
  select role from public.profiles where id=auth.uid() and is_active=true and deleted_at is null
$$;
create or replace function public.current_primary_store() returns uuid language sql stable security definer set search_path=public as $$
  select primary_store_id from public.profiles where id=auth.uid() and is_active=true and deleted_at is null
$$;

-- ------------------------------------------------------------------
-- Product metadata guarantees
-- ------------------------------------------------------------------
insert into public.categories(name,description,is_active) values
('Suku Cadang Mesin','Komponen pengganti mesin, kapasitor, saklar, angker, charger, dan bagian internal.',true),
('Alat Listrik & Pemanas','Alat listrik ringan, glue gun, heat gun, solder, dan alat pemanas.',true),
('Mesin Bor','Bor tangan, bor cordless, dan bor duduk.',true),
('Mesin Gerinda & Poles','Gerinda tangan, gerinda duduk, die grinder, mini grinder, dan mesin poles.',true),
('Mesin Potong & Gergaji','Circular saw, jig saw, dan mesin potong.',true),
('Mesin Kayu','Planner, router, trimmer, dan mesin pengolah kayu.',true),
('Mesin Las','Mesin las dan peralatan pengelasan utama.',true),
('Kompresor & Pneumatik','Kompresor, spray gun, staples angin, dan alat pneumatik.',true),
('Pompa & Pembersih','Pompa air, jet cleaner, alat semprot, dan washing gun.',true),
('Alat Ukur','Multitester dan alat ukur listrik.',true),
('Mesin Serbaguna','Mesin blower, grafir, pengolahan makanan, dan mesin serbaguna.',true),
('Timbangan','Timbangan digital dan analog.',true),
('Peralatan Teknik Lainnya','Produk teknik yang belum masuk kategori khusus.',true)
on conflict(name) do update set description=excluded.description,is_active=true;

-- Repair the 146 products imported from MESIN & ALAT LISTRIK by exact SKU.
with mapping as (
  select * from jsonb_to_recordset($catalog$[{"sku":"SCD-BUL-001","category_name":"Suku Cadang Mesin","brand":"Bulltrax","name":"Adaptor Charger Bor Impact 20/21 Volt - 21-750 Sellery"},{"sku":"LIS-GEN-001","category_name":"Alat Listrik & Pemanas","brand":"Sellery","name":"Alat Grafir - 21-750 Sellery"},{"sku":"SCD-MOD-001","category_name":"Suku Cadang Mesin","brand":"Modern","name":"Angker Circular Saw - MOD 2600"},{"sku":"SCD-MOD-002","category_name":"Suku Cadang Mesin","brand":"Modern","name":"Angker Gerinda - M2350"},{"sku":"SCD-DCA-001","category_name":"Suku Cadang Mesin","brand":"DCA","name":"Angker Gerinda - DCA MT90"},{"sku":"SCD-MOD-003","category_name":"Suku Cadang Mesin","brand":"Modern","name":"Angker Gerinda - MOD 2300, Sim 100"},{"sku":"SCD-DCA-002","category_name":"Suku Cadang Mesin","brand":"DCA","name":"Angker Gerinda - DCA 9553 (msn Makita)"},{"sku":"SCD-MOD-004","category_name":"Suku Cadang Mesin","brand":"Modern","name":"Angker Gerinda - 2350B MOD"},{"sku":"SCD-MOD-005","category_name":"Suku Cadang Mesin","brand":"Modern","name":"Angker Gerinda - 2100B/JIZ100B MOD"},{"sku":"SCD-GEN-001","category_name":"Suku Cadang Mesin","brand":"DCA","name":"Angker Gerinda - N1900 DCA"},{"sku":"SCD-MOD-006","category_name":"Suku Cadang Mesin","brand":"Modern","name":"Angker Planner - M2900 450 Watt (Blue)"},{"sku":"SCD-MOD-007","category_name":"Suku Cadang Mesin","brand":"Modern","name":"Angker Planner - M2920 (Red)"},{"sku":"SCD-GMT-001","category_name":"Suku Cadang Mesin","brand":"GMT","name":"Angker Planner - GMT G0900"},{"sku":"SCD-DCA-003","category_name":"Suku Cadang Mesin","brand":"DCA","name":"Angker Planner - DCA 1900B"},{"sku":"SCD-MOD-008","category_name":"Suku Cadang Mesin","brand":"Modern","name":"Angker Trimmer - MOD 2700"},{"sku":"SCD-MOD-009","category_name":"Suku Cadang Mesin","brand":"Modern","name":"Baterai Charger - 20 Volt"},{"sku":"LIS-GEN-002","category_name":"Alat Listrik & Pemanas","brand":"Sellery","name":"Electric Engraver - 230 Sellery"},{"sku":"LIS-PRO-001","category_name":"Alat Listrik & Pemanas","brand":"Prohex","name":"Glue Gun Besar - 40 Watt 10 mm"},{"sku":"LIS-TEK-001","category_name":"Alat Listrik & Pemanas","brand":"Tekiro","name":"Glue Gun Besar - 40 Watt 10 mm"},{"sku":"LIS-PRO-002","category_name":"Alat Listrik & Pemanas","brand":"Prohex","name":"Glue Gun Mini - 40 Watt 7 mm"},{"sku":"LIS-TOH-001","category_name":"Alat Listrik & Pemanas","brand":"Toho","name":"Glue Gun Mini - 40 Watt 7 mm"},{"sku":"LIS-MIT-001","category_name":"Alat Listrik & Pemanas","brand":"Mitsushi","name":"Glue Gun Mini - 40 Watt 7 mm"},{"sku":"LIS-GSD-001","category_name":"Alat Listrik & Pemanas","brand":"GSD-SWI","name":"Glue Gun Mini - 20 Watt 7 mm"},{"sku":"LIS-MOL-001","category_name":"Alat Listrik & Pemanas","brand":"Mollar","name":"Glue Gun Besar - 80 Watt 10 mm"},{"sku":"LIS-XEN-001","category_name":"Alat Listrik & Pemanas","brand":"Xenon","name":"Glue Gun Besar - 80 Watt 10 mm"},{"sku":"LIS-SUN-001","category_name":"Alat Listrik & Pemanas","brand":"Sun Shine","name":"Glue Gun Besar - 80 Watt 10 mm"},{"sku":"LIS-XEN-002","category_name":"Alat Listrik & Pemanas","brand":"Xenon","name":"Hot Air Gun Orange - X-HG 802_ 600/800 strip Black"},{"sku":"LIS-MOL-002","category_name":"Alat Listrik & Pemanas","brand":"Mollar","name":"Hot Wire Foam Cutter - HW001 3in1"},{"sku":"SCD-ESE-001","category_name":"Suku Cadang Mesin","brand":"ESE","name":"Kapasitor Tabung - 6 Farrad"},{"sku":"SCD-BUL-002","category_name":"Suku Cadang Mesin","brand":"Bulltrax","name":"Kapasitor Tabung - 8 Farrad"},{"sku":"SCD-ESE-002","category_name":"Suku Cadang Mesin","brand":"ESE","name":"Kapasitor Tabung - 10 Farrad"},{"sku":"SCD-ESE-003","category_name":"Suku Cadang Mesin","brand":"ESE","name":"Kapasitor Tabung - 12,5 Farrad"},{"sku":"SCD-BUL-003","category_name":"Suku Cadang Mesin","brand":"Bulltrax","name":"Kapasitor Kotak - 8 Farrad"},{"sku":"SCD-BUL-004","category_name":"Suku Cadang Mesin","brand":"Bulltrax","name":"Kapasitor Kotak - 10 Farrad"},{"sku":"SCD-BUL-005","category_name":"Suku Cadang Mesin","brand":"Bulltrax","name":"Kapasitor Kotak - 12,5 Farrad"},{"sku":"SCD-GEN-002","category_name":"Suku Cadang Mesin","brand":"Tanpa Merek","name":"Kapasitor Kotak Black - 4 Farrad"},{"sku":"SCD-GEN-003","category_name":"Suku Cadang Mesin","brand":"Tanpa Merek","name":"Kapasitor Kotak Black - 5 Farrad"},{"sku":"SCD-GEN-004","category_name":"Suku Cadang Mesin","brand":"Tanpa Merek","name":"Kapasitor Kotak Black - 6 Farrad"},{"sku":"SCD-GEN-005","category_name":"Suku Cadang Mesin","brand":"Tanpa Merek","name":"Kapasitor Kotak Black - 8 Farrad"},{"sku":"SCD-GEN-006","category_name":"Suku Cadang Mesin","brand":"Tanpa Merek","name":"Kapasitor Kotak Black - 10 Farrad"},{"sku":"GRD-BEN-001","category_name":"Mesin Gerinda & Poles","brand":"Benz","name":"Mesin Air Die Grinder - 6 mm BZ5805"},{"sku":"SRB-GEN-001","category_name":"Mesin Serbaguna","brand":"Mollar","name":"Mesin Blower - BL 500 MLR 500Watt"},{"sku":"BOR-GEN-001","category_name":"Mesin Bor","brand":"Tokyo","name":"Mesin Bor Cordless - 12 Volt Tokyo"},{"sku":"BOR-AST-001","category_name":"Mesin Bor","brand":"AST","name":"Mesin Bor Cordless - 12 Volt AST"},{"sku":"BOR-GEN-002","category_name":"Mesin Bor","brand":"Boky","name":"Mesin Bor Cordless - 12 Volt Boky"},{"sku":"BOR-BUL-001","category_name":"Mesin Bor","brand":"Bulltrax","name":"Mesin Bor Cordless - 20 Volt Bull"},{"sku":"BOR-AST-002","category_name":"Mesin Bor","brand":"AST","name":"Mesin Bor Cordless - 20 Volt AST"},{"sku":"BOR-GEN-003","category_name":"Mesin Bor","brand":"Tanpa Merek","name":"Mesin Bor Cordless - BL20V Li-Ion Ø 10mm"},{"sku":"BOR-BUL-002","category_name":"Mesin Bor","brand":"Bull","name":"Mesin Bor Cordless - WR BL127 (Impact)"},{"sku":"BOR-GEN-004","category_name":"Mesin Bor","brand":"Westlake","name":"Mesin Bor Cordless - Ø13mm Weastlaske"},{"sku":"BOR-MOL-001","category_name":"Mesin Bor","brand":"Mollar","name":"Mesin Bor Duduk - Ø13mm"},{"sku":"BOR-WES-001","category_name":"Mesin Bor","brand":"Westlake","name":"Mesin Bor Duduk - Ø13mm"},{"sku":"BOR-MOD-001","category_name":"Mesin Bor","brand":"Modern","name":"Mesin Bor Tangan - Ø10mm M2100C 350W"},{"sku":"BOR-MAK-001","category_name":"Mesin Bor","brand":"Makita","name":"Mesin Bor Tangan - Ø10mm M0600B 400 W"},{"sku":"BOR-MOL-002","category_name":"Mesin Bor","brand":"Mollar","name":"Mesin Bor Tangan - Ø10mm ED430MLR 350W"},{"sku":"BOR-MOD-002","category_name":"Mesin Bor","brand":"Modern","name":"Mesin Bor Tangan - Ø13mm M2122 MOD"},{"sku":"BOR-MOD-003","category_name":"Mesin Bor","brand":"Modern","name":"Mesin Bor Tangan - Ø13mm M2150 MOD"},{"sku":"BOR-MOD-004","category_name":"Mesin Bor","brand":"Modern","name":"Mesin Bor Tangan - Ø13mm JIZ 10B 300W"},{"sku":"BOR-MOL-003","category_name":"Mesin Bor","brand":"Mollar","name":"Mesin Bor Tangan - Ø13mm ID500MLR 500W"},{"sku":"BOR-MOD-005","category_name":"Mesin Bor","brand":"Modern Impack","name":"Mesin Bor Tangan - Ø16mm JIZ 13 MOD"},{"sku":"POT-BUL-001","category_name":"Mesin Potong & Gergaji","brand":"Bull","name":"Mesin Circular Saw - BL 4800 900W (Red)"},{"sku":"POT-MOD-001","category_name":"Mesin Potong & Gergaji","brand":"Modern","name":"Mesin Circular Saw - M2600L MOD 700W"},{"sku":"GRD-MOL-001","category_name":"Mesin Gerinda & Poles","brand":"Mollar","name":"Mesin Gerinda Duduk - 5\" BG125"},{"sku":"GRD-MOD-001","category_name":"Mesin Gerinda & Poles","brand":"Modern","name":"Mesin Gerinda Tangan - SIM 100B MOD"},{"sku":"GRD-MOD-002","category_name":"Mesin Gerinda & Poles","brand":"Modern","name":"Mesin Gerinda Tangan - M 2300B MOD 540W"},{"sku":"GRD-MOD-003","category_name":"Mesin Gerinda & Poles","brand":"Modern","name":"Mesin Gerinda Tangan - M 2350B MOD 570W"},{"sku":"GRD-MOL-002","category_name":"Mesin Gerinda & Poles","brand":"Mollar","name":"Mesin Gerinda Tangan - AG 7600 MLR 570W"},{"sku":"GRD-BOS-001","category_name":"Mesin Gerinda & Poles","brand":"Bosch","name":"Mesin Gerinda Tangan - GWS 700"},{"sku":"GRD-HIT-001","category_name":"Mesin Gerinda & Poles","brand":"Hitachi","name":"Mesin Gerinda Tangan - G10SS2"},{"sku":"GRD-INO-001","category_name":"Mesin Gerinda & Poles","brand":"Inotec","name":"Mesin Gerinda Tangan - IT954"},{"sku":"GRD-MAK-001","category_name":"Mesin Gerinda & Poles","brand":"Makita","name":"Mesin Gerinda Tangan - M0910B"},{"sku":"SRB-GEN-002","category_name":"Mesin Serbaguna","brand":"Nagako","name":"Mesin Giling Daging - No. 2 Nagako"},{"sku":"SRB-GEN-003","category_name":"Mesin Serbaguna","brand":"Nagako","name":"Mesin Giling Daging - No. 2 Nagako Star"},{"sku":"SRB-NAN-001","category_name":"Mesin Serbaguna","brand":"Nankai","name":"Mesin Grafir - Nankai"},{"sku":"SRB-SEL-001","category_name":"Mesin Serbaguna","brand":"Sellery","name":"Mesin Grafir - 21-750"},{"sku":"POM-LAG-001","category_name":"Pompa & Pembersih","brand":"LAGUNA","name":"Mesin Jet Cleaner - 100 Bar Laguna 70 550W"},{"sku":"POM-BUL-001","category_name":"Pompa & Pembersih","brand":"Bull","name":"Mesin Semprot Hama - 18 ltr"},{"sku":"POT-MOD-002","category_name":"Mesin Potong & Gergaji","brand":"Modern","name":"Mesin Jig Saw - M2200 MOD 320 W"},{"sku":"POT-MOD-003","category_name":"Mesin Potong & Gergaji","brand":"Modern","name":"Mesin Jig Saw - M2200 MOD 450W"},{"sku":"POT-GRE-001","category_name":"Mesin Potong & Gergaji","brand":"Modern","name":"Mesin Jig Saw - M2200 Laser 600W"},{"sku":"PNE-LAK-001","category_name":"Kompresor & Pneumatik","brand":"Lakoni","name":"Mesin Kompresor - 3/4HP Fresco110X LAKONI"},{"sku":"PNE-MUL-001","category_name":"Kompresor & Pneumatik","brand":"Multipro","name":"Mesin Kompresor - 3/4HP Multipro"},{"sku":"PNE-MUL-002","category_name":"Kompresor & Pneumatik","brand":"Multipro","name":"Mesin Kompresor - 1 HP Multipro"},{"sku":"PNE-MUL-003","category_name":"Kompresor & Pneumatik","brand":"Multipro","name":"Mesin Kompresor - OL-075 Multipro"},{"sku":"LAS-DAI-001","category_name":"Mesin Las","brand":"Daiden","name":"Mesin Las 900 w - MMA120"},{"sku":"LAS-LAK-001","category_name":"Mesin Las","brand":"Lakoni","name":"Mesin Las 900 w - 120E FALKON LAKONI"},{"sku":"LAS-LAK-002","category_name":"Mesin Las","brand":"Lakoni","name":"Mesin Las 450 w - 123ix450 BASIC LAKONI"},{"sku":"GRD-MOL-003","category_name":"Mesin Gerinda & Poles","brand":"Mollar","name":"Mesin Mini Grinder - MG005F"},{"sku":"SRB-GEN-004","category_name":"Mesin Serbaguna","brand":"Tanpa Merek","name":"Mesin Parut Kelapa"},{"sku":"KYU-GEN-001","category_name":"Mesin Kayu","brand":"Modern","name":"Mesin Planner - M2900 MOD 450W (Blue)"},{"sku":"KYU-GEN-002","category_name":"Mesin Kayu","brand":"Modern","name":"Mesin Planner - M2920 MOD (Red)"},{"sku":"KYU-GEN-003","category_name":"Mesin Kayu","brand":"Tanpa Merek","name":"Mesin Planner - MT80 450W"},{"sku":"KYU-GEN-004","category_name":"Mesin Kayu","brand":"Tanpa Merek","name":"Mesin Planner - BL0900 500W"},{"sku":"KYU-GEN-005","category_name":"Mesin Kayu","brand":"Inotec","name":"Mesin Planner - Inotec"},{"sku":"GRD-MOD-004","category_name":"Mesin Gerinda & Poles","brand":"Modern","name":"Mesin Poles - M2500B MOD (kotak pjg)"},{"sku":"GRD-MOD-005","category_name":"Mesin Gerinda & Poles","brand":"Modern","name":"Mesin Poles - M2540 MOD (Kotak)"},{"sku":"GRD-NRT-001","category_name":"Mesin Gerinda & Poles","brand":"NRT Pro","name":"Mesin Poles - 920 HD (Kotak)"},{"sku":"GRD-NRT-002","category_name":"Mesin Gerinda & Poles","brand":"NRT Pro","name":"Mesin Poles - 5\"GV5000HD (Bulat)"},{"sku":"GRD-BEN-002","category_name":"Mesin Gerinda & Poles","brand":"Benz","name":"Mesin Poles - 5\" BZ-8215 (Bulat)"},{"sku":"GRD-MOD-006","category_name":"Mesin Gerinda & Poles","brand":"Modern","name":"Mesin Poles - 5\" (Bulat) M3210"},{"sku":"GRD-NRT-003","category_name":"Mesin Gerinda & Poles","brand":"NRT Pro","name":"Mesin Poles - 7\" (Bulat)"},{"sku":"GRD-KEN-001","category_name":"Mesin Gerinda & Poles","brand":"Kenmaster","name":"Mesin Poles - 7\" Q1P-GW08-240(Bulat)"},{"sku":"POM-BEA-001","category_name":"Pompa & Pembersih","brand":"Beaufort","name":"Mesin Pompa Air - 220 W"},{"sku":"POM-NAS-001","category_name":"Pompa & Pembersih","brand":"Nasional Decker","name":"Mesin Pompa Air - 125 W GP 129"},{"sku":"KYU-GEN-006","category_name":"Mesin Kayu","brand":"Modern","name":"Mesin Router - M2850 MOD (Besar)"},{"sku":"KYU-GEN-007","category_name":"Mesin Kayu","brand":"Tanpa Merek","name":"Mesin Router - (Kecil)"},{"sku":"PNE-MOL-001","category_name":"Kompresor & Pneumatik","brand":"Mollar","name":"Mesin Spray gun Electric - ESG 350W MLR"},{"sku":"PNE-TEK-001","category_name":"Kompresor & Pneumatik","brand":"Tekiro","name":"Mesin Staples Angin - A1022 J (Isi U)"},{"sku":"PNE-TEK-002","category_name":"Kompresor & Pneumatik","brand":"Tekiro","name":"Mesin Staples Angin - A1022 F30 (Isi I)"},{"sku":"PNE-GEN-001","category_name":"Kompresor & Pneumatik","brand":"Tanpa Merek","name":"Mesin Staples Angin - A1022 J (Isi U)"},{"sku":"PNE-HNL-001","category_name":"Kompresor & Pneumatik","brand":"HNL","name":"Mesin Staples Angin - A1022 F30 (Isi I)"},{"sku":"PNE-MOL-002","category_name":"Kompresor & Pneumatik","brand":"Mollar","name":"Mesin Staples Angin - A1022 F30 (Isi I)"},{"sku":"KYU-MOD-001","category_name":"Mesin Kayu","brand":"Modern","name":"Mesin Trimmer - M2700 MOD"},{"sku":"KYU-BUL-001","category_name":"Mesin Kayu","brand":"Bull","name":"Mesin Trimmer - BL2701"},{"sku":"POM-SHI-001","category_name":"Pompa & Pembersih","brand":"Shimizu","name":"Mesin Pompa Air - PS 128"},{"sku":"LAS-MOL-001","category_name":"Mesin Las","brand":"Mollar","name":"Mesin Welding Gun - NG 400"},{"sku":"POM-WIP-001","category_name":"Pompa & Pembersih","brand":"Wipro","name":"Mesin Washing Gun"},{"sku":"UKR-GEN-001","category_name":"Alat Ukur","brand":"Tanpa Merek","name":"Multi Tester Analog - YX 360 TRD"},{"sku":"UKR-GEN-002","category_name":"Alat Ukur","brand":"Tanpa Merek","name":"Multi Tester Digital"},{"sku":"SCD-MOL-001","category_name":"Suku Cadang Mesin","brand":"Mollar","name":"Otomatis kompresor (4 Lubang)"},{"sku":"SCD-GEN-007","category_name":"Suku Cadang Mesin","brand":"Tanpa Merek","name":"Radar Pompa Air - 1/4\" (electrik)"},{"sku":"SCD-GEN-008","category_name":"Suku Cadang Mesin","brand":"Tanpa Merek","name":"Radar Pompa Air - 3/8\" (electrik)"},{"sku":"SCD-RHI-001","category_name":"Suku Cadang Mesin","brand":"RHINO","name":"Saklar mesin las - MMA 120 / 160, 6 kaki"},{"sku":"SCD-MOD-010","category_name":"Suku Cadang Mesin","brand":"Modern","name":"Saklar Power Bor - 13 mm M-2150"},{"sku":"SCD-BUL-006","category_name":"Suku Cadang Mesin","brand":"Bull","name":"Saklar Power Bor - 10 mm M-2100C"},{"sku":"SCD-BUL-007","category_name":"Suku Cadang Mesin","brand":"Bull","name":"Saklar Power Gerinda - BL 8954"},{"sku":"SCD-RIN-001","category_name":"Suku Cadang Mesin","brand":"Rino","name":"Saklar Power Las - 900 / 1300 Watt"},{"sku":"SCD-BUL-008","category_name":"Suku Cadang Mesin","brand":"Bull","name":"Saklar Power Planner - 1900 B"},{"sku":"SCD-OSS-001","category_name":"Suku Cadang Mesin","brand":"OSSEL","name":"Saklar Power Planner - 1900 B"},{"sku":"SCD-MOD-011","category_name":"Suku Cadang Mesin","brand":"Modern","name":"Saklar Power Trimmer - 2700MOD"},{"sku":"SCD-GEN-009","category_name":"Suku Cadang Mesin","brand":"Tanpa Merek","name":"Saklar Togel - On/Off"},{"sku":"LIS-KEN-001","category_name":"Alat Listrik & Pemanas","brand":"Kenmaster","name":"Solder - 40 Watt"},{"sku":"LIS-DEK-001","category_name":"Alat Listrik & Pemanas","brand":"Deko","name":"Solder - 40 Watt"},{"sku":"LIS-SHE-001","category_name":"Alat Listrik & Pemanas","brand":"SHENGWEI","name":"Solder - 40 Watt"},{"sku":"LIS-NSA-001","category_name":"Alat Listrik & Pemanas","brand":"NSA","name":"Solder - 40 Watt"},{"sku":"LIS-DEK-002","category_name":"Alat Listrik & Pemanas","brand":"Deko","name":"Solder - 60 Watt"},{"sku":"LIS-SHE-002","category_name":"Alat Listrik & Pemanas","brand":"SHENGWEI","name":"Solder - 60 Watt"},{"sku":"LIS-DEK-003","category_name":"Alat Listrik & Pemanas","brand":"Deko","name":"Solder - 25-80 Watt"},{"sku":"LIS-DEK-004","category_name":"Alat Listrik & Pemanas","brand":"Deko","name":"Solder - 100 Watt"},{"sku":"LIS-GEN-003","category_name":"Alat Listrik & Pemanas","brand":"Tanpa Merek","name":"Solder - 100 Watt"},{"sku":"SCD-GEN-010","category_name":"Suku Cadang Mesin","brand":"Modern","name":"Stator Trimmer - Modern 2700"},{"sku":"TMB-DUC-001","category_name":"Timbangan","brand":"Ducar","name":"Timbangan Digital - 40 Kg"},{"sku":"TMB-GEN-001","category_name":"Timbangan","brand":"Tanpa Merek","name":"Timbangan Digital - 5 Kg"},{"sku":"TMB-GEN-002","category_name":"Timbangan","brand":"Tanpa Merek","name":"Timbangan Digital - GTG 35060-1"},{"sku":"TMB-GEN-003","category_name":"Timbangan","brand":"Tanpa Merek","name":"Timbangan Analog - 10 Kg VC020"},{"sku":"TMB-GEN-004","category_name":"Timbangan","brand":"Tanpa Merek","name":"Timbangan Analog - 15 Kg GAT"}]$catalog$::jsonb)
  as x(sku text,category_name text,brand text,name text)
), resolved as (
  select m.sku,m.brand,c.id category_id
  from mapping m
  join lateral (
    select id from public.categories
    where lower(btrim(name))=lower(btrim(m.category_name))
    order by created_at,id limit 1
  ) c on true
)
update public.products p
set category_id=r.category_id,
    brand=coalesce(nullif(btrim(r.brand),''),'Tanpa Merek'),
    updated_at=now()
from resolved r
where upper(btrim(p.sku))=upper(btrim(r.sku));

-- Deterministic fallback for any other existing products.
update public.products p
set category_id=(
  select id from public.categories
  where name=case split_part(upper(p.sku),'-',1)
    when 'SCD' then 'Suku Cadang Mesin'
    when 'LIS' then 'Alat Listrik & Pemanas'
    when 'BOR' then 'Mesin Bor'
    when 'GRD' then 'Mesin Gerinda & Poles'
    when 'POT' then 'Mesin Potong & Gergaji'
    when 'KYU' then 'Mesin Kayu'
    when 'LAS' then 'Mesin Las'
    when 'PNE' then 'Kompresor & Pneumatik'
    when 'POM' then 'Pompa & Pembersih'
    when 'UKR' then 'Alat Ukur'
    when 'SRB' then 'Mesin Serbaguna'
    when 'TMB' then 'Timbangan'
    else 'Peralatan Teknik Lainnya' end
  order by created_at,id limit 1
)
where p.category_id is null;

update public.products set brand='Tanpa Merek' where nullif(btrim(brand),'') is null;
alter table public.products alter column brand set default 'Tanpa Merek';
alter table public.products alter column brand set not null;
alter table public.products alter column category_id set not null;

-- SQL-import helper. Call this function with JSON rows containing
-- sku, name, category, brand, prices, unit, minimum_stock and optional visual_name.
create or replace function public.import_product_catalog(p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_row jsonb;
  v_sku text;
  v_name text;
  v_category_name text;
  v_brand text;
  v_category_id uuid;
  v_visual_id uuid;
  v_product_id uuid;
  v_count integer:=0;
begin
  if coalesce(jsonb_typeof(p_rows),'')<>'array' or jsonb_array_length(p_rows)=0 then
    raise exception 'Data import harus berupa array JSON dan tidak boleh kosong';
  end if;

  for v_row in select value from jsonb_array_elements(p_rows) loop
    v_sku:=upper(btrim(coalesce(v_row->>'sku','')));
    v_name:=btrim(coalesce(v_row->>'name',''));
    v_category_name:=btrim(coalesce(v_row->>'category',''));
    v_brand:=coalesce(nullif(btrim(v_row->>'brand'),''),'Tanpa Merek');
    if v_sku='' or v_name='' or v_category_name='' then
      raise exception 'Setiap produk wajib memiliki sku, name, dan category. Data: %',v_row;
    end if;

    select id into v_category_id from public.categories
    where lower(btrim(name))=lower(v_category_name)
    order by created_at,id limit 1;
    if v_category_id is null then
      insert into public.categories(name,description,is_active)
      values(v_category_name,'Dibuat otomatis melalui import SQL',true)
      returning id into v_category_id;
    end if;

    v_visual_id:=null;
    if nullif(btrim(v_row->>'visual_name'),'') is not null then
      select id into v_visual_id from public.product_visuals
      where lower(btrim(name))=lower(btrim(v_row->>'visual_name')) and is_active=true
      order by is_builtin desc,updated_at desc limit 1;
    end if;
    if v_visual_id is null then
      select id into v_visual_id from public.product_visuals
      where name=case
        when lower(v_name) like '%bor%' then 'Bor Tangan'
        when lower(v_name) like '%gerinda%' or lower(v_name) like '%grinder%' or lower(v_name) like '%poles%' then 'Gerinda'
        when lower(v_name) like '%gergaji%' or lower(v_name) like '%circular%' or lower(v_name) like '%jig saw%' then 'Gergaji'
        when lower(v_name) like '%meter%' then 'Meteran'
        else 'Perkakas Umum' end
      and is_active=true order by is_builtin desc limit 1;
    end if;

    insert into public.products(
      sku,barcode,name,category_id,brand,unit,description,cost_price,selling_price,
      minimum_stock,image_url,visual_id,is_active,sales_scope,updated_at
    ) values(
      v_sku,nullif(btrim(v_row->>'barcode'),''),v_name,v_category_id,v_brand,
      coalesce(nullif(btrim(v_row->>'unit'),''),'pcs'),nullif(btrim(v_row->>'description'),''),
      greatest(coalesce(nullif(btrim(v_row->>'cost_price'),'')::numeric,0),0),
      greatest(coalesce(nullif(btrim(v_row->>'selling_price'),'')::numeric,0),0),
      greatest(coalesce(nullif(btrim(v_row->>'minimum_stock'),'')::numeric,0),0),
      nullif(btrim(v_row->>'image_url'),''),v_visual_id,
      case when nullif(btrim(v_row->>'is_active'),'') is null then true else (v_row->>'is_active')::boolean end,'all',now()
    )
    on conflict(sku) do update set
      barcode=excluded.barcode,name=excluded.name,category_id=excluded.category_id,
      brand=excluded.brand,unit=excluded.unit,description=excluded.description,
      cost_price=excluded.cost_price,selling_price=excluded.selling_price,
      minimum_stock=excluded.minimum_stock,image_url=excluded.image_url,
      visual_id=coalesce(excluded.visual_id,public.products.visual_id),
      is_active=excluded.is_active,updated_at=now()
    returning id into v_product_id;

    insert into public.store_inventory(store_id,product_id,quantity_on_hand,quantity_reserved)
    select id,v_product_id,0,0 from public.stores
    on conflict(store_id,product_id) do nothing;
    v_count:=v_count+1;
  end loop;

  return jsonb_build_object(
    'processed',v_count,
    'category_missing',(select count(*) from public.products where category_id is null),
    'brand_missing',(select count(*) from public.products where nullif(btrim(brand),'') is null)
  );
end $$;

revoke all on function public.import_product_catalog(jsonb) from public,anon,authenticated;
grant execute on function public.import_product_catalog(jsonb) to service_role;

notify pgrst,'reload schema';
commit;

-- Verification: both values must be 0.
select
  count(*) filter(where category_id is null) category_missing,
  count(*) filter(where nullif(btrim(brand),'') is null) brand_missing,
  count(*) total_products
from public.products;
