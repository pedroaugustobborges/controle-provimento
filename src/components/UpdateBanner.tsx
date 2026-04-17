import { useSystemUpdates } from '@/hooks/useSystemUpdates';
import { useAppVersion } from '@/hooks/useAppVersion';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, RefreshCw, LogOut, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useState } from 'react';

export function UpdateBanner() {
  const { latest, shouldShow, markSeen, dismiss } = useSystemUpdates();
  const { hasUpdate: hasBuildUpdate, newVersion, acknowledge, reload } = useAppVersion();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [buildDismissed, setBuildDismissed] = useState(false);

  // Prioridade 1: system_updates (admin manual)
  if (shouldShow && latest) {
    const handleAction = async () => {
      if (latest.action_type === 'reload') {
        markSeen();
        window.location.reload();
      } else {
        markSeen();
        await signOut();
        navigate('/login', { replace: true });
      }
    };

    if (latest.is_mandatory) {
      return (
        <Dialog open onOpenChange={() => {}}>
          <DialogContent
            className="sm:max-w-md"
            onPointerDownOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Nova versão disponível
                {latest.version && <span className="text-xs text-muted-foreground ml-2">v{latest.version}</span>}
              </DialogTitle>
              <DialogDescription>{latest.message}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={handleAction} className="gap-2 w-full">
                {latest.action_type === 'reload' ? (
                  <><RefreshCw className="h-4 w-4" /> Atualizar agora</>
                ) : (
                  <><LogOut className="h-4 w-4" /> Deslogar e entrar novamente</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    }

    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Sparkles className="h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">
                Nova versão disponível {latest.version && <span className="opacity-80">· v{latest.version}</span>}
              </p>
              <p className="text-xs opacity-90 truncate">{latest.message}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button onClick={handleAction} size="sm" variant="secondary" className="gap-2">
              {latest.action_type === 'reload' ? (
                <><RefreshCw className="h-3.5 w-3.5" /> Atualizar agora</>
              ) : (
                <><LogOut className="h-3.5 w-3.5" /> Deslogar e entrar</>
              )}
            </Button>
            <Button onClick={dismiss} size="sm" variant="ghost" className="text-primary-foreground hover:bg-white/10">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Prioridade 2: detecção automática de novo build (version.json)
  if (hasBuildUpdate && !buildDismissed && newVersion) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Sparkles className="h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">Nova versão disponível</p>
              <p className="text-xs opacity-90 truncate">
                Atualize para receber as últimas melhorias e correções.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button onClick={reload} size="sm" variant="secondary" className="gap-2">
              <RefreshCw className="h-3.5 w-3.5" /> Atualizar agora
            </Button>
            <Button
              onClick={() => {
                acknowledge();
                setBuildDismissed(true);
              }}
              size="sm"
              variant="ghost"
              className="text-primary-foreground hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
