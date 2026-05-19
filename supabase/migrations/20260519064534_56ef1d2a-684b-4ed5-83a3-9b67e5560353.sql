
-- Drop the overly permissive "Allow all" policies
DROP POLICY IF EXISTS "Allow all on items" ON public.items;
DROP POLICY IF EXISTS "Allow all on groups" ON public.groups;
DROP POLICY IF EXISTS "Allow all on tags" ON public.tags;
DROP POLICY IF EXISTS "Allow all on item_groups" ON public.item_groups;
DROP POLICY IF EXISTS "Allow all on item_tags" ON public.item_tags;

-- Authenticated users can read; writes only via service role (no policy => denied for anon/authenticated)
CREATE POLICY "Authenticated can read items" ON public.items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read groups" ON public.groups
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read tags" ON public.tags
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read item_groups" ON public.item_groups
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read item_tags" ON public.item_tags
  FOR SELECT TO authenticated USING (true);
