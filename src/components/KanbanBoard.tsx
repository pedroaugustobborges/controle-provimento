import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Clock, CheckCircle, MessageSquare, Paperclip, Activity, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Convocacao, StatusConvocacao } from '@/types/vaga';

interface KanbanColumnProps {
  title: string;
  icon: React.ElementType;
  count: number;
  color: string;
  children: React.ReactNode;
}

const KanbanColumn = ({ title, icon: Icon, count, color, children }: KanbanColumnProps) => (
  <div className="flex flex-col min-w-[320px] max-w-[320px] h-full bg-slate-50/50 rounded-xl border border-slate-200/50">
    <div className="p-4 flex items-center justify-between border-b border-slate-200/50 bg-white/50 rounded-t-xl">
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-lg ${color} bg-opacity-10`}>
          <Icon className={`h-4 w-4 ${color.replace('bg-', 'text-')}`} />
        </div>
        <h3 className="font-bold text-sm text-slate-700 uppercase tracking-tight">{title}</h3>
        <Badge variant="secondary" className="ml-2 bg-slate-200/50 text-slate-600 font-bold text-[10px] h-5 px-1.5">
          {count}
        </Badge>
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </div>
    <div className="p-3 flex flex-col gap-3 overflow-y-auto scrollbar-hide flex-1">
      {children}
    </div>
  </div>
);

interface KanbanCardProps {
  id: string;
  name: string;
  role: string;
  unit: string;
  date: string;
  priority?: 'high' | 'medium' | 'low';
  tags?: string[];
}

const KanbanCard = ({ name, role, unit, date, priority, tags }: KanbanCardProps) => (
  <Card className="shadow-sm hover:shadow-md transition-all duration-200 border-slate-200 cursor-grab active:cursor-grabbing group">
    <CardContent className="p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <h4 className="font-bold text-sm text-slate-800 leading-tight group-hover:text-primary transition-colors">{name}</h4>
          <span className="text-[11px] text-slate-500 font-medium mt-0.5">{role}</span>
        </div>
        {priority === 'high' && (
          <Badge className="bg-destructive/10 text-destructive border-none text-[9px] font-bold h-4 px-1 uppercase tracking-tighter">
            Urgente
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{date}</span>
        </div>
        <span>•</span>
        <span>{unit}</span>
      </div>

      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map(tag => (
            <span key={tag} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[9px] font-bold">
              {tag}
            </span>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

interface KanbanBoardProps {
  convocacoes: Convocacao[];
}

export function KanbanBoard({ convocacoes }: KanbanBoardProps) {
  const columns: { status: StatusConvocacao | 'finalizado', title: string, icon: any, color: string }[] = [
    { status: 'pendente', title: 'Aguardando Contato', icon: MessageSquare, color: 'bg-blue-500' },
    { status: 'aceite', title: 'Em Admissão', icon: Activity, color: 'bg-orange-500' },
    { status: 'desistiu', title: 'Desistências', icon: Paperclip, color: 'bg-purple-500' },
    { status: 'finalizado', title: 'Finalizados', icon: CheckCircle, color: 'bg-green-500' },
  ];

  const getConvocacoesByStatus = (status: string) => {
    // Treat 'aceite' as 'finalizado' for the sake of this mock display if we want, 
    // but better to map them logically
    if (status === 'finalizado') {
      return convocacoes.filter(c => ['aceite'].includes(c.status)).slice(0, 20);
    }
    return convocacoes.filter(c => c.status === status).slice(0, 20);
  };

  return (
    <div className="flex gap-6 overflow-x-auto pb-6 h-[calc(100vh-280px)] min-h-[500px]">
      {columns.map(col => {
        const items = getConvocacoesByStatus(col.status);
        return (
          <KanbanColumn 
            key={col.status} 
            title={col.title} 
            icon={col.icon} 
            count={items.length} 
            color={col.color}
          >
            {items.map(item => (
              <KanbanCard 
                key={item.id}
                id={item.id}
                name={item.nome_candidato}
                role={item.cargo}
                unit={item.unidade}
                date={item.data_convocacao}
                priority={item.classificacao === 1 ? 'high' : undefined}
                tags={[item.tipo_convocacao]}
              />
            ))}
            {items.length === 0 && (
              <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-xs italic">
                Nenhum registro
              </div>
            )}
          </KanbanColumn>
        );
      })}
    </div>
  );
}
