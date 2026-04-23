import React from 'react';
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Users,
  Bell,
  Settings,
  LogOut,
  PlusCircle,
  FileSearch,
  Users2,
  ShieldCheck,
  History,
  TrendingUp,
  FileSpreadsheet,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const navigation = [
  { name: 'Início', icon: LayoutDashboard, href: '/' },
  { name: 'Controle de Vagas', icon: Briefcase, href: '/vagas' },
  { name: 'Publicação de Edital', icon: PlusCircle, href: '/fila-editais' },
  { name: 'Redação de Edital', icon: FileText, href: '/fila-analista-edital' },
  { name: 'Validação de Edital', icon: FileSearch, href: '/validacao-editais' },
  { name: 'Cadastro Reserva', icon: Users, href: '/banco-talentos' },
  { name: 'Convocações', icon: Users2, href: '/convocacoes' },
  { name: 'Alertas e Tarefas', icon: Bell, href: '/alertas-tarefas' },
  { name: 'Monitoramento', icon: TrendingUp, href: '/monitoramento' },
  { name: 'Importações', icon: History, href: '/importacoes' },
  { name: 'Relatórios', icon: FileSpreadsheet, href: '/relatorios' },
  { name: 'Mensagens', icon: MessageSquare, href: '/mensagens' },
  { name: 'Administração', icon: Settings, href: '/gestor' },
  { name: 'Portal RH', icon: ShieldCheck, href: '/portal-rh' },
];

export function Sidebar() {
  const location = useLocation();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="flex h-full flex-col gap-y-5 bg-slate-900 px-6 pb-4 border-r border-white/10">
      <div className="flex h-16 shrink-0 items-center">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
            <ShieldCheck className="text-white h-5 w-5" />
          </div>
          <h1 className="text-xl font-black text-white tracking-tight uppercase">AGIR</h1>
        </div>
      </div>
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-4">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={cn(
                      location.pathname === item.href
                        ? 'bg-white/10 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-white/5',
                      'group flex gap-x-3 rounded-xl p-2.5 text-[13px] leading-6 font-bold transition-all duration-200'
                    )}
                  >
                    <item.icon
                      className={cn(
                        location.pathname === item.href ? 'text-primary' : 'text-slate-500 group-hover:text-white',
                        'h-5 w-5 shrink-0 transition-colors'
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
            <button 
              onClick={handleLogout}
              className="group -mx-2 flex gap-x-3 rounded-xl p-2.5 text-[13px] font-bold leading-6 text-slate-400 hover:bg-white/5 hover:text-rose-400 transition-all w-full"
            >
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
