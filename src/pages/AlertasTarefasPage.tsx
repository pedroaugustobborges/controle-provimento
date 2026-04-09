import { useVagasStore } from '@/store/vagasStore';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, CheckCircle2, Clock, AlertTriangle, User, ArrowRight, MessageSquare, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/vagaUtils';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';


export default function AlertasTarefasPage() {
  const { alertas, tarefas, updateAlerta, updateTarefa } = useVagasStore();
  const permissions = usePermissions();

  const handleResolveAlerta = (id: string) => {
    updateAlerta(id, { status: 'resolvido' });
    toast.success('Alerta marcado como resolvido.');
  };

  const handleCompleteTarefa = (id: string) => {
    updateTarefa(id, { status: 'concluida' });
    toast.success('Tarefa concluída com sucesso.');
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Alertas e Tarefas"
        subtitle="Monitoramento operacional de pendências críticas, atrasos e atividades delegadas à equipe."
        badge="Operacional"
      />


      <Tabs defaultValue="tarefas" className="space-y-4">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="tarefas" className="gap-2">
            <ClipboardList className="h-4 w-4" /> Minhas Tarefas
            {tarefas.filter(t => t.status === 'pendente').length > 0 && (
              <Badge variant="destructive" className="ml-1 px-1.5 h-4 text-[11px]">
                {tarefas.filter(t => t.status === 'pendente').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="alertas" className="gap-2">
            <Bell className="h-4 w-4" /> Alertas Operacionais
            {alertas.filter(a => a.status === 'nao_lido').length > 0 && (
              <Badge variant="destructive" className="ml-1 px-1.5 h-4 text-[11px]">
                {alertas.filter(a => a.status === 'nao_lido').length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tarefas" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tarefas.map((tarefa) => (
              <Card key={tarefa.id} className={`border-l-4 ${tarefa.status === 'concluida' ? 'border-l-green-500 opacity-60' : 'border-l-amber-500 shadow-sm'}`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <Badge variant={tarefa.prioridade === 'alta' ? 'destructive' : 'outline'} className="text-[11px] uppercase font-bold">
                      {tarefa.prioridade}
                    </Badge>
                    <span className="text-[11px] text-slate-400 font-medium">{formatDate(tarefa.data_criacao)}</span>
                  </div>
                  <CardTitle className="text-base font-bold mt-2">{tarefa.titulo}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">{tarefa.descricao}</p>
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-bold uppercase">
                      <User className="h-3.5 w-3.5" /> {tarefa.atribuido_a}
                    </div>
                    {tarefa.status === 'pendente' && (
                      <Button size="sm" onClick={() => handleCompleteTarefa(tarefa.id)} className="h-8 gap-1.5 text-[11px] font-bold">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Concluir
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {tarefas.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 italic">
                Nenhuma tarefa pendente encontrada.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="alertas" className="space-y-4">
          <div className="space-y-3">
            {alertas.map((alerta) => (
              <Card key={alerta.id} className={`border-none shadow-sm ${alerta.status === 'nao_lido' ? 'bg-amber-50/50' : 'bg-white'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${
                      alerta.tipo === 'atraso' ? 'bg-red-100 text-red-600' :
                      alerta.tipo === 'validacao' ? 'bg-blue-100 text-blue-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {alerta.tipo === 'atraso' ? <Clock className="h-5 w-5" /> :
                       alerta.tipo === 'validacao' ? <ShieldCheck className="h-5 w-5" /> :
                       <Bell className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-bold text-slate-800">{alerta.titulo}</h4>
                        <span className="text-[11px] text-slate-400 font-medium">{formatDate(alerta.data_criacao)}</span>
                      </div>
                      <p className="text-xs text-slate-600 mb-3">{alerta.mensagem}</p>
                      <div className="flex items-center gap-2">
                        {alerta.link && (
                          <Button variant="outline" size="sm" className="h-7 text-[11px] font-bold gap-1">
                            Acessar Registro <ArrowRight className="h-3 w-3" />
                          </Button>
                        )}
                        {permissions.isAdminAnalyst() && (
                          <Button variant="ghost" size="sm" className="h-7 text-[11px] font-bold gap-1 text-primary">
                            <MessageSquare className="h-3 w-3" /> Enviar Lembrete
                          </Button>
                        )}
                        {alerta.status !== 'resolvido' && (
                          <Button variant="ghost" size="sm" onClick={() => handleResolveAlerta(alerta.id)} className="h-7 text-[11px] font-bold gap-1 ml-auto">
                            <CheckCircle2 className="h-3 w-3" /> Marcar Lido
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {alertas.length === 0 && (
              <div className="py-12 text-center text-slate-400 italic">
                Nenhum alerta encontrado no momento.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ShieldCheck(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}