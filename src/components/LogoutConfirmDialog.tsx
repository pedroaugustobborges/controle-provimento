import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminStore } from '@/store/adminStore';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Loader2, LogOut } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogoutConfirmDialog({ open, onOpenChange }: Props) {
  const { signOut } = useAuth();
  const { currentUser } = useAdminStore();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleConfirm = async () => {
    setLoggingOut(true);
    try {
      if (currentUser) {
        await supabase
          .from('user_sessions')
          .update({ logout_at: new Date().toISOString() })
          .eq('user_id', currentUser.id)
          .is('logout_at', null);
      }
      await signOut();
      navigate('/login');
    } catch (e) {
      console.error('Logout error', e);
    } finally {
      setLoggingOut(false);
      onOpenChange(false);
    }
  };

  return (
    <>
      <AlertDialog open={open} onOpenChange={(o) => !loggingOut && onOpenChange(o)}>
        <AlertDialogContent className="sm:max-w-[420px]">
          <AlertDialogHeader>
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-2">
              <LogOut className="h-6 w-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-center">Sair do sistema</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Tem certeza que deseja encerrar sua sessão?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2">
            <AlertDialogCancel disabled={loggingOut}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirm();
              }}
              disabled={loggingOut}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Sim, sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {loggingOut && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-white/10 border border-white/20 shadow-2xl">
            <Loader2 className="h-12 w-12 text-white animate-spin" />
            <p className="text-white text-base font-bold tracking-wide">Saindo do sistema...</p>
            <p className="text-white/60 text-xs">Encerrando sessão com segurança</p>
          </div>
        </div>
      )}
    </>
  );
}
