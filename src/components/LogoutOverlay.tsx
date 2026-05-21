import { Loader2 } from 'lucide-react';
import { useLogoutStore } from '@/store/logoutStore';

export function LogoutOverlay() {
  const isLoggingOut = useLogoutStore((s) => s.isLoggingOut);
  if (!isLoggingOut) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-white/10 border border-white/20 shadow-2xl">
        <Loader2 className="h-12 w-12 text-white animate-spin" />
        <p className="text-white text-base font-bold tracking-wide">Saindo do sistema...</p>
        <p className="text-white/60 text-xs">Encerrando sessão com segurança</p>
      </div>
    </div>
  );
}
