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
  FileText, 
  LogIn, 
  Clock, 
  History, 
  Download,
  Filter,
  Search,
  Calendar as CalendarIcon,
  BarChart as FileBarChart,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { format, differenceInMinutes, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ExportButton } from '@/components/ExportButton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRBAC } from '@/hooks/useRBAC';
import { Navigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function RelatoriosPage() {
  const { isFullAccessProfile, isAdmin, isManagement } = useRBAC();
  const [searchTerm, setSearchTerm] = useState('');
  const [isBackingUp, setIsBackingUp] = useState(false);

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
// ... keep existing code

  // Perfil protection
  if (!isFullAccessProfile) {
    return <Navigate to="/" replace />;
  }

  // Query for user sessions (Logins & Session Time)
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

  // Query for audit logs (Modifications)
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

  const filteredSessions = sessions?.filter(s => 
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileBarChart className="h-8 w-8 text-primary" />
            Módulo de Relatórios
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe o uso do sistema, acessos e auditoria de modificações.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
              onClick={handleManualBackup}
              disabled={isBackingUp}
            >
              <ShieldCheck className={`h-4 w-4 ${isBackingUp ? 'animate-spin' : ''}`} />
              Backup do Sistema
            </Button>
          )}
          <div className="relative w-64">
// ... keep existing code
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar nos relatórios..." 
              className="pl-8" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Tabs defaultValue="logins" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="logins" className="gap-2">
            <LogIn className="h-4 w-4" />
            Logins
          </TabsTrigger>
          <TabsTrigger value="tempo" className="gap-2">
            <Clock className="h-4 w-4" />
            Sessões
          </TabsTrigger>
          <TabsTrigger value="auditoria" className="gap-2">
            <History className="h-4 w-4" />
            Auditoria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logins" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Histórico de Logins</CardTitle>
                <CardDescription>Quem acessou o sistema e de qual local.</CardDescription>
              </div>
              <ExportButton 
                data={prepareSessionsForExport(filteredSessions || [])} 
                filename="relatorio_logins"
                label="Exportar Logins"
              />
            </CardHeader>
            <CardContent>
              {loadingSessions ? <ReportSkeleton /> : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead className="hidden md:table-cell">Dispositivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSessions?.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>
                            <div className="font-medium">{s.profiles?.nome_completo}</div>
                            <div className="text-xs text-muted-foreground">{s.profiles?.email}</div>
                          </TableCell>
                          <TableCell>{format(parseISO(s.login_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</TableCell>
                          <TableCell>{s.ip_address}</TableCell>
                          <TableCell className="hidden md:table-cell text-xs max-w-[200px] truncate">
                            {s.user_agent}
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

        <TabsContent value="tempo" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Tempo de Sessão</CardTitle>
                <CardDescription>Duração de permanência de cada usuário por sessão.</CardDescription>
              </div>
              <ExportButton 
                data={prepareSessionsForExport(filteredSessions || [])} 
                filename="relatorio_sessoes"
                label="Exportar Sessões"
              />
            </CardHeader>
            <CardContent>
              {loadingSessions ? <ReportSkeleton /> : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Início</TableHead>
                        <TableHead>Fim</TableHead>
                        <TableHead>Duração</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSessions?.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>
                            <div className="font-medium">{s.profiles?.nome_completo}</div>
                            <div className="text-xs text-muted-foreground">{s.profiles?.perfil}</div>
                          </TableCell>
                          <TableCell>{format(parseISO(s.login_at), "dd/MM/yy HH:mm")}</TableCell>
                          <TableCell>
                            {s.logout_at ? format(parseISO(s.logout_at), "dd/MM/yy HH:mm") : (
                              <span className="text-green-600 font-semibold animate-pulse">Ativo</span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-primary font-medium">
                            {formatDuration(s.login_at, s.logout_at, s.last_activity_at)}
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

        <TabsContent value="auditoria" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Logs de Auditoria</CardTitle>
                <CardDescription>Todas as modificações realizadas no sistema.</CardDescription>
              </div>
              <ExportButton 
                data={prepareAuditForExport(filteredAudit || [])} 
                filename="relatorio_auditoria"
                label="Exportar Auditoria"
              />
            </CardHeader>
            <CardContent>
              {loadingAudit ? <ReportSkeleton /> : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Ação / Módulo</TableHead>
                        <TableHead>Registro</TableHead>
                        <TableHead>Data/Hora</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAudit?.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell>
                            <div className="font-medium">{a.usuario_nome}</div>
                            <div className="text-xs text-muted-foreground">{a.perfil}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                a.acao === 'INSERT' ? 'bg-green-100 text-green-700' :
                                a.acao === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {a.acao}
                              </span>
                              <span className="text-sm">{a.modulo}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">{a.registro_afetado}</TableCell>
                          <TableCell className="text-xs">{format(parseISO(a.created_at), "dd/MM/yyyy HH:mm:ss")}</TableCell>
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
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
