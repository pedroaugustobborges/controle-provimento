import React, { useState, useEffect, useRef } from 'react';
import avatarDefault from '@/assets/avatar-izac.jpeg';
import logoAgir from '@/assets/logo-agir-white.png';
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
  Bell, Search, Home, ChevronRight, User, Settings, LogOut, 
  Briefcase, FileText, ListOrdered, Megaphone, ShieldCheck, Users, 
  Upload, Mail, BriefcaseBusiness, Shield, MapPin, CheckCircle2,
  Filter
} from 'lucide-react';
import { AgieChat } from './chat/AgieChat';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const pathnames = location.pathname.split('/').filter((x) => x);
  const { currentUser, fetchCurrentProfile } = useAdminStore();
  const { signOut } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCurrentProfile();
  }, [fetchCurrentProfile]);

  const getBreadcrumbLabel = (path: string) => {
    const labels: Record<string, string> = {
      'vagas': 'Vagas',
      'editais': 'Editais e Etapas',
      'fila-editais': 'Fila de Editais',
      'convocacoes': 'Convocações',
      'validacao': 'Validações',
      'gestor': 'Administração',
      'banco-talentos': 'Banco de Talentos',
      'importacoes': 'Importações',
      'fila-analista-edital': 'Redação do Edital',
      'validacao-editais': 'Validação de Editais',
      'alertas-tarefas': 'Alertas e Tarefas',
      'monitoramento': 'Monitoramento',
    };
    
    // Custom labels for nested routes or specific tabs if needed
    if (location.search.includes('tab=acompanhamento')) return 'Acompanhamento de Edital';
    if (location.search.includes('tab=list')) return 'Cadastro Reserva';
    
    return labels[path] || path.charAt(0).toUpperCase() + path.slice(1);
  };

  const userName = currentUser?.nome_completo?.split(' ')[0] || 'Usuário';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[#F8FAFC]">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="shrink-0 z-20 sticky top-0 bg-white border-b border-[#E5E7EB]">
            {/* Top bar */}
            <div className="flex items-center justify-between px-6 h-16">
              <div className="flex items-center gap-6">
                <SidebarTrigger className="h-9 w-9 text-[#6B7280] hover:text-[#2563EB] hover:bg-slate-50 transition-all rounded-lg" />
                
                {/* Greeting */}
                <div className="hidden md:flex flex-col">
                  <span className="text-sm text-[#374151]">
                    {getGreeting()}, <span className="font-bold text-[#111827]">{userName}</span>
                  </span>
                  <span className="text-[11px] text-[#6B7280] font-medium leading-none mt-0.5">
                    {currentUser?.cargo || 'Analista de RH'} · {currentUser?.perfil || 'Administrador'}
                  </span>
                </div>
              </div>

              {/* Search */}
              <div className="hidden lg:flex items-center flex-1 max-w-xl mx-8 gap-2">
                <div className="relative flex-1 group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF] group-focus-within:text-[#2563EB] transition-colors" />
                  <Input
                    placeholder="Buscar vagas, editais, candidatos..."
                    className="pl-9 pr-4 bg-slate-50 border-[#E5E7EB] rounded-lg h-10 text-sm placeholder:text-[#9CA3AF] focus-visible:ring-[#2563EB]/20 focus-visible:bg-white transition-all"
                  />
                </div>
                <Button variant="outline" size="sm" className="h-10 px-3 border-[#E5E7EB] text-[#374151] hover:bg-slate-50 font-medium">
                  <Filter className="h-4 w-4 mr-2 text-[#6B7280]" />
                  Filtrar
                </Button>
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-4">
                <button className="p-2 text-[#6B7280] hover:text-[#2563EB] transition-all rounded-lg hover:bg-slate-50 relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-[#EF4444] rounded-full border-2 border-white" />
                </button>
                
                <div className="h-8 w-px bg-[#E5E7EB] mx-1" />
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-3 group focus:outline-none">
                      <div className="h-9 w-9 rounded-full overflow-hidden border border-[#E5E7EB] shadow-sm transition-transform group-hover:scale-105">
                        <img src={avatarDefault} alt={userName} className="h-full w-full object-cover" />
                      </div>
                      <div className="hidden xl:flex flex-col items-start">
                        <span className="text-sm font-semibold text-[#111827] leading-tight">{userName}</span>
                        <span className="text-[10px] text-[#6B7280] uppercase font-bold tracking-wider">Ver Perfil</span>
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem 
                      className="gap-2 cursor-pointer" 
                      onClick={() => setShowProfile(true)}
                    >
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
              <div className="flex items-center px-6 h-10 border-t border-[#F3F4F6] bg-white">
                <Breadcrumb>
                  <BreadcrumbList className="gap-1">
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link to="/" className="text-[#6B7280] hover:text-[#2563EB] transition-colors text-xs font-medium flex items-center gap-1">
                          <Home className="h-3.5 w-3.5" />
                          <span>Início</span>
                        </Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    {pathnames.map((name, index) => {
                      const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
                      const isLast = index === pathnames.length - 1;
                      return (
                        <React.Fragment key={name}>
                          <BreadcrumbSeparator>
                            <span className="text-[#D1D5DB] font-light text-sm mx-1">&gt;</span>
                          </BreadcrumbSeparator>
                          <BreadcrumbItem>
                            {isLast ? (
                              <BreadcrumbPage className="text-xs font-bold text-[#111827]">
                                {getBreadcrumbLabel(name)}
                              </BreadcrumbPage>
                            ) : (
                              <BreadcrumbLink asChild>
                                <Link to={routeTo} className="text-[#6B7280] hover:text-[#2563EB] transition-colors text-xs font-medium">
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

      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none bg-background shadow-2xl">
          <div className="relative h-36 bg-[#1E293B] flex items-center justify-center">
            <img src={logoAgir} alt="AGIR" className="h-14 object-contain" />
            <div className="absolute -bottom-12 left-8">
              <div className="h-24 w-24 rounded-2xl border-4 border-background bg-muted overflow-hidden shadow-lg">
                <img src={avatarDefault} alt={userName} className="h-full w-full object-cover" />
              </div>
            </div>
          </div>

          <div className="pt-16 pb-8 px-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[#111827] tracking-tight">{currentUser?.nome_completo || userName}</h2>
                <p className="text-[#6B7280] font-medium flex items-center gap-1.5 mt-1">
                  <BriefcaseBusiness className="h-4 w-4 text-[#2563EB]" />
                  {currentUser?.cargo || 'Colaborador AGIR'}
                </p>
              </div>
              <Badge variant="outline" className="capitalize px-3 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 border-emerald-100">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                {currentUser?.status || 'Ativo'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-100 transition-all hover:bg-slate-100/50">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center text-[#2563EB]">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">E-mail Corporativo</span>
                    <span className="text-sm font-semibold text-[#374151]">{currentUser?.email || 'Não informado'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-100 transition-all hover:bg-slate-100/50">
                  <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Perfil de Acesso</span>
                    <span className="text-sm font-semibold text-[#374151]">{currentUser?.perfil || 'Analista de RH'}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-4 w-4 text-rose-500" />
                    <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Unidades Vinculadas</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {currentUser?.visualiza_todas_unidades ? (
                      <Badge variant="outline" className="bg-blue-50 text-[#2563EB] border-blue-100 font-bold py-1 px-3">
                        Todas as Unidades
                      </Badge>
                    ) : currentUser?.unidades_vinculadas && currentUser.unidades_vinculadas.length > 0 ? (
                      currentUser.unidades_vinculadas.map((unidade, idx) => (
                        <Badge key={idx} variant="outline" className="bg-white text-[#4B5563] border-[#E5E7EB] font-medium">
                          {unidade}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-[#6B7280] italic">Nenhuma unidade vinculada</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Sessão autenticada e segura
                </div>
                <button 
                  onClick={() => setShowProfile(false)}
                  className="text-xs font-bold text-[#2563EB] hover:underline underline-offset-4"
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
