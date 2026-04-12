import { useVagasStore } from '@/store/vagasStore';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, CheckCircle2, Clock, AlertTriangle, User, ArrowRight, MessageSquare, ClipboardList, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/vagaUtils';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';



export default function AlertasTarefasPage() {
  const { alertas, tarefas, historicoMensagens, updateAlerta, updateTarefa, marcarMensagemLida } = useVagasStore();
  const permissions = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'tarefas';


  const handleResolveAlerta = (id: string) => {
    updateAlerta(id, { status: 'resolvido' });
    toast.success('Alerta marcado como resolvido.');
  };

  const handleCompleteTarefa = (id: string) => {
    updateTarefa(id, { status: 'concluida' });
    toast.success('Tarefa concluída com sucesso.');
  };

  const groupedMessages = historicoMensagens.reduce((groups: { [key: string]: any[] }, message) => {
    const date = format(parseISO(message.data), 'yyyy-MM-dd');
    if (!groups[date]) groups[date] = [];
    groups[date].push(message);
    return groups;
  }, {});

  const sortedDates = Object.keys(groupedMessages).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Alertas e Tarefas"
      />


      <Tabs value={activeTab} onValueChange={(val) => setSearchParams({ tab: val })} className="space-y-4">

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
          <TabsTrigger value="historico" className="gap-2">
            <History className="h-4 w-4" /> Histórico de Mensagens
            {historicoMensagens.filter(m => !m.lida).length > 0 && (
              <Badge variant="destructive" className="ml-1 px-1.5 h-4 text-[11px]">
                {historicoMensagens.filter(m => !m.lida).length}
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

        <TabsContent value="historico" className="space-y-6">
          {sortedDates.length === 0 ? (
            <div className="py-12 text-center text-slate-400 italic bg-white rounded-lg border border-dashed">
              Nenhum histórico de mensagens encontrado.
            </div>
          ) : (
            <div className="space-y-8">
              {sortedDates.map((date) => (
                <div key={date} className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-slate-200"></div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                      {format(parseISO(date), "EEEE, d 'de' MMMM", { locale: ptBR })}
                    </span>
                    <div className="h-px flex-1 bg-slate-200"></div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupedMessages[date].map((msg) => (
                      <Card key={msg.id} className={cn(
                        "transition-all duration-200 border-l-4",
                        msg.lida ? "border-l-slate-200 opacity-80" : "border-l-blue-500 shadow-md ring-1 ring-blue-500/10"
                      )}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <Badge variant="outline" className={cn(
                              "text-[10px] uppercase font-bold",
                              msg.remetente === 'Agie' ? "bg-purple-50 text-purple-600 border-purple-200" : "bg-blue-50 text-blue-600 border-blue-200"
                            )}>
                              {msg.remetente}
                            </Badge>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {format(parseISO(msg.data), 'HH:mm')}
                            </span>
                          </div>
                          <CardTitle className="text-sm font-bold mt-2">Mensagem recebida</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs text-slate-600 leading-relaxed mb-4">{msg.conteudo}</p>
                          {!msg.lida && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                marcarMensagemLida(msg.id);
                                toast.success('Mensagem marcada como lida.');
                              }}
                              className="w-full h-8 text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-600"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1.5" /> Marcar como lida
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
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