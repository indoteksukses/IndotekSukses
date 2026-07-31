-- Indotek Sukses v2.0.1
-- Repair owner profile, table privileges, and product RLS on an existing database.
-- Change the email below if your owner uses another email.

begin;

-- 1. Ensure the Authentication user has a matching active owner profile.
insert into public.profiles (
  id,
  full_name,
  email,
  role,
  primary_store_id,
  is_active,
  updated_at
)
select
  u.id,
  coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), 'Owner Indotek Sukses'),
  u.email,
  'owner'::public.user_role,
  (select id from public.stores where is_active = true order by created_at asc limit 1),
  true,
  now()
from auth.users u
where lower(u.email) = lower('admin@indoteksukses.id')
on conflict (id) do update
set
  full_name = case
    when nullif(public.profiles.full_name, '') is null then excluded.full_name
    else public.profiles.full_name
  end,
  email = excluded.email,
  role = 'owner'::public.user_role,
  primary_store_id = coalesce(
    public.profiles.primary_store_id,
    excluded.primary_store_id
  ),
  is_active = true,
  updated_at = now();

-- 2. Give the owner access to every current branch.
insert into public.user_store_access (user_id, store_id)
select p.id, s.id
from public.profiles p
cross join public.stores s
where lower(p.email) = lower('admin@indoteksukses.id')
on conflict (user_id, store_id) do nothing;

-- 3. Repair base privileges. RLS remains the real authorization layer.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Keep sensitive financial columns hidden from ordinary authenticated SELECTs.
revoke select on public.products from authenticated;
grant select (
  id, sku, barcode, name, category_id, brand, unit, description, image_url,
  selling_price, minimum_stock, primary_supplier_id, track_serial, is_active,
  created_by, created_at, updated_at
) on public.products to authenticated;
grant insert, update, delete on public.products to authenticated;

revoke select on public.sale_items from authenticated;
grant select (
  id, sale_id, product_id, product_name_snapshot, sku_snapshot, quantity,
  selling_price_snapshot, discount, subtotal
) on public.sale_items to authenticated;

-- 4. Recreate product policies idempotently.
alter table public.products enable row level security;
drop policy if exists products_read on public.products;
drop policy if exists products_admin on public.products;
create policy products_read
on public.products
for select
to authenticated
using (true);

create policy products_admin
on public.products
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 5. Ensure helper functions can be called from an authenticated session.
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.can_access_store(uuid) to authenticated;
grant execute on function public.admin_product_financials() to authenticated;

commit;

-- Verification result should show role=owner and is_active=true.
-- SQL Editor does not carry the website user's auth.uid(), so verify the stored role directly.
select
  p.id,
  p.email,
  p.role,
  p.primary_store_id,
  p.is_active
from public.profiles p
where lower(p.email) = lower('admin@indoteksukses.id');
