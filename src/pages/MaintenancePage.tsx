import { Wrench, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  message?: string | null;
  expectedReturnAt?: string | null;
}

export default function MaintenancePage({ message, expectedReturnAt }: Props) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto h-20 w-20 rounded-2xl bg-warning/10 border border-warning/30 flex items-center justify-center">
          <Wrench className="h-10 w-10 text-warning" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Sistema em manutenção</h1>
          <p className="text-muted-foreground">
            {message || 'O sistema está temporariamente indisponível para melhorias. Tente novamente em alguns instantes.'}
          </p>
        </div>
        {expectedReturnAt && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-sm text-foreground">
            <Clock className="h-4 w-4" />
            Previsão de retorno: {format(parseISO(expectedReturnAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
          </div>
        )}
        <Button onClick={handleLogout} variant="outline" className="mt-4">
          Sair
        </Button>
      </div>
    </div>
  );
}
