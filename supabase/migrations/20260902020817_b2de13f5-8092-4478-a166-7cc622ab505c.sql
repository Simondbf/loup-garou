CREATE POLICY "no_direct_client_access" ON public.games FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "no_direct_client_access" ON public.seats FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "no_direct_client_access" ON public.reveals FOR SELECT TO anon, authenticated USING (false);