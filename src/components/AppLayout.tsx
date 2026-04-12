import React, { useState, useEffect, useRef } from 'react';
import avatarDefault from '@/assets/avatar-izac.jpeg';
import logoAgir from '@/assets/logo-agir-white.png';
import { supabase } from '@/lib/supabase';
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
  Upload, LayoutDashboard, Mail, BriefcaseBusiness, Shield, MapPin, CheckCircle2,
  History, MessageSquare, AlertTriangle, Info, CheckCircle, Camera
} from 'lucide-react';
import { AIAssistant } from './AIAssistant';
import { Input } from '@/components/ui/input';
import { useAdminStore } from '@/store/adminStore';
import { useVagasStore } from '@/store/vagasStore';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  const [showProfile, setShowProfile] = useState(false);
  const { alertas, updateAlerta } = useVagasStore();
  const unreadAlertsCount = alertas.filter(a => a.status === 'nao_lido').length;
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

  const labels: Record<string, string> = {
    'vagas': 'Controle de Vagas',
    'editais': 'Editais',
    'fila-editais': 'Fila de Editais',
    'fila-analista-edital': 'Redação de Edital',
    'validacao-editais': 'Validação de Edital',
    'banco-talentos': 'Cadastro Reserva',
    'convocacoes': 'Histórico de Convocação',
    'gestor': 'Administração',
    'importacoes': 'Importações',
    'monitoramento': 'Monitoramento de Prazos',
    'alertas-tarefas': 'Alertas e Tarefas',
    'mensagens': 'Mensagens',
  };

  const getBreadcrumbLabel = (path: string) => {
    return labels[path] || path.charAt(0).toUpperCase() + path.slice(1);
  };

  const getBreadcrumbs = () => {
    const breadcrumbs = [{ label: 'Início', path: '/' }];
    const path = location.pathname;
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');

    // Explicit overrides based on path requirements and sidebar hierarchy
    if (path === '/vagas') {
      breadcrumbs.push({ label: 'Controle de Vagas', path: '/vagas' });
      return breadcrumbs;
    }

    if (path === '/validacao-editais') {
      breadcrumbs.push({ label: 'Validação de Edital', path: '/validacao-editais' });
      return breadcrumbs;
    }

    if (path === '/editais') {
      breadcrumbs.push({ label: 'Editais', path: '/editais' });
      return breadcrumbs;
    }

    if (path === '/fila-editais' || path === '/fila-analista-edital') {
      breadcrumbs.push({ label: 'Publicação de Edital', path: '/fila-editais' });
      if (path === '/fila-editais') {
        breadcrumbs.push({ label: 'Fila de Editais', path: '/fila-editais' });
      } else {
        breadcrumbs.push({ label: 'Redação de Edital', path: '/fila-analista-edital' });
      }
      return breadcrumbs;
    }

    if (path === '/banco-talentos') {
      breadcrumbs.push({ label: 'Cadastro Reserva', path: '/banco-talentos' });
      
      // Points 1, 2, 3: Reflect subpages within Cadastro Reserva
      if (tab === 'convocados') {
        breadcrumbs.push({ label: 'Histórico de Convocação', path: '/banco-talentos?tab=convocados' });
      } else if (tab === 'vencidos') {
        breadcrumbs.push({ label: 'Bancos Vencidos', path: '/banco-talentos?tab=vencidos' });
      }
      // Point 4: For the main page (tab=list or others not specified), 
      // it stays as "Início > Cadastro Reserva"
      
      return breadcrumbs;
    }

    if (path === '/convocacoes') {
      // Point 1: Histórico de Convocação should have "Cadastro Reserva" as intermediate clickable link
      breadcrumbs.push({ label: 'Cadastro Reserva', path: '/banco-talentos' });
      breadcrumbs.push({ label: 'Histórico de Convocação', path: '/convocacoes' });
      return breadcrumbs;
    }

    // Default logic for other pages
    if (pathnames.length > 0) {
      pathnames.forEach((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const label = getBreadcrumbLabel(name);
        breadcrumbs.push({ label, path: routeTo });
      });
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

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


              {/* Right actions */}
              <div className="flex items-center gap-3">
                <div className={`hidden xl:flex items-center gap-2 text-[10px] text-muted-foreground font-semibold bg-success/5 text-success px-3 py-1.5 rounded-full border border-success/20 transition-all duration-300 ${
                  isCompact ? 'opacity-0 max-w-0 overflow-hidden px-0 border-0' : 'opacity-100 max-w-xs'
                }`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                  Sistema sincronizado
                </div>

                <Popover>
                  <PopoverTrigger asChild>
                    <button className="p-2 text-muted-foreground hover:text-primary transition-all rounded-lg hover:bg-primary/5 relative">
                      <Bell className="h-5 w-5" />
                      {unreadAlertsCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-destructive rounded-full border-2 border-white animate-pulse" />
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-80 p-0 overflow-hidden bg-white/95 backdrop-blur-sm border-slate-200/60 shadow-xl rounded-xl">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <Bell className="h-4 w-4 text-primary" />
                        Notificações
                      </h3>
                      {unreadAlertsCount > 0 && (
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-none">
                          {unreadAlertsCount} novas
                        </Badge>
                      )}
                    </div>
                    
                    <div className="max-h-[350px] overflow-y-auto">
                      {alertas.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                          <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                          <p className="text-sm">Nenhuma notificação por enquanto.</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {alertas.map((alerta) => (
                            <Link 
                              key={alerta.id} 
                              to={alerta.link || '#'} 
                              onClick={() => {
                                if (alerta.status === 'nao_lido') {
                                  updateAlerta(alerta.id, { status: 'lido' });
                                }
                              }}
                              className={`flex gap-3 p-4 hover:bg-slate-50 transition-colors group relative ${
                                alerta.status === 'nao_lido' ? 'bg-primary/5' : ''
                              }`}
                            >
                              <div className={`mt-1 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                                alerta.tipo === 'atraso' ? 'bg-amber-100 text-amber-600' :
                                alerta.tipo === 'critico' ? 'bg-red-100 text-red-600' :
                                'bg-blue-100 text-blue-600'
                              }`}>
                                {alerta.tipo === 'atraso' ? <AlertTriangle className="h-4 w-4" /> :
                                 alerta.tipo === 'critico' ? <Bell className="h-4 w-4" /> :
                                 <Info className="h-4 w-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-800 line-clamp-1">{alerta.titulo}</p>
                                <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{alerta.mensagem}</p>
                                <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold tracking-wider">
                                  {format(parseISO(alerta.data_criacao), "dd 'de' MMMM", { locale: ptBR })}
                                </p>
                              </div>
                              {alerta.status === 'nao_lido' && (
                                <div className="absolute top-4 right-4 h-2 w-2 bg-primary rounded-full" />
                              )}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="p-2 border-t border-slate-100 bg-slate-50/50">
                      <Link 
                        to="/mensagens?tab=historico" 
                        className="flex items-center justify-center gap-2 w-full py-2 text-xs font-semibold text-primary hover:bg-primary/5 rounded-lg transition-colors"
                      >
                        <History className="h-3.5 w-3.5" />
                        Histórico de Mensagens
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </PopoverContent>
                </Popover>
                
                <div className="h-8 w-px bg-border/50 mx-1" />
                
                <button 
                  onClick={() => setShowProfile(true)}
                  className={`rounded-full overflow-hidden flex items-center justify-center ring-2 ring-[#1e3a5f] transition-all duration-300 hover:ring-primary ${
                    isCompact ? 'h-8 w-8' : 'h-10 w-10'
                  }`}
                >
                  <img src={currentUser?.avatar_url || avatarDefault} alt={userName} className="h-full w-full object-cover" />
                </button>
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
                    {breadcrumbs.slice(1).map((crumb, index) => {
                      const isLast = index === breadcrumbs.length - 2;
                      return (
                        <React.Fragment key={crumb.path}>
                          <BreadcrumbSeparator>
                            <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                          </BreadcrumbSeparator>
                          <BreadcrumbItem>
                            {isLast ? (
                              <BreadcrumbPage className="text-xs font-semibold px-2 py-0.5 text-foreground">
                                {crumb.label}
                              </BreadcrumbPage>
                            ) : (
                              <BreadcrumbLink asChild>
                                <Link to={crumb.path} className="text-muted-foreground hover:text-primary transition-colors text-xs font-medium">
                                  {crumb.label}
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
            <div className="animate-in fade-in duration-200">
              {children}
            </div>
          </main>
          <AIAssistant />
        </div>
      </div>

      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none bg-background shadow-2xl">
          <div className="relative h-36 bg-primary flex items-center justify-center">
            <img src={logoAgir} alt="AGIR" className="h-14 object-contain" />
            <div className="absolute -bottom-12 left-8 group">
              <div className="h-24 w-24 rounded-full border-4 border-background bg-muted overflow-hidden shadow-lg relative">
                <img src={currentUser?.avatar_url || avatarDefault} alt={userName} className="h-full w-full object-cover" />
                <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="h-6 w-6 text-white" />
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !currentUser) return;
                      try {
                        const fileExt = file.name.split('.').pop();
                        const filePath = `${currentUser.id}/${Math.random()}.${fileExt}`;
                        const { data, error } = await supabase.storage
                          .from('avatars')
                          .upload(filePath, file);
                        if (error) throw error;
                        const { data: { publicUrl } } = supabase.storage
                          .from('avatars')
                          .getPublicUrl(filePath);
                        
                        await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', currentUser.id);
                        await fetchCurrentProfile();
                        // Also update admin store if needed, but fetchCurrentProfile should do it
                      } catch (err: any) {
                        console.error('Error uploading avatar:', err);
                      }
                    }} 
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="pt-16 pb-8 px-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground tracking-tight">{currentUser?.nome_completo || userName}</h2>
                <p className="text-muted-foreground font-medium flex items-center gap-1.5 mt-1">
                  <BriefcaseBusiness className="h-4 w-4 text-primary" />
                  {currentUser?.cargo || 'Colaborador AGIR'}
                </p>
              </div>
              <Badge variant={currentUser?.status === 'ativo' ? 'default' : 'secondary'} className="capitalize px-3 py-1 text-xs font-bold bg-success/10 text-success border-success/20 hover:bg-success/20">
                <span className="h-1.5 w-1.5 rounded-full bg-success mr-2 animate-pulse" />
                {currentUser?.status || 'Ativo'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 border border-border/40 transition-all hover:bg-muted/50">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">E-mail Corporativo</span>
                    <span className="text-sm font-semibold text-foreground">{currentUser?.email || 'Não informado'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 border border-border/40 transition-all hover:bg-muted/50">
                  <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Perfil de Acesso</span>
                    <span className="text-sm font-semibold text-foreground">{currentUser?.perfil || 'Analista de RH'}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 p-4 rounded-xl bg-muted/30 border border-border/40">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-4 w-4 text-rose-500" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Unidades Vinculadas</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {currentUser?.visualiza_todas_unidades ? (
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold py-1 px-3">
                        Todas as Unidades
                      </Badge>
                    ) : currentUser?.unidades_vinculadas && currentUser.unidades_vinculadas.length > 0 ? (
                      currentUser.unidades_vinculadas.map((unidade, idx) => (
                        <Badge key={idx} variant="outline" className="bg-white text-muted-foreground border-border font-medium">
                          {unidade}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground italic">Nenhuma unidade vinculada</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-2 border-t border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  Sessão autenticada e segura
                </div>
                <button 
                  onClick={() => setShowProfile(false)}
                  className="text-xs font-bold text-primary hover:underline underline-offset-4"
                >
                  Fechar informações
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
