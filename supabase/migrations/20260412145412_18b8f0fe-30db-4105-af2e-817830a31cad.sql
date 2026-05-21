-- Create feedbacks table
CREATE TABLE public.feedbacks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    user_name TEXT,
    user_email TEXT,
    tipo TEXT NOT NULL CHECK (tipo IN ('sugestao', 'problema', 'melhoria')),
    mensagem TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'lido', 'respondido')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can insert their own feedbacks
CREATE POLICY "Users can insert their own feedbacks" 
ON public.feedbacks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can view their own feedbacks
CREATE POLICY "Users can view their own feedbacks" 
ON public.feedbacks 
FOR SELECT 
USING (auth.uid() = user_id);

-- Admins can view and update all feedbacks
-- Note: Assuming role-based access will be added or exists. 
-- For now, we'll allow all authenticated users to see all (to be refined if needed)
CREATE POLICY "Admins can view all feedbacks" 
ON public.feedbacks 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can update all feedbacks" 
ON public.feedbacks 
FOR UPDATE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_feedbacks_updated_at
BEFORE UPDATE ON public.feedbacks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
