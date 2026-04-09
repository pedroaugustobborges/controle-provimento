import { useState, useMemo } from 'react';
import { useVagasStore } from '@/store/vagasStore';
import { useAdminStore } from '@/store/adminStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/usePermissions';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Settings, Users, Building2, Clock, ShieldCheck, Bell, Database, Lock, Plus, Trash2, Edit2, 
  Search, MoreVertical, UserPlus, History, Mail, Save, Play, Download, CheckCircle, AlertCircle,
  HardDrive, Info, Shield, Check, X
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EQUIPE_POR_UNIDADE, RESPONSAVEL_LIDERANCA } from '@/data/equipe';
import { getCategoriaStatus } from '@/lib/vagaUtils';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserProfile } from '@/types/auth';

export default function AdministracaoPage() {
  const [activeTab, setActiveTab] = useState('usuarios');
  const { users, auditLogs, supportConfigs, backups, addUser, updateUser, generateBackup } = useAdminStore();
  const { vagas } = useVagasStore();
  const permissions = usePermissions();
  
  const [isNewUserOpen, setIsNewUserOpen] = useState(false);
  const [testEmailLoading, setTestEmailLoading] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState<string | null>(null);

  const handleDeleteUser = () => {
    if (usuarioParaExcluir) {
      toast.success('Usuário removido com sucesso.');
      setIsDeleteDialogOpen(false);
      setUsuarioParaExcluir(null);
    }
  };

  const handleTestEmail = (id: string) => {
    setTestEmailLoading(id);
    setTimeout(() => {
      setTestEmailLoading(null);
      toast.success('E-mail de teste enviado com sucesso!');
    }, 1500);
  };

  const unidades = [...new Set(vagas.map((v) => v.unidade))].filter(Boolean).sort();

  return (
    <div className="space-y-6 pb-10">
      <PageHeader 
        title="Configurações do Sistema"
        subtitle="Gerenciamento de usuários, níveis de acesso, auditoria completa e parâmetros globais do sistema."
        badge="Administração"
      />


      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100 p-1 flex-wrap h-auto">
          <TabsTrigger value="usuarios" className="gap-2 font-bold px-4 py-2">
            <Users className="h-4 w-4" /> Usuários
          </TabsTrigger>
          <TabsTrigger value="permissoes" className="gap-2 font-bold px-4 py-2">
            <Shield className="h-4 w-4" /> Unidades e Permissões
          </TabsTrigger>
          <TabsTrigger value="suporte" className="gap-2 font-bold px-4 py-2">
            <Bell className="h-4 w-4" /> Suporte
          </TabsTrigger>
          {permissions.canViewAudit() && (
            <TabsTrigger value="auditoria" className="gap-2 font-bold px-4 py-2">
              <History className="h-4 w-4" /> Auditoria
            </TabsTrigger>
          )}
          <TabsTrigger value="backup" className="gap-2 font-bold px-4 py-2">
            <HardDrive className="h-4 w-4" /> Backup
          </TabsTrigger>
          {permissions.canViewDiagnostics() && (
            <TabsTrigger value="conferencia" className="gap-2 font-bold px-4 py-2">
              <Database className="h-4 w-4" /> Conferência de Status
            </TabsTrigger>
          )}
          <TabsTrigger value="parametros" className="gap-2 font-bold px-4 py-2">
            <Settings className="h-4 w-4" /> Configurações Gerais
          </TabsTrigger>
        </TabsList>

        {/* USUÁRIOS */}
        <TabsContent value="usuarios">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b space-y-0">
              <div>
                <CardTitle className="text-lg font-bold">Usuários Cadastrados</CardTitle>
                <CardDescription>Gerencie quem tem acesso ao sistema e seus perfis básicos.</CardDescription>
              </div>
              <Button onClick={() => setIsNewUserOpen(true)} className="gap-2 bg-primary">
                <UserPlus className="h-4 w-4" /> Incluir novo usuário
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead >Nome / E-mail</TableHead>
                      <TableHead >Perfil / Cargo</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Acesso Global</TableHead>
                      <TableHead className="text-center">Pode Excluir</TableHead>
                      <TableHead >Último Acesso</TableHead>
                      <TableHead className="text-right pr-6"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-700">{user.nome_completo}</span>
                            <span className="text-xs text-slate-400 font-medium">{user.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline" className="w-fit text-[11px] font-bold py-0 h-4 bg-blue-50 text-blue-700 border-blue-100">{user.perfil}</Badge>
                            <span className="text-[11px] text-slate-500 font-medium">{user.cargo}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={`${user.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'} font-bold text-[11px] uppercase border-0`}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {user.visualiza_todas_unidades ? 
                            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 font-bold text-[11px]">Sim</Badge> : 
                            <span className="text-[11px] text-slate-400 font-bold">Não</span>
                          }
                        </TableCell>
                        <TableCell className="text-center">
                          {user.pode_excluir_requisicoes ? 
                            <Check className="h-4 w-4 text-green-500 mx-auto" /> : 
                            <X className="h-4 w-4 text-slate-300 mx-auto" />
                          }
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 font-medium">
                          {user.ultimo_acesso || 'Nunca'}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0"><MoreVertical className="h-4 w-4 text-slate-400" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              <DropdownMenuItem><Edit2 className="mr-2 h-4 w-4" /> Editar dados básicos</DropdownMenuItem>
                              <DropdownMenuItem><Shield className="mr-2 h-4 w-4" /> Alterar unidades e permissões</DropdownMenuItem>
                              <DropdownMenuItem><Lock className="mr-2 h-4 w-4" /> Definir senha</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className={user.status === 'ativo' ? 'text-amber-600' : 'text-green-600'}>
                                {user.status === 'ativo' ? 'Inativar usuário' : 'Ativar usuário'}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => {
                                  setUsuarioParaExcluir(user.id);
                                  setIsDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Excluir usuário
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* UNIDADES E PERMISSÕES */}
        <TabsContent value="permissoes">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b">
              <CardTitle className="text-lg font-bold">Gerenciar Unidades e Permissões</CardTitle>
              <CardDescription>Defina a quais unidades cada usuário tem acesso e o que ele pode fazer em cada uma.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Usuário</TableHead>
                    <TableHead >Unidades com Acesso</TableHead>
                    <TableHead className="text-center">Ações Permitidas</TableHead>
                    <TableHead className="text-right pr-6"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="pl-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700">{user.nome_completo}</span>
                          <Badge variant="outline" className="w-fit text-[9px] h-4 mt-1">{user.perfil}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.visualiza_todas_unidades ? (
                          <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 font-bold text-[11px]">Todas as Unidades</Badge>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-[400px]">
                            {user.unidades_vinculadas.length > 0 ? 
                              user.unidades_vinculadas.map(u => (
                                <Badge key={u} variant="secondary" className="text-[11px] bg-slate-100">{u}</Badge>
                              )) : 
                              <span className="text-[11px] text-slate-400 italic">Nenhuma unidade vinculada</span>
                            }
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-2">
                          {user.pode_incluir_registros && <Badge className="bg-green-50 text-green-700 border-green-100 text-[9px]">Incluir</Badge>}
                          {user.pode_excluir_requisicoes && <Badge className="bg-red-50 text-red-700 border-red-100 text-[9px]">Excluir</Badge>}
                          {user.pode_editar_configuracoes && <Badge className="bg-amber-50 text-amber-700 border-amber-100 text-[9px]">Config</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="sm" className="gap-2 text-primary font-bold"><Settings className="h-3.5 w-3.5" /> Ajustar</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SUPORTE */}
        <TabsContent value="suporte">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b space-y-0">
              <div>
                <CardTitle className="text-lg font-bold">Configuração de Suporte</CardTitle>
                <CardDescription>Defina os contatos de suporte fixos para cada região ou grupo de unidades.</CardDescription>
              </div>
              <Button className="gap-2 bg-primary"><Plus className="h-4 w-4" /> Novo Suporte</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Região / Unidades</TableHead>
                    <TableHead >Responsável</TableHead>
                    <TableHead >Contato</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right pr-6">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supportConfigs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell className="pl-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700">{config.regiao}</span>
                          <span className="text-[11px] text-slate-400 mt-1">{config.unidades.join(', ')}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-slate-600">{config.responsavel}</TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs">
                          <span className="flex items-center gap-1.5"><Mail className="h-3 w-3 text-slate-400" /> {config.email}</span>
                          <span className="flex items-center gap-1.5 mt-1 text-blue-600"><Users className="h-3 w-3" /> @{config.teams_user}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-green-100 text-green-700 font-bold text-[11px]">Ativo</Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 gap-1.5 text-[11px] font-bold"
                            onClick={() => handleTestEmail(config.id)}
                            disabled={testEmailLoading === config.id}
                          >
                            {testEmailLoading === config.id ? 'Enviando...' : <><Play className="h-3 w-3" /> Testar E-mail</>}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><Edit2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AUDITORIA */}
        <TabsContent value="auditoria">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold">Histórico / Auditoria</CardTitle>
                  <CardDescription>Rastreabilidade completa de todas as ações executadas no sistema.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Filtrar por usuário ou e-mail..." className="pl-9 h-9 w-[250px]" />
                  </div>
                  <Button variant="outline" size="sm" className="h-9 gap-2"><Download className="h-4 w-4" /> Exportar</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader className="sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="pl-6">Data / Hora</TableHead>
                      <TableHead >Usuário</TableHead>
                      <TableHead >Ação / Módulo</TableHead>
                      <TableHead >Registro</TableHead>
                      <TableHead >Alteração (De → Para)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id} className="text-xs">
                        <TableCell className="pl-6 font-mono text-slate-500">
                          {log.data} <br/> {log.hora}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-700">{log.usuario_nome}</span>
                            <span className="text-[11px] text-slate-400">{log.perfil}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-primary">{log.acao}</span>
                            <span className="text-[11px] text-slate-400 uppercase font-bold">{log.modulo}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-slate-600">{log.registro_afetado}</TableCell>
                        <TableCell>
                          {log.valor_anterior || log.valor_novo ? (
                            <div className="flex items-center gap-2">
                              <span className="line-through text-slate-400">{log.valor_anterior || '-'}</span>
                              <MoreVertical className="h-3 w-3 rotate-90 text-slate-300" />
                              <span className="text-green-600 font-bold">{log.valor_novo || '-'}</span>
                            </div>
                          ) : (
                            <span className="text-slate-300 italic">N/A</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONFERÊNCIA DE STATUS */}
        <TabsContent value="conferencia">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b bg-blue-50/30">
              <div className="flex items-center gap-2.5">
                <Database className="h-5 w-5 text-blue-600" />
                <div>
                  <CardTitle className="text-lg font-bold text-slate-800">Conferência de Status (Dados Reais)</CardTitle>
                  <CardDescription className="text-xs font-medium text-slate-400">Validação objetiva de como cada registro original está sendo classificado.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-auto max-h-[600px]">
              <Table>
                <TableHeader className="sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="px-6 py-4 font-bold text-[11px] text-slate-400 uppercase tracking-wider">Status Original Importado</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[11px] text-slate-400 uppercase tracking-wider text-center">Quantidade</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[11px] text-slate-400 uppercase tracking-wider">Grupo/Card de Destino</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-50 font-medium">
                  {useMemo(() => {
                    const distribution = new Map<string, { count: number, group: string }>();
                    
                    vagas.forEach(v => {
                      const groupKey = getCategoriaStatus(v);
                      
                      const groupLabelMap: Record<string, string> = {
                        fila_edital: 'Fila de Editais',
                        em_andamento: 'Em Andamento',
                        concluidas: 'Concluídas',
                        vagas_interrompidas: 'Vagas Interrompidas',
                        vagas_lideranca: 'Vagas de Liderança',
                        convocacao: 'Convocações',
                        aguardando_unidade: 'Aguardando Unidade'
                      };
                      const groupLabel = groupLabelMap[groupKey] || groupKey;
                      
                      const current = distribution.get(status) || { count: 0, group: groupLabel };
                      current.count++;
                      distribution.set(status, current);
                    });
                    
                    return Array.from(distribution.entries())
                      .sort((a, b) => b[1].count - a[1].count)
                      .map(([status, data]) => (
                        <TableRow key={status} className="hover:bg-slate-50/50 transition-colors h-14">
                          <TableCell className="px-6 py-4 text-slate-700 font-bold">{status.toUpperCase().replace('_', ' ')}</TableCell>
                          <TableCell className="px-6 py-4 text-center">
                            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-bold text-xs">
                              {data.count}
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className={`h-2 w-2 rounded-full ${
                                data.group.includes('Fila') ? 'bg-amber-400' : 
                                data.group.includes('Concluídas') ? 'bg-green-500' : 
                                data.group.includes('Interrompidas') ? 'bg-red-500' : 
                                data.group.includes('Liderança') ? 'bg-rose-500' :
                                data.group.includes('Aguardando') ? 'bg-yellow-500' :
                                'bg-blue-400'
                              }`}></div>
                              <span className="text-slate-500 font-bold uppercase text-[11px] tracking-tight">{data.group}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ));
                  }, [vagas])}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BACKUP */}
        <TabsContent value="backup">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-6">
              <Card className="border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-primary/5 p-4 border-b border-primary/10">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg"><HardDrive className="h-5 w-5 text-primary" /></div>
                    <div>
                      <h3 className="font-bold text-slate-800">Status do Backup</h3>
                      <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">Automático (30 em 30 min)</p>
                    </div>
                  </div>
                </div>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-slate-50">
                    <span className="text-xs font-medium text-slate-500">Último Backup</span>
                    <span className="text-xs font-bold text-slate-800">{backups[0]?.data_hora || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-50">
                    <span className="text-xs font-medium text-slate-500">Próximo Backup</span>
                    <span className="text-xs font-bold text-blue-600">Em 12 minutos</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-50">
                    <span className="text-xs font-medium text-slate-500">Registros Copiados</span>
                    <span className="text-xs font-bold text-slate-800">{backups[0]?.quantidade_registros || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-xs font-medium text-slate-500">Status Sistema</span>
                    <Badge className="bg-green-100 text-green-700 font-bold text-[9px]">Protegido</Badge>
                  </div>
                </CardContent>
                <CardFooter className="bg-slate-50/50 pt-4">
                  <Button onClick={() => {
                    generateBackup();
                    toast.success('Backup manual iniciado!');
                  }} className="w-full gap-2 bg-primary">
                    <Play className="h-4 w-4" /> Gerar backup agora
                  </Button>
                </CardFooter>
              </Card>

              <Card className="border-slate-200 shadow-sm bg-amber-50/30 border-amber-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-700">
                    <Info className="h-4 w-4" /> Política de Retenção
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-amber-800/70 leading-relaxed">
                    Os backups são realizados a cada 30 minutos e armazenados em servidor redundante. Mantemos os últimos 30 dias de histórico para restauração imediata.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-2">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="border-b">
                  <CardTitle className="text-lg font-bold">Histórico de Backups</CardTitle>
                  <CardDescription>Lista dos últimos snapshots realizados pelo sistema.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-6 text-[11px] font-bold uppercase">Data / Hora</TableHead>
                        <TableHead className="text-center">Registros</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right pr-6">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {backups.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="pl-6 font-mono text-xs">{b.data_hora}</TableCell>
                          <TableCell className="text-center font-bold text-slate-600 text-xs">{b.quantidade_registros}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5 text-green-600 font-bold text-[11px]">
                              <CheckCircle className="h-3 w-3" /> Sucesso
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button variant="ghost" size="sm" className="h-8 gap-2 text-blue-600 font-bold"><Download className="h-3.5 w-3.5" /> Baixar</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* PARÂMETROS GERAIS */}
        <TabsContent value="parametros">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b">
                <CardTitle className="text-lg font-bold">Configurações do Fluxo</CardTitle>
                <CardDescription>Ajuste as regras de negócio aplicadas ao controle de provimento.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">Validação Obrigatória</Label>
                    <p className="text-xs text-slate-500">Exigir validação da unidade para toda convocação.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">Bloqueio de Vagas Suspensas</Label>
                    <p className="text-xs text-slate-500">Impedir qualquer ação em vagas com status "Suspensa".</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">Alerta de Banco Vencendo</Label>
                    <p className="text-xs text-slate-500">Notificar analistas 30 dias antes do vencimento do banco.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
              <CardFooter className="border-t bg-slate-50/50">
                <Button className="ml-auto gap-2"><Save className="h-4 w-4" /> Salvar Configurações</Button>
              </CardFooter>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b">
                <CardTitle className="text-lg font-bold">Segurança e Acesso</CardTitle>
                <CardDescription>Configurações globais de segurança.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Tempo de Sessão (minutos)</Label>
                  <Input type="number" defaultValue="120" className="w-[100px]" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">Log de Auditoria Estendido</Label>
                    <p className="text-xs text-slate-500">Registrar IP e dados de navegador em todos os logs.</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">Forçar Troca de Senha</Label>
                    <p className="text-xs text-slate-500">Exigir nova senha no primeiro acesso de novos usuários.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* DIALOG: NOVO USUÁRIO */}
      <Dialog open={isNewUserOpen} onOpenChange={setIsNewUserOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" /> Incluir novo usuário
            </DialogTitle>
            <DialogDescription>Preencha os dados básicos e defina as permissões iniciais.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-bold uppercase text-slate-500">Nome Completo</Label>
                <Input id="name" placeholder="Ex: João da Silva" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase text-slate-500">E-mail</Label>
                <Input id="email" type="email" placeholder="joao@hospital.com" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="perfil" className="text-xs font-bold uppercase text-slate-500">Perfil de Acesso</Label>
                <Select defaultValue="Assistente">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Assistente">Assistente</SelectItem>
                    <SelectItem value="Analista">Analista</SelectItem>
                    <SelectItem value="Supervisão">Supervisão</SelectItem>
                    <SelectItem value="Coordenação">Coordenação</SelectItem>
                    <SelectItem value="Gerência">Gerência</SelectItem>
                    <SelectItem value="Admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cargo" className="text-xs font-bold uppercase text-slate-500">Cargo Hierárquico</Label>
                <Input id="cargo" placeholder="Ex: Analista Pleno" />
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Permissões e Acesso</h4>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Visualizar todas as unidades</Label>
                  <p className="text-[11px] text-slate-500">O usuário terá acesso a todos os registros do sistema.</p>
                </div>
                <Switch />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">Vincular Unidades Específicas</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {unidades.map(u => (
                    <div key={u} className="flex items-center gap-2 border rounded-md p-2 hover:bg-slate-50 transition-colors">
                      <input type="checkbox" id={`unit-${u}`} className="h-3 w-3 rounded border-slate-300" />
                      <label htmlFor={`unit-${u}`} className="text-[11px] font-bold text-slate-600 cursor-pointer">{u}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <Switch id="pode-incluir" />
                  <Label htmlFor="pode-incluir" className="text-xs font-bold">Pode incluir registros</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="pode-excluir" />
                  <Label htmlFor="pode-excluir" className="text-xs font-bold">Pode excluir requisições</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="pode-config" />
                  <Label htmlFor="pode-config" className="text-xs font-bold">Pode editar configurações</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="pode-usuarios" />
                  <Label htmlFor="pode-usuarios" className="text-xs font-bold">Pode gerenciar usuários</Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewUserOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              setIsNewUserOpen(false);
              toast.success('Usuário criado com sucesso!');
            }} className="bg-primary">Criar Usuário</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Excluir usuário?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O usuário perderá o acesso ao sistema permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUsuarioParaExcluir(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
