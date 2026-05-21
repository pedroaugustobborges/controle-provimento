import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  AlertTriangle, 
  Send, 
  Inbox, 
  Search, 
  X,
  ExternalLink,
  Info,
  ChevronRight,
  Lightbulb,
  ArrowLeft,
  MessageSquare,
  Sparkles,
  MapPin,
  Users,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useVagasStore } from '@/store/vagasStore';
import { cn } from '@/lib/utils';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { UNITS, ROLES } from '@/data/chatData';
import { Unit, Role, Message } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';
import { useAdminStore } from '@/store/adminStore';
import { toast } from 'sonner';

type PopoverView = 
  | 'menu'
  | 'mensagens'
  | 'msg-by-region'
  | 'msg-by-unit'
  | 'msg-by-person'
  | 'msg-by-role'
  | 'msg-by-user'
  | 'msg-supervision'
  | 'msg-conversation'
  | 'msg-sent'
  | 'msg-received'
  | 'alertas'
  | 'notificacoes'
  | 'feedback'
  | 'novidades';

// Expressive Agie Avatar (No mouth, only eyes)
function AgieAvatar({ expression = 'default', className = "" }: { expression?: 'default' | 'curious' | 'attention' | 'alert', className?: string }) {
  return (
    <div className={cn("relative flex items-center justify-center bg-primary rounded-full overflow-hidden shadow-inner", className)}>
      <motion.div 
        animate={{ y: expression === 'alert' ? [0, -0.5, 0.5, 0] : [0, -0.3, 0.3, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="flex gap-1.5"
      >
        <motion.div 
          animate={
            expression === 'default' ? { height: [6, 6, 6, 1.5, 6] } :
            expression === 'curious' ? { height: [6, 7, 6], rotate: -3 } :
            expression === 'attention' ? { height: 7, width: 7 } :
            expression === 'alert' ? { height: [6, 7, 6], scale: 1.05 } : {}
          }
          transition={
            expression === 'default' ? { duration: 5, repeat: Infinity, times: [0, 0.85, 0.92, 0.95, 1], ease: "easeInOut" } :
            { duration: 2, repeat: expression === 'curious' ? Infinity : 0, ease: "easeInOut" }
          }
          className="w-1.5 bg-white rounded-full shadow-[0_0_6px_rgba(255,255,255,0.6)]" 
        />
        <motion.div 
          animate={
            expression === 'default' ? { height: [6, 6, 6, 1.5, 6] } :
            expression === 'curious' ? { height: [6, 7, 6], rotate: 3, y: -0.5 } :
            expression === 'attention' ? { height: 7, width: 7 } :
            expression === 'alert' ? { height: [6, 7, 6], scale: 1.05 } : {}
          }
          transition={
            expression === 'default' ? { duration: 5, repeat: Infinity, times: [0, 0.85, 0.92, 0.95, 1], ease: "easeInOut" } :
            { duration: 2, repeat: expression === 'curious' ? Infinity : 0, ease: "easeInOut" }
          }
          className="w-1.5 bg-white rounded-full shadow-[0_0_6px_rgba(255,255,255,0.6)]" 
        />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
    </div>
  );
}

export function AIAssistant() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [expression, setExpression] = useState<'default' | 'curious' | 'attention' | 'alert'>('default');
  const [currentView, setCurrentView] = useState<PopoverView>('menu');

  // Message sub-state
  const [selectedRegion, setSelectedRegion] = useState<'GOIÁS E ESPÍRITO SANTO' | 'AMAZONAS' | 'OUTRAS UNIDADES' | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Feedback
  const [feedbackType, setFeedbackType] = useState<'sugestao' | 'problema' | 'melhoria'>('sugestao');
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const { currentUser } = useAdminStore();

  const { 
    historicoMensagens, 
    alertas, 
    marcarMensagemLida, 
    updateAlerta,
  } = useVagasStore();

  const unreadMessagesCount = useMemo(() => 
    historicoMensagens.filter(m => !m.lida).length, 
  [historicoMensagens]);
  
  const unreadAlertsCount = useMemo(() => 
    alertas.filter(a => a.status === 'nao_lido').length, 
  [alertas]);

  const totalUnread = unreadMessagesCount + unreadAlertsCount;

  const sentMessages = useMemo(() => 
    historicoMensagens.filter(m => m.remetente === 'Você' || m.remetente === 'Usuário'),
  [historicoMensagens]);
  
  const receivedMessages = useMemo(() => 
    historicoMensagens.filter(m => m.remetente !== 'Você' && m.remetente !== 'Usuário'),
  [historicoMensagens]);

  useEffect(() => {
    if (totalUnread > 0) setExpression('attention');
    else if (isOpen) setExpression('curious');
    else setExpression('default');
  }, [totalUnread, isOpen]);

  // Reset view when closing
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setCurrentView('menu');
        setSelectedRegion(null);
        setSelectedUnit(null);
        setSelectedRole(null);
        setSelectedRecipient(null);
        setChatMessages([]);
        setSearchTerm("");
      }, 300);
    }
  }, [isOpen]);

  const handleBack = () => {
    const backMap: Record<PopoverView, PopoverView> = {
      'menu': 'menu',
      'mensagens': 'menu',
      'msg-by-region': 'mensagens',
      'msg-by-unit': 'msg-by-region',
      'msg-by-person': selectedUnit ? 'msg-by-unit' : 'msg-by-role',
      'msg-by-role': 'mensagens',
      'msg-by-user': 'mensagens',
      'msg-supervision': 'mensagens',
      'msg-conversation': selectedUnit ? 'msg-by-person' : selectedRole ? 'msg-supervision' : 'mensagens',
      'msg-sent': 'mensagens',
      'msg-received': 'mensagens',
      'alertas': 'menu',
      'notificacoes': 'menu',
      'feedback': 'menu',
      'novidades': 'menu',
    };
    setCurrentView(backMap[currentView]);
  };

  const handleNotificationClick = (alerta: any) => {
    updateAlerta(alerta.id, { status: 'lido' });
    if (alerta.link) {
      navigate(alerta.link);
      setIsOpen(false);
    }
  };

  const handleMessageClick = (msg: any) => {
    if (!msg.lida) marcarMensagemLida(msg.id);
    setIsOpen(false);
  };

  const sendMessage = () => {
    if (!inputText.trim()) return;
    const newMsg: Message = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: 'current-user',
      senderName: 'Você',
      senderRole: 'Usuário',
      content: inputText,
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, newMsg]);
    setInputText("");
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        senderId: 'agie',
        senderName: 'Agie',
        senderRole: 'Assistente',
        content: `Recebi sua mensagem! Vou encaminhar para ${selectedRecipient} agora mesmo.`,
        timestamp: new Date(),
        isReply: true,
      }]);
    }, 1000);
  };

  const submitFeedback = async () => {
    if (!feedbackMessage.trim()) { toast.error("Descreva seu feedback."); return; }
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
      toast.success("Feedback enviado! Obrigado.");
      setFeedbackMessage("");
      setCurrentView('menu');
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar feedback.");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const getViewTitle = (): string => {
    const titles: Record<PopoverView, string> = {
      'menu': 'Central de Comunicação',
      'mensagens': 'Mensagens',
      'msg-by-region': 'Enviar por Unidade',
      'msg-by-unit': selectedRegion || 'Unidades',
      'msg-by-person': selectedUnit?.name || 'Selecionar Pessoa',
      'msg-by-role': 'Enviar por Cargo',
      'msg-by-user': 'Buscar por Nome',
      'msg-supervision': 'Supervisão / Coordenação',
      'msg-conversation': selectedRecipient || 'Conversa',
      'msg-sent': 'Mensagens Enviadas',
      'msg-received': 'Mensagens Recebidas',
      'alertas': 'Alertas do Sistema',
      'notificacoes': 'Notificações',
      'feedback': 'Feedback / Melhorias',
      'novidades': 'Novidades do Sistema',
    };
    return titles[currentView];
  };

  // All people for search
  const allPeople = useMemo(() => {
    const people = new Set<string>();
    UNITS.forEach(u => { u.analysts.forEach(a => people.add(a)); u.assistants.forEach(a => people.add(a)); });
    ROLES.forEach(r => r.users.forEach(u => people.add(u)));
    return Array.from(people).sort();
  }, []);

  const filteredPeople = useMemo(() => {
    if (!searchTerm.trim()) return allPeople;
    return allPeople.filter(p => p.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm, allPeople]);

  return (
    <div className="fixed bottom-6 right-6 z-[60]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute bottom-20 right-0 w-[380px] h-[520px] bg-background rounded-2xl shadow-2xl border flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-3 bg-primary text-white flex items-center gap-2 shrink-0">
              {currentView !== 'menu' && (
                <button onClick={handleBack} className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              {currentView === 'menu' && (
                <AgieAvatar expression="curious" className="h-8 w-8 border-2 border-white/20" />
              )}
              <div className="flex-1 text-left">
                <h3 className="text-sm font-bold text-white leading-tight">{getViewTitle()}</h3>
                {currentView === 'menu' && (
                  <p className="text-white/70 text-[10px]">Olá! Eu sou a Agie. Como posso ajudar?</p>
                )}
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-3">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentView}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    {/* MENU PRINCIPAL */}
                    {currentView === 'menu' && (
                      <div className="space-y-1.5">
                        <MenuItem icon={<MessageSquare className="h-4 w-4 text-blue-500" />} label="Mensagens" badge={unreadMessagesCount} onClick={() => setCurrentView('mensagens')} />
                        <MenuItem icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} label="Alertas do Sistema" badge={alertas.filter(a => a.tipo === 'atraso' || a.tipo === 'critico').length} onClick={() => setCurrentView('alertas')} />
                        <MenuItem icon={<Bell className="h-4 w-4 text-purple-500" />} label="Notificações" badge={unreadAlertsCount} onClick={() => setCurrentView('notificacoes')} />
                        <MenuItem icon={<Lightbulb className="h-4 w-4 text-amber-500" />} label="Feedback / Melhorias" onClick={() => setCurrentView('feedback')} />
                        <MenuItem icon={<Sparkles className="h-4 w-4 text-indigo-500" />} label="Novidades do Sistema" onClick={() => setCurrentView('novidades')} />
                      </div>
                    )}

                    {/* SUB-MENU MENSAGENS */}
                    {currentView === 'mensagens' && (
                      <div className="space-y-1.5">
                        <MenuItem icon={<MapPin className="h-4 w-4 text-blue-500" />} label="Enviar por Unidade" onClick={() => setCurrentView('msg-by-region')} />
                        <MenuItem icon={<Users className="h-4 w-4 text-purple-500" />} label="Enviar por Cargo" onClick={() => setCurrentView('msg-by-role')} />
                        <MenuItem icon={<Shield className="h-4 w-4 text-red-500" />} label="Supervisão / Coordenação" onClick={() => setCurrentView('msg-supervision')} />
                        <MenuItem icon={<Search className="h-4 w-4 text-muted-foreground" />} label="Buscar por Nome" onClick={() => setCurrentView('msg-by-user')} />
                        <div className="border-t my-2" />
                        <MenuItem icon={<Send className="h-4 w-4 text-emerald-500" />} label="Histórico Enviadas" badge={sentMessages.length} onClick={() => setCurrentView('msg-sent')} />
                        <MenuItem icon={<Inbox className="h-4 w-4 text-sky-500" />} label="Histórico Recebidas" badge={unreadMessagesCount} onClick={() => setCurrentView('msg-received')} />
                      </div>
                    )}

                    {/* BY REGION */}
                    {currentView === 'msg-by-region' && (
                      <div className="space-y-2">
                        <Button variant="outline" className="w-full justify-between h-12" onClick={() => { setSelectedRegion('GOIÁS E ESPÍRITO SANTO'); setCurrentView('msg-by-unit'); }}>
                          Goiás e Espírito Santo <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" className="w-full justify-between h-12" onClick={() => { setSelectedRegion('AMAZONAS'); setCurrentView('msg-by-unit'); }}>
                          Amazonas <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" className="w-full justify-between h-12" onClick={() => { setSelectedRegion('OUTRAS UNIDADES'); setCurrentView('msg-by-unit'); }}>
                          Outras Unidades <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {/* BY UNIT */}
                    {currentView === 'msg-by-unit' && (
                      <div className="space-y-1.5">
                        {UNITS.filter(u => u.region === selectedRegion).map(unit => (
                          <Button key={unit.id} variant="outline" className="w-full justify-start h-10 text-xs" onClick={() => { setSelectedUnit(unit); setCurrentView('msg-by-person'); }}>
                            {unit.name}
                          </Button>
                        ))}
                      </div>
                    )}

                    {/* BY PERSON */}
                    {currentView === 'msg-by-person' && (
                      <div className="space-y-3">
                        {selectedUnit && (
                          <>
                            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Analistas</p>
                            {selectedUnit.analysts.map(person => (
                              <Button key={person} variant="outline" className="w-full justify-start text-xs h-9" onClick={() => { setSelectedRecipient(person); setCurrentView('msg-conversation'); }}>
                                {person}
                              </Button>
                            ))}
                            {selectedUnit.assistants.length > 0 && (
                              <>
                                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mt-3">Assistentes</p>
                                {selectedUnit.assistants.map(person => (
                                  <Button key={person} variant="outline" className="w-full justify-start text-xs h-9" onClick={() => { setSelectedRecipient(person); setCurrentView('msg-conversation'); }}>
                                    {person}
                                  </Button>
                                ))}
                              </>
                            )}
                          </>
                        )}
                        {selectedRole && (
                          selectedRole.users.map(person => (
                            <Button key={person} variant="outline" className="w-full justify-start text-xs h-9" onClick={() => { setSelectedRecipient(person); setCurrentView('msg-conversation'); }}>
                              {person}
                            </Button>
                          ))
                        )}
                      </div>
                    )}

                    {/* BY ROLE */}
                    {currentView === 'msg-by-role' && (
                      <div className="space-y-1.5">
                        {ROLES.filter(r => !['super-go-vit', 'super-fora', 'coordenadora'].includes(r.id)).map(role => (
                          <Button key={role.id} variant="outline" className="w-full justify-start text-xs h-auto py-2 whitespace-normal text-left" onClick={() => { setSelectedRole(role); setCurrentView('msg-by-person'); }}>
                            {role.label}
                          </Button>
                        ))}
                      </div>
                    )}

                    {/* SUPERVISION */}
                    {currentView === 'msg-supervision' && (
                      <div className="space-y-1.5">
                        {ROLES.filter(r => ['super-go-vit', 'super-fora', 'coordenadora'].includes(r.id)).map(role => (
                          <Button key={role.id} variant="outline" className="w-full justify-between text-xs h-auto py-3 whitespace-normal text-left" onClick={() => { setSelectedRecipient(role.users[0]); setSelectedRole(role); setCurrentView('msg-conversation'); }}>
                            <div>
                              <p className="font-bold">{role.users[0]}</p>
                              <p className="text-[10px] text-muted-foreground">{role.label}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0" />
                          </Button>
                        ))}
                      </div>
                    )}

                    {/* BY USER (search) */}
                    {currentView === 'msg-by-user' && (
                      <div className="space-y-3">
                        <Input placeholder="Digite o nome..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="h-9 text-xs" />
                        <div className="space-y-1">
                          {filteredPeople.map(person => (
                            <Button key={person} variant="ghost" className="w-full justify-start text-xs h-8" onClick={() => { setSelectedRecipient(person); setCurrentView('msg-conversation'); }}>
                              {person}
                            </Button>
                          ))}
                          {filteredPeople.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-4">Nenhum resultado encontrado.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* CONVERSATION */}
                    {currentView === 'msg-conversation' && (
                      <div className="flex flex-col" style={{ height: '380px' }}>
                        <div className="flex-1 overflow-y-auto space-y-3 mb-3">
                          {chatMessages.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-10 italic">Inicie a conversa enviando uma mensagem.</p>
                          ) : chatMessages.map(msg => (
                            <div key={msg.id} className={cn(
                              "max-w-[85%] rounded-2xl p-3 text-xs shadow-sm",
                              msg.senderId === 'current-user'
                                ? "bg-primary text-white ml-auto rounded-tr-none"
                                : "bg-muted text-foreground rounded-tl-none"
                            )}>
                              <p>{msg.content}</p>
                              <p className={cn("text-[9px] mt-1 opacity-60", msg.senderId === 'current-user' ? "text-right" : "")}>
                                {format(msg.timestamp, 'HH:mm')}
                              </p>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 pt-2 border-t shrink-0">
                          <Input placeholder="Mensagem..." value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} className="h-8 text-xs" />
                          <Button size="sm" onClick={sendMessage} className="h-8 px-3"><Send className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    )}

                    {/* SENT MESSAGES */}
                    {currentView === 'msg-sent' && (
                      <div className="space-y-2">
                        {sentMessages.length === 0 ? (
                          <EmptyState icon={<Send className="h-6 w-6 text-muted-foreground/40" />} text="Nenhuma mensagem enviada" />
                        ) : sentMessages.map(msg => (
                          <MessageItem key={msg.id} msg={msg} type="sent" onClick={() => handleMessageClick(msg)} />
                        ))}
                      </div>
                    )}

                    {/* RECEIVED MESSAGES */}
                    {currentView === 'msg-received' && (
                      <div className="space-y-2">
                        {receivedMessages.length === 0 ? (
                          <EmptyState icon={<Inbox className="h-6 w-6 text-muted-foreground/40" />} text="Nenhuma mensagem recebida" />
                        ) : receivedMessages.map(msg => (
                          <MessageItem key={msg.id} msg={msg} type="received" onClick={() => handleMessageClick(msg)} />
                        ))}
                      </div>
                    )}

                    {/* ALERTAS */}
                    {currentView === 'alertas' && (
                      <div className="space-y-2">
                        {alertas.filter(a => a.tipo === 'atraso' || a.tipo === 'critico').length === 0 ? (
                          <EmptyState icon={<AlertTriangle className="h-6 w-6 text-muted-foreground/40" />} text="Nenhum alerta pendente" />
                        ) : alertas.filter(a => a.tipo === 'atraso' || a.tipo === 'critico').map(alerta => (
                          <AlertaItem key={alerta.id} alerta={alerta} onClick={() => handleNotificationClick(alerta)} />
                        ))}
                      </div>
                    )}

                    {/* NOTIFICAÇÕES */}
                    {currentView === 'notificacoes' && (
                      <div className="space-y-2">
                        {alertas.length === 0 ? (
                          <EmptyState icon={<Bell className="h-6 w-6 text-muted-foreground/40" />} text="Nenhuma notificação" />
                        ) : alertas.map(alerta => (
                          <AlertaItem key={alerta.id} alerta={alerta} onClick={() => handleNotificationClick(alerta)} />
                        ))}
                      </div>
                    )}

                    {/* FEEDBACK */}
                    {currentView === 'feedback' && (
                      <div className="space-y-4">
                        <p className="text-xs text-muted-foreground">Relate problemas ou sugira melhorias.</p>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground">Tipo</label>
                          <Select value={feedbackType} onValueChange={(v: any) => setFeedbackType(v)}>
                            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sugestao">Sugestão</SelectItem>
                              <SelectItem value="problema">Problema</SelectItem>
                              <SelectItem value="melhoria">Melhoria</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground">Mensagem</label>
                          <Textarea placeholder="Descreva..." className="min-h-[100px] text-xs" value={feedbackMessage} onChange={e => setFeedbackMessage(e.target.value)} />
                        </div>
                        <Button className="w-full h-9 text-xs font-bold" onClick={submitFeedback} disabled={isSubmittingFeedback}>
                          {isSubmittingFeedback ? "Enviando..." : "Enviar Feedback"}
                        </Button>
                      </div>
                    )}

                    {/* NOVIDADES */}
                    {currentView === 'novidades' && (
                      <div className="space-y-3">
                        <NewsItem title="Novo Painel de Monitoramento" date="Hoje" content="Visualize métricas em tempo real de todas as unidades." tag="Novo" />
                        <NewsItem title="Central de Comunicação" date="Recente" content="Nova interface hierárquica para envio de mensagens e feedbacks." tag="Melhoria" />
                        <NewsItem title="Importação Otimizada" date="Há 5 dias" content="Melhorias na velocidade de importação e validação de dados." tag="Melhoria" />
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </ScrollArea>

            {/* Footer removido — funcionalidade de mensagens entre usuários descontinuada */}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botão flutuante */}
      <div className="relative">
        <AnimatePresence>
          {totalUnread > 0 && !isOpen && (
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute -top-1 -right-1 z-10"
            >
              <Badge variant="destructive" className="h-5 min-w-[20px] px-1 flex items-center justify-center rounded-full border-2 border-white shadow-md animate-bounce">
                {totalUnread > 99 ? '99+' : totalUnread}
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>

        <Button 
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "h-14 w-14 rounded-full shadow-2xl p-0 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group border-2 border-white/20",
            totalUnread > 0 
              ? "bg-primary ring-4 ring-primary/20" 
              : "bg-slate-600 hover:bg-slate-700"
          )}
        >
          <AgieAvatar expression={expression} className="h-full w-full" />
        </Button>
      </div>
    </div>
  );
}

// --- Sub-components ---

function MenuItem({ icon, label, badge, onClick }: { icon: React.ReactNode, label: string, badge?: number, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/60 transition-colors text-left group"
    >
      <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors shrink-0">
        {icon}
      </div>
      <span className="text-xs font-semibold text-foreground flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-[10px] rounded-full">{badge}</Badge>
      )}
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
    </button>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode, text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2 text-center">
      {icon}
      <p className="text-xs font-medium">{text}</p>
    </div>
  );
}

function MessageItem({ msg, type, onClick }: { msg: any, type: 'sent' | 'received', onClick: () => void }) {
  const dataFormatada = msg.data ? format(new Date(msg.data), "d 'de' MMM, HH:mm", { locale: ptBR }) : '';
  return (
    <div 
      onClick={onClick}
      className={cn(
        "p-3 rounded-xl border transition-all cursor-pointer relative group hover:shadow-md",
        type === 'received' && !msg.lida ? "bg-background border-primary/30 border-l-4 border-l-primary" : "bg-background border-border border-l-4 border-l-muted-foreground/30"
      )}
    >
      <div className="flex justify-between items-start mb-1">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{msg.remetente}</span>
        <span className="text-[10px] text-muted-foreground">{dataFormatada}</span>
      </div>
      <p className="text-xs text-foreground leading-relaxed">{msg.conteudo}</p>
      {type === 'received' && !msg.lida && <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />}
    </div>
  );
}

function AlertaItem({ alerta, onClick }: { alerta: any, onClick: () => void }) {
  const dataFormatada = alerta.data_criacao ? format(new Date(alerta.data_criacao), "d 'de' MMM, HH:mm", { locale: ptBR }) : '';
  const getIcon = () => {
    switch (alerta.tipo) {
      case 'critico': return <AlertTriangle className="h-3.5 w-3.5 text-red-500" />;
      case 'atraso': return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
      case 'validacao': return <Info className="h-3.5 w-3.5 text-blue-500" />;
      default: return <Bell className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };
  const getBg = () => {
    switch (alerta.tipo) {
      case 'critico': return "bg-red-50 border-red-100";
      case 'atraso': return "bg-amber-50 border-amber-100";
      default: return "bg-background border-border";
    }
  };
  return (
    <div onClick={onClick} className={cn("p-3 rounded-xl border transition-all cursor-pointer hover:shadow-md", getBg(), alerta.status === 'nao_lido' ? "border-l-4 border-l-red-500" : "border-l-4 border-l-muted-foreground/30")}>
      <div className="flex items-center gap-2 mb-1">
        {getIcon()}
        <h4 className="text-xs font-bold text-foreground line-clamp-1 flex-1">{alerta.titulo}</h4>
        <span className="text-[10px] text-muted-foreground">{dataFormatada}</span>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{alerta.mensagem}</p>
      {alerta.link && (
        <div className="flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-tight mt-2">
          Acessar <ExternalLink className="h-2.5 w-2.5" />
        </div>
      )}
    </div>
  );
}

function NewsItem({ title, date, content, tag }: { title: string, date: string, content: string, tag: string }) {
  return (
    <div className="p-3 rounded-xl border bg-muted/30">
      <div className="flex justify-between items-start mb-1.5">
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">{tag}</Badge>
        <span className="text-[10px] text-muted-foreground font-bold">{date}</span>
      </div>
      <h4 className="font-bold text-xs mb-1">{title}</h4>
      <p className="text-[11px] text-muted-foreground">{content}</p>
    </div>
  );
}
