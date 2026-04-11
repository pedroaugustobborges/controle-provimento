import React, { useState, useEffect, useRef } from 'react';
import avatarDefault from '@/assets/avatar-izac.jpeg';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from '@/components/ui/breadcrumb';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { 
  Bell, Search, Home, ChevronRight, Sparkles, User, Settings, LogOut, 
  Briefcase, FileText, ListOrdered, Megaphone, ShieldCheck, Users, 
  Upload, LayoutDashboard, Mail, BriefcaseBusiness, Shield, MapPin, CheckCircle2
} from 'lucide-react';
import { AgieChat } from './chat/AgieChat';
import { Input } from '@/components/ui/input';
import { useAdminStore } from '@/store/adminStore';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

const routeContextMap: Record<string, { color: string; bgLight: string; icon: React.ElementType }> = {
  'vagas': { color: 'text-blue-600', bgLight: 'bg-blue-50 border-blue-200', icon: Briefcase },
  'editais': { color: 'text-teal-600', bgLight: 'bg-teal-50 border-teal-200', icon: FileText },
  'fila-editais': { color: 'text-cyan-600', bgLight: 'bg-cyan-50 border-cyan-200', icon: ListOrdered },
  'convocacoes': { color: 'text-amber-600', bgLight: 'bg-amber-50 border-amber-200', icon: Megaphone },
  'validacao': { color: 'text-emerald-600', bgLight: 'bg-emerald-50 border-emerald-200', icon: ShieldCheck },
  'gestor': { color: 'text-purple-600', bgLight: 'bg-purple-50 border-purple-200', icon: Settings },
  'banco-talentos': { color: 'text-indigo-600', bgLight: 'bg-indigo-50 border-indigo-200', icon: Users },
  'importacoes': { color: 'text-green-600', bgLight: 'bg-green-50 border-green-200', icon: Upload },
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const pathnames = location.pathname.split('/').filter((x) => x);
  const { currentUser, fetchCurrentProfile } = useAdminStore();
  const { signOut } = useAuth();
  const [isCompact, setIsCompact] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCurrentProfile();
  }, [fetchCurrentProfile]);

  useEffect(() => {
    const mainEl = mainRef.current;
    if (!mainEl) return;
    const handleScroll = () => {
      const compact = mainEl.scrollTop > 50;
      setIsCompact(prev => prev === compact ? prev : compact);
    };
    mainEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => mainEl.removeEventListener('scroll', handleScroll);
  }, []);

  const activeRoute = pathnames[0] || '';
  const routeCtx = routeContextMap[activeRoute];

  const getBreadcrumbLabel = (path: string) => {
    const labels: Record<string, string> = {
      'vagas': 'Processos Seletivos',
      'editais': 'Editais e Etapas',
      'fila-editais': 'Fila de Editais',
      'convocacoes': 'Convocações',
      'validacao': 'Validações',
      'gestor': 'Administração',
      'banco-talentos': 'Banco de Talentos',
      'importacoes': 'Importações',
    };
    return labels[path] || path.charAt(0).toUpperCase() + path.slice(1);
  };

  const userName = currentUser?.nome_completo?.split(' ')[0] || 'Usuário';
  const initials = currentUser?.nome_completo
    ? currentUser.nome_completo.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'US';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="shrink-0 z-20 sticky top-0 bg-background transition-all duration-300">
            {/* Top bar */}
            <div className={`flex items-center justify-between px-6 border-b transition-all duration-300 ${
              isCompact 
                ? 'h-12 bg-background shadow-sm border-border/40' 
                : 'h-16 bg-gradient-to-r from-background via-background to-primary/[0.03] border-border/60'
            }`}>
              <div className="flex items-center gap-4">
                <SidebarTrigger className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all rounded-lg border border-border/50" />
                
                {/* Greeting — hidden when compact */}
                <div className={`hidden md:flex flex-col transition-all duration-300 overflow-hidden ${
                  isCompact ? 'opacity-0 max-w-0' : 'opacity-100 max-w-xs'
                }`}>
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <Sparkles className="h-3.5 w-3.5 text-warning" />
                    <span className="text-sm font-semibold text-foreground">
                      {getGreeting()}, <span className="text-primary">{userName}</span>
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium tracking-wide whitespace-nowrap">
                    {currentUser?.cargo || 'Sistema AGIR'} · {currentUser?.perfil || 'Usuário'}
                  </span>
                </div>

                {/* Route context icon — shown when compact */}
                {isCompact && routeCtx && (
                  <div className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all duration-300 ${routeCtx.bgLight} ${routeCtx.color}`}>
                    <routeCtx.icon className="h-3.5 w-3.5" />
                    <span>{getBreadcrumbLabel(activeRoute)}</span>
                  </div>
                )}
              </div>

              {/* Search */}
              <div className="hidden lg:flex items-center flex-1 max-w-md mx-8">
                <div className="relative w-full group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    placeholder="Buscar vagas, editais, candidatos..."
                    className={`pl-9 pr-12 bg-muted/40 border-border/50 rounded-xl text-sm placeholder:text-muted-foreground/60 focus-visible:ring-primary/20 focus-visible:bg-white transition-all ${
                      isCompact ? 'h-8' : 'h-9'
                    }`}
                  />
                  <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[10px] font-bold text-muted-foreground/50 bg-background border border-border/50 rounded px-1.5 py-0.5">
                    ⌘K
                  </kbd>
                </div>
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-3">
                <div className={`hidden xl:flex items-center gap-2 text-[10px] text-muted-foreground font-semibold bg-success/5 text-success px-3 py-1.5 rounded-full border border-success/20 transition-all duration-300 ${
                  isCompact ? 'opacity-0 max-w-0 overflow-hidden px-0 border-0' : 'opacity-100 max-w-xs'
                }`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                  Sistema sincronizado
                </div>

                <button className="p-2 text-muted-foreground hover:text-primary transition-all rounded-lg hover:bg-primary/5 relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-destructive rounded-full border-2 border-white animate-pulse" />
                </button>
                
                <div className="h-8 w-px bg-border/50 mx-1" />
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={`rounded-xl overflow-hidden flex items-center justify-center shadow-lg shadow-primary/15 ring-2 ring-white transition-all duration-300 hover:scale-105 focus:outline-none ${
                      isCompact ? 'h-8 w-8' : 'h-10 w-10'
                    }`}>
                      <img src={avatarDefault} alt={userName} className="h-full w-full object-cover" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem className="gap-2 cursor-pointer">
                      <User className="h-4 w-4" />
                      Meu Perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => navigate('/gestor')}>
                      <Settings className="h-4 w-4" />
                      Configurações
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2 cursor-pointer text-destructive focus:text-destructive" onClick={async () => {
                      await signOut();
                      navigate('/login');
                    }}>
                      <LogOut className="h-4 w-4" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Breadcrumb bar */}
            {pathnames.length > 0 && (
              <div className={`flex items-center px-6 border-b border-border/30 transition-all duration-300 ${
                isCompact ? 'h-0 opacity-0 overflow-hidden border-0' : 'h-10 opacity-100 bg-background'
              }`}>
                <Breadcrumb>
                  <BreadcrumbList className="gap-1">
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link to="/" className="text-muted-foreground hover:text-primary transition-colors text-xs font-medium flex items-center gap-1">
                          <Home className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Início</span>
                        </Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    {pathnames.map((name, index) => {
                      const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
                      const isLast = index === pathnames.length - 1;
                      const ctx = routeContextMap[name];
                      return (
                        <React.Fragment key={name}>
                          <BreadcrumbSeparator>
                            <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                          </BreadcrumbSeparator>
                          <BreadcrumbItem>
                            {isLast ? (
                              <BreadcrumbPage className={`text-xs font-semibold px-2 py-0.5 rounded-md transition-all ${
                                ctx ? `${ctx.bgLight} ${ctx.color} border` : 'text-foreground'
                              }`}>
                                {ctx && <ctx.icon className="h-3 w-3 inline mr-1 -mt-0.5" />}
                                {getBreadcrumbLabel(name)}
                              </BreadcrumbPage>
                            ) : (
                              <BreadcrumbLink asChild>
                                <Link to={routeTo} className="text-muted-foreground hover:text-primary transition-colors text-xs font-medium">
                                  {getBreadcrumbLabel(name)}
                                </Link>
                              </BreadcrumbLink>
                            )}
                          </BreadcrumbItem>
                        </React.Fragment>
                      );
                    })}
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            )}
          </header>

          <main ref={mainRef} className="flex-1 overflow-auto p-8 max-w-[1600px] mx-auto w-full">
            {children}
          </main>
          <AgieChat />
        </div>
      </div>
    </SidebarProvider>
  );
}
