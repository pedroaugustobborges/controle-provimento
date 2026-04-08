import React from 'react';
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
import { useLocation, Link } from 'react-router-dom';
import { Bell, Search, Home, ChevronRight, Sparkles, User, Settings, LogOut } from 'lucide-react';
import { AIAssistant } from './AIAssistant';
import { Input } from '@/components/ui/input';
import { useAdminStore } from '@/store/adminStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);
  const { currentUser } = useAdminStore();

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
          <header className="shrink-0 z-20 sticky top-0">
            {/* Top bar with gradient */}
            <div className="h-16 flex items-center justify-between px-6 bg-gradient-to-r from-white via-white to-primary/[0.03] border-b border-border/60 backdrop-blur-xl">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all rounded-lg border border-border/50" />
                
                {/* Greeting */}
                <div className="hidden md:flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-warning" />
                    <span className="text-sm font-semibold text-foreground">
                      {getGreeting()}, <span className="text-primary">{userName}</span>
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium tracking-wide">
                    {currentUser?.cargo || 'Sistema AGIR'} · {currentUser?.perfil || 'Usuário'}
                  </span>
                </div>
              </div>

              {/* Search */}
              <div className="hidden lg:flex items-center flex-1 max-w-md mx-8">
                <div className="relative w-full group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    placeholder="Buscar vagas, editais, candidatos..."
                    className="pl-9 pr-12 h-9 bg-muted/40 border-border/50 rounded-xl text-sm placeholder:text-muted-foreground/60 focus-visible:ring-primary/20 focus-visible:bg-white transition-all"
                  />
                  <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[10px] font-bold text-muted-foreground/50 bg-background border border-border/50 rounded px-1.5 py-0.5">
                    ⌘K
                  </kbd>
                </div>
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-3">
                <div className="hidden xl:flex items-center gap-2 text-[10px] text-muted-foreground font-semibold bg-success/5 text-success px-3 py-1.5 rounded-full border border-success/20">
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
                    <button className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground font-bold text-xs shadow-lg shadow-primary/15 ring-2 ring-white transition-transform hover:scale-105 focus:outline-none">
                      {initials}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem className="gap-2 cursor-pointer">
                      <User className="h-4 w-4" />
                      Meu Perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2 cursor-pointer">
                      <Settings className="h-4 w-4" />
                      Configurações
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2 cursor-pointer text-destructive focus:text-destructive">
                      <LogOut className="h-4 w-4" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Breadcrumb bar */}
            {pathnames.length > 0 && (
              <div className="h-10 flex items-center px-6 bg-muted/30 border-b border-border/30">
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
                      return (
                        <React.Fragment key={name}>
                          <BreadcrumbSeparator>
                            <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                          </BreadcrumbSeparator>
                          <BreadcrumbItem>
                            {isLast ? (
                              <BreadcrumbPage className="text-foreground font-semibold text-xs">
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

          <main className="flex-1 overflow-auto p-8 max-w-[1600px] mx-auto w-full">
            {children}
          </main>
          <AIAssistant />
        </div>
      </div>
    </SidebarProvider>
  );
}
