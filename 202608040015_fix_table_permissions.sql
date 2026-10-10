-- Fix table permissions for authenticated and anon users
-- Previous migration 003 accidentally revoked SELECT on products from authenticated users,
-- which blocked PostgREST from querying cost_price, visual_id, and sales_scope.

BEGIN;

GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_items TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variant_inventory TO authenticated, anon;

COMMIT;
