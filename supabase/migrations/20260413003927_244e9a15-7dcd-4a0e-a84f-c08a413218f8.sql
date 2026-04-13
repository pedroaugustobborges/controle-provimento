-- Create backups bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for backups bucket
CREATE POLICY "Backups access for Admins" 
ON storage.objects 
FOR ALL 
TO authenticated 
USING (
  bucket_id = 'backups' AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND perfil = 'Administrador'
  )
);
