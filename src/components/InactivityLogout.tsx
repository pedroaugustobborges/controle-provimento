import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, LogOut, Clock } from 'lucide-react';

const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_MS = 5 * 60 * 1000; // 5 minutes before timeout

export function InactivityLogout() {
  const { signOut, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [timeLeft, setTimeLeft] = useState(WARNING_MS / 1000);

  const handleLogout = useCallback(async () => {
    setShowWarning(false);
    await signOut();
    navigate('/auth');
  }, [signOut, navigate]);

  const resetTimer = useCallback(() => {
    setLastActivity(Date.now());
    if (showWarning) {
      setShowWarning(false);
    }
  }, [showWarning]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const handleEvent = () => resetTimer();

    events.forEach(event => {
      window.addEventListener(event, handleEvent);
    });

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActivity;

      if (elapsed >= TIMEOUT_MS) {
        handleLogout();
      } else if (elapsed >= TIMEOUT_MS - WARNING_MS) {
        setShowWarning(true);
        setTimeLeft(Math.ceil((TIMEOUT_MS - elapsed) / 1000));
      }
    }, 1000);

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleEvent);
      });
      clearInterval(interval);
    };
  }, [isAuthenticated, lastActivity, handleLogout, resetTimer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={showWarning} onOpenChange={setShowWarning}>
      <DialogContent className="sm:max-w-[425px] border-none shadow-2xl bg-white/95 backdrop-blur-md">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <Clock className="h-6 w-6 text-amber-600 animate-pulse" />
          </div>
          <DialogTitle className="text-center text-xl font-bold text-slate-800">
            Sessão expirando
          </DialogTitle>
          <DialogDescription className="text-center text-slate-500 pt-2">
            Sua sessão expirará em <span className="font-bold text-amber-600">{formatTime(timeLeft)}</span> por inatividade. Deseja continuar conectado?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center gap-2 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleLogout}
            className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair agora
          </Button>
          <Button
            type="button"
            onClick={resetTimer}
            className="flex-1 bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 text-white shadow-lg shadow-blue-900/20"
          >
            Continuar conectado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
