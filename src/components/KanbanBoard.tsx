import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Clock, CheckCircle, XCircle, AlertCircle, MoreHorizontal, MessageSquare, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  daysInStatus: number;
  priority?: 'high' | 'medium' | 'low';
  tags?: string[];
  comments?: number;
  attachments?: number;
}

const KanbanCard = ({ name, role, unit, daysInStatus, priority, tags, comments, attachments }: KanbanCardProps) => (
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
          <span>{daysInStatus} dias na etapa</span>
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

      <div className="pt-2 flex items-center justify-between border-t border-slate-100 mt-2">
        <div className="flex -space-x-1.5 overflow-hidden">
          {[1, 2].map(i => (
            <div key={i} className="inline-block h-5 w-5 rounded-full ring-2 ring-white bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-500 uppercase">
              {name.charAt(0)}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 text-slate-400">
          {comments && comments > 0 && (
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              <span className="text-[10px] font-medium">{comments}</span>
            </div>
          )}
          {attachments && attachments > 0 && (
            <div className="flex items-center gap-1">
              <Paperclip className="h-3 w-3" />
              <span className="text-[10px] font-medium">{attachments}</span>
            </div>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

export function KanbanBoard() {
  return (
    <div className="flex gap-6 overflow-x-auto pb-6 h-[calc(100vh-280px)] min-h-[500px]">
      <KanbanColumn title="Aguardando Contato" icon={MessageSquare} count={12} color="bg-blue-500">
        <KanbanCard 
          id="1" 
          name="Ana Paula Silva" 
          role="Enfermeiro Assistencial" 
          unit="HOSPITAL SÃO LUIZ" 
          daysInStatus={2}
          priority="high"
          comments={3}
          attachments={1}
        />
        <KanbanCard 
          id="2" 
          name="Carlos Eduardo Souza" 
          role="Técnico de Enfermagem" 
          unit="UNIDADE ANÁLIA FRANCO" 
          daysInStatus={4}
          tags={['CR', 'Recontratação']}
        />
        <KanbanCard 
          id="3" 
          name="Beatriz Oliveira" 
          role="Fisioterapeuta" 
          unit="HOSPITAL BRASIL" 
          daysInStatus={1}
        />
      </KanbanColumn>

      <KanbanColumn title="Em Exames Med." icon={Activity} count={8} color="bg-orange-500">
        <KanbanCard 
          id="4" 
          name="Marcos Roberto Lima" 
          role="Auxiliar Administrativo" 
          unit="MATERNIDADE STAR" 
          daysInStatus={5}
          comments={12}
        />
        <KanbanCard 
          id="5" 
          name="Juliana Mendes" 
          role="Enfermeiro UTI" 
          unit="HOSPITAL SÃO LUIZ" 
          daysInStatus={3}
          priority="high"
          attachments={2}
        />
      </KanbanColumn>

      <KanbanColumn title="Validando Docs" icon={Paperclip} count={5} color="bg-purple-500">
        <KanbanCard 
          id="6" 
          name="Rodrigo Santos" 
          role="Farmacêutico" 
          unit="UNIDADE MORUMBI" 
          daysInStatus={2}
          tags={['Pendente CRM']}
        />
      </KanbanColumn>

      <KanbanColumn title="Aguardando Integração" icon={User} count={15} color="bg-primary">
        <KanbanCard 
          id="7" 
          name="Fernanda Lima" 
          role="Nutricionista" 
          unit="HOSPITAL BRASIL" 
          daysInStatus={1}
          tags={['Turma 25/05']}
        />
      </KanbanColumn>

      <KanbanColumn title="Finalizados" icon={CheckCircle} count={42} color="bg-success">
         <KanbanCard 
          id="8" 
          name="Ricardo Pereira" 
          role="Médico Plantonista" 
          unit="HOSPITAL SÃO LUIZ" 
          daysInStatus={10}
        />
      </KanbanColumn>
    </div>
  );
}