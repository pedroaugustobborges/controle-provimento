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
import { Bell, Search, Clock } from 'lucide-react';
import { AIAssistant } from './AIAssistant';


export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const getBreadcrumbLabel = (path: string) => {
    const labels: Record<string, string> = {
      'vagas': 'Processos Seletivos',
      'editais': 'Editais e Etapas',
      'fila-editais': 'Fila de Editais',
      'convocacoes': 'Convocações',
      'validacao': 'Validações',
      'gestor': 'Administração',
    };
    return labels[path] || path.charAt(0).toUpperCase() + path.slice(1);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[#F8FAFC]">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center justify-between border-b bg-white px-6 shrink-0 z-10 sticky top-0 shadow-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="h-9 w-9 text-slate-500 hover:text-primary transition-colors" />
              <div className="h-6 w-[1px] bg-slate-200 hidden md:block"></div>
              
              <Breadcrumb className="hidden md:block">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to="/" className="text-slate-500 hover:text-primary transition-colors text-xs font-medium uppercase tracking-wider">Visão Geral</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {pathnames.map((name, index) => {
                    const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
                    const isLast = index === pathnames.length - 1;
                    return (
                      <React.Fragment key={name}>
                        <BreadcrumbSeparator className="text-slate-300" />
                        <BreadcrumbItem>
                          {isLast ? (
                            <BreadcrumbPage className="text-slate-800 font-bold text-xs uppercase tracking-wider">{getBreadcrumbLabel(name)}</BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink asChild>
                              <Link to={routeTo} className="text-slate-500 hover:text-primary transition-colors text-xs font-medium uppercase tracking-wider">{getBreadcrumbLabel(name)}</Link>
                            </BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                      </React.Fragment>
                    );
                  })}
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            <div className="flex items-center gap-6">
              <div className="hidden lg:flex items-center gap-2 text-[10px] text-slate-400 font-medium uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                <Clock className="h-3 w-3" />
                <span>Atualizado: Hoje, 14:30</span>
              </div>

              <div className="flex items-center gap-3">
                <button className="p-2 text-slate-400 hover:text-primary transition-colors">
                  <Search className="h-5 w-5" />
                </button>
                <button className="p-2 text-slate-400 hover:text-primary transition-colors relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-2 right-2 h-2 w-2 bg-destructive rounded-full border-2 border-white"></span>
                </button>
                
                <div className="h-8 w-[1px] bg-slate-200 mx-1"></div>
                
                <div className="flex items-center gap-3 pl-1">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-slate-700 leading-none">Ana Paula Oliveira</span>
                    <span className="text-[10px] text-primary font-semibold uppercase tracking-tighter mt-1">Gestora de RH · AGIR</span>
                  </div>
                  <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xs shadow-sm shadow-primary/20">
                    AP
                  </div>
                </div>
              </div>
            </div>
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
