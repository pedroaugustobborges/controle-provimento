-- Drop permissive policies
DROP POLICY IF EXISTS "Admins can view all feedbacks" ON public.feedbacks;
DROP POLICY IF EXISTS "Admins can update all feedbacks" ON public.feedbacks;

-- Create more secure policies for admins
CREATE POLICY "Admins can view all feedbacks" 
ON public.feedbacks 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

CREATE POLICY "Admins can update all feedbacks" 
ON public.feedbacks 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);
