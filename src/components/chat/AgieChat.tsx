import { useState, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, MapPin, User, ChevronLeft, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { UNITS, ROLES } from "@/data/chatData";
import { ChatStep, Unit, Role, Message } from "@/types/chat";

export const AgieChat = memo(() => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<ChatStep>('INITIAL');
  const [selectedRegion, setSelectedRegion] = useState<'GO_VIT' | 'FORA' | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [hasNewMessage, setHasNewMessage] = useState(false);

  // Mock initial notification after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen) setHasNewMessage(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    setHasNewMessage(false);
  };

  const handleBack = () => {
    if (step === 'BY_REGION') setStep('INITIAL');
    if (step === 'BY_UNIT') setStep('BY_REGION');
    if (step === 'BY_PERSON') {
      if (selectedUnit) setStep('BY_UNIT');
      else if (selectedRole) setStep('BY_ROLE');
    }
    if (step === 'BY_ROLE') setStep('INITIAL');
    if (step === 'CONVERSATION') {
      setStep('BY_PERSON');
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
                  <h3 className="font-bold text-sm leading-tight tracking-tight">Agie</h3>
                  <p className="text-[10px] text-white/70 uppercase tracking-widest font-black">Assistente AG Saúde</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full" onClick={() => setIsOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col bg-slate-50 relative overflow-hidden">
              {step !== 'INITIAL' && step !== 'CONVERSATION' && (
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
                        <h2 className="text-xl font-bold text-slate-800">Olá! Eu sou a Agie. 👋</h2>
                        <p className="text-sm text-slate-500 mt-1">Sua ponte de comunicação interna na AG Saúde. Como posso te conectar hoje?</p>
                      </div>
                      <div className="grid gap-3">
                        <Button 
                          variant="outline" 
                          className="justify-start gap-3 h-auto py-4 bg-white hover:bg-slate-100 hover:border-primary transition-all border-slate-200"
                          onClick={() => setStep('BY_REGION')}
                        >
                          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-primary" />
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-slate-800">Por Unidade</p>
                            <p className="text-[11px] text-slate-500">Escolha por região e local</p>
                          </div>
                        </Button>
                        <Button 
                          variant="outline" 
                          className="justify-start gap-3 h-auto py-4 bg-white hover:bg-slate-100 hover:border-primary transition-all border-slate-200"
                          onClick={() => setStep('BY_ROLE')}
                        >
                          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                            <User className="w-5 h-5 text-purple-600" />
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-slate-800">Por Cargo</p>
                            <p className="text-[11px] text-slate-500">Escolha diretamente a função</p>
                          </div>
                        </Button>
                      </div>
                    </div>
                  )}

                  {step === 'BY_REGION' && (
                    <div className="pt-8 space-y-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Selecione a Região</p>
                      <Button variant="outline" className="w-full justify-between h-12 bg-white" onClick={() => { setSelectedRegion('GO_VIT'); setStep('BY_UNIT'); }}>
                        Goiás e Vitória <ChevronLeft className="w-4 h-4 rotate-180" />
                      </Button>
                      <Button variant="outline" className="w-full justify-between h-12 bg-white" onClick={() => { setSelectedRegion('FORA'); setStep('BY_UNIT'); }}>
                        Unidades de Fora <ChevronLeft className="w-4 h-4 rotate-180" />
                      </Button>
                    </div>
                  )}

                  {step === 'BY_UNIT' && (
                    <div className="pt-8 space-y-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Selecione a Unidade</p>
                      <div className="grid grid-cols-1 gap-2">
                        {UNITS.filter(u => u.region === selectedRegion).map(unit => (
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
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-4 border-slate-50 rounded-full z-10"
            />
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
              : "bg-primary border-white hover:shadow-primary/40"
          )}
        >
          {isOpen ? (
            <X className="w-8 h-8 text-primary -rotate-90" />
          ) : (
            <div className="flex flex-col items-center gap-1">
              {/* Agie Animated Face */}
              <div className="flex gap-2 mb-0.5">
                <motion.div 
                  animate={{ 
                    scaleY: [1, 1, 0.1, 1],
                  }}
                  transition={{ 
                    duration: 4, 
                    repeat: Infinity,
                    times: [0, 0.9, 0.92, 1]
                  }}
                  className="w-2 h-2 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]" 
                />
                <motion.div 
                  animate={{ 
                    scaleY: [1, 1, 0.1, 1],
                  }}
                  transition={{ 
                    duration: 4, 
                    repeat: Infinity,
                    times: [0, 0.9, 0.92, 1]
                  }}
                  className="w-2 h-2 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]" 
                />
              </div>
              <motion.div 
                animate={{ width: [8, 12, 8] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="h-1 bg-white/40 rounded-full" 
              />
            </div>
          )}
        </motion.div>
        
        {/* Help tooltip */}
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute right-20 top-1/2 -translate-y-1/2 bg-white px-3 py-1.5 rounded-lg shadow-lg border text-xs font-bold whitespace-nowrap text-primary pointer-events-none"
          >
            Olá! Sou a Agie.
            <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 border-8 border-transparent border-l-white" />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
});