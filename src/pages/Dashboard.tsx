import React from 'react';
import { 
  Users, 
  Briefcase, 
  CheckCircle2, 
  FileText, 
  Clock, 
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  UserPlus,
  Users2,
  CalendarDays,
  XCircle,
  PauseCircle,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

const stats = [
  { name: 'Vagas Ativas', value: '42', icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-100' },
  { name: 'Em Andamento', value: '28', icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-100' },
  { name: 'Processos Concluídos', value: '156', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  { name: 'Fila de Editais', value: '5', icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  { name: 'Movimentação Interna', value: '12', icon: ArrowUpRight, color: 'text-purple-600', bg: 'bg-purple-100' },
  { name: 'Vagas de Liderança', value: '3', icon: Users, color: 'text-rose-600', bg: 'bg-rose-100' },
  { name: 'Cadastro Reserva', value: '840', icon: Users2, color: 'text-cyan-600', bg: 'bg-cyan-100' },
  { name: 'Convocados', value: '24', icon: UserPlus, color: 'text-teal-600', bg: 'bg-teal-100' },
  { name: 'Vencidos', value: '18', icon: CalendarDays, color: 'text-orange-600', bg: 'bg-orange-100' },
  { name: 'Convocações Realizadas', value: '12', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  { name: 'Canceladas', value: '8', icon: XCircle, color: 'text-destructive', bg: 'bg-red-100' },
  { name: 'Dispensa', value: '4', icon: PauseCircle, color: 'text-slate-600', bg: 'bg-slate-100' },
  { name: 'Aguardar Anuência', value: '2', icon: HelpCircle, color: 'text-zinc-600', bg: 'bg-zinc-100' },
  { name: 'Etapas em Atraso', value: '6', icon: AlertTriangle, color: 'text-destructive', bg: 'bg-red-100' },
  { name: 'Editais Pendentes de Validação', value: '2', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
  { name: 'Tarefas Pendentes', value: '14', icon: CheckCircle2, color: 'text-indigo-600', bg: 'bg-indigo-100' },
];

export function Dashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground mt-2">Visão geral do fluxo operacional de vagas e editais.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className={cn(stat.bg, "p-3 rounded-lg")}>
                <stat.icon className={cn(stat.color, "h-6 w-6")} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-4">Vagas em Destaque</h3>
          <div className="space-y-4">
            {/* Placeholder for list */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                <div>
                  <p className="font-semibold text-primary">Req. #1234{i}</p>
                  <p className="text-sm text-muted-foreground">Analista de Sistemas - Unidade São Paulo</p>
                </div>
                <div className="text-right">
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">Em Edital</span>
                  <p className="text-xs text-muted-foreground mt-1">5 dias em aberto</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-4">Alertas Recentes</h3>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 p-4 border-l-4 border-l-destructive bg-destructive/5 rounded-r-lg">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-destructive">Prazo de triagem vencido</p>
                  <p className="text-xs text-muted-foreground">A vaga #5678{i} está com a etapa de triagem atrasada há 2 dias.</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
