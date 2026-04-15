import { useState, useMemo, useEffect, useRef } from 'react';
import { useVagasStore } from '@/store/vagasStore';
import { useAdminStore, generateTempPassword } from '@/store/adminStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/usePermissions';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/lib/supabase';
import { 
  Settings, Users, Building2, Clock, ShieldCheck, Bell, Database, Lock, Plus, Trash2, Edit2, 
  Search, MoreVertical, UserPlus, History, Mail, Save, Play, Download, CheckCircle, AlertCircle,
  HardDrive, Info, Shield, Check, X, KeyRound, RefreshCw, Ban, UserCheck, Send, Eye, EyeOff,
  MessageSquare, Camera, Upload, User as UserIcon
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { PageSkeleton } from '@/components/PageSkeleton';
import { cn } from '@/lib/utils';

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
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { PERFIS_ACESSO, CARGOS_HIERARQUICOS } from '@/types/auth';
import { UNIDADES_POR_REGIAO } from '@/lib/vagaUtils';

const REGIOES_SELECAO = {
  'Goiânia': UNIDADES_POR_REGIAO['Goiânia'] || [],
  'Vitória (ES)': UNIDADES_POR_REGIAO['Vitória'] || [],
  'Demais Unidades': UNIDADES_POR_REGIAO['Demais Unidades'] || [],
};

const ALL_UNIDADES = Object.values(REGIOES_SELECAO).flat();

const MODULOS_SISTEMA = [
  { id: 'vagas', label: 'Vagas (Painel Principal)' },
  { id: 'publicacao', label: 'Publicação de Edital' },
  { id: 'validacao', label: 'Validação de Edital' },
  { id: 'banco', label: 'Banco de Talentos' },
  { id: 'convocacoes', label: 'Convocações' },
  { id: 'alertas', label: 'Alertas e Tarefas' },
  { id: 'monitoramento', label: 'Monitoramento de Prazos' },
  { id: 'validacao_convocacoes', label: 'Validar Convocações' },
  { id: 'importacoes', label: 'Importações' },
  { id: 'administracao', label: 'Administração' },
];

const DEFAULT_PERMISSIONS_BY_PROFILE: Record<string, { modulos: string[], perms: Record<string, 'read' | 'edit'> }> = {
  'Analista de RH': {
    modulos: ['vagas', 'banco', 'convocacoes', 'alertas', 'monitoramento', 'validacao_convocacoes'],
    perms: { vagas: 'edit', banco: 'edit', convocacoes: 'edit', alertas: 'edit', monitoramento: 'read', validacao_convocacoes: 'read' }
  },
  'Assistente de RH': {
    modulos: ['vagas', 'banco', 'convocacoes', 'alertas', 'monitoramento', 'validacao_convocacoes'],
    perms: { vagas: 'edit', banco: 'edit', convocacoes: 'edit', alertas: 'edit', monitoramento: 'read', validacao_convocacoes: 'read' }
  },
  'Analista Administrativo': {
    modulos: ['vagas', 'publicacao', 'validacao', 'banco', 'convocacoes', 'alertas', 'monitoramento', 'validacao_convocacoes', 'importacoes', 'administracao'],
    perms: { vagas: 'edit', publicacao: 'edit', validacao: 'edit', banco: 'edit', convocacoes: 'edit', alertas: 'edit', monitoramento: 'edit', validacao_convocacoes: 'edit', importacoes: 'edit', administracao: 'edit' }
  },
  'Supervisão': {
    modulos: ['vagas', 'publicacao', 'validacao', 'banco', 'convocacoes', 'alertas', 'monitoramento', 'validacao_convocacoes', 'importacoes', 'administracao'],
    perms: { vagas: 'edit', publicacao: 'edit', validacao: 'edit', banco: 'edit', convocacoes: 'edit', alertas: 'edit', monitoramento: 'edit', validacao_convocacoes: 'edit', importacoes: 'edit', administracao: 'edit' }
  },
  'Coordenação': {
    modulos: ['vagas', 'publicacao', 'validacao', 'banco', 'convocacoes', 'alertas', 'monitoramento', 'validacao_convocacoes', 'importacoes', 'administracao'],
    perms: { vagas: 'edit', publicacao: 'edit', validacao: 'edit', banco: 'edit', convocacoes: 'edit', alertas: 'edit', monitoramento: 'edit', validacao_convocacoes: 'edit', importacoes: 'edit', administracao: 'edit' }
  },
  'Analista de Edital': {
    modulos: ['vagas', 'publicacao', 'validacao', 'banco', 'convocacoes', 'alertas', 'monitoramento', 'validacao_convocacoes'],
    perms: { vagas: 'read', publicacao: 'edit', validacao: 'read', banco: 'read', convocacoes: 'read', alertas: 'read', monitoramento: 'read', validacao_convocacoes: 'read' }
  },
  'Analista das Convocações': {
    modulos: ['vagas', 'banco', 'convocacoes', 'alertas', 'monitoramento', 'validacao_convocacoes'],
    perms: { vagas: 'read', banco: 'read', convocacoes: 'edit', alertas: 'read', monitoramento: 'read', validacao_convocacoes: 'read' }
  },
  'Administrador': {
    modulos: ['vagas', 'publicacao', 'validacao', 'banco', 'convocacoes', 'alertas', 'monitoramento', 'validacao_convocacoes', 'importacoes', 'administracao'],
    perms: { vagas: 'edit', publicacao: 'edit', validacao: 'edit', banco: 'edit', convocacoes: 'edit', alertas: 'edit', monitoramento: 'edit', validacao_convocacoes: 'edit', importacoes: 'edit', administracao: 'edit' }
  },
};

export default function AdministracaoPage() {
  const [activeTab, setActiveTab] = useState('usuarios');
  const { 
    users, auditLogs, supportConfigs, backups, feedbacks, loading,
    addUser, updateUser, deleteUser, updateUserStatus, resetUserPassword, 
    sendWelcomeEmail, fetchUsers, fetchAuditLogs, fetchFeedbacks, fetchSupportConfigs,
    addSupportConfig, updateSupportConfig, deleteSupportConfig, updateFeedbackStatus, generateBackup 
  } = useAdminStore();

  const { vagas } = useVagasStore();
  const permissions = usePermissions();
  
  const [isNewUserOpen, setIsNewUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [testEmailLoading, setTestEmailLoading] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [passwordUser, setPasswordUser] = useState<{ id: string; nome: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Password dialog state
  const [passwordMode, setPasswordMode] = useState<'manual' | 'temp'>('temp');
  const [manualPassword, setManualPassword] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [sendEmailAfterPassword, setSendEmailAfterPassword] = useState(true);

  // Support config state
  const [isSupportDialogOpen, setIsSupportDialogOpen] = useState(false);
  const [editingSupportConfig, setEditingSupportConfig] = useState<any>(null);
  const [supportForm, setSupportForm] = useState({
    regiao: '', responsavel: '', email: '', teams_user: '', mensagem: '', status: 'ativo' as 'ativo' | 'inativo', unidades: [] as string[]
  });
  const resetSupportForm = () => setSupportForm({ regiao: '', responsavel: '', email: '', teams_user: '', mensagem: '', status: 'ativo' as 'ativo' | 'inativo', unidades: [] });

  const [newUser, setNewUser] = useState({
    nome_completo: '',
    email: '',
    password: '',
    passwordMode: 'temp' as 'manual' | 'temp',
    perfil: 'Analista de RH',
    cargo: '',
    status: 'ativo' as 'ativo' | 'suspenso' | 'inativo',
    avatar_url: '',
    visualiza_todas_unidades: false,
    unidades_vinculadas: [] as string[],
    modulos_acesso: DEFAULT_PERMISSIONS_BY_PROFILE['Analista de RH'].modulos,
    permissoes_modulo: DEFAULT_PERMISSIONS_BY_PROFILE['Analista de RH'].perms,
    pode_incluir_registros: false,
    pode_excluir_requisicoes: false,
    pode_editar_configuracoes: false,
    pode_gerenciar_usuarios: false,
    acesso_portal_unidade: false,
    sendWelcomeEmail: true,
    regiao_suporte: null as string | null,
  });

  useEffect(() => {
    fetchUsers();
    fetchAuditLogs();
    fetchFeedbacks();
  }, [fetchUsers, fetchAuditLogs, fetchFeedbacks]);

  // Auto-generate temp password when mode changes
  useEffect(() => {
    if (newUser.passwordMode === 'temp') {
      setNewUser(prev => ({ ...prev, password: generateTempPassword() }));
    } else {
      setNewUser(prev => ({ ...prev, password: '' }));
    }
  }, [newUser.passwordMode]);

  const resetNewUserForm = () => {
    setNewUser({
    nome_completo: '', email: '', password: '', passwordMode: 'temp',
      perfil: 'Analista de RH', cargo: '', status: 'ativo',
      avatar_url: '',
      visualiza_todas_unidades: false, unidades_vinculadas: [],
      modulos_acesso: DEFAULT_PERMISSIONS_BY_PROFILE['Analista de RH'].modulos,
      permissoes_modulo: DEFAULT_PERMISSIONS_BY_PROFILE['Analista de RH'].perms,
      pode_incluir_registros: false, pode_excluir_requisicoes: false,
      pode_editar_configuracoes: false, pode_gerenciar_usuarios: false,
      acesso_portal_unidade: false, sendWelcomeEmail: true,
      regiao_suporte: null as string | null,
    });
  };

  const handleCreateUser = async () => {
    if (!newUser.nome_completo || !newUser.email || !newUser.password) {
      toast.error('Preencha nome, e-mail e senha.');
      return;
    }
    if (newUser.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setSaving(true);
    try {
      await addUser({
        ...newUser,
        perfil: newUser.perfil as any,
        sendWelcomeEmail: newUser.sendWelcomeEmail,
      });
      toast.success('Usuário criado com sucesso!');
      setIsNewUserOpen(false);
      resetNewUserForm();
    } catch (err: any) {
      toast.error(`Erro ao criar usuário: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!usuarioParaExcluir) return;
    setSaving(true);
    try {
      await deleteUser(usuarioParaExcluir);
      toast.success('Usuário removido com sucesso.');
    } catch (err: any) {
      toast.error(`Erro ao excluir: ${err.message}`);
    } finally {
      setSaving(false);
      setIsDeleteDialogOpen(false);
      setUsuarioParaExcluir(null);
    }
  };

  const handleStatusChange = async (id: string, status: 'ativo' | 'suspenso' | 'inativo') => {
    setSaving(true);
    try {
      await updateUserStatus(id, status);
      toast.success(`Status atualizado para "${status}".`);
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!passwordUser) return;
    const pwd = passwordMode === 'temp' ? generatedPassword : manualPassword;
    if (!pwd || pwd.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setSaving(true);
    try {
      await resetUserPassword(passwordUser.id, pwd);
      if (sendEmailAfterPassword) {
        await sendWelcomeEmail(passwordUser.id, pwd);
        toast.success('Senha redefinida e dados de acesso reenviados por e-mail.');
      } else {
        toast.success('Senha redefinida com sucesso.');
      }
      setIsPasswordDialogOpen(false);
      setPasswordUser(null);
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleResendWelcomeEmail = async (user: any) => {
    setTestEmailLoading(user.id);
    try {
      // We need a password to send — generate a temp one and reset
      const tempPwd = generateTempPassword();
      await resetUserPassword(user.id, tempPwd);
      await sendWelcomeEmail(user.id, tempPwd);
      toast.success('E-mail de boas-vindas reenviado com nova senha temporária.');
    } catch (err: any) {
      toast.error(`Erro ao reenviar e-mail: ${err.message}`);
    } finally {
      setTestEmailLoading(null);
    }
  };

  const openEditUser = (user: any) => {
    setEditingUser({ ...user });
    setIsEditUserOpen(true);
  };

  const handleSaveEditUser = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      await updateUser(editingUser.id, {
        nome_completo: editingUser.nome_completo,
        perfil: editingUser.perfil,
        cargo: editingUser.cargo,
        visualiza_todas_unidades: editingUser.visualiza_todas_unidades,
        unidades_vinculadas: editingUser.unidades_vinculadas,
        pode_incluir_registros: editingUser.pode_incluir_registros,
        pode_excluir_requisicoes: editingUser.pode_excluir_requisicoes,
        pode_editar_configuracoes: editingUser.pode_editar_configuracoes,
        pode_gerenciar_usuarios: editingUser.pode_gerenciar_usuarios,
        acesso_portal_unidade: editingUser.acesso_portal_unidade,
        avatar_url: editingUser.avatar_url,
        modulos_acesso: editingUser.modulos_acesso,
        permissoes_modulo: editingUser.permissoes_modulo,
        regiao_suporte: editingUser.cargo === 'Analista Administrativo' ? editingUser.regiao_suporte : null,
      });
      toast.success('Dados do usuário atualizados.');
      setIsEditUserOpen(false);
      setEditingUser(null);
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const openPasswordDialog = (user: any) => {
    setPasswordUser({ id: user.id, nome: user.nome_completo });
    setPasswordMode('temp');
    setGeneratedPassword(generateTempPassword());
    setManualPassword('');
    setSendEmailAfterPassword(true);
    setShowResetPassword(false);
    setIsPasswordDialogOpen(true);
  };

  const toggleUnidade = (unidade: string) => {
    setNewUser(prev => ({
      ...prev,
      unidades_vinculadas: prev.unidades_vinculadas.includes(unidade)
        ? prev.unidades_vinculadas.filter(u => u !== unidade)
        : [...prev.unidades_vinculadas, unidade]
    }));
  };

  const toggleEditUnidade = (unidade: string) => {
    if (!editingUser) return;
    setEditingUser((prev: any) => ({
      ...prev,
      unidades_vinculadas: prev.unidades_vinculadas.includes(unidade)
        ? prev.unidades_vinculadas.filter((u: string) => u !== unidade)
        : [...prev.unidades_vinculadas, unidade]
    }));
  };

  const handleUploadPhoto = async (file: File, isEdit = false) => {
    try {
      const fileExt = file.name.split('.').pop();
      const userId = isEdit ? editingUser?.id : 'new';
      const filePath = `${userId}/${Date.now()}.${fileExt}`;
      
      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (isEdit) {
        setEditingUser((prev: any) => ({ ...prev, avatar_url: publicUrl }));
      } else {
        setNewUser(prev => ({ ...prev, avatar_url: publicUrl }));
      }
      toast.success('Foto carregada com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao carregar foto: ' + error.message);
    }
  };

  const toggleModule = (moduleId: string, isEdit = false) => {
    if (isEdit) {
      if (!editingUser) return;
      const modulos = editingUser.modulos_acesso || [];
      const newModulos = modulos.includes(moduleId)
        ? modulos.filter((m: string) => m !== moduleId)
        : [...modulos, moduleId];
      
      const newPerms = { ...editingUser.permissoes_modulo };
      if (!newModulos.includes(moduleId)) {
        delete newPerms[moduleId];
      } else if (!newPerms[moduleId]) {
        newPerms[moduleId] = 'read';
      }

      setEditingUser((prev: any) => ({
        ...prev,
        modulos_acesso: newModulos,
        permissoes_modulo: newPerms
      }));
    } else {
      const modulos = newUser.modulos_acesso || [];
      const newModulos = modulos.includes(moduleId)
        ? modulos.filter((m: string) => m !== moduleId)
        : [...modulos, moduleId];
      
      const newPerms = { ...newUser.permissoes_modulo };
      if (!newModulos.includes(moduleId)) {
        delete newPerms[moduleId];
      } else if (!newPerms[moduleId]) {
        newPerms[moduleId] = 'read';
      }

      setNewUser(prev => ({
        ...prev,
        modulos_acesso: newModulos,
        permissoes_modulo: newPerms
      }));
    }
  };

  const togglePermission = (moduleId: string, isEdit = false) => {
    if (isEdit) {
      if (!editingUser) return;
      const current = editingUser.permissoes_modulo?.[moduleId] || 'read';
      const next = current === 'read' ? 'edit' : 'read';
      setEditingUser((prev: any) => ({
        ...prev,
        permissoes_modulo: {
          ...(prev.permissoes_modulo || {}),
          [moduleId]: next
        }
      }));
    } else {
      const current = newUser.permissoes_modulo?.[moduleId] || 'read';
      const next = current === 'read' ? 'edit' : 'read';
      setNewUser(prev => ({
        ...prev,
        permissoes_modulo: {
          ...(prev.permissoes_modulo || {}),
          [moduleId]: next
        }
      }));
    }
  };

  const handleProfileChange = (perfil: string, isEdit = false) => {
    const defaults = DEFAULT_PERMISSIONS_BY_PROFILE[perfil] || { modulos: [], perms: {} };
    if (isEdit) {
      setEditingUser((prev: any) => ({
        ...prev,
        perfil,
        modulos_acesso: defaults.modulos,
        permissoes_modulo: defaults.perms
      }));
    } else {
      setNewUser(prev => ({
        ...prev,
        perfil,
        modulos_acesso: defaults.modulos,
        permissoes_modulo: defaults.perms
      }));
    }
  };
  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      'ativo': 'bg-green-100 text-green-700',
      'suspenso': 'bg-amber-100 text-amber-700',
      'inativo': 'bg-slate-100 text-slate-500',
    };
    return map[status] || 'bg-slate-100 text-slate-500';
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader 
        title="Configurações do Sistema"
      />



      <Tabs value={activeTab} onValueChange={(val) => {
          setActiveTab(val);
          if (val === 'usuarios') fetchUsers();
          if (val === 'auditoria') fetchAuditLogs();
          if (val === 'feedback') fetchFeedbacks();
          if (val === 'suporte') { fetchUsers(); fetchSupportConfigs(); }
        }} className="space-y-4">
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
          <TabsTrigger value="feedbacks" className="gap-2 font-bold px-4 py-2">
            <MessageSquare className="h-4 w-4" /> Feedbacks
          </TabsTrigger>
        </TabsList>

        {/* USUÁRIOS */}
        <TabsContent value="usuarios">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b space-y-0">
              <div>
                <CardTitle className="text-lg font-bold">Usuários Cadastrados</CardTitle>
                <CardDescription>Gerencie quem tem acesso ao sistema, perfis, permissões e senhas.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => fetchUsers()} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Atualizar lista
                </Button>
                <Button onClick={() => { resetNewUserForm(); setIsNewUserOpen(true); }} className="gap-2 bg-primary">
                  <UserPlus className="h-4 w-4" /> Incluir novo usuário
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left">Nome / E-mail</TableHead>
                      <TableHead className="text-left">Perfil / Cargo</TableHead>
                      <TableHead className="text-left">Unidades</TableHead>
                      <TableHead className="text-left">Status</TableHead>
                      <TableHead className="text-left">Último Acesso</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="text-left">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                              {user.avatar_url ? (
                                <img src={user.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                              ) : (
                                <UserIcon className="h-4 w-4 text-slate-400" />
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-700">{user.nome_completo}</span>
                              <span className="text-xs text-slate-400 font-medium">{user.email}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-left">
                          <div className="flex flex-col gap-0.5 items-start">
                            <Badge variant="outline" className="w-fit text-[10px] font-bold py-0 h-4 bg-blue-50 text-blue-700 border-blue-100 uppercase tracking-tighter">{user.perfil}</Badge>
                            <span className="text-[11px] text-slate-500 font-medium ml-0.5">{user.cargo}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-left">
                          {user.visualiza_todas_unidades ? (
                            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 font-bold text-[11px]">Todas</Badge>
                          ) : (
                            <span className="text-[11px] text-slate-500">{user.unidades_vinculadas?.length || 0} unid.</span>
                          )}
                        </TableCell>
                        <TableCell className="text-left">
                          <Badge className={`${getStatusBadge(user.status)} font-bold text-[11px] uppercase border-0`}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-left text-xs text-slate-500 font-medium">
                          {user.ultimo_acesso ? new Date(user.ultimo_acesso).toLocaleDateString('pt-BR') : 'Nunca'}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0"><MoreVertical className="h-4 w-4 text-slate-400" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => openEditUser(user)}>
                                <Edit2 className="mr-2 h-4 w-4" /> Editar dados do usuário
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openPasswordDialog(user)}>
                                <KeyRound className="mr-2 h-4 w-4" /> Redefinir senha
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleResendWelcomeEmail(user)}
                                disabled={testEmailLoading === user.id}
                              >
                                <Send className="mr-2 h-4 w-4" /> {testEmailLoading === user.id ? 'Enviando...' : 'Reenviar e-mail de boas-vindas'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {user.status !== 'ativo' && (
                                <DropdownMenuItem className="text-green-600" onClick={() => handleStatusChange(user.id, 'ativo')}>
                                  <UserCheck className="mr-2 h-4 w-4" /> Reativar acesso
                                </DropdownMenuItem>
                              )}
                              {user.status === 'ativo' && (
                                <DropdownMenuItem className="text-amber-600" onClick={() => handleStatusChange(user.id, 'suspenso')}>
                                  <Ban className="mr-2 h-4 w-4" /> Suspender acesso
                                </DropdownMenuItem>
                              )}
                              {user.status !== 'inativo' && (
                                <DropdownMenuItem className="text-slate-500" onClick={() => handleStatusChange(user.id, 'inativo')}>
                                  <X className="mr-2 h-4 w-4" /> Inativar usuário
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => {
                                  setUsuarioParaExcluir(user.id);
                                  setIsDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Excluir acesso
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
                    <TableHead>Usuário</TableHead>
                    <TableHead>Unidades com Acesso</TableHead>
                    <TableHead>Ações Permitidas</TableHead>
                    <TableHead className="text-right">Ajuste</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="py-4">
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
                      <TableCell className="text-right">
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
            <CardHeader className="border-b">
              <CardTitle className="text-lg font-bold">Suporte Técnico</CardTitle>
              <CardDescription>Analistas administrativos responsáveis por cada região. Para alterar, edite o cadastro do usuário na aba "Usuários" e defina o cargo como "Analista Administrativo" com a região de suporte.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {(() => {
                const analistas = users.filter(u => u.cargo === 'Analista Administrativo' && u.regiao_suporte && u.status === 'ativo');
                const regiaoLabels: Record<string, string> = {
                  go_es: 'Goiás e Espírito Santo',
                  demais: 'Demais Unidades',
                };
                const regiaoUnidades: Record<string, string[]> = {
                  go_es: [...(REGIOES_SELECAO['Goiânia'] || []), ...(REGIOES_SELECAO['Vitória (ES)'] || [])],
                  demais: REGIOES_SELECAO['Demais Unidades'] || [],
                };

                if (analistas.length === 0) {
                  return (
                    <div className="p-8 text-center text-slate-400">
                      <Bell className="h-10 w-10 mx-auto mb-2 opacity-40" />
                      <p className="font-medium">Nenhum analista administrativo com região de suporte definida.</p>
                      <p className="text-sm mt-1">Vá à aba "Usuários", edite um usuário com cargo "Analista Administrativo" e defina a região de suporte.</p>
                    </div>
                  );
                }

                const regioes = ['go_es', 'demais'];
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {regioes.map(regiao => {
                      const responsaveis = analistas.filter(a => a.regiao_suporte === regiao);
                      return (
                        <div key={regiao} className="border rounded-xl p-5 bg-slate-50/50">
                          <h3 className="font-bold text-sm text-primary mb-1">{regiaoLabels[regiao]}</h3>
                          <p className="text-[10px] text-slate-400 mb-4">{(regiaoUnidades[regiao] || []).join(', ')}</p>
                          {responsaveis.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">Nenhum responsável definido</p>
                          ) : (
                            <div className="space-y-3">
                              {responsaveis.map(resp => (
                                <div key={resp.id} className="bg-white rounded-lg p-3 border shadow-sm">
                                  <p className="font-bold text-sm text-slate-700">{resp.nome_completo}</p>
                                  <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                                    <Mail className="h-3 w-3" /> {resp.email}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
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
                      <TableHead>Data / Hora</TableHead>
                      <TableHead >Usuário</TableHead>
                      <TableHead >Ação / Módulo</TableHead>
                      <TableHead >Registro</TableHead>
                      <TableHead >Alteração (De → Para)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id} className="text-xs">
                        <TableCell className="font-mono text-slate-500">
                          {log.created_at ? new Date(log.created_at).toLocaleDateString('pt-BR') : log.data} <br/> 
                          {log.created_at ? new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : log.hora}
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
                    <TableHead>Status Original Importado</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Grupo/Card de Destino</TableHead>
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
                          <TableCell className="text-slate-700 font-bold">{status.toUpperCase().replace('_', ' ')}</TableCell>
                          <TableCell>
                            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-bold text-xs">
                              {data.count}
                            </span>
                          </TableCell>
                          <TableCell>
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
                        <TableHead>Data / Hora</TableHead>
                        <TableHead>Registros</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {backups.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-mono text-xs">{b.data_hora}</TableCell>
                          <TableCell className="font-bold text-slate-600 text-xs">{b.quantidade_registros}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1.5 text-green-600 font-bold text-[11px]">
                              <CheckCircle className="h-3 w-3" /> Sucesso
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
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

        {/* FEEDBACKS */}
        <TabsContent value="feedbacks">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b space-y-0">
              <div>
                <CardTitle className="text-lg font-bold text-slate-800">Feedback dos Usuários</CardTitle>
                <CardDescription>Sugestões, problemas e oportunidades reportadas via Assistente Agie.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="w-[150px]">Data</TableHead>
                      <TableHead className="w-[200px]">Usuário</TableHead>
                      <TableHead className="w-[120px]">Tipo</TableHead>
                      <TableHead>Mensagem</TableHead>
                      <TableHead className="w-[120px]">Status</TableHead>
                      <TableHead className="w-[100px] text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feedbacks && feedbacks.length > 0 ? (
                      feedbacks.map((item) => (
                        <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell className="text-xs font-medium text-slate-500">
                            {new Date(item.created_at).toLocaleString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-700 text-sm">{item.user_name}</span>
                              <span className="text-[10px] text-slate-400 font-medium">{item.user_email}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn(
                              "text-[10px] font-bold uppercase",
                              item.tipo === 'sugestao' ? "bg-blue-100 text-blue-700" :
                              item.tipo === 'problema' ? "bg-red-100 text-red-700" :
                              "bg-amber-100 text-amber-700"
                            )}>
                              {item.tipo === 'sugestao' ? 'Sugestão' :
                               item.tipo === 'problema' ? 'Problema' : 'Melhoria'}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-md">
                            <p className="text-xs text-slate-600 leading-relaxed truncate hover:whitespace-normal transition-all cursor-help" title={item.mensagem}>
                              {item.mensagem}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn(
                              "text-[10px] font-bold uppercase",
                              item.status === 'pendente' ? "bg-slate-100 text-slate-500" :
                              item.status === 'lido' ? "bg-green-100 text-green-700" :
                              "bg-primary/10 text-primary"
                            )}>
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4 text-slate-400" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Alterar Status</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => updateFeedbackStatus(item.id, 'lido')}>
                                  <Check className="mr-2 h-4 w-4 text-green-600" /> Marcar como lido
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateFeedbackStatus(item.id, 'respondido')}>
                                  <Send className="mr-2 h-4 w-4 text-primary" /> Marcar como respondido
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateFeedbackStatus(item.id, 'pendente')}>
                                  <Clock className="mr-2 h-4 w-4 text-slate-500" /> Marcar como pendente
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-slate-400 italic">
                          Nenhum feedback recebido até o momento.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIALOG: NOVO USUÁRIO */}
      <Dialog open={isNewUserOpen} onOpenChange={setIsNewUserOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" /> Incluir novo usuário
            </DialogTitle>
            <DialogDescription>Preencha os dados, defina a senha e as permissões iniciais.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="relative group">
                <div className="h-20 w-20 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
                  {newUser.avatar_url ? (
                    <img src={newUser.avatar_url} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <UserIcon className="h-8 w-8 text-slate-300" />
                  )}
                </div>
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadPhoto(file);
                  }}
                />
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="text-sm font-bold text-slate-800">Foto de Perfil</h4>
                <p className="text-xs text-slate-500">Adicione uma foto para facilitar a identificação do usuário no sistema.</p>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px] font-bold text-primary px-0 hover:bg-transparent" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-3 w-3 mr-1" /> Alterar foto
                </Button>
              </div>
            </div>

            {/* Nome e Email */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Nome Completo</Label>
                <Input placeholder="Ex: João da Silva" value={newUser.nome_completo} onChange={(e) => setNewUser(p => ({ ...p, nome_completo: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">E-mail</Label>
                <Input type="email" placeholder="joao@agir.org.br" value={newUser.email} onChange={(e) => setNewUser(p => ({ ...p, email: e.target.value }))} />
              </div>
            </div>

            {/* Perfil, Cargo, Status */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Perfil de Acesso</Label>
                <Select value={newUser.perfil} onValueChange={(v) => handleProfileChange(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERFIS_ACESSO.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Cargo Hierárquico</Label>
                <Select value={newUser.cargo} onValueChange={(v) => setNewUser(p => ({ ...p, cargo: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {CARGOS_HIERARQUICOS.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {newUser.cargo === 'Analista Administrativo' && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Região de Suporte</Label>
                  <Select value={newUser.regiao_suporte || ''} onValueChange={(v) => setNewUser(p => ({ ...p, regiao_suporte: v || null }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione a região..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="go_es">Goiás e Espírito Santo</SelectItem>
                      <SelectItem value="demais">Demais Unidades</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Status</Label>
                <Select value={newUser.status} onValueChange={(v: any) => setNewUser(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="suspenso">Suspenso</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Senha */}
            <div className="space-y-3 border-t pt-4">
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Senha de Acesso</h4>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={newUser.passwordMode === 'temp'} onChange={() => setNewUser(p => ({ ...p, passwordMode: 'temp' }))} className="h-3.5 w-3.5" />
                  <span className="text-sm font-medium">Gerar senha temporária</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={newUser.passwordMode === 'manual'} onChange={() => setNewUser(p => ({ ...p, passwordMode: 'manual' }))} className="h-3.5 w-3.5" />
                  <span className="text-sm font-medium">Definir senha manualmente</span>
                </label>
              </div>
              {newUser.passwordMode === 'temp' ? (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input type={showNewPassword ? 'text' : 'password'} value={newUser.password} readOnly className="font-mono bg-muted/50 pr-10" />
                    <button type="button" onClick={() => setShowNewPassword(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => { setNewUser(p => ({ ...p, password: generateTempPassword() })); setShowNewPassword(false); }}>
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Input type={showNewPassword ? 'text' : 'password'} placeholder="Mínimo 6 caracteres" value={newUser.password} onChange={(e) => setNewUser(p => ({ ...p, password: e.target.value }))} className="pr-10" />
                  <button type="button" onClick={() => setShowNewPassword(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              )}
            </div>

            {/* Unidades e Permissões */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Unidades Vinculadas</h4>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Visualizar todas as unidades</Label>
                  <p className="text-[11px] text-muted-foreground">O usuário terá acesso a todos os registros do sistema.</p>
                </div>
                <Switch checked={newUser.visualiza_todas_unidades} onCheckedChange={(v) => setNewUser(p => ({ ...p, visualiza_todas_unidades: v }))} />
              </div>

              {!newUser.visualiza_todas_unidades && (
                <div className="space-y-3">
                  {/* Seleção rápida por região */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase">Selecionar por região:</span>
                    {Object.entries(REGIOES_SELECAO).map(([regiao, unidades]) => {
                      const allSelected = unidades.length > 0 && unidades.every(u => newUser.unidades_vinculadas.includes(u));
                      return (
                        <Button
                          key={regiao}
                          type="button"
                          variant={allSelected ? "default" : "outline"}
                          size="sm"
                          className="h-7 text-[11px] font-bold"
                          onClick={() => {
                            if (allSelected) {
                              setNewUser(p => ({ ...p, unidades_vinculadas: p.unidades_vinculadas.filter(u => !unidades.includes(u)) }));
                            } else {
                              setNewUser(p => ({ ...p, unidades_vinculadas: [...new Set([...p.unidades_vinculadas, ...unidades])] }));
                            }
                          }}
                        >
                          {regiao} {allSelected && <Check className="h-3 w-3 ml-1" />}
                        </Button>
                      );
                    })}
                  </div>

                  {/* Checkboxes individuais agrupados por região */}
                  <div className="space-y-3 max-h-[220px] overflow-y-auto">
                    {Object.entries(REGIOES_SELECAO).map(([regiao, unidades]) => (
                      <div key={regiao}>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">{regiao}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {unidades.map(u => (
                            <div key={u} className="flex items-center gap-2 border rounded-md p-2 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => toggleUnidade(u)}>
                              <input type="checkbox" checked={newUser.unidades_vinculadas.includes(u)} readOnly className="h-3 w-3 rounded" />
                              <label className="text-[11px] font-bold text-foreground/70 cursor-pointer">{u}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Acesso a Módulos */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Módulos e Menus de Acesso</h4>
                <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-500 font-bold border-slate-200">Personalizado por Perfil</Badge>
              </div>
              
              <div className="grid grid-cols-1 gap-2 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                {MODULOS_SISTEMA.map(modulo => {
                  const isChecked = newUser.modulos_acesso?.includes(modulo.id);
                  const canEdit = newUser.permissoes_modulo?.[modulo.id] === 'edit';
                  
                  return (
                    <div key={modulo.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white transition-colors">
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          id={`mod-${modulo.id}`} 
                          checked={isChecked}
                          onCheckedChange={() => toggleModule(modulo.id)}
                        />
                        <Label htmlFor={`mod-${modulo.id}`} className="text-sm font-bold text-slate-700 cursor-pointer">{modulo.label}</Label>
                      </div>
                      
                      {isChecked && (
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-[10px] font-bold cursor-pointer transition-all border-2",
                              canEdit 
                                ? "bg-green-50 text-green-700 border-green-200 shadow-sm" 
                                : "bg-blue-50 text-blue-700 border-blue-200 shadow-sm"
                            )}
                            onClick={() => togglePermission(modulo.id)}
                          >
                            {canEdit ? <><CheckCircle className="h-2.5 w-2.5 mr-1" /> Edição Completa</> : <><Eye className="h-2.5 w-2.5 mr-1" /> Somente Leitura</>}
                          </Badge>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Permissões específicas (Legacy Flags) */}
            <div className="space-y-3 border-t pt-4">
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Outras Permissões</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Switch checked={newUser.pode_incluir_registros} onCheckedChange={(v) => setNewUser(p => ({ ...p, pode_incluir_registros: v }))} />
                  <Label className="text-xs font-bold">Pode incluir registros</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={newUser.pode_excluir_requisicoes} onCheckedChange={(v) => setNewUser(p => ({ ...p, pode_excluir_requisicoes: v }))} />
                  <Label className="text-xs font-bold">Pode excluir requisições</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={newUser.pode_editar_configuracoes} onCheckedChange={(v) => setNewUser(p => ({ ...p, pode_editar_configuracoes: v }))} />
                  <Label className="text-xs font-bold">Pode editar configurações</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={newUser.pode_gerenciar_usuarios} onCheckedChange={(v) => setNewUser(p => ({ ...p, pode_gerenciar_usuarios: v }))} />
                  <Label className="text-xs font-bold">Pode gerenciar usuários</Label>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <Switch checked={newUser.acesso_portal_unidade} onCheckedChange={(v) => setNewUser(p => ({ ...p, acesso_portal_unidade: v }))} />
                <div>
                  <Label className="text-xs font-bold text-blue-800">Habilitar acesso ao Portal da Unidade</Label>
                  <p className="text-[10px] text-blue-600 mt-0.5">O usuário poderá acessar o Portal com as mesmas credenciais e unidades vinculadas.</p>
                </div>
              </div>
            </div>

            {/* E-mail de boas-vindas */}
            <div className="flex items-center gap-3 border-t pt-4">
              <Checkbox 
                id="sendWelcome" 
                checked={newUser.sendWelcomeEmail} 
                onCheckedChange={(v) => setNewUser(p => ({ ...p, sendWelcomeEmail: !!v }))} 
              />
              <label htmlFor="sendWelcome" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" /> Enviar e-mail de boas-vindas agora
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewUserOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateUser} disabled={saving} className="bg-primary gap-2">
              {saving ? 'Criando...' : <><UserPlus className="h-4 w-4" /> Criar Usuário</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: EDITAR USUÁRIO */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-primary" /> Editar dados do usuário
            </DialogTitle>
            <DialogDescription>Altere perfil, cargo, permissões e unidades sem excluir o cadastro.</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="grid gap-5 py-4">
              <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="relative group">
                  <div className="h-20 w-20 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
                    {editingUser.avatar_url ? (
                      <img src={editingUser.avatar_url} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <UserIcon className="h-8 w-8 text-slate-300" />
                    )}
                  </div>
                  <button 
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                  <input 
                    type="file" 
                    ref={editFileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadPhoto(file, true);
                    }}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <h4 className="text-sm font-bold text-slate-800">Foto de Perfil</h4>
                  <p className="text-xs text-slate-500">Adicione uma foto para facilitar a identificação do usuário no sistema.</p>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px] font-bold text-primary px-0 hover:bg-transparent" onClick={() => editFileInputRef.current?.click()}>
                    <Upload className="h-3 w-3 mr-1" /> Alterar foto
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Nome Completo</Label>
                  <Input value={editingUser.nome_completo} onChange={(e) => setEditingUser((p: any) => ({ ...p, nome_completo: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">E-mail (somente leitura)</Label>
                  <Input value={editingUser.email} readOnly className="bg-muted/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Perfil de Acesso</Label>
                  <Select value={editingUser.perfil} onValueChange={(v) => handleProfileChange(v, true)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PERFIS_ACESSO.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Cargo Hierárquico</Label>
                  <Select value={editingUser.cargo || ''} onValueChange={(v) => setEditingUser((p: any) => ({ ...p, cargo: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {CARGOS_HIERARQUICOS.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {editingUser.cargo === 'Analista Administrativo' && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Região de Suporte</Label>
                    <Select value={editingUser.regiao_suporte || ''} onValueChange={(v) => setEditingUser((p: any) => ({ ...p, regiao_suporte: v || null }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione a região..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="go_es">Goiás e Espírito Santo</SelectItem>
                        <SelectItem value="demais">Demais Unidades</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-4 border-t pt-4">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Unidades Vinculadas</h4>
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-bold">Visualizar todas as unidades</Label>
                  <Switch checked={editingUser.visualiza_todas_unidades} onCheckedChange={(v) => setEditingUser((p: any) => ({ ...p, visualiza_todas_unidades: v }))} />
                </div>
                {!editingUser.visualiza_todas_unidades && (
                  <div className="grid grid-cols-2 gap-2 max-h-[180px] overflow-y-auto">
                    {ALL_UNIDADES.map(u => (
                      <div key={u} className="flex items-center gap-2 border rounded-md p-2 hover:bg-muted/50 cursor-pointer" onClick={() => toggleEditUnidade(u)}>
                        <input type="checkbox" checked={editingUser.unidades_vinculadas?.includes(u)} readOnly className="h-3 w-3 rounded" />
                        <label className="text-[11px] font-bold text-foreground/70 cursor-pointer">{u}</label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Acesso a Módulos */}
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Módulos e Menus de Acesso</h4>
                  <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-500 font-bold border-slate-200">Personalizado por Perfil</Badge>
                </div>
                
                <div className="grid grid-cols-1 gap-2 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                  {MODULOS_SISTEMA.map(modulo => {
                    const isChecked = editingUser.modulos_acesso?.includes(modulo.id);
                    const canEdit = editingUser.permissoes_modulo?.[modulo.id] === 'edit';
                    
                    return (
                      <div key={modulo.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white transition-colors">
                        <div className="flex items-center gap-3">
                          <Checkbox 
                            id={`edit-mod-${modulo.id}`} 
                            checked={isChecked}
                            onCheckedChange={() => toggleModule(modulo.id, true)}
                          />
                          <Label htmlFor={`edit-mod-${modulo.id}`} className="text-sm font-bold text-slate-700 cursor-pointer">{modulo.label}</Label>
                        </div>
                        
                        {isChecked && (
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-[10px] font-bold cursor-pointer transition-all border-2",
                                canEdit 
                                  ? "bg-green-50 text-green-700 border-green-200 shadow-sm" 
                                  : "bg-blue-50 text-blue-700 border-blue-200 shadow-sm"
                              )}
                              onClick={() => togglePermission(modulo.id, true)}
                            >
                              {canEdit ? <><CheckCircle className="h-2.5 w-2.5 mr-1" /> Edição Completa</> : <><Eye className="h-2.5 w-2.5 mr-1" /> Somente Leitura</>}
                            </Badge>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3 border-t pt-4">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Outras Permissões</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Switch checked={editingUser.pode_incluir_registros} onCheckedChange={(v) => setEditingUser((p: any) => ({ ...p, pode_incluir_registros: v }))} />
                    <Label className="text-xs font-bold">Pode incluir registros</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={editingUser.pode_excluir_requisicoes} onCheckedChange={(v) => setEditingUser((p: any) => ({ ...p, pode_excluir_requisicoes: v }))} />
                    <Label className="text-xs font-bold">Pode excluir requisições</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={editingUser.pode_editar_configuracoes} onCheckedChange={(v) => setEditingUser((p: any) => ({ ...p, pode_editar_configuracoes: v }))} />
                    <Label className="text-xs font-bold">Pode editar configurações</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={editingUser.pode_gerenciar_usuarios} onCheckedChange={(v) => setEditingUser((p: any) => ({ ...p, pode_gerenciar_usuarios: v }))} />
                    <Label className="text-xs font-bold">Pode gerenciar usuários</Label>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <Switch checked={editingUser?.acesso_portal_unidade || false} onCheckedChange={(v) => setEditingUser((p: any) => ({ ...p, acesso_portal_unidade: v }))} />
                  <div>
                    <Label className="text-xs font-bold text-blue-800">Habilitar acesso ao Portal da Unidade</Label>
                    <p className="text-[10px] text-blue-600 mt-0.5">O usuário poderá acessar o Portal com as mesmas credenciais e unidades vinculadas.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEditUser} disabled={saving} className="bg-primary gap-2">
              {saving ? 'Salvando...' : <><Save className="h-4 w-4" /> Salvar Alterações</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: REDEFINIR SENHA */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" /> Redefinir senha
            </DialogTitle>
            <DialogDescription>
              {passwordUser ? `Redefinir senha de ${passwordUser.nome}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={passwordMode === 'temp'} onChange={() => { setPasswordMode('temp'); setGeneratedPassword(generateTempPassword()); }} className="h-3.5 w-3.5" />
                <span className="text-sm font-medium">Gerar senha temporária</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={passwordMode === 'manual'} onChange={() => setPasswordMode('manual')} className="h-3.5 w-3.5" />
                <span className="text-sm font-medium">Definir manualmente</span>
              </label>
            </div>
            {passwordMode === 'temp' ? (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input type={showResetPassword ? 'text' : 'password'} value={generatedPassword} readOnly className="font-mono bg-muted/50 pr-10" />
                  <button type="button" onClick={() => setShowResetPassword(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => { setGeneratedPassword(generateTempPassword()); setShowResetPassword(false); }}>
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Input type={showResetPassword ? 'text' : 'password'} placeholder="Nova senha (mín. 6 caracteres)" value={manualPassword} onChange={(e) => setManualPassword(e.target.value)} className="pr-10" />
                <button type="button" onClick={() => setShowResetPassword(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            )}
            <div className="flex items-center gap-3 pt-2">
              <Checkbox 
                id="sendEmailPassword" 
                checked={sendEmailAfterPassword} 
                onCheckedChange={(v) => setSendEmailAfterPassword(!!v)} 
              />
              <label htmlFor="sendEmailPassword" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" /> Reenviar dados de acesso por e-mail
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleResetPassword} disabled={saving} className="bg-primary gap-2">
              {saving ? 'Redefinindo...' : <><KeyRound className="h-4 w-4" /> Redefinir Senha</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: EXCLUIR */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Excluir acesso do usuário?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O usuário perderá o acesso ao sistema permanentemente e seu cadastro será removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUsuarioParaExcluir(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={saving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {saving ? 'Excluindo...' : 'Confirmar Exclusão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
