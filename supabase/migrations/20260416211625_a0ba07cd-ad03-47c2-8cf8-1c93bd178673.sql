-- Editais
DROP POLICY IF EXISTS "Authenticated users can view editais" ON public.editais;
DROP POLICY IF EXISTS "Authenticated users can manage editais" ON public.editais;
CREATE POLICY "Users can view editais" ON public.editais FOR SELECT TO authenticated USING (can_view_recruitment_data(auth.uid()));
CREATE POLICY "Users can manage editais" ON public.editais FOR ALL TO authenticated USING (can_manage_recruitment_data(auth.uid())) WITH CHECK (can_manage_recruitment_data(auth.uid()));

-- Validacoes
DROP POLICY IF EXISTS "Authenticated users can view validacoes_editais" ON public.validacoes_editais;
DROP POLICY IF EXISTS "Authenticated users can manage validacoes_editais" ON public.validacoes_editais;
CREATE POLICY "Users can view validacoes_editais" ON public.validacoes_editais FOR SELECT TO authenticated USING (can_view_recruitment_data(auth.uid()));
CREATE POLICY "Users can manage validacoes_editais" ON public.validacoes_editais FOR ALL TO authenticated USING (can_manage_recruitment_data(auth.uid())) WITH CHECK (can_manage_recruitment_data(auth.uid()));

-- Tarefas
DROP POLICY IF EXISTS "Authenticated users can view tarefas" ON public.tarefas;
DROP POLICY IF EXISTS "Authenticated users can manage tarefas" ON public.tarefas;
CREATE POLICY "Users can view tarefas" ON public.tarefas FOR SELECT TO authenticated USING (can_view_recruitment_data(auth.uid()));
CREATE POLICY "Users can manage tarefas" ON public.tarefas FOR ALL TO authenticated USING (can_manage_recruitment_data(auth.uid())) WITH CHECK (can_manage_recruitment_data(auth.uid()));

-- Alertas
DROP POLICY IF EXISTS "Authenticated users can view alertas" ON public.alertas;
DROP POLICY IF EXISTS "Authenticated users can manage alertas" ON public.alertas;
CREATE POLICY "Users can view alertas" ON public.alertas FOR SELECT TO authenticated USING (can_view_recruitment_data(auth.uid()));
CREATE POLICY "Users can manage alertas" ON public.alertas FOR ALL TO authenticated USING (can_manage_recruitment_data(auth.uid())) WITH CHECK (can_manage_recruitment_data(auth.uid()));

-- Bloqueios
DROP POLICY IF EXISTS "Authenticated users can view bloqueios_horario" ON public.bloqueios_horario;
DROP POLICY IF EXISTS "Authenticated users can manage bloqueios_horario" ON public.bloqueios_horario;
CREATE POLICY "Users can view bloqueios_horario" ON public.bloqueios_horario FOR SELECT TO authenticated USING (can_view_recruitment_data(auth.uid()));
CREATE POLICY "Users can manage bloqueios_horario" ON public.bloqueios_horario FOR ALL TO authenticated USING (can_manage_recruitment_data(auth.uid())) WITH CHECK (can_manage_recruitment_data(auth.uid()));
