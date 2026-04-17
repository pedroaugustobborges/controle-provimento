import { useState, useEffect, useMemo, memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ChevronLeft, Send, Sparkles,
  Lightbulb, Bell, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ChatStep } from "@/types/chat";
import { useVagasStore } from "@/store/vagasStore";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const AgieChat = memo(() => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<ChatStep>('INITIAL');

  // Feedback state
  const [feedbackType, setFeedbackType] = useState<'sugestao' | 'problema' | 'melhoria'>('sugestao');
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // User profile state
  const [userProfile, setUserProfile] = useState<{ nome_completo: string; email: string; id: string } | null>(null);

  // Notification carousel state
  const [notificationIndex, setNotificationIndex] = useState(0);
  const notifications = useMemo(() => [
    "Olá! Eu sou a Agie 👋",
    "Veja seus alertas do sistema",
    "Envie sugestões de melhoria",
    "Conheça as novidades do sistema"
  ], []);

  const { setTemNovasMensagens, alertas, tarefas, marcarTodasLidas } = useVagasStore();

  const alertMessages = useMemo(() => {
    const msgs: string[] = [];
    const unreadAlertas = (alertas || []).filter((a: any) => !a.lida).length;
    const pendingTasks = (tarefas || []).filter((t: any) => t.status === 'pendente').length;

    if (unreadAlertas > 0) msgs.push(`Você tem ${unreadAlertas} alerta(s) novo(s)!`);
    if (pendingTasks > 0) msgs.push(`Você tem ${pendingTasks} tarefa(s) pendente(s)!`);

    return msgs;
  }, [alertas, tarefas]);

  const hasNewRealNotification = alertMessages.length > 0;

  // Notification carousel logic
  useEffect(() => {
    if (!isOpen) {
      const interval = setInterval(() => {
        const maxIndex = hasNewRealNotification ? alertMessages.length : notifications.length;
        setNotificationIndex((prev) => (prev + 1) % maxIndex);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [hasNewRealNotification, isOpen, alertMessages.length, notifications.length]);

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

        if (profile) setUserProfile(profile);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    if (isOpen) setTemNovasMensagens(false);
  }, [isOpen, setTemNovasMensagens]);

  const handleOpen = () => {
    setIsOpen(true);
    marcarTodasLidas();
  };

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setStep('INITIAL');
  }, []);

  const handleBack = () => setStep('INITIAL');

  const submitFeedback = async () => {
    if (!feedbackMessage.trim()) {
      toast.error("Por favor, descreva seu feedback.");
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

      toast.success("Feedback enviado! Agradecemos sua contribuição.");
      setFeedbackMessage("");
      setStep('INITIAL');
    } catch (error: any) {
      console.error("[AgieChat submitFeedback]", error);
      toast.error(error.message || "Tente novamente mais tarde.");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const currentTooltipMessage = useMemo(() => {
    if (hasNewRealNotification) {
      return alertMessages[notificationIndex % alertMessages.length];
    }
    return notifications[notificationIndex % notifications.length];
  }, [hasNewRealNotification, notificationIndex, alertMessages, notifications]);

  const unreadAlertas = useMemo(
    () => (alertas || []).filter((a: any) => !a.lida).slice(0, 30),
    [alertas]
  );
  const allAlertas = useMemo(
    () => [...(alertas || [])].sort((a: any, b: any) =>
      new Date(b.data || b.created_at || 0).getTime() - new Date(a.data || a.created_at || 0).getTime()
    ).slice(0, 30),
    [alertas]
  );

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
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md relative group">
                  <motion.div
                    animate={{ y: [0, -1, 1, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="flex flex-col items-center justify-center gap-0.5"
                  >
                    <div className="flex gap-1.5">
                      <motion.div
                        animate={{ height: [6, 6, 1, 6] }}
                        transition={{ duration: 4, repeat: Infinity, times: [0, 0.9, 0.95, 1] }}
                        className="w-1.5 bg-white rounded-full"
                      />
                      <motion.div
                        animate={{ height: [6, 6, 1, 6] }}
                        transition={{ duration: 4, repeat: Infinity, times: [0, 0.9, 0.95, 1] }}
                        className="w-1.5 bg-white rounded-full"
                      />
                    </div>
                    <motion.div
                      animate={{ scaleX: [1, 1.2, 1] }}
                      transition={{ duration: 4, repeat: Infinity }}
                      className="w-3 h-1 bg-white/40 rounded-full mt-0.5"
                    />
                  </motion.div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-primary rounded-full shadow-sm z-10" />
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight tracking-tight">AGIE</h3>
                  <p className="text-[10px] text-white/70 uppercase tracking-widest font-black">Notificações do Sistema</p>
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
                  {/* INITIAL */}
                  {step === 'INITIAL' && (
                    <div className="pt-4 animate-in fade-in slide-in-from-bottom-4">
                      <div className="mb-6">
                        <h2 className="text-xl font-bold text-slate-800">
                          Olá, {userProfile?.nome_completo?.split(' ')[0] || 'colega'}! 👋
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                          O que você gostaria de ver agora?
                        </p>
                      </div>
                      <div className="grid gap-3">
                        <Button
                          variant="outline"
                          className="justify-start gap-3 h-auto py-4 bg-white hover:bg-slate-100 hover:border-primary transition-all border-slate-200 group"
                          onClick={() => setStep('ALERTS')}
                        >
                          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-primary/10 transition-colors relative">
                            <Bell className="w-5 h-5 text-primary" />
                            {unreadAlertas.length > 0 && (
                              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                                {unreadAlertas.length}
                              </span>
                            )}
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-slate-800">Alertas do Sistema</p>
                            <p className="text-[11px] text-slate-500">Prazos, tarefas e avisos importantes</p>
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
                            <p className="font-bold text-slate-800">Feedback / Melhoria</p>
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

                  {/* ALERTS */}
                  {step === 'ALERTS' && (
                    <div className="pt-8 space-y-3 animate-in fade-in slide-in-from-right-4">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Alertas do Sistema</p>
                      {allAlertas.length === 0 ? (
                        <div className="bg-white p-6 rounded-xl border text-center space-y-2">
                          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mx-auto">
                            <Bell className="w-5 h-5 text-green-500" />
                          </div>
                          <p className="text-sm font-bold text-slate-700">Tudo em dia!</p>
                          <p className="text-[11px] text-slate-500">Nenhum alerta no momento.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {allAlertas.map((alerta: any) => (
                            <div
                              key={alerta.id}
                              className={cn(
                                "bg-white p-3 rounded-xl border space-y-1 border-l-4",
                                alerta.lida ? "border-l-slate-200" : "border-l-primary"
                              )}
                            >
                              <div className="flex justify-between items-start gap-2">
                                <p className="text-xs font-bold text-slate-800 leading-tight">
                                  {alerta.titulo || alerta.mensagem || 'Alerta'}
                                </p>
                                {!alerta.lida && (
                                  <span className="text-[9px] font-black bg-primary/10 text-primary px-1.5 py-0.5 rounded-full uppercase shrink-0">Novo</span>
                                )}
                              </div>
                              {alerta.mensagem && alerta.titulo && (
                                <p className="text-[11px] text-slate-500 leading-relaxed">{alerta.mensagem}</p>
                              )}
                              <p className="text-[9px] text-slate-400">
                                {alerta.data || alerta.created_at
                                  ? format(new Date(alerta.data || alerta.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                                  : ''}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* FEEDBACK */}
                  {step === 'FEEDBACK' && (
                    <div className="pt-8 space-y-4 animate-in fade-in slide-in-from-right-4">
                      <div className="space-y-2">
                        <h3 className="font-bold text-slate-800">Enviar Feedback</h3>
                        <p className="text-xs text-slate-500">Sua opinião é fundamental para evoluirmos.</p>
                      </div>

                      <div className="space-y-4 bg-white p-4 rounded-xl border shadow-sm">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-slate-400">Tipo de Feedback</label>
                          <Select value={feedbackType} onValueChange={(v: any) => setFeedbackType(v)}>
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

                        <Button className="w-full gap-2" onClick={submitFeedback} disabled={isSubmittingFeedback}>
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

                  {/* NEWS */}
                  {step === 'NEWS' && (
                    <div className="pt-8 space-y-4 animate-in fade-in slide-in-from-right-4">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Novidades do Sistema</p>
                      <div className="space-y-3">
                        <div className="bg-white p-4 rounded-xl border shadow-sm space-y-2 border-l-4 border-l-primary">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-tighter">Atualização</span>
                            <span className="text-[10px] text-slate-400">Hoje</span>
                          </div>
                          <h4 className="font-bold text-slate-800 text-sm">AGIE simplificada</h4>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            A AGIE agora foca em três pontos: alertas do sistema, feedback e novidades.
                            O envio de mensagens entre usuários foi descontinuado.
                          </p>
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
                </div>
              </ScrollArea>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mascot Trigger */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative cursor-pointer"
        onClick={isOpen ? handleClose : handleOpen}
      >
        <AnimatePresence>
          {hasNewRealNotification && !isOpen && (
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
          animate={{ y: [0, -8, 0], scale: [1, 1.02, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className={cn(
            "w-16 h-16 rounded-full flex flex-col items-center justify-center shadow-2xl border-4 transition-all duration-500 overflow-hidden",
            isOpen
              ? "bg-white border-primary rotate-90"
              : hasNewRealNotification
                ? "bg-red-600 border-white hover:shadow-red-500/40 ring-4 ring-red-400/30 animate-bounce"
                : "bg-primary border-white hover:shadow-primary/40 shadow-xl"
          )}
        >
          {isOpen ? (
            <X className="w-8 h-8 text-primary -rotate-90" />
          ) : (
            <div className="flex flex-col items-center gap-1">
              <div className={cn("flex mb-0.5", hasNewRealNotification ? "gap-3" : "gap-2")}>
                <motion.div
                  animate={hasNewRealNotification
                    ? { scale: [1, 1.5, 1.2, 1.5, 1], scaleY: 1 }
                    : { scaleY: [1, 1, 0.1, 1] }
                  }
                  transition={hasNewRealNotification
                    ? { duration: 0.8, repeat: Infinity }
                    : { duration: 4, repeat: Infinity, times: [0, 0.9, 0.92, 1] }
                  }
                  className={cn(
                    "bg-white rounded-full",
                    hasNewRealNotification
                      ? "w-3 h-3 shadow-[0_0_12px_rgba(255,255,255,1)]"
                      : "w-2 h-2 shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                  )}
                />
                <motion.div
                  animate={hasNewRealNotification
                    ? { scale: [1, 1.5, 1.2, 1.5, 1], scaleY: 1 }
                    : { scaleY: [1, 1, 0.1, 1] }
                  }
                  transition={hasNewRealNotification
                    ? { duration: 0.8, repeat: Infinity, delay: 0.1 }
                    : { duration: 4, repeat: Infinity, times: [0, 0.9, 0.92, 1] }
                  }
                  className={cn(
                    "bg-white rounded-full",
                    hasNewRealNotification
                      ? "w-3 h-3 shadow-[0_0_12px_rgba(255,255,255,1)]"
                      : "w-2 h-2 shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                  )}
                />
              </div>
              <motion.div
                animate={hasNewRealNotification
                  ? { width: [8, 14, 8], height: [4, 6, 4] }
                  : { width: [8, 12, 8] }
                }
                transition={{ duration: hasNewRealNotification ? 0.6 : 4, repeat: Infinity }}
                className={cn(
                  "rounded-full",
                  hasNewRealNotification ? "h-1.5 bg-white/80" : "h-1 bg-white/40"
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
            transition={{ delay: 0.5, duration: 0.4, ease: "easeOut" }}
            className="absolute right-20 top-1/2 -translate-y-1/2 bg-white px-4 py-2.5 rounded-2xl shadow-2xl border text-[13px] font-bold whitespace-nowrap text-primary pointer-events-none"
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={currentTooltipMessage}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.3 }}
              >
                {currentTooltipMessage}
              </motion.span>
            </AnimatePresence>
            <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 border-[6px] border-transparent border-l-white" />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
});

AgieChat.displayName = 'AgieChat';
