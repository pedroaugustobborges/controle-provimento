import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center justify-between border-b bg-white px-6 shrink-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="h-9 w-9" />
              <div className="h-4 w-[1px] bg-slate-200 hidden md:block"></div>
              <span className="text-xs font-medium text-slate-500 hidden md:block uppercase tracking-wider">
                Recrutamento & Seleção · Portal do Analista
              </span>
            </div>
            <div className="flex items-center gap-4">
               <div className="flex flex-col items-end mr-2">
                  <span className="text-xs font-bold text-slate-700">Equipe RH</span>
                  <span className="text-[10px] text-primary font-medium">Administrador</span>
               </div>
               <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                  RH
               </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
