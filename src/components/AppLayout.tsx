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
          <header className="h-20 flex items-center justify-between border-b bg-white/80 backdrop-blur-md px-8 shrink-0 z-20 sticky top-0 shadow-sm border-slate-100">
            <div className="flex items-center gap-6">
              <SidebarTrigger className="h-10 w-10 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all rounded-xl border border-slate-100" />
              <div className="h-8 w-[1px] bg-slate-100 hidden md:block"></div>
              
              <Breadcrumb className="hidden md:block">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to="/" className="text-slate-400 hover:text-primary transition-colors text-[10px] font-black uppercase tracking-[0.2em]">Home</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {pathnames.map((name, index) => {
                    const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
                    const isLast = index === pathnames.length - 1;
                    return (
                      <React.Fragment key={name}>
                        <BreadcrumbSeparator className="text-slate-200" />
                        <BreadcrumbItem>
                          {isLast ? (
                            <BreadcrumbPage className="text-slate-800 font-black text-[10px] uppercase tracking-[0.2em] bg-slate-50 px-2 py-1 rounded-md border border-slate-100">{getBreadcrumbLabel(name)}</BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink asChild>
                              <Link to={routeTo} className="text-slate-400 hover:text-primary transition-colors text-[10px] font-black uppercase tracking-[0.2em]">{getBreadcrumbLabel(name)}</Link>
                            </BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                      </React.Fragment>
                    );
                  })}
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            <div className="flex items-center gap-8">
              <div className="hidden xl:flex items-center gap-2.5 text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] bg-slate-50/50 px-4 py-2 rounded-full border border-slate-100 shadow-inner">
                <Clock className="h-3.5 w-3.5 text-primary/60" />
                <span>Sync: Hoje, 14:30</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative group hidden sm:block">
                  <button className="p-2.5 text-slate-400 hover:text-primary transition-all rounded-xl hover:bg-primary/5 border border-transparent hover:border-primary/10">
                    <Search className="h-5 w-5" />
                  </button>
                  <span className="absolute -bottom-1 -right-1 h-4 w-4 bg-white border border-slate-200 rounded text-[8px] font-black flex items-center justify-center shadow-sm text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">/</span>
                </div>
                
                <button className="p-2.5 text-slate-400 hover:text-primary transition-all rounded-xl hover:bg-primary/5 relative border border-transparent hover:border-primary/10">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-destructive rounded-full border-2 border-white shadow-sm ring-2 ring-destructive/20 animate-pulse"></span>
                </button>
                
                <div className="h-10 w-[1px] bg-slate-100 mx-1"></div>
                
                <div className="flex items-center gap-4 pl-1 group cursor-pointer">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-black text-slate-800 leading-none group-hover:text-primary transition-colors">Ana Paula Oliveira</span>
                    <span className="text-[9px] text-primary font-black uppercase tracking-widest mt-1.5 opacity-70">RH Admin · AGIR</span>
                  </div>
                  <div className="h-11 w-11 rounded-xl bg-primary flex items-center justify-center text-white font-black text-xs shadow-lg shadow-primary/20 ring-2 ring-white transition-transform group-hover:scale-105">
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
