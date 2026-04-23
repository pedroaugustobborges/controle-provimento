import React from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Outlet } from 'react-router-dom';
import { Bell, Search, Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAdminStore } from '@/store/adminStore';
import { PageSkeleton } from './PageSkeleton';
import { Suspense } from 'react';

export function Layout({ children }: { children?: React.ReactNode }) {
  const { currentUser } = useAdminStore();
  
  const userName = currentUser?.nome_completo || 'Usuário';
  const initials = currentUser?.nome_completo
    ? currentUser.nome_completo.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'US';

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-foreground font-sans">
      <div className="w-64 flex-shrink-0">
        <Sidebar />
      </div>
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="h-16 border-b bg-white flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Pesquisar no sistema..." 
                className="pl-10 w-full bg-slate-50 border-none rounded-full h-10 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            
            <div className="hidden md:flex items-center gap-2 ml-4 px-3 py-1.5 bg-primary/5 rounded-full border border-primary/10">
              <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
              <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                Sistema Ativo
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <button className="relative p-2 rounded-full hover:bg-slate-100 transition-colors">
              <Bell className="h-5 w-5 text-muted-foreground hover:text-primary" />
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground rounded-full text-[10px] flex items-center justify-center font-bold">
                3
              </span>
            </button>
            <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900 leading-none">{userName}</p>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">{currentUser?.perfil || 'Usuário'}</p>
              </div>
              <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
                <AvatarImage src={currentUser?.avatar_url || ''} alt={userName} />
                <AvatarFallback className="bg-primary text-primary-foreground font-bold">{initials}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <Suspense fallback={<PageSkeleton />}>
            {children || <Outlet />}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
