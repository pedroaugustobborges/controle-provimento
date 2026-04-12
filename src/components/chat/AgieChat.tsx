import { useState, useEffect, useMemo, memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageCircle, X, MapPin, User, ChevronLeft, Send, Sparkles, 
  Lightbulb, Megaphone, Users, Search, Shield, Info, MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { UNITS, ROLES } from "@/data/chatData";
import { ChatStep, Unit, Role, Message } from "@/types/chat";
import { useVagasStore } from "@/store/vagasStore";
import { supabase } from "@/integrations/supabase/client";

export const AgieChat = memo(() => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<ChatStep>('INITIAL');
  const [selectedRegion, setSelectedRegion] = useState<'GOIÁS E VITÓRIA' | 'OUTRAS UNIDADES' | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  
  // Feedback state
  const [feedbackType, setFeedbackType] = useState<'sugestao' | 'problema' | 'melhoria'>('sugestao');
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  
  // User profile state
  const [userProfile, setUserProfile] = useState<{ nome_completo: string; email: string; id: string } | null>(null);
  const { toast } = useToast();
  
  // Notification carousel state
  const [notificationIndex, setNotificationIndex] = useState(0);
  const notifications = useMemo(() => [
    "Nova mensagem recebida",
    "Sugestão de melhoria pendente",
    "Problema reportado",
    "Novidade disponível"
  ], []);

  const { temNovasMensagens, setTemNovasMensagens, historicoMensagens } = useVagasStore();
  const hasNewMessage = temNovasMensagens;

  // Notification carousel logic
  useEffect(() => {
    if (hasNewMessage && !isOpen) {
      const interval = setInterval(() => {
        setNotificationIndex((prev) => (prev + 1) % notifications.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [hasNewMessage, isOpen, notifications.length]);

  // Fetch user profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('nome_completo, email, id')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUserProfile(profile);
        }
      }
    };
    fetchProfile();
  }, []);

  // Keep notifications alive
  useEffect(() => {
    if (!temNovasMensagens) {
      const timer = setTimeout(() => {
        if (!isOpen) setTemNovasMensagens(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, temNovasMensagens, setTemNovasMensagens]);

  const handleOpen = () => {
    setIsOpen(true);
    setTemNovasMensagens(false);
  };

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setStep('INITIAL');
    setSelectedRegion(null);
    setSelectedUnit(null);
    setSelectedRole(null);
    setSelectedRecipient(null);
  }, []);

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
      toast({
        title: "Erro",
        description: "Por favor, descreva seu feedback.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingFeedback(true);
    try {
      const { error } = await supabase.from('feedbacks').insert({
        user_id: userProfile?.id,
        user_name: userProfile?.nome_completo || 'Anônimo',
        user_email: userProfile?.email || '',
        tipo: feedbackType,
        mensagem: feedbackMessage,
      });

      if (error) throw error;

      toast({
        title: "Feedback enviado!",
        description: "Agradecemos sua contribuição para o sistema AGIR Saúde.",
      });

      setFeedbackMessage("");
      setStep('INITIAL');
    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Erro ao enviar feedback",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const sendMessage = () => {
    if (!inputText.trim()) return;
    
    const newMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: 'current-user',
      senderName: 'Você',
      senderRole: 'Usuário',
      content: inputText,
      timestamp: new Date(),
    };

    setMessages([...messages, newMessage]);
    setInputText("");

    // Simulate response
    setTimeout(() => {
      const response: Message = {
        id: Math.random().toString(36).substr(2, 9),
        senderId: 'agie',
        senderName: 'Agie',
        senderRole: 'Assistente',
        content: `Recebi sua mensagem! Vou encaminhar para ${selectedRecipient} agora mesmo.`,
        timestamp: new Date(),
        isReply: true,
      };
      setMessages(prev => [...prev, response]);
    }, 1000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="mb-4 w-[380px] h-[550px] bg-white rounded-2xl shadow-2xl border flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-primary p-4 text-white flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md relative overflow-hidden group">
                  {/* Agie Face inside the chat */}
                  <motion.div 
                    animate={{ y: [0, -1, 1, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="flex flex-col items-center justify-center gap-1"
                  >
                    <div className="flex gap-1.5">
                      <motion.div 
                        animate={{ height: [2, 2, 0, 2] }}
                        transition={{ duration: 3, repeat: Infinity, times: [0, 0.9, 0.95, 1] }}
                        className="w-1.5 h-1.5 bg-white rounded-full" 
                      />
                      <motion.div 
                        animate={{ height: [2, 2, 0, 2] }}
                        transition={{ duration: 3, repeat: Infinity, times: [0, 0.9, 0.95, 1] }}
                        className="w-1.5 h-1.5 bg-white rounded-full" 
                      />
                    </div>
                  </motion.div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-primary rounded-full" />
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight tracking-tight">Hub de Comunicação AGIR</h3>
                  <p className="text-[10px] text-white/70 uppercase tracking-widest font-black">Central de Atendimento</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full" onClick={handleClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col bg-slate-50 relative overflow-hidden">
              {step !== 'INITIAL' && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="absolute top-2 left-2 z-10 text-slate-500 gap-1 h-8"
                  onClick={handleBack}
                >
                  <ChevronLeft className="w-4 h-4" /> Voltar
                </Button>
              )}

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {/* Step Logic */}
                  {step === 'INITIAL' && (
                    <div className="pt-4 animate-in fade-in slide-in-from-bottom-4">
                      <div className="mb-6">
                        <h2 className="text-xl font-bold text-slate-800">
                          Olá, {userProfile?.nome_completo?.split(' ')[0] || 'colega'}! 👋
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                          Como posso te conectar hoje? Escolha uma das opções para começar:
                        </p>
                      </div>
                      <div className="grid gap-3">
                        <Button 
                          variant="outline" 
                          className="justify-start gap-3 h-auto py-4 bg-white hover:bg-slate-100 hover:border-primary transition-all border-slate-200 group"
                          onClick={() => setStep('COMMUNICATION_HUB')}
                        >
                          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                            <Megaphone className="w-5 h-5 text-primary" />
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-slate-800">Enviar Comunicação Interna</p>
                            <p className="text-[11px] text-slate-500">Unidades, cargos ou usuários</p>
                          </div>
                        </Button>

                        <Button 
                          variant="outline" 
                          className="justify-start gap-3 h-auto py-4 bg-white hover:bg-slate-100 hover:border-amber-500 transition-all border-slate-200 group"
                          onClick={() => setStep('FEEDBACK')}
                        >
                          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                            <Lightbulb className="w-5 h-5 text-amber-600" />
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-slate-800">Enviar Feedback / Sugestão</p>
                            <p className="text-[11px] text-slate-500">Ajude-nos a melhorar o sistema</p>
                          </div>
                        </Button>

                        <Button 
                          variant="outline" 
                          className="justify-start gap-3 h-auto py-4 bg-white hover:bg-slate-100 hover:border-purple-500 transition-all border-slate-200 group"
                          onClick={() => setStep('NEWS')}
                        >
                          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                            <Sparkles className="w-5 h-5 text-purple-600" />
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-slate-800">Novidades do Sistema</p>
                            <p className="text-[11px] text-slate-500">Veja o que há de novo por aqui</p>
                          </div>
                        </Button>
                      </div>
                    </div>
                  )}

                  {step === 'COMMUNICATION_HUB' && (
                    <div className="pt-8 space-y-4 animate-in fade-in slide-in-from-right-4">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Selecione o Destinatário</p>
                      <div className="grid gap-2">
                        <Button 
                          variant="outline" 
                          className="w-full justify-start gap-3 h-12 bg-white"
                          onClick={() => setStep('BY_REGION')}
                        >
                          <MapPin className="w-4 h-4 text-primary" />
                          <div className="text-left font-semibold text-sm">Por Unidade</div>
                        </Button>
                        <Button 
                          variant="outline" 
                          className="w-full justify-start gap-3 h-12 bg-white"
                          onClick={() => setStep('BY_ROLE')}
                        >
                          <Users className="w-4 h-4 text-purple-600" />
                          <div className="text-left font-semibold text-sm">Por Cargo</div>
                        </Button>
                        <Button 
                          variant="outline" 
                          className="w-full justify-start gap-3 h-12 bg-white"
                          onClick={() => setStep('SUPERVISION')}
                        >
                          <Shield className="w-4 h-4 text-red-600" />
                          <div className="text-left font-semibold text-sm">Falar com a Supervisão</div>
                        </Button>
                        <Button 
                          variant="outline" 
                          className="w-full justify-start gap-3 h-12 bg-white"
                          onClick={() => setStep('BY_USER')}
                        >
                          <Search className="w-4 h-4 text-slate-600" />
                          <div className="text-left font-semibold text-sm">Buscar Usuário Específico</div>
                        </Button>
                      </div>
                    </div>
                  )}

                  {step === 'FEEDBACK' && (
                    <div className="pt-8 space-y-4 animate-in fade-in slide-in-from-right-4">
                      <div className="space-y-2">
                        <h3 className="font-bold text-slate-800">Enviar Feedback</h3>
                        <p className="text-xs text-slate-500">Sua opinião é fundamental para evoluirmos.</p>
                      </div>

                      <div className="space-y-4 bg-white p-4 rounded-xl border shadow-sm">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-slate-400">Tipo de Feedback</label>
                          <Select 
                            value={feedbackType} 
                            onValueChange={(v: any) => setFeedbackType(v)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sugestao">Sugestão de melhoria</SelectItem>
                              <SelectItem value="problema">Relato de problema</SelectItem>
                              <SelectItem value="melhoria">Oportunidade de melhoria</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-slate-400">Mensagem</label>
                          <Textarea 
                            placeholder="Descreva sua sugestão ou problema detalhadamente..."
                            className="min-h-[120px] resize-none"
                            value={feedbackMessage}
                            onChange={(e) => setFeedbackMessage(e.target.value)}
                          />
                        </div>

                        <Button 
                          className="w-full gap-2" 
                          onClick={submitFeedback}
                          disabled={isSubmittingFeedback}
                        >
                          {isSubmittingFeedback ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                          Enviar Feedback
                        </Button>
                      </div>
                      
                      <div className="bg-blue-50 p-3 rounded-lg flex gap-3 border border-blue-100">
                        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-blue-700 leading-relaxed">
                          Seu nome, e-mail e dados da sessão serão anexados automaticamente para agilizar o atendimento.
                        </p>
                      </div>
                    </div>
                  )}

                  {step === 'BY_USER' && (
                    <div className="pt-8 space-y-4 animate-in fade-in slide-in-from-right-4">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Buscar Usuário</p>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input placeholder="Digite o nome do usuário..." className="pl-10" />
                      </div>
                      <div className="p-8 text-center space-y-2">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                          <Search className="w-6 h-6 text-slate-300" />
                        </div>
                        <p className="text-xs text-slate-500 font-medium italic">Funcionalidade de busca em desenvolvimento...</p>
                      </div>
                    </div>
                  )}

                   {step === 'SUPERVISION' && (
                    <div className="pt-8 space-y-4 animate-in fade-in slide-in-from-right-4">
                      <div className="flex items-center gap-2 px-1">
                        <Shield className="w-4 h-4 text-red-600" />
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Contatar Supervisão</p>
                      </div>
                      <div className="grid gap-2">
                        {ROLES.filter(role => 
                          role.id === 'super-go-vit' || 
                          role.id === 'super-fora' || 
                          role.id === 'coordenadora'
                        ).map(role => (
                          <div key={role.id} className="space-y-1">
                            {role.users.map(userName => (
                              <Button 
                                key={userName}
                                variant="outline" 
                                className="w-full justify-start gap-3 h-14 bg-white hover:border-red-200 transition-all group"
                                onClick={() => { 
                                  setSelectedRecipient(userName); 
                                  setSelectedRole(role);
                                  setStep('CONVERSATION'); 
                                }}
                              >
                                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-xs font-bold text-red-600 group-hover:bg-red-100">
                                  {userName.charAt(0)}
                                </div>
                                <div className="text-left">
                                  <p className="text-sm font-bold text-slate-800">{userName}</p>
                                  <p className="text-[10px] text-slate-500">{role.label}</p>
                                </div>
                              </Button>
                            ))}
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-400 italic px-2">
                        * Canal direto com a liderança e supervisão do sistema.
                      </p>
                    </div>
                  )}

                  {step === 'NEWS' && (
                    <div className="pt-8 space-y-4 animate-in fade-in slide-in-from-right-4">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Novidades do Sistema</p>
                      <div className="space-y-3">
                        <div className="bg-white p-4 rounded-xl border shadow-sm space-y-2 border-l-4 border-l-primary">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-tighter">Novo Módulo</span>
                            <span className="text-[10px] text-slate-400">24/05/2024</span>
                          </div>
                          <h4 className="font-bold text-slate-800 text-sm">Hub de Comunicação</h4>
                          <p className="text-xs text-slate-500 leading-relaxed">Agora você pode enviar feedbacks e falar com unidades diretamente pela Agie!</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border shadow-sm space-y-2 border-l-4 border-l-green-500">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-black bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase tracking-tighter">Melhoria</span>
                            <span className="text-[10px] text-slate-400">22/05/2024</span>
                          </div>
                          <h4 className="font-bold text-slate-800 text-sm">Filtros Avançados</h4>
                          <p className="text-xs text-slate-500 leading-relaxed">Melhoramos o desempenho da busca no Banco de Talentos.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 'BY_REGION' && (
                    <div className="pt-8 space-y-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Selecione a Região</p>
                      <Button variant="outline" className="w-full justify-between h-12 bg-white" onClick={() => { setSelectedRegion('GOIÁS E VITÓRIA'); setStep('BY_UNIT'); }}>
                        GOIÁS E VITÓRIA <ChevronLeft className="w-4 h-4 rotate-180" />
                      </Button>
                      <Button variant="outline" className="w-full justify-between h-12 bg-white" onClick={() => { setSelectedRegion('OUTRAS UNIDADES'); setStep('BY_UNIT'); }}>
                        OUTRAS UNIDADES <ChevronLeft className="w-4 h-4 rotate-180" />
                      </Button>
                    </div>
                  )}

                  {step === 'BY_UNIT' && (
                    <div className="pt-8 space-y-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Selecione a Unidade</p>
                      <div className="grid grid-cols-1 gap-2">
                        {UNITS.filter(u => u.region === (selectedRegion as any)).map(unit => (
                          <Button key={unit.id} variant="outline" className="w-full justify-start h-10 bg-white text-sm" onClick={() => { setSelectedUnit(unit); setSelectedRole(null); setStep('BY_PERSON'); }}>
                            {unit.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {(step === 'BY_PERSON') && (selectedUnit || selectedRole) && (
                    <div className="pt-8 space-y-4">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Quem deseja contatar?</p>
                      
                      {selectedUnit ? (
                        <div className="space-y-2">
                          <p className="text-[11px] text-slate-400 font-bold px-1 uppercase">Analistas</p>
                          {selectedUnit.analysts.map(a => (
                            <Button key={a} variant="outline" className="w-full justify-start h-12 bg-white gap-3" onClick={() => { setSelectedRecipient(a); setStep('CONVERSATION'); }}>
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700">{a.charAt(0)}</div>
                              <div className="text-left"><p className="text-sm font-bold">{a}</p><p className="text-[10px] text-slate-500">Analista da Unidade</p></div>
                            </Button>
                          ))}
                          {selectedUnit.assistants.length > 0 && (
                            <>
                              <p className="text-[11px] text-slate-400 font-bold px-1 uppercase pt-2">Assistentes</p>
                              {selectedUnit.assistants.map(a => (
                                <Button key={a} variant="outline" className="w-full justify-start h-12 bg-white gap-3" onClick={() => { setSelectedRecipient(a); setStep('CONVERSATION'); }}>
                                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-[10px] font-bold text-green-700">{a.charAt(0)}</div>
                                  <div className="text-left"><p className="text-sm font-bold">{a}</p><p className="text-[10px] text-slate-500">Assistente da Unidade</p></div>
                                </Button>
                              ))}
                            </>
                          )}
                        </div>
                      ) : selectedRole ? (
                        <div className="space-y-2">
                          <p className="text-[11px] text-slate-400 font-bold px-1 uppercase">{selectedRole.label}</p>
                          {selectedRole.users.map(u => (
                            <Button key={u} variant="outline" className="w-full justify-start h-12 bg-white gap-3" onClick={() => { setSelectedRecipient(u); setStep('CONVERSATION'); }}>
                              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-[10px] font-bold text-purple-700">{u.charAt(0)}</div>
                              <div className="text-left"><p className="text-sm font-bold">{u}</p><p className="text-[10px] text-slate-500">{selectedRole.label}</p></div>
                            </Button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}

                  {step === 'BY_ROLE' && (
                    <div className="pt-8 space-y-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Selecione o Cargo</p>
                      <div className="grid grid-cols-1 gap-2">
                        {ROLES.map(role => (
                          <Button key={role.id} variant="outline" className="w-full justify-start h-12 bg-white gap-3 px-4" onClick={() => { setSelectedRole(role); setSelectedUnit(null); setStep('BY_PERSON'); }}>
                            <div className="text-left font-bold text-sm">{role.label}</div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {step === 'CONVERSATION' && (
                    <div className="space-y-4">
                      {/* Conversation Header Info */}
                      <div className="bg-white p-3 rounded-xl border shadow-sm flex items-center gap-3 mb-4 animate-in fade-in slide-in-from-top-2">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {selectedRecipient?.charAt(0)}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter">Conversando com:</p>
                          <p className="text-sm font-bold text-slate-800 truncate">{selectedRecipient}</p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {selectedRole?.label || (selectedUnit ? `Equipe ${selectedUnit.name}` : 'Colaborador')}
                          </p>
                        </div>
                      </div>

                      {messages.map((msg) => (
                        <div key={msg.id} className={cn("flex flex-col max-w-[85%]", msg.senderId === 'current-user' ? "ml-auto items-end" : "items-start")}>
                          <div className={cn("p-3 rounded-2xl text-sm shadow-sm", msg.senderId === 'current-user' ? "bg-primary text-white rounded-br-none" : "bg-white text-slate-800 rounded-bl-none border")}>
                            {msg.content}
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1">{msg.senderName} • {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Input Area */}
              {step === 'CONVERSATION' && (
                <div className="p-4 bg-white border-t flex gap-2">
                  <Input 
                    placeholder="Escreva sua mensagem..." 
                    value={inputText} 
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    className="flex-1"
                  />
                  <Button size="icon" onClick={sendMessage}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mascot Trigger */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative cursor-pointer"
        onClick={handleOpen}
      >
        <AnimatePresence>
          {hasNewMessage && !isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: [1, 1.3, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-4 border-slate-50 rounded-full z-10"
              />
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute inset-0 rounded-full bg-red-500/30 z-0"
              />
            </>
          )}
        </AnimatePresence>

        <motion.div
          animate={{
            y: [0, -8, 0],
            scale: [1, 1.02, 1]
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className={cn(
            "w-16 h-16 rounded-full flex flex-col items-center justify-center shadow-2xl border-4 transition-all duration-500 overflow-hidden",
            isOpen 
              ? "bg-white border-primary rotate-90" 
              : hasNewMessage
                ? "bg-red-600 border-white hover:shadow-red-500/40 ring-4 ring-red-400/30 animate-bounce"
                : "bg-primary border-white hover:shadow-primary/40 shadow-xl"
          )}
          onClick={(e) => {
            if (isOpen) {
              e.stopPropagation();
              handleClose();
            }
          }}
        >
          {isOpen ? (
            <X className="w-8 h-8 text-primary -rotate-90" />
          ) : (
            <div className="flex flex-col items-center gap-1">
              {/* Agie Animated Face - eyes go wide when there are notifications */}
              <div className={cn("flex mb-0.5", hasNewMessage ? "gap-3" : "gap-2")}>
                <motion.div 
                  animate={hasNewMessage 
                    ? { scale: [1, 1.5, 1.2, 1.5, 1], scaleY: 1 }
                    : { scaleY: [1, 1, 0.1, 1] }
                  }
                  transition={hasNewMessage 
                    ? { duration: 0.8, repeat: Infinity }
                    : { duration: 4, repeat: Infinity, times: [0, 0.9, 0.92, 1] }
                  }
                  className={cn(
                    "bg-white rounded-full",
                    hasNewMessage 
                      ? "w-3 h-3 shadow-[0_0_12px_rgba(255,255,255,1)]" 
                      : "w-2 h-2 shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                  )} 
                />
                <motion.div 
                  animate={hasNewMessage 
                    ? { scale: [1, 1.5, 1.2, 1.5, 1], scaleY: 1 }
                    : { scaleY: [1, 1, 0.1, 1] }
                  }
                  transition={hasNewMessage 
                    ? { duration: 0.8, repeat: Infinity, delay: 0.1 }
                    : { duration: 4, repeat: Infinity, times: [0, 0.9, 0.92, 1] }
                  }
                  className={cn(
                    "bg-white rounded-full",
                    hasNewMessage 
                      ? "w-3 h-3 shadow-[0_0_12px_rgba(255,255,255,1)]" 
                      : "w-2 h-2 shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                  )} 
                />
              </div>
              <motion.div 
                animate={hasNewMessage 
                  ? { width: [8, 14, 8], height: [4, 6, 4] }
                  : { width: [8, 12, 8] }
                }
                transition={{ duration: hasNewMessage ? 0.6 : 4, repeat: Infinity }}
                className={cn(
                  "rounded-full",
                  hasNewMessage ? "h-1.5 bg-white/80" : "h-1 bg-white/40"
                )}
              />
            </div>
          )}
        </motion.div>
        
        {/* Help tooltip */}
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ 
              delay: 0.5, 
              duration: 0.4,
              ease: "easeOut"
            }}
            className="absolute right-20 top-1/2 -translate-y-1/2 bg-white px-4 py-2.5 rounded-2xl shadow-2xl border text-[13px] font-bold whitespace-nowrap text-primary pointer-events-none"
          >
            Central de Comunicação
            <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 border-[6px] border-transparent border-l-white" />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
});