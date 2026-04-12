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
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVagasStore } from '@/store/vagasStore';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

// Expressive Agie Avatar (No mouth, only eyes)
function AgieAvatar({ expression = 'default', className = "" }: { expression?: 'default' | 'curious' | 'attention' | 'alert', className?: string }) {
  return (
    <div className={cn("relative flex items-center justify-center bg-primary rounded-full overflow-hidden shadow-inner", className)}>
      <motion.div 
        animate={{ 
          y: expression === 'alert' ? [0, -1, 1, 0] : [0, -0.5, 0.5, 0],
        }}
        transition={{ 
          duration: expression === 'alert' ? 0.2 : 4, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="flex gap-2"
      >
        <motion.div 
          animate={
            expression === 'default' ? { height: [8, 8, 1, 8] } :
            expression === 'curious' ? { height: [8, 10, 8], rotate: -5 } :
            expression === 'attention' ? { height: 10, width: 10 } :
            expression === 'alert' ? { height: [8, 9, 8], scale: 1.1 } : {}
          }
          transition={
            expression === 'default' ? { duration: 4, repeat: Infinity, times: [0, 0.9, 0.95, 1] } :
            { duration: 0.5, repeat: expression === 'curious' ? Infinity : 0 }
          }
          className="w-2 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]" 
        />
        <motion.div 
          animate={
            expression === 'default' ? { height: [8, 8, 1, 8] } :
            expression === 'curious' ? { height: [8, 10, 8], rotate: 5, y: -1 } :
            expression === 'attention' ? { height: 10, width: 10 } :
            expression === 'alert' ? { height: [8, 9, 8], scale: 1.1 } : {}
          }
          transition={
            expression === 'default' ? { duration: 4, repeat: Infinity, times: [0, 0.9, 0.95, 1] } :
            { duration: 0.5, repeat: expression === 'curious' ? Infinity : 0 }
          }
          className="w-2 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]" 
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
  
  const { 
    historicoMensagens, 
    alertas, 
    marcarMensagemLida, 
    updateAlerta,
    marcarTodasLidas
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
    if (totalUnread > 0) {
      setExpression('attention');
    } else if (isOpen) {
      setExpression('curious');
    } else {
      setExpression('default');
    }
  }, [totalUnread, isOpen]);

  const handleNotificationClick = (alerta: any) => {
    updateAlerta(alerta.id, { status: 'lido' });
    if (alerta.link) {
      navigate(alerta.link);
      setIsOpen(false);
    }
  };

  const handleMessageClick = (msg: any) => {
    if (!msg.lida) {
      marcarMensagemLida(msg.id);
    }
    navigate('/mensagens?tab=historico');
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[60]">
      {/* Popover flutuante */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute bottom-20 right-0 w-[380px] max-h-[520px] bg-background rounded-2xl shadow-2xl border flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-primary text-white flex items-center gap-3 shrink-0">
              <AgieAvatar expression="curious" className="h-10 w-10 border-2 border-white/20" />
              <div className="flex-1 text-left">
                <h3 className="text-base font-bold text-white">Central de Comunicação</h3>
                <p className="text-white/80 text-xs">Olá! Eu sou a Agie. Como posso ajudar?</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="received" className="flex-1 flex flex-col min-h-0">
              <div className="px-3 py-2 border-b bg-muted/30 shrink-0">
                <TabsList className="grid w-full grid-cols-4 h-9 bg-muted/50 p-0.5">
                  <TabsTrigger value="sent" className="text-[10px] gap-1 py-1 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <Send className="h-3 w-3" />
                    Enviadas
                  </TabsTrigger>
                  <TabsTrigger value="received" className="text-[10px] gap-1 py-1 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <Inbox className="h-3 w-3" />
                    Recebidas
                    {unreadMessagesCount > 0 && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
                  </TabsTrigger>
                  <TabsTrigger value="alerts" className="text-[10px] gap-1 py-1 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <AlertTriangle className="h-3 w-3" />
                    Alertas
                  </TabsTrigger>
                  <TabsTrigger value="notifications" className="text-[10px] gap-1 py-1 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <Bell className="h-3 w-3" />
                    Notif.
                    {unreadAlertsCount > 0 && <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />}
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 min-h-0">
                <TabsContent value="sent" className="m-0 h-full">
                  <ScrollArea className="h-[320px]">
                    <div className="p-3 space-y-2">
                      {sentMessages.length === 0 ? (
                        <EmptyState icon={<Send className="h-7 w-7 text-muted-foreground/40" />} text="Nenhuma mensagem enviada" />
                      ) : sentMessages.map((msg) => (
                        <MessageItem key={msg.id} msg={msg} type="sent" onClick={() => handleMessageClick(msg)} />
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="received" className="m-0 h-full">
                  <ScrollArea className="h-[320px]">
                    <div className="p-3 space-y-2">
                      {receivedMessages.length === 0 ? (
                        <EmptyState icon={<Inbox className="h-7 w-7 text-muted-foreground/40" />} text="Nenhuma mensagem recebida" />
                      ) : receivedMessages.map((msg) => (
                        <MessageItem key={msg.id} msg={msg} type="received" onClick={() => handleMessageClick(msg)} />
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="alerts" className="m-0 h-full">
                  <ScrollArea className="h-[320px]">
                    <div className="p-3 space-y-2">
                      {alertas.filter(a => a.tipo === 'atraso' || a.tipo === 'critico').length === 0 ? (
                        <EmptyState icon={<AlertTriangle className="h-7 w-7 text-muted-foreground/40" />} text="Nenhum alerta pendente" />
                      ) : alertas.filter(a => a.tipo === 'atraso' || a.tipo === 'critico').map((alerta) => (
                        <AlertaItem key={alerta.id} alerta={alerta} onClick={() => handleNotificationClick(alerta)} />
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="notifications" className="m-0 h-full">
                  <ScrollArea className="h-[320px]">
                    <div className="p-3 space-y-2">
                      {alertas.length === 0 ? (
                        <EmptyState icon={<Bell className="h-7 w-7 text-muted-foreground/40" />} text="Nenhuma notificação" />
                      ) : alertas.map((alerta) => (
                        <AlertaItem key={alerta.id} alerta={alerta} onClick={() => handleNotificationClick(alerta)} />
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </div>
            </Tabs>

            {/* Footer */}
            <div className="p-3 border-t bg-background shrink-0">
              <Button className="w-full gap-2 text-xs font-bold" variant="outline" size="sm" onClick={() => navigate('/mensagens')}>
                <Search className="h-3.5 w-3.5" />
                Ver Todas as Mensagens
              </Button>
            </div>
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
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={cn(
        "p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden group hover:shadow-md",
        type === 'received' && !msg.lida ? "bg-background border-primary/30" : "bg-background border-border",
        type === 'sent' ? "border-l-4 border-l-muted-foreground/40" : "border-l-4 border-l-primary"
      )}
    >
      <div className="flex justify-between items-start mb-1">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{msg.remetente}</span>
        <span className="text-[10px] text-muted-foreground">{dataFormatada}</span>
      </div>
      <p className="text-xs text-foreground leading-relaxed">{msg.conteudo}</p>
      
      {type === 'received' && !msg.lida && (
        <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
      )}
      
      <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
      </div>
    </motion.div>
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
      case 'validacao': return "bg-blue-50 border-blue-100";
      default: return "bg-background border-border";
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={cn(
        "p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden group hover:shadow-md",
        getBg(),
        alerta.status === 'nao_lido' ? "border-l-4 border-l-red-500 shadow-sm" : "border-l-4 border-l-muted-foreground/30"
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        {getIcon()}
        <h4 className="text-xs font-bold text-foreground line-clamp-1 flex-1">{alerta.titulo}</h4>
        <span className="text-[10px] text-muted-foreground">{dataFormatada}</span>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">{alerta.mensagem}</p>
      
      {alerta.link && (
        <div className="flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-tight">
          Acessar local <ExternalLink className="h-2.5 w-2.5" />
        </div>
      )}

      {alerta.status === 'nao_lido' && (
        <div className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
      )}
    </motion.div>
  );
}
