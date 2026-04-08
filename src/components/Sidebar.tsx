import React from 'react';
import { 
  LayoutDashboard, 
  Briefcase, 
  FileText, 
  Search, 
  Users, 
  Bell, 
  CheckSquare, 
  History, 
  Settings,
  LogOut,
  PlusCircle,
  FileSearch,
  Users2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link, useLocation } from 'react-router-dom';

const navigation = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { name: 'Vagas', icon: Briefcase, href: '/vagas' },
  { name: 'Fila de Editais', icon: PlusCircle, href: '/fila-editais' },
  { name: 'Editais', icon: FileText, href: '/editais' },
  { name: 'Acompanhamento', icon: FileSearch, href: '/acompanhamento' },
  { name: 'Banco / Reserva', icon: Users, href: '/banco' },
  { name: 'Convocações', icon: Users2, href: '/convocacoes' },
  { name: 'Tarefas', icon: CheckSquare, href: '/tarefas' },
  { name: 'Alertas', icon: Bell, href: '/alertas' },
  { name: 'Importação', icon: History, href: '/importacao' },
  { name: 'Histórico', icon: History, href: '/historico' },
  { name: 'Configurações', icon: Settings, href: '/configuracoes' },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <div className="flex h-full flex-col gap-y-5 bg-card px-6 pb-4 border-r">
      <div className="flex h-16 shrink-0 items-center">
        <h1 className="text-2xl font-bold text-primary">HR Management</h1>
      </div>
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={cn(
                      location.pathname === item.href
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-primary hover:bg-muted',
                      'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors'
                    )}
                  >
                    <item.icon
                      className={cn(
                        location.pathname === item.href ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-primary',
                        'h-6 w-6 shrink-0'
                      )}
                      aria-hidden="true"
                    />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
          <li className="mt-auto">
            <button className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-muted-foreground hover:bg-muted hover:text-primary transition-colors w-full">
              <LogOut
                className="h-6 w-6 shrink-0 text-muted-foreground group-hover:text-primary"
                aria-hidden="true"
              />
              Sair
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
