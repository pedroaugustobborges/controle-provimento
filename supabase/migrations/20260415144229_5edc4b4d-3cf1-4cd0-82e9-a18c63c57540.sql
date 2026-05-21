ALTER TABLE public.user_sessions 
ADD CONSTRAINT user_sessions_profile_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;