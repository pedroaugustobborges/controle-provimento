import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminStore } from '@/store/adminStore';
import { useLogoutStore } from '@/store/logoutStore';
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
import { LogOut } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogoutConfirmDialog({ open, onOpenChange }: Props) {
  const { signOut } = useAuth();
  const { currentUser } = useAdminStore();
  const setIsLoggingOut = useLogoutStore((s) => s.setIsLoggingOut);
  const navigate = useNavigate();

  const handleConfirm = async () => {
    // Close the modal and show overlay BEFORE signOut tears down the tree
    onOpenChange(false);
    setIsLoggingOut(true);

    // Yield a frame so the overlay paints before any heavy work
    await new Promise((r) => requestAnimationFrame(() => r(null)));

    try {
      if (currentUser) {
        await supabase
          .from('user_sessions')
          .update({ logout_at: new Date().toISOString() })
          .eq('user_id', currentUser.id)
          .is('logout_at', null);
      }
      await signOut();
      navigate('/login', { replace: true });
    } catch (e) {
      console.error('Logout error', e);
      // On error, hide overlay so user isn't stuck
      setIsLoggingOut(false);
    }
    // Note: do NOT clear isLoggingOut here on success — LoginPage clears it on mount
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
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
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Sim, sair
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
