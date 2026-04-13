import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users, History, Calendar as CalendarIcon, Clock, CheckCircle2, XCircle, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { format, startOfDay, endOfDay, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AccessHistoryPopoverContentProps {
  onlineUsers: any[];
}

export function AccessHistoryPopoverContent({ onlineUsers }: AccessHistoryPopoverContentProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, [date]);

  const fetchHistory = async () => {
    setLoading(true);
    const start = startOfDay(date).toISOString();
    const end = endOfDay(date).toISOString();

    const { data: sessions, error } = await (supabase
      .from('user_sessions' as any)
      .select(`
        *,
        profiles:user_id (
          nome_completo,
          perfil,
          cargo
        )
      `) as any)
      .or(`login_at.gte.${start},and(login_at.lte.${end},last_activity_at.gte.${start})`)
      .order('login_at', { ascending: false });

    if (error) {
      console.error('Error fetching history:', error);
      setLoading(false);
      return;
    }

    // Fetch audit logs for these users in this timeframe to calculate interactivity
    const { data: auditLogs, error: auditError } = await (supabase
      .from('audit_logs' as any)
      .select('usuario_id, created_at, acao, modulo, registro_afetado') as any)
      .gte('created_at', start)
      .lte('created_at', end);

    if (auditError) {
      console.error('Error fetching audit logs:', auditError);
    }

    const historyWithActivity = (sessions || []).map((session: any) => {
      const sessionStart = new Date(session.login_at);
      const sessionEnd = session.logout_at ? new Date(session.logout_at) : new Date(session.last_activity_at);
      
      const sessionLogs = (auditLogs || []).filter((log: any) => 
        log.usuario_id === session.user_id && 
        new Date(log.created_at) >= sessionStart && 
        new Date(log.created_at) <= sessionEnd
      );

      const duration = differenceInMinutes(sessionEnd, sessionStart);

      return {
        ...session,
        duration,
        hasActivity: sessionLogs.length > 0,
        activityDetails: sessionLogs.slice(0, 5).map((log: any) => `${log.acao} em ${log.modulo}${log.registro_afetado ? ` (${log.registro_afetado})` : ''}`).join('\n') + (sessionLogs.length > 5 ? '\n...' : '')
      };
    });

    setHistory(historyWithActivity);
    setLoading(false);
  };

  return (
    <div className="w-[450px] bg-white/95 backdrop-blur-sm border-slate-200/60 shadow-xl rounded-xl overflow-hidden">
      <Tabs defaultValue="online" className="w-full">
        <div className="px-4 pt-4 pb-2 border-b border-slate-100 bg-slate-50/50">
          <TabsList className="grid w-full grid-cols-2 h-9 bg-slate-200/50">
            <TabsTrigger value="online" className="text-xs flex items-center gap-2">
              <Users className="h-3.5 w-3.5" />
              Online Agora
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs flex items-center gap-2">
              <History className="h-3.5 w-3.5" />
              Histórico
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="online" className="m-0">
          <div className="p-3 flex items-center justify-between border-b border-slate-100 bg-white">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-xs">
              <Users className="h-3.5 w-3.5 text-primary" />
              Usuários Conectados
            </h3>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px]">
              {onlineUsers.length}
            </Badge>
          </div>
          <ScrollArea className="h-80">
            <div className="p-2">
              {onlineUsers.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Nenhum usuário online.
                </div>
              ) : (
                <div className="space-y-1">
                  {onlineUsers.map((user) => (
                    <div key={user.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="relative">
                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                          {user.nome_completo?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'US'}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-success rounded-full border-2 border-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{user.nome_completo}</p>
                        <p className="text-[10px] text-slate-500 truncate">{user.perfil} · {format(new Date(user.online_at || Date.now()), 'HH:mm')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="history" className="m-0">
          <div className="p-3 border-b border-slate-100 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-xs">
                <History className="h-3.5 w-3.5 text-primary" />
                Histórico de Acessos
              </h3>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-[10px] font-medium border-slate-200">
                    <CalendarIcon className="mr-2 h-3 w-3" />
                    {format(date, 'dd/MM/yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <ScrollArea className="h-80">
            <div className="p-2">
              {loading ? (
                <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
                  Carregando histórico...
                </div>
              ) : history.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Nenhum registro encontrado para este dia.
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((session) => (
                    <div key={session.id} className="p-3 rounded-xl border border-slate-100 bg-white hover:border-primary/20 hover:shadow-sm transition-all group">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/5 flex items-center justify-center text-[10px] font-bold text-primary border border-primary/10">
                            {session.profiles?.nome_completo?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'US'}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-800">{session.profiles?.nome_completo}</p>
                            <p className="text-[9px] text-slate-500 uppercase tracking-tight">{session.profiles?.perfil} · {session.profiles?.cargo || 'Sem cargo'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-[10px] font-medium text-slate-600">
                            <Clock className="h-3 w-3 text-slate-400" />
                            {format(new Date(session.login_at), 'HH:mm')}
                          </div>
                          <div className="text-[9px] text-slate-400">
                            Duração: {session.duration} min
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-medium text-slate-600">Interatividade:</span>
                          {session.hasActivity ? (
                            <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 flex items-center gap-1 text-[9px] h-5 px-1.5">
                              <CheckCircle2 className="h-2.5 w-2.5" />
                              Sim
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-50 text-slate-400 border-slate-100 flex items-center gap-1 text-[9px] h-5 px-1.5">
                              <XCircle className="h-2.5 w-2.5" />
                              Não
                            </Badge>
                          )}
                        </div>
                        
                        {session.hasActivity && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="text-[10px] text-primary hover:underline flex items-center gap-1">
                                <Info className="h-3 w-3" />
                                Ver detalhes
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-3 text-xs bg-slate-900 text-slate-100 border-none shadow-2xl rounded-lg">
                              <p className="font-semibold mb-2 border-b border-slate-700 pb-1">Atividades da Sessão:</p>
                              <p className="text-slate-300 leading-relaxed italic whitespace-pre-line">{session.activityDetails}</p>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
