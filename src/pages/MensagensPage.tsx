import { useState, useMemo, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageSquare, 
  Send, 
  History, 
  Lightbulb, 
  Sparkles, 
  Search, 
  Users, 
  MapPin, 
  Shield, 
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useVagasStore } from "@/store/vagasStore";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { UNITS, ROLES } from "@/data/chatData";
import { Unit, Role, Message, ChatStep } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStore } from "@/store/adminStore";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function MensagensPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'comunicacao';
  
  const { 
    historicoMensagens, 
    alertas, 
    marcarMensagemLida, 
    updateAlerta 
  } = useVagasStore();
  
  const { currentUser } = useAdminStore();

  // Communication Hub State
  const [step, setStep] = useState<ChatStep>('INITIAL');
  const [selectedRegion, setSelectedRegion] = useState<'GOIÁS E ESPÍRITO SANTO' | 'AMAZONAS' | 'OUTRAS UNIDADES' | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [chatMessages, setChatMessages] = useState<Message[]>([]);

  // Feedback State
  const [feedbackType, setFeedbackType] = useState<'sugestao' | 'problema' | 'melhoria'>('sugestao');
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const groupedHistory = useMemo(() => {
    return historicoMensagens.reduce((groups: { [key: string]: any[] }, message) => {
      const date = format(parseISO(message.data), 'yyyy-MM-dd');
      if (!groups[date]) groups[date] = [];
      groups[date].push(message);
      return groups;
    }, {});
  }, [historicoMensagens]);

  const sortedDates = Object.keys(groupedHistory).sort((a, b) => b.localeCompare(a));

  const handleBack = () => {
    if (step === 'COMMUNICATION_HUB') setStep('INITIAL');
    if (step === 'FEEDBACK') setStep('INITIAL');
    if (step === 'NEWS') setStep('INITIAL');
    if (step === 'BY_REGION') setStep('COMMUNICATION_HUB');
    if (step === 'BY_ROLE') setStep('COMMUNICATION_HUB');
    if (step === 'BY_USER') setStep('COMMUNICATION_HUB');
    if (step === 'SUPERVISION') setStep('COMMUNICATION_HUB');
    if (step === 'BY_UNIT') setStep('BY_REGION');
    if (step === 'BY_PERSON') {
      if (selectedUnit) setStep('BY_UNIT');
      else if (selectedRole) setStep('BY_ROLE');
    }
    if (step === 'CONVERSATION') {
      if (selectedRole && (selectedRole.id === 'super-go-vit' || selectedRole.id === 'super-fora' || selectedRole.id === 'coordenadora')) {
        setStep('SUPERVISION');
      } else if (selectedUnit || selectedRole) {
        setStep('BY_PERSON');
      } else {
        setStep('COMMUNICATION_HUB');
      }
    }
  };

  const submitFeedback = async () => {
    if (!feedbackMessage.trim()) {
      toast.error("Por favor, descreva seu feedback.");
      return;
    }

    setIsSubmittingFeedback(true);
    try {
      const { error } = await supabase.from('feedbacks').insert({
        user_id: currentUser?.id,
        user_name: currentUser?.nome_completo || 'Anônimo',
        user_email: currentUser?.email || '',
        tipo: feedbackType,
        mensagem: feedbackMessage,
      });

      if (error) throw error;

      toast.success("Feedback enviado! Agradecemos sua contribuição.");
      setFeedbackMessage("");
      setStep('INITIAL');
    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      toast.error(error.message || "Tente novamente mais tarde.");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !selectedRecipient) return;
    const conteudo = inputText.trim();
    setInputText("");

    const optimisticId = Math.random().toString(36).substr(2, 9);
    const newMessage: Message = {
      id: optimisticId,
      senderId: 'current-user',
      senderName: currentUser?.nome_completo || 'Você',
      senderRole: 'Usuário',
      content: conteudo,
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, newMessage]);

    try {
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('id, nome_completo')
        .ilike('nome_completo', selectedRecipient.trim())
        .eq('status', 'ativo')
        .maybeSingle();

      if (profileErr || !profile) {
        toast.error(`Não foi possível localizar "${selectedRecipient}" no sistema.`);
        setChatMessages((prev) => prev.filter(m => m.id !== optimisticId));
        return;
      }

      await useVagasStore.getState().addMensagem({
        id: optimisticId,
        destinatario_id: profile.id,
        destinatario_nome: profile.nome_completo,
        conteudo,
        remetente: currentUser?.nome_completo || 'Você',
        remetente_nome: currentUser?.nome_completo || 'Você',
        titulo: `Mensagem de ${currentUser?.nome_completo || 'colega'}`,
      });
    } catch (e: any) {
      console.error('[MensagensPage sendMessage]', e);
      toast.error('Erro ao enviar mensagem.');
      setChatMessages((prev) => prev.filter(m => m.id !== optimisticId));
    }
  };

  // Live conversation history with selected recipient
  useEffect(() => {
    if (step !== 'CONVERSATION' || !selectedRecipient || !currentUser) return;
    const myId = currentUser.id;
    const recipientName = selectedRecipient.trim().toLowerCase();
    const convo = historicoMensagens
      .filter(m => {
        const remetenteName = (m.remetente || '').trim().toLowerCase();
        const isFromMeToThem = m.remetente_id === myId && (m.destinatario_nome || '').trim().toLowerCase() === recipientName;
        const isFromThemToMe = m.destinatario_id === myId && remetenteName === recipientName;
        return isFromMeToThem || isFromThemToMe;
      })
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
      .map<Message>(m => ({
        id: m.id,
        senderId: m.remetente_id === myId ? 'current-user' : 'other',
        senderName: m.remetente_id === myId ? (currentUser?.nome_completo || 'Você') : m.remetente,
        senderRole: '',
        content: m.conteudo,
        timestamp: new Date(m.data),
      }));
    setChatMessages(convo);
  }, [step, selectedRecipient, currentUser, historicoMensagens]);

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <PageHeader 
        title="Central de Comunicação"
      />

      <Tabs value={activeTab} onValueChange={(val) => setSearchParams({ tab: val })} className="space-y-6">
        <TabsList className="bg-muted p-1">
          <TabsTrigger value="comunicacao" className="gap-2 px-4">
            <MessageSquare className="h-4 w-4" /> Comunicação Interna
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2 px-4">
            <History className="h-4 w-4" /> Histórico de Mensagens
          </TabsTrigger>
          <TabsTrigger value="alertas" className="gap-2 px-4">
            <Clock className="h-4 w-4" /> Alertas e Notificações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="comunicacao" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Sidebar Menus */}
            <Card className="md:col-span-1 border-none shadow-sm h-fit">
              <CardContent className="p-4 space-y-2">
                <Button 
                  variant={step === 'INITIAL' || step === 'COMMUNICATION_HUB' ? 'secondary' : 'ghost'} 
                  className="w-full justify-start gap-3 h-11"
                  onClick={() => setStep('COMMUNICATION_HUB')}
                >
                  <Send className="h-4 w-4 text-blue-500" /> Enviar Mensagem
                </Button>
                <Button 
                  variant={step === 'FEEDBACK' ? 'secondary' : 'ghost'} 
                  className="w-full justify-start gap-3 h-11"
                  onClick={() => setStep('FEEDBACK')}
                >
                  <Lightbulb className="h-4 w-4 text-amber-500" /> Enviar Feedback
                </Button>
                <Button 
                  variant={step === 'NEWS' ? 'secondary' : 'ghost'} 
                  className="w-full justify-start gap-3 h-11"
                  onClick={() => setStep('NEWS')}
                >
                  <Sparkles className="h-4 w-4 text-purple-500" /> Novidades
                </Button>
              </CardContent>
            </Card>

            {/* Main Content Area */}
            <Card className="md:col-span-3 border-none shadow-sm min-h-[500px] flex flex-col">
              <CardContent className="p-6 flex-1 flex flex-col">
                {step !== 'INITIAL' && step !== 'COMMUNICATION_HUB' && step !== 'FEEDBACK' && step !== 'NEWS' && (
                  <Button variant="ghost" size="sm" className="mb-4 self-start gap-2" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4" /> Voltar
                  </Button>
                )}

                {/* INITIAL & HUB */}
                {(step === 'INITIAL' || step === 'COMMUNICATION_HUB') && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div>
                      <h2 className="text-xl font-bold">Para quem você deseja enviar uma mensagem?</h2>
                      <p className="text-sm text-muted-foreground mt-1">Selecione uma categoria de destinatário abaixo.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <SelectionCard 
                        icon={<MapPin className="h-5 w-5 text-blue-500" />}
                        title="Por Unidade"
                        description="Envie para analistas ou assistentes de uma unidade específica."
                        onClick={() => setStep('BY_REGION')}
                      />
                      <SelectionCard 
                        icon={<Users className="h-5 w-5 text-purple-500" />}
                        title="Por Cargo"
                        description="Selecione um papel específico (ex: Analista de Edital)."
                        onClick={() => setStep('BY_ROLE')}
                      />
                      <SelectionCard 
                        icon={<Shield className="h-5 w-5 text-red-500" />}
                        title="Supervisão"
                        description="Fale diretamente com as supervisoras ou coordenação."
                        onClick={() => setStep('SUPERVISION')}
                      />
                      <SelectionCard 
                        icon={<Search className="h-5 w-5 text-slate-500" />}
                        title="Buscar Usuário"
                        description="Procure por um colaborador específico pelo nome."
                        onClick={() => setStep('BY_USER')}
                      />
                    </div>
                  </div>
                )}

                {/* BY REGION */}
                {step === 'BY_REGION' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div>
                      <h2 className="text-xl font-bold">Selecione a Região</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <Button variant="outline" className="h-16 justify-between px-6 text-lg" onClick={() => { setSelectedRegion('GOIÁS E ESPÍRITO SANTO'); setStep('BY_UNIT'); }}>
                        Goiás e Espírito Santo <ChevronRight className="h-5 w-5" />
                      </Button>
                      <Button variant="outline" className="h-16 justify-between px-6 text-lg" onClick={() => { setSelectedRegion('AMAZONAS'); setStep('BY_UNIT'); }}>
                        Amazonas <ChevronRight className="h-5 w-5" />
                      </Button>
                      <Button variant="outline" className="h-16 justify-between px-6 text-lg" onClick={() => { setSelectedRegion('OUTRAS UNIDADES'); setStep('BY_UNIT'); }}>
                        Outras Unidades <ChevronRight className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* BY UNIT */}
                {step === 'BY_UNIT' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <h2 className="text-xl font-bold">Unidades em {selectedRegion}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {UNITS.filter(u => u.region === selectedRegion).map(unit => (
                        <Button key={unit.id} variant="outline" className="h-auto py-3 justify-start" onClick={() => { setSelectedUnit(unit); setStep('BY_PERSON'); }}>
                          {unit.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* BY PERSON */}
                {step === 'BY_PERSON' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <h2 className="text-xl font-bold">Falar com quem no {selectedUnit?.name}?</h2>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Analistas</p>
                        <div className="grid gap-2">
                          {selectedUnit?.analysts.map(person => (
                            <Button key={person} variant="outline" className="justify-start" onClick={() => { setSelectedRecipient(person); setStep('CONVERSATION'); }}>
                              {person}
                            </Button>
                          ))}
                        </div>
                      </div>
                      {selectedUnit?.assistants.length! > 0 && (
                        <div>
                          <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Assistentes</p>
                          <div className="grid gap-2">
                            {selectedUnit?.assistants.map(person => (
                              <Button key={person} variant="outline" className="justify-start" onClick={() => { setSelectedRecipient(person); setStep('CONVERSATION'); }}>
                                {person}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* CONVERSATION */}
                {step === 'CONVERSATION' && (
                  <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-300">
                    <div className="pb-4 border-b mb-4">
                      <h2 className="text-xl font-bold">Conversa com {selectedRecipient}</h2>
                      <p className="text-sm text-muted-foreground">O histórico completo aparecerá em instantes.</p>
                    </div>
                    
                    <ScrollArea className="flex-1 pr-4 mb-4">
                      <div className="space-y-4">
                        {chatMessages.length === 0 ? (
                          <div className="py-20 text-center text-muted-foreground italic">
                            Inicie sua conversa enviando uma mensagem abaixo.
                          </div>
                        ) : (
                          chatMessages.map((msg) => (
                            <div key={msg.id} className={cn(
                              "max-w-[80%] rounded-2xl p-4 shadow-sm",
                              msg.senderId === 'current-user' 
                                ? "bg-primary text-white ml-auto rounded-tr-none" 
                                : "bg-muted text-foreground rounded-tl-none"
                            )}>
                              <p className="text-sm">{msg.content}</p>
                              <p className={cn(
                                "text-[10px] mt-2 opacity-70",
                                msg.senderId === 'current-user' ? "text-right" : "text-left"
                              )}>
                                {format(msg.timestamp, 'HH:mm')}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>

                    <div className="flex gap-2 pt-4 border-t">
                      <Input 
                        placeholder="Digite sua mensagem..." 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                      />
                      <Button onClick={sendMessage}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* FEEDBACK */}
                {step === 'FEEDBACK' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div>
                      <h2 className="text-xl font-bold">Sua opinião é fundamental</h2>
                      <p className="text-sm text-muted-foreground mt-1">Relate problemas ou sugira melhorias para o sistema.</p>
                    </div>
                    
                    <div className="space-y-4 max-w-xl">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-muted-foreground">Tipo de Feedback</label>
                        <Select value={feedbackType} onValueChange={(v: any) => setFeedbackType(v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sugestao">Sugestão de melhoria</SelectItem>
                            <SelectItem value="problema">Relato de problema</SelectItem>
                            <SelectItem value="melhoria">Oportunidade de melhoria</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-muted-foreground">Sua Mensagem</label>
                        <Textarea 
                          placeholder="Descreva detalhadamente..." 
                          className="min-h-[150px]"
                          value={feedbackMessage}
                          onChange={(e) => setFeedbackMessage(e.target.value)}
                        />
                      </div>

                      <Button 
                        className="w-full h-11 font-bold" 
                        onClick={submitFeedback}
                        disabled={isSubmittingFeedback}
                      >
                        {isSubmittingFeedback ? "Enviando..." : "Enviar Feedback"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* NEWS */}
                {step === 'NEWS' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <h2 className="text-xl font-bold">O que há de novo no Sistema AGIR</h2>
                    <div className="space-y-4">
                      <NewsItem 
                        title="Novo Painel de Monitoramento"
                        date="Hoje"
                        content="Agora você pode visualizar métricas em tempo real de todas as unidades integradas."
                        tag="Novo"
                      />
                      <NewsItem 
                        title="Integração com Supabase"
                        date="Há 2 dias"
                        content="Melhorias significativas na velocidade de sincronização de dados."
                        tag="Melhoria"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="historico">
          <Card className="border-none shadow-sm">
            <CardContent className="p-6">
              {sortedDates.length === 0 ? (
                <div className="py-20 text-center text-muted-foreground italic bg-muted/20 rounded-xl border border-dashed">
                  Nenhum histórico de mensagens encontrado.
                </div>
              ) : (
                <div className="space-y-8">
                  {sortedDates.map((date) => (
                    <div key={date} className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="h-px flex-1 bg-border"></div>
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-3 py-1 rounded-full">
                          {format(parseISO(date), "EEEE, d 'de' MMMM", { locale: ptBR })}
                        </span>
                        <div className="h-px flex-1 bg-border"></div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {groupedHistory[date].map((msg) => (
                          <MessageCard key={msg.id} msg={msg} onMarkRead={() => marcarMensagemLida(msg.id)} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alertas">
          <div className="space-y-4">
            {alertas.length === 0 ? (
              <Card className="border-none shadow-sm">
                <CardContent className="p-10 text-center text-muted-foreground italic">
                  Nenhum alerta ou notificação no momento.
                </CardContent>
              </Card>
            ) : (
              alertas.map((alerta) => (
                <AlertaCard key={alerta.id} alerta={alerta} onUpdate={() => updateAlerta(alerta.id, { status: 'lido' })} />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SelectionCard({ icon, title, description, onClick }: { icon: React.ReactNode, title: string, description: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="p-5 text-left bg-white border rounded-2xl hover:border-primary hover:shadow-md transition-all group"
    >
      <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
        {icon}
      </div>
      <h3 className="font-bold text-foreground mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </button>
  );
}

function NewsItem({ title, date, content, tag }: { title: string, date: string, content: string, tag: string }) {
  return (
    <div className="p-4 rounded-xl border bg-muted/30">
      <div className="flex justify-between items-start mb-2">
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">{tag}</Badge>
        <span className="text-[10px] text-muted-foreground font-bold">{date}</span>
      </div>
      <h4 className="font-bold text-sm mb-1">{title}</h4>
      <p className="text-xs text-muted-foreground">{content}</p>
    </div>
  );
}

function MessageCard({ msg, onMarkRead }: { msg: any, onMarkRead: () => void }) {
  return (
    <Card className={cn(
      "transition-all duration-200 border-l-4",
      msg.lida ? "border-l-slate-200 opacity-80" : "border-l-blue-500 shadow-md ring-1 ring-blue-500/10"
    )}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <Badge variant="outline" className={cn(
            "text-[10px] uppercase font-bold",
            msg.remetente === 'Agie' ? "bg-purple-50 text-purple-600 border-purple-200" : "bg-blue-50 text-blue-600 border-blue-200"
          )}>
            {msg.remetente}
          </Badge>
          <span className="text-[10px] text-muted-foreground font-medium">
            {format(parseISO(msg.data), 'HH:mm')}
          </span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed mb-4">{msg.conteudo}</p>
        {!msg.lida && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onMarkRead}
            className="w-full h-8 text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-600"
          >
            <CheckCircle2 className="h-3 w-3 mr-1.5" /> Marcar como lida
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function AlertaCard({ alerta, onUpdate }: { alerta: any, onUpdate: () => void }) {
  return (
    <Card className={cn(
      "border-none shadow-sm",
      alerta.status === 'nao_lido' ? 'bg-amber-50/50' : 'bg-white'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className={cn(
            "p-2 rounded-lg",
            alerta.tipo === 'atraso' ? 'bg-red-100 text-red-600' :
            alerta.tipo === 'validacao' ? 'bg-blue-100 text-blue-600' :
            'bg-slate-100 text-slate-600'
          )}>
            {alerta.tipo === 'atraso' ? <Clock className="h-5 w-5" /> :
             alerta.tipo === 'validacao' ? <Shield className="h-5 w-5" /> :
             <AlertTriangle className="h-5 w-5" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-bold text-slate-800">{alerta.titulo}</h4>
              <span className="text-[11px] text-slate-400 font-medium">{format(parseISO(alerta.data_criacao), "d 'de' MMM, HH:mm", { locale: ptBR })}</span>
            </div>
            <p className="text-xs text-slate-600 mb-3">{alerta.mensagem}</p>
            <div className="flex items-center gap-2">
              {alerta.link && (
                <Button variant="outline" size="sm" className="h-7 text-[11px] font-bold gap-1" onClick={() => window.location.href = alerta.link}>
                  Acessar Registro <ExternalLink className="h-3 w-3" />
                </Button>
              )}
              {alerta.status !== 'lido' && (
                <Button variant="ghost" size="sm" onClick={onUpdate} className="h-7 text-[11px] font-bold gap-1 ml-auto">
                  <CheckCircle2 className="h-3 w-3" /> Marcar Lido
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}