
-- Groups/tags/links: authenticated users can fully manage
CREATE POLICY "Authenticated can write groups" ON public.groups
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update groups" ON public.groups
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete groups" ON public.groups
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated can write tags" ON public.tags
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update tags" ON public.tags
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete tags" ON public.tags
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated can write item_groups" ON public.item_groups
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can delete item_groups" ON public.item_groups
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated can write item_tags" ON public.item_tags
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can delete item_tags" ON public.item_tags
  FOR DELETE TO authenticated USING (true);

-- Revoke EXECUTE on user-defined SECURITY DEFINER trigger functions from API roles.
-- They run as triggers regardless; no client needs to call them directly.
REVOKE EXECUTE ON FUNCTION public.ov_handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ov_increment_reply_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ov_decrement_reply_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ov_update_like_count() FROM PUBLIC, anon, authenticated;
