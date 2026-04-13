import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  LogIn, 
  Clock, 
  History, 
  Search,
  BarChart as FileBarChart,
  ShieldCheck,
  Users,
  Activity,
  FileText
} from 'lucide-react';
import { format, differenceInMinutes, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ExportButton } from '@/components/ExportButton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRBAC } from '@/hooks/useRBAC';
import { Navigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function RelatoriosPage() {
  const { isFullAccessProfile, isAdmin, isManagement } = useRBAC();
  const [searchTerm, setSearchTerm] = useState('');
  const [isBackingUp, setIsBackingUp] = useState(false);

  const { data: sessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['report_sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_sessions')
        .select(`
          *,
          profiles:user_id (nome_completo, email, perfil)
        `)
        .order('login_at', { ascending: false })
        .limit(500);
      
      if (error) throw error;
      return data as any[];
    }
  });

  const { data: auditLogs, isLoading: loadingAudit } = useQuery({
    queryKey: ['report_audit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      
      if (error) throw error;
      return data as any[];
    }
  });

  const handleManualBackup = async () => {
    setIsBackingUp(true);
    const id = toast.loading('Iniciando backup do sistema...');
    
    try {
      const { data, error } = await supabase.functions.invoke('database-backup');
      
      if (error) throw error;
      
      toast.success('Backup concluído com sucesso!', { id });
    } catch (err: any) {
      console.error('Backup error:', err);
      toast.error('Erro ao realizar backup: ' + err.message, { id });
    } finally {
      setIsBackingUp(false);
    }
  };

  if (!isFullAccessProfile) {
    return <Navigate to="/" replace />;
  }

    s.profiles?.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.ip_address?.includes(searchTerm)
  );

  const filteredAudit = auditLogs?.filter(a => 
    a.usuario_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.modulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.acao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.registro_afetado?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDuration = (login: string, logout: string | null, lastActivity: string | null) => {
    const start = parseISO(login);
    const end = logout ? parseISO(logout) : (lastActivity ? parseISO(lastActivity) : new Date());
    const diff = differenceInMinutes(end, start);
    
    if (diff < 60) return `${diff} min`;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return `${hours}h ${mins}m`;
  };

  const prepareSessionsForExport = (data: any[]) => {
    return data.map(s => ({
      'Usuário': s.profiles?.nome_completo || 'N/A',
      'Email': s.profiles?.email || 'N/A',
      'Perfil': s.profiles?.perfil || 'N/A',
      'Login': format(parseISO(s.login_at), 'dd/MM/yyyy HH:mm:ss'),
      'Logout': s.logout_at ? format(parseISO(s.logout_at), 'dd/MM/yyyy HH:mm:ss') : 'Ativo',
      'Duração': formatDuration(s.login_at, s.logout_at, s.last_activity_at),
      'IP': s.ip_address || 'N/A',
      'Navegador': s.user_agent || 'N/A'
    }));
  };

  const prepareAuditForExport = (data: any[]) => {
    return data.map(a => ({
      'Usuário': a.usuario_nome || 'N/A',
      'Email': a.usuario_email || 'N/A',
      'Ação': a.acao || 'N/A',
      'Módulo': a.modulo || 'N/A',
      'Registro': a.registro_afetado || 'N/A',
      'Data/Hora': format(parseISO(a.created_at), 'dd/MM/yyyy HH:mm:ss'),
      'IP': a.ip || 'N/A'
    }));
  };

  const totalSessions = filteredSessions?.length || 0;
  const activeSessions = filteredSessions?.filter(s => !s.logout_at)?.length || 0;
  const totalAuditActions = filteredAudit?.length || 0;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <FileBarChart className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Módulo de Relatórios
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Acompanhe o uso do sistema, acessos e auditoria de modificações.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 rounded-xl h-10 px-4 font-semibold"
                onClick={handleManualBackup}
                disabled={isBackingUp}
              >
                <ShieldCheck className={`h-4 w-4 ${isBackingUp ? 'animate-spin' : ''}`} />
                Backup do Sistema
              </Button>
            )}
            <div className="relative w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar nos relatórios..." 
                className="pl-9 h-10 rounded-xl border-border/60 bg-background" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-border/40 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <LogIn className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Sessões Registradas</p>
                <p className="text-2xl font-bold text-foreground">{totalSessions}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/40 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50 text-green-600">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Sessões Ativas</p>
                <p className="text-2xl font-bold text-foreground">{activeSessions}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/40 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Ações Auditadas</p>
                <p className="text-2xl font-bold text-foreground">{totalAuditActions}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="logins" className="w-full">
        <TabsList className="bg-muted/50 p-1 rounded-xl h-auto gap-1">
          <TabsTrigger value="logins" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2.5 text-sm font-medium">
            <LogIn className="h-4 w-4" />
            Logins
          </TabsTrigger>
          <TabsTrigger value="tempo" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2.5 text-sm font-medium">
            <Clock className="h-4 w-4" />
            Sessões
          </TabsTrigger>
          <TabsTrigger value="auditoria" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2.5 text-sm font-medium">
            <History className="h-4 w-4" />
            Auditoria
          </TabsTrigger>
        </TabsList>

        {/* Logins Tab */}
        <TabsContent value="logins" className="mt-4">
          <Card className="border-border/40 shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 bg-muted/20 border-b border-border/40">
              <div>
                <CardTitle className="text-lg font-semibold">Histórico de Logins</CardTitle>
                <CardDescription className="text-xs mt-0.5">Quem acessou o sistema e de qual local.</CardDescription>
              </div>
              <ExportButton 
                data={prepareSessionsForExport(filteredSessions || [])} 
                filename="relatorio_logins"
                label="Exportar"
                className="rounded-xl h-9 font-semibold"
              />
            </CardHeader>
            <CardContent className="p-0">
              {loadingSessions ? <div className="p-6"><ReportSkeleton /></div> : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Usuário</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Data/Hora</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">IP</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground hidden md:table-cell">Dispositivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSessions?.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                            Nenhum registro encontrado.
                          </TableCell>
                        </TableRow>
                      )}
                      {filteredSessions?.map((s) => (
                        <TableRow key={s.id} className="hover:bg-muted/10 transition-colors">
                          <TableCell>
                            <div className="font-medium text-sm text-foreground">{s.profiles?.nome_completo}</div>
                            <div className="text-xs text-muted-foreground">{s.profiles?.email}</div>
                          </TableCell>
                          <TableCell className="text-sm text-foreground">
                            {format(parseISO(s.login_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs rounded-md">
                              {s.ip_address || '—'}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[220px] truncate">
                            {s.user_agent || '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="tempo" className="mt-4">
          <Card className="border-border/40 shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 bg-muted/20 border-b border-border/40">
              <div>
                <CardTitle className="text-lg font-semibold">Tempo de Sessão</CardTitle>
                <CardDescription className="text-xs mt-0.5">Duração de permanência de cada usuário por sessão.</CardDescription>
              </div>
              <ExportButton 
                data={prepareSessionsForExport(filteredSessions || [])} 
                filename="relatorio_sessoes"
                label="Exportar"
                className="rounded-xl h-9 font-semibold"
              />
            </CardHeader>
            <CardContent className="p-0">
              {loadingSessions ? <div className="p-6"><ReportSkeleton /></div> : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Usuário</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Início</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Fim</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Duração</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSessions?.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                            Nenhum registro encontrado.
                          </TableCell>
                        </TableRow>
                      )}
                      {filteredSessions?.map((s) => (
                        <TableRow key={s.id} className="hover:bg-muted/10 transition-colors">
                          <TableCell>
                            <div className="font-medium text-sm text-foreground">{s.profiles?.nome_completo}</div>
                            <div className="text-xs text-muted-foreground">{s.profiles?.perfil}</div>
                          </TableCell>
                          <TableCell className="text-sm text-foreground">{format(parseISO(s.login_at), "dd/MM/yy HH:mm")}</TableCell>
                          <TableCell>
                            {s.logout_at ? (
                              <span className="text-sm text-foreground">{format(parseISO(s.logout_at), "dd/MM/yy HH:mm")}</span>
                            ) : (
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 text-xs font-semibold animate-pulse">
                                Ativo
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-mono text-xs font-semibold text-primary">
                              {formatDuration(s.login_at, s.logout_at, s.last_activity_at)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="auditoria" className="mt-4">
          <Card className="border-border/40 shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 bg-muted/20 border-b border-border/40">
              <div>
                <CardTitle className="text-lg font-semibold">Logs de Auditoria</CardTitle>
                <CardDescription className="text-xs mt-0.5">Todas as modificações realizadas no sistema.</CardDescription>
              </div>
              <ExportButton 
                data={prepareAuditForExport(filteredAudit || [])} 
                filename="relatorio_auditoria"
                label="Exportar"
                className="rounded-xl h-9 font-semibold"
              />
            </CardHeader>
            <CardContent className="p-0">
              {loadingAudit ? <div className="p-6"><ReportSkeleton /></div> : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Usuário</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Ação / Módulo</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Registro</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Data/Hora</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAudit?.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                            Nenhum registro encontrado.
                          </TableCell>
                        </TableRow>
                      )}
                      {filteredAudit?.map((a) => (
                        <TableRow key={a.id} className="hover:bg-muted/10 transition-colors">
                          <TableCell>
                            <div className="font-medium text-sm text-foreground">{a.usuario_nome}</div>
                            <div className="text-xs text-muted-foreground">{a.perfil}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline"
                                className={`text-[10px] uppercase font-bold px-1.5 py-0.5 border-0 ${
                                  a.acao === 'INSERT' ? 'bg-green-100 text-green-700' :
                                  a.acao === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                                  'bg-red-100 text-red-700'
                                }`}
                              >
                                {a.acao}
                              </Badge>
                              <span className="text-sm text-foreground">{a.modulo}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[220px] truncate">{a.registro_afetado}</TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(parseISO(a.created_at), "dd/MM/yyyy HH:mm:ss")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-full rounded-lg" />
      <Skeleton className="h-16 w-full rounded-lg" />
      <Skeleton className="h-16 w-full rounded-lg" />
      <Skeleton className="h-16 w-full rounded-lg" />
    </div>
  );
}
