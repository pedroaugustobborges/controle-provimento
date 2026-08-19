import { useState, useMemo, useEffect, useRef } from "react";
import { useVagasStore } from "@/store/vagasStore";
import { useAdminStore } from "@/store/adminStore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";
import {
  Settings,
  Users,
  ShieldCheck,
  Plus,
  Trash2,
  Edit2,
  Search,
  MoreVertical,
  UserPlus,
  Mail,
  Save,
  CheckCircle,
  AlertCircle,
  Info,
  Shield,
  Check,
  X,
  KeyRound,
  RefreshCw,
  Ban,
  UserCheck,
  Send,
  Eye,
  EyeOff,
  Camera,
  Upload,
  User as UserIcon,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageSkeleton } from "@/components/PageSkeleton";
import { cn } from "@/lib/utils";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EQUIPE_POR_UNIDADE, RESPONSAVEL_LIDERANCA } from "@/data/equipe";
import {
  getCategoriaStatus,
  unitIsAllowed,
  normalizeUnitName,
  getUnitDisplayName,
  UNIT_ALIAS_MAP,
} from "@/lib/vagaUtils";
import { toast } from "sonner";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { PERFIS_ACESSO, CARGOS_HIERARQUICOS } from "@/types/auth";
import {
  generateTempPassword,
  getAdminPasswordErrorMessage,
  validateAdminPassword,
} from "@/lib/adminPasswordUtils";
import {
  UnidadesPicker,
  ALL_UNIDADES,
  UNIDADES_GRUPOS,
} from "@/components/UnidadesPicker";

// Legacy alias entries not covered by UNIT_ALIAS_MAP (e.g. old profiles that stored "DOURADOS")
const LEGACY_ALIASES: Record<string, string[]> = {
  DOURADOS: ["CHRD"],
};

/**
 * Checks whether a full vaga unit name belongs to a short unit name.
 * 1. Tries exact prefix match via unitIsAllowed (covers UNIT_ALIAS_MAP entries like HRD→CHRD).
 * 2. Tries legacy aliases for old stored values.
 * 3. Falls back to an `includes` check for remaining edge cases.
 */
const vagaMatchesShortUnits = (
  vagaUnidade: string | null | undefined,
  shortNames: string[],
): boolean => {
  if (!vagaUnidade || shortNames.length === 0) return false;
  if (unitIsAllowed(vagaUnidade, shortNames)) return true;
  const normFull = normalizeUnitName(vagaUnidade);
  return shortNames.some((s) => {
    const normShort = normalizeUnitName(s);
    if (normFull.includes(normShort)) return true;
    // Check UNIT_ALIAS_MAP and legacy aliases
    const prefixes = [
      ...(UNIT_ALIAS_MAP[normShort] || []),
      ...(LEGACY_ALIASES[normShort] || []),
    ];
    return prefixes.some((p) => normFull.startsWith(normalizeUnitName(p)));
  });
};

/**
 * Resolves a full vaga unit name to its canonical short name from ALL_UNIDADES.
 * Falls back to the original string if no match is found.
 */
const resolveShortUnitName = (vagaUnidade: string): string => {
  return (
    ALL_UNIDADES.find((u) => vagaMatchesShortUnits(vagaUnidade, [u])) ??
    vagaUnidade
  );
};

const BANCO_TALENTOS_UNIDADES = [
  "Goiânia - GO",
  "Cidade de Goiás - GO",
  "Jataí - GO",
  "Cáceres - MT",
  "Vitória - ES",
];

const MODULOS_SISTEMA = [
  { id: "vagas", label: "Vagas (Painel Principal)" },
  { id: "publicacao", label: "Publicação de Edital" },
  { id: "validacao", label: "Validação de Edital" },
  { id: "banco", label: "Banco de Talentos" },
  { id: "convocacoes", label: "Convocações" },
  { id: "alertas", label: "Alertas e Tarefas" },
  { id: "validacao_convocacoes", label: "Validar Convocações" },
  { id: "administracao", label: "Administração" },
];

const DEFAULT_PERMISSIONS_BY_PROFILE: Record<
  string,
  { modulos: string[]; perms: Record<string, "read" | "edit"> }
> = {
  "Analista de RH": {
    modulos: [
      "vagas",
      "banco",
      "convocacoes",
      "alertas",
      "validacao_convocacoes",
    ],
    perms: {
      vagas: "edit",
      banco: "edit",
      convocacoes: "edit",
      alertas: "edit",
      validacao_convocacoes: "read",
    },
  },
  "Assistente de RH": {
    modulos: [
      "vagas",
      "banco",
      "convocacoes",
      "alertas",
      "validacao_convocacoes",
    ],
    perms: {
      vagas: "edit",
      banco: "edit",
      convocacoes: "edit",
      alertas: "edit",
      validacao_convocacoes: "read",
    },
  },
  "Analista Administrativo": {
    modulos: [
      "vagas",
      "publicacao",
      "validacao",
      "banco",
      "convocacoes",
      "alertas",
      "validacao_convocacoes",
      "administracao",
    ],
    perms: {
      vagas: "edit",
      publicacao: "edit",
      validacao: "edit",
      banco: "edit",
      convocacoes: "edit",
      alertas: "edit",
      validacao_convocacoes: "edit",
      administracao: "edit",
    },
  },
  Supervisão: {
    modulos: [
      "vagas",
      "publicacao",
      "validacao",
      "banco",
      "convocacoes",
      "alertas",
      "validacao_convocacoes",
      "administracao",
    ],
    perms: {
      vagas: "edit",
      publicacao: "edit",
      validacao: "edit",
      banco: "edit",
      convocacoes: "edit",
      alertas: "edit",
      validacao_convocacoes: "edit",
      administracao: "edit",
    },
  },
  Coordenação: {
    modulos: [
      "vagas",
      "publicacao",
      "validacao",
      "banco",
      "convocacoes",
      "alertas",
      "validacao_convocacoes",
      "administracao",
    ],
    perms: {
      vagas: "edit",
      publicacao: "edit",
      validacao: "edit",
      banco: "edit",
      convocacoes: "edit",
      alertas: "edit",
      validacao_convocacoes: "edit",
      administracao: "edit",
    },
  },
  "Analista de Edital": {
    modulos: [
      "vagas",
      "publicacao",
      "validacao",
      "banco",
      "convocacoes",
      "alertas",
      "validacao_convocacoes",
    ],
    perms: {
      vagas: "read",
      publicacao: "edit",
      validacao: "read",
      banco: "read",
      convocacoes: "read",
      alertas: "read",
      validacao_convocacoes: "read",
    },
  },
  "Analista das Convocações": {
    modulos: [
      "vagas",
      "banco",
      "convocacoes",
      "alertas",
      "validacao_convocacoes",
    ],
    perms: {
      vagas: "read",
      banco: "read",
      convocacoes: "edit",
      alertas: "read",
      validacao_convocacoes: "read",
    },
  },
  Administrador: {
    modulos: [
      "vagas",
      "publicacao",
      "validacao",
      "banco",
      "convocacoes",
      "alertas",
      "validacao_convocacoes",
      "administracao",
    ],
    perms: {
      vagas: "edit",
      publicacao: "edit",
      validacao: "edit",
      banco: "edit",
      convocacoes: "edit",
      alertas: "edit",
      validacao_convocacoes: "edit",
      administracao: "edit",
    },
  },
};

export default function AdministracaoPage() {
  const [activeTab, setActiveTab] = useState("usuarios");
  const {
    users,
    loading,
    addUser,
    updateUser,
    deleteUser,
    updateUserStatus,
    resetUserPassword,
    sendWelcomeEmail,
    fetchUsers,
  } = useAdminStore();

  const { vagas } = useVagasStore();

  // Map of short unit name → registered user currently responsible.
  // Built from profiles.unidades_responsavel (authoritative source) so it works
  // even when a unit has no vagas yet.
  const unitAnalystMap = useMemo(() => {
    const map = new Map<string, string>(); // shortName → analystName
    (users || []).forEach((u: any) => {
      if (!u.nome_completo || !Array.isArray(u.unidades_responsavel)) return;
      u.unidades_responsavel.forEach((unit: string) => {
        if (unit && !map.has(unit)) {
          map.set(unit, u.nome_completo);
        }
      });
    });
    return map;
  }, [users]);

  const [isNewUserOpen, setIsNewUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [testEmailLoading, setTestEmailLoading] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState<string | null>(
    null,
  );
  const [editingUser, setEditingUser] = useState<any>(null);
  const [passwordUser, setPasswordUser] = useState<{
    id: string;
    nome: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Search + pagination for the Usuários tab
  const [userSearch, setUserSearch] = useState("");
  const [userPage, setUserPage] = useState(1);
  const USER_PAGE_SIZE = 20;

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.nome_completo?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.perfil?.toLowerCase().includes(q) ||
        u.cargo?.toLowerCase().includes(q),
    );
  }, [users, userSearch]);

  const userPageCount = Math.max(
    1,
    Math.ceil(filteredUsers.length / USER_PAGE_SIZE),
  );
  const pagedUsers = filteredUsers.slice(
    (userPage - 1) * USER_PAGE_SIZE,
    userPage * USER_PAGE_SIZE,
  );

  // Password dialog state
  const [passwordMode, setPasswordMode] = useState<"manual" | "temp">("temp");
  const [manualPassword, setManualPassword] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");

  const [newUser, setNewUser] = useState({
    nome_completo: "",
    email: "",
    password: "",
    passwordMode: "temp" as "manual" | "temp",
    perfil: "Analista de RH",
    cargo: "",
    status: "ativo" as "ativo" | "suspenso" | "inativo",
    avatar_url: "",
    visualiza_todas_unidades: false,
    unidades_vinculadas: [] as string[],
    modulos_acesso: DEFAULT_PERMISSIONS_BY_PROFILE["Analista de RH"].modulos,
    permissoes_modulo: DEFAULT_PERMISSIONS_BY_PROFILE["Analista de RH"].perms,
    pode_incluir_registros: false,
    pode_excluir_requisicoes: false,
    pode_editar_configuracoes: false,
    pode_gerenciar_usuarios: false,
    acesso_portal_unidade: false,
    sendWelcomeEmail: true,
    regiao_suporte: null as string | null,
    unidades_responsavel: [] as string[],
    unidades_banco_talentos: [] as string[],
  });

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
  // Reset to page 1 whenever search term changes
  useEffect(() => {
    setUserPage(1);
  }, [userSearch]);

  // Auto-generate temp password when mode changes
  useEffect(() => {
    if (newUser.passwordMode === "temp") {
      setNewUser((prev) => ({ ...prev, password: generateTempPassword() }));
    } else {
      setNewUser((prev) => ({ ...prev, password: "" }));
    }
  }, [newUser.passwordMode]);

  const resetNewUserForm = () => {
    setNewUser({
      nome_completo: "",
      email: "",
      password: "",
      passwordMode: "temp",
      perfil: "Analista de RH",
      cargo: "",
      status: "ativo",
      avatar_url: "",
      visualiza_todas_unidades: false,
      unidades_vinculadas: [],
      modulos_acesso: DEFAULT_PERMISSIONS_BY_PROFILE["Analista de RH"].modulos,
      permissoes_modulo: DEFAULT_PERMISSIONS_BY_PROFILE["Analista de RH"].perms,
      pode_incluir_registros: false,
      pode_excluir_requisicoes: false,
      pode_editar_configuracoes: false,
      pode_gerenciar_usuarios: false,
      acesso_portal_unidade: false,
      sendWelcomeEmail: true,
      regiao_suporte: null as string | null,
      unidades_responsavel: [] as string[],
      unidades_banco_talentos: [] as string[],
    });
  };

  const handleCreateUser = async () => {
    if (!newUser.nome_completo || !newUser.email || !newUser.password) {
      toast.error("Preencha nome, e-mail e senha.");
      return;
    }
    const passwordError = validateAdminPassword(newUser.password);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }
    const isAnalista =
      newUser.perfil === "Analista de RH" ||
      newUser.perfil === "Analista Administrativo";
    if (isAnalista && newUser.unidades_responsavel.length > 0) {
      const conflictUnit = newUser.unidades_responsavel.find((u) =>
        unitAnalystMap.has(u),
      );
      if (conflictUnit) {
        toast.error(
          `A unidade "${conflictUnit}" já possui um analista responsável: ${unitAnalystMap.get(conflictUnit)}. Remova o conflito antes de salvar.`,
        );
        return;
      }
    }
    setSaving(true);
    try {
      await addUser({
        ...newUser,
        perfil: newUser.perfil as any,
        sendWelcomeEmail: newUser.sendWelcomeEmail,
      });

      // Assign analista_responsavel on vagas for selected responsible units (prefix match)
      if (isAnalista && newUser.unidades_responsavel.length > 0) {
        const allVagas = useVagasStore.getState().vagas;
        const matchingVagas = allVagas.filter((v) =>
          vagaMatchesShortUnits(v.unidade, newUser.unidades_responsavel),
        );
        const matchingIds = matchingVagas.map((v) => v.id);
        if (matchingIds.length > 0) {
          const { supabase } = await import("@/integrations/supabase/client");
          const { error } = await supabase
            .from("vagas")
            .update({ analista_responsavel: newUser.nome_completo })
            .in("id", matchingIds);
          if (error) {
            console.error(
              "[handleCreateUser] Bulk vaga assignment error:",
              error,
            );
            toast.warning(
              "Usuário criado, mas houve um erro ao atribuir vagas. Verifique manualmente.",
            );
          } else {
            const { updateVaga } = useVagasStore.getState();
            matchingVagas.forEach((v) =>
              updateVaga(v.id, { analista_responsavel: newUser.nome_completo }),
            );
          }
        }
      }

      toast.success("Usuário criado com sucesso!");
      setIsNewUserOpen(false);
      resetNewUserForm();
    } catch (err: any) {
      toast.error(
        `Erro ao criar usuário: ${getAdminPasswordErrorMessage(err?.message)}`,
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!usuarioParaExcluir) return;
    setSaving(true);
    try {
      await deleteUser(usuarioParaExcluir);
      toast.success("Usuário removido com sucesso.");
    } catch (err: any) {
      toast.error(`Erro ao excluir: ${err.message}`);
    } finally {
      setSaving(false);
      setIsDeleteDialogOpen(false);
      setUsuarioParaExcluir(null);
    }
  };

  const handleStatusChange = async (
    id: string,
    status: "ativo" | "suspenso" | "inativo",
  ) => {
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
    const pwd = passwordMode === "temp" ? generatedPassword : manualPassword;
    const passwordError = validateAdminPassword(pwd);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }
    setSaving(true);
    try {
      await resetUserPassword(passwordUser.id, pwd);
      toast.success("Senha redefinida com sucesso.");
      setIsPasswordDialogOpen(false);
      setPasswordUser(null);
    } catch (err: any) {
      toast.error(getAdminPasswordErrorMessage(err?.message));
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
      toast.success(
        "E-mail de boas-vindas reenviado com nova senha temporária.",
      );
    } catch (err: any) {
      toast.error(
        `Erro ao reenviar e-mail: ${getAdminPasswordErrorMessage(err?.message)}`,
      );
    } finally {
      setTestEmailLoading(null);
    }
  };

  const openEditUser = (user: any) => {
    // Use the authoritative value stored in profiles.unidades_responsavel.
    // Fall back to deriving from vagas only for legacy data that predates the column.
    const storedResponsavel = Array.isArray(user.unidades_responsavel)
      ? user.unidades_responsavel
      : null;
    const currentResponsavelUnits =
      storedResponsavel && storedResponsavel.length > 0
        ? storedResponsavel
        : [
            ...new Set(
              vagas
                .filter(
                  (v) =>
                    v.analista_responsavel === user.nome_completo && v.unidade,
                )
                .map((v) => resolveShortUnitName(v.unidade as string))
                .filter(Boolean),
            ),
          ];
    setEditingUser({
      ...user,
      unidades_vinculadas: Array.isArray(user.unidades_vinculadas)
        ? user.unidades_vinculadas
        : [],
      modulos_acesso: Array.isArray(user.modulos_acesso)
        ? user.modulos_acesso
        : [],
      permissoes_modulo: user.permissoes_modulo || {},
      visualiza_todas_unidades: !!user.visualiza_todas_unidades,
      unidades_responsavel: currentResponsavelUnits,
      unidades_banco_talentos: Array.isArray(user.unidades_banco_talentos)
        ? user.unidades_banco_talentos
        : [],
    });
    setIsEditUserOpen(true);
  };

  const handleSaveEditUser = async () => {
    if (!editingUser) return;
    const isAnalista =
      editingUser.perfil === "Analista de RH" ||
      editingUser.perfil === "Analista Administrativo";
    const newUnidadesResponsavel: string[] =
      editingUser.unidades_responsavel || [];
    if (isAnalista && newUnidadesResponsavel.length > 0) {
      const conflictUnit = newUnidadesResponsavel.find((u) => {
        const existing = unitAnalystMap.get(u);
        return existing && existing !== editingUser.nome_completo;
      });
      if (conflictUnit) {
        toast.error(
          `A unidade "${conflictUnit}" já possui outro analista responsável: ${unitAnalystMap.get(conflictUnit)}.`,
        );
        return;
      }
    }
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
        regiao_suporte:
          editingUser.cargo === "Analista Administrativo"
            ? editingUser.regiao_suporte
            : null,
        unidades_responsavel: newUnidadesResponsavel,
        unidades_banco_talentos: editingUser.unidades_banco_talentos || [],
      } as any);

      // Handle analista_responsavel bulk update for Analista profiles (prefix match for full unit names)
      if (isAnalista) {
        const { supabase } = await import("@/integrations/supabase/client");
        const { updateVaga } = useVagasStore.getState();
        const allVagas = useVagasStore.getState().vagas;

        // Vagas currently owned by this analyst
        const ownedVagas = allVagas.filter(
          (v) =>
            v.analista_responsavel === editingUser.nome_completo && v.unidade,
        );

        // Vagas to clear: owned but not in the new responsible units
        const vagasToClear = ownedVagas.filter(
          (v) => !vagaMatchesShortUnits(v.unidade, newUnidadesResponsavel),
        );
        if (vagasToClear.length > 0) {
          await supabase
            .from("vagas")
            .update({ analista_responsavel: null })
            .in(
              "id",
              vagasToClear.map((v) => v.id),
            );
          vagasToClear.forEach((v) =>
            updateVaga(v.id, { analista_responsavel: null }),
          );
        }

        // Vagas to set: match new responsible units via prefix
        if (newUnidadesResponsavel.length > 0) {
          const vagasToSet = allVagas.filter((v) =>
            vagaMatchesShortUnits(v.unidade, newUnidadesResponsavel),
          );
          if (vagasToSet.length > 0) {
            await supabase
              .from("vagas")
              .update({ analista_responsavel: editingUser.nome_completo })
              .in(
                "id",
                vagasToSet.map((v) => v.id),
              );
            vagasToSet.forEach((v) =>
              updateVaga(v.id, {
                analista_responsavel: editingUser.nome_completo,
              }),
            );
          }
        }
      }

      toast.success("Dados do usuário atualizados.");
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
    setPasswordMode("temp");
    setGeneratedPassword(generateTempPassword());
    setManualPassword("");
    setShowResetPassword(false);
    setIsPasswordDialogOpen(true);
  };

  const handleUploadPhoto = async (file: File, isEdit = false) => {
    try {
      const fileExt = file.name.split(".").pop();
      const userId = isEdit ? editingUser?.id : "new";
      const filePath = `${userId}/${Date.now()}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      if (isEdit) {
        setEditingUser((prev: any) => ({ ...prev, avatar_url: publicUrl }));
      } else {
        setNewUser((prev) => ({ ...prev, avatar_url: publicUrl }));
      }
      toast.success("Foto carregada com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao carregar foto: " + error.message);
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
        newPerms[moduleId] = "read";
      }

      setEditingUser((prev: any) => ({
        ...prev,
        modulos_acesso: newModulos,
        permissoes_modulo: newPerms,
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
        newPerms[moduleId] = "read";
      }

      setNewUser((prev) => ({
        ...prev,
        modulos_acesso: newModulos,
        permissoes_modulo: newPerms,
      }));
    }
  };

  const togglePermission = (moduleId: string, isEdit = false) => {
    if (isEdit) {
      if (!editingUser) return;
      const current = editingUser.permissoes_modulo?.[moduleId] || "read";
      const next = current === "read" ? "edit" : "read";
      setEditingUser((prev: any) => ({
        ...prev,
        permissoes_modulo: {
          ...(prev.permissoes_modulo || {}),
          [moduleId]: next,
        },
      }));
    } else {
      const current = newUser.permissoes_modulo?.[moduleId] || "read";
      const next = current === "read" ? "edit" : "read";
      setNewUser((prev) => ({
        ...prev,
        permissoes_modulo: {
          ...(prev.permissoes_modulo || {}),
          [moduleId]: next,
        },
      }));
    }
  };

  const handleProfileChange = (perfil: string, isEdit = false) => {
    const defaults = DEFAULT_PERMISSIONS_BY_PROFILE[perfil] || {
      modulos: [],
      perms: {},
    };
    if (isEdit) {
      setEditingUser((prev: any) => ({
        ...prev,
        perfil,
        modulos_acesso: defaults.modulos,
        permissoes_modulo: defaults.perms,
      }));
    } else {
      setNewUser((prev) => ({
        ...prev,
        perfil,
        modulos_acesso: defaults.modulos,
        permissoes_modulo: defaults.perms,
      }));
    }
  };
  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      ativo: "bg-green-100 text-green-700",
      suspenso: "bg-amber-100 text-amber-700",
      inativo: "bg-slate-100 text-slate-500",
    };
    return map[status] || "bg-slate-100 text-slate-500";
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader title="Configurações do Sistema" />

      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          setActiveTab(val);
          if (val === "usuarios") fetchUsers();
          if (val === "auditoria") fetchAuditLogs();
          if (val === "feedback") fetchFeedbacks();
          if (val === "suporte") {
            fetchUsers();
            fetchSupportConfigs();
          }
        }}
        className="space-y-4"
      >
        <TabsList className="bg-slate-100 p-1 flex-wrap h-auto">
          <TabsTrigger value="usuarios" className="gap-2 font-bold px-4 py-2">
            <Users className="h-4 w-4" /> Usuários
          </TabsTrigger>
          <TabsTrigger value="parametros" className="gap-2 font-bold px-4 py-2">
            <Settings className="h-4 w-4" /> Configurações Gerais
          </TabsTrigger>
        </TabsList>

        {/* USUÁRIOS */}
        <TabsContent value="usuarios">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b space-y-3 pb-4">
              <div className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-lg font-bold">
                    Usuários Cadastrados
                  </CardTitle>
                  <CardDescription>
                    Gerencie quem tem acesso ao sistema, perfis, permissões e
                    senhas.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      resetNewUserForm();
                      setIsNewUserOpen(true);
                    }}
                    className="gap-2 bg-primary"
                  >
                    <UserPlus className="h-4 w-4" /> Incluir novo usuário
                  </Button>
                </div>
              </div>
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Buscar por nome, e-mail, perfil ou cargo..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
                {userSearch && (
                  <button
                    type="button"
                    onClick={() => setUserSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left">Nome / E-mail</TableHead>
                      <TableHead className="text-left">
                        Perfil / Cargo
                      </TableHead>
                      <TableHead className="text-left">Unidades</TableHead>
                      <TableHead className="text-left">Status</TableHead>
                      <TableHead className="text-left">Último Acesso</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedUsers.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-10 text-slate-400 text-sm italic"
                        >
                          {userSearch
                            ? `Nenhum usuário encontrado para "${userSearch}"`
                            : "Nenhum usuário cadastrado."}
                        </TableCell>
                      </TableRow>
                    )}
                    {pagedUsers.map((user) => (
                      <TableRow
                        key={user.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <TableCell className="text-left">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                              {user.avatar_url ? (
                                <img
                                  src={user.avatar_url}
                                  alt="Avatar"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <UserIcon className="h-4 w-4 text-slate-400" />
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-700">
                                {user.nome_completo}
                              </span>
                              <span className="text-xs text-slate-400 font-medium">
                                {user.email}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-left">
                          <div className="flex flex-col gap-0.5 items-start">
                            <Badge
                              variant="outline"
                              className="w-fit text-[10px] font-bold py-0 h-4 bg-blue-50 text-blue-700 border-blue-100 uppercase tracking-tighter"
                            >
                              {user.perfil}
                            </Badge>
                            <span className="text-[11px] text-slate-500 font-medium ml-0.5">
                              {user.cargo}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-left">
                          {user.visualiza_todas_unidades ? (
                            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 font-bold text-[11px]">
                              Todas
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-slate-500">
                              {user.unidades_vinculadas?.length || 0} unid.
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-left">
                          <Badge
                            className={`${getStatusBadge(user.status)} font-bold text-[11px] uppercase border-0`}
                          >
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-left text-xs text-slate-500 font-medium">
                          {user.ultimo_acesso
                            ? new Date(user.ultimo_acesso).toLocaleDateString(
                                "pt-BR",
                              )
                            : "Nunca"}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4 text-slate-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => openEditUser(user)}
                              >
                                <Edit2 className="mr-2 h-4 w-4" /> Editar dados
                                do usuário
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openPasswordDialog(user)}
                              >
                                <KeyRound className="mr-2 h-4 w-4" /> Redefinir
                                senha
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleResendWelcomeEmail(user)}
                                disabled={testEmailLoading === user.id}
                              >
                                <Send className="mr-2 h-4 w-4" />{" "}
                                {testEmailLoading === user.id
                                  ? "Enviando..."
                                  : "Reenviar e-mail de boas-vindas"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {user.status !== "ativo" && (
                                <DropdownMenuItem
                                  className="text-green-600"
                                  onClick={() =>
                                    handleStatusChange(user.id, "ativo")
                                  }
                                >
                                  <UserCheck className="mr-2 h-4 w-4" />{" "}
                                  Reativar acesso
                                </DropdownMenuItem>
                              )}
                              {user.status === "ativo" && (
                                <DropdownMenuItem
                                  className="text-amber-600"
                                  onClick={() =>
                                    handleStatusChange(user.id, "suspenso")
                                  }
                                >
                                  <Ban className="mr-2 h-4 w-4" /> Suspender
                                  acesso
                                </DropdownMenuItem>
                              )}
                              {user.status !== "inativo" && (
                                <DropdownMenuItem
                                  className="text-slate-500"
                                  onClick={() =>
                                    handleStatusChange(user.id, "inativo")
                                  }
                                >
                                  <X className="mr-2 h-4 w-4" /> Inativar
                                  usuário
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
                                <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                acesso
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {userPageCount > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50/50">
                  <span className="text-[12px] text-slate-500 font-medium">
                    {filteredUsers.length} usuário
                    {filteredUsers.length !== 1 ? "s" : ""}
                    {userSearch
                      ? ` encontrado${filteredUsers.length !== 1 ? "s" : ""}`
                      : " no total"}
                    {" · "}página {userPage} de {userPageCount}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[11px] font-bold"
                      disabled={userPage === 1}
                      onClick={() => setUserPage(1)}
                    >
                      «
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[11px] font-bold"
                      disabled={userPage === 1}
                      onClick={() => setUserPage((p) => p - 1)}
                    >
                      ‹
                    </Button>
                    {Array.from({ length: userPageCount }, (_, i) => i + 1)
                      .filter(
                        (p) =>
                          p === 1 ||
                          p === userPageCount ||
                          Math.abs(p - userPage) <= 1,
                      )
                      .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                        if (
                          idx > 0 &&
                          typeof arr[idx - 1] === "number" &&
                          (p as number) - (arr[idx - 1] as number) > 1
                        )
                          acc.push("...");
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, idx) =>
                        p === "..." ? (
                          <span
                            key={`ellipsis-${idx}`}
                            className="px-1 text-[11px] text-slate-400"
                          >
                            …
                          </span>
                        ) : (
                          <Button
                            key={p}
                            variant={p === userPage ? "default" : "outline"}
                            size="sm"
                            className="h-7 w-7 p-0 text-[11px] font-bold"
                            onClick={() => setUserPage(p as number)}
                          >
                            {p}
                          </Button>
                        ),
                      )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[11px] font-bold"
                      disabled={userPage === userPageCount}
                      onClick={() => setUserPage((p) => p + 1)}
                    >
                      ›
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[11px] font-bold"
                      disabled={userPage === userPageCount}
                      onClick={() => setUserPage(userPageCount)}
                    >
                      »
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PARÂMETROS GERAIS */}
        <TabsContent value="parametros">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b">
                <CardTitle className="text-lg font-bold">
                  Configurações do Fluxo
                </CardTitle>
                <CardDescription>
                  Ajuste as regras de negócio aplicadas ao controle de
                  provimento.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">
                      Validação Obrigatória
                    </Label>
                    <p className="text-xs text-slate-500">
                      Exigir validação da unidade para toda convocação.
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">
                      Bloqueio de Vagas Suspensas
                    </Label>
                    <p className="text-xs text-slate-500">
                      Impedir qualquer ação em vagas com status "Suspensa".
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">
                      Alerta de Banco Vencendo
                    </Label>
                    <p className="text-xs text-slate-500">
                      Notificar analistas 30 dias antes do vencimento do banco.
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
              <CardFooter className="border-t bg-slate-50/50">
                <Button className="ml-auto gap-2">
                  <Save className="h-4 w-4" /> Salvar Configurações
                </Button>
              </CardFooter>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b">
                <CardTitle className="text-lg font-bold">
                  Segurança e Acesso
                </CardTitle>
                <CardDescription>
                  Configurações globais de segurança.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">
                    Tempo de Sessão (minutos)
                  </Label>
                  <Input
                    type="number"
                    defaultValue="120"
                    className="w-[100px]"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">
                      Log de Auditoria Estendido
                    </Label>
                    <p className="text-xs text-slate-500">
                      Registrar IP e dados de navegador em todos os logs.
                    </p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">
                      Forçar Troca de Senha
                    </Label>
                    <p className="text-xs text-slate-500">
                      Exigir nova senha no primeiro acesso de novos usuários.
                    </p>
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
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" /> Incluir novo usuário
            </DialogTitle>
            <DialogDescription>
              Preencha os dados, defina a senha e as permissões iniciais.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="relative group">
                <div className="h-20 w-20 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
                  {newUser.avatar_url ? (
                    <img
                      src={newUser.avatar_url}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
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
                <h4 className="text-sm font-bold text-slate-800">
                  Foto de Perfil
                </h4>
                <p className="text-xs text-slate-500">
                  Adicione uma foto para facilitar a identificação do usuário no
                  sistema.
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px] font-bold text-primary px-0 hover:bg-transparent"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-3 w-3 mr-1" /> Alterar foto
                </Button>
              </div>
            </div>

            {/* Nome e Email */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">
                  Nome Completo
                </Label>
                <Input
                  placeholder="Ex: João da Silva"
                  value={newUser.nome_completo}
                  onChange={(e) =>
                    setNewUser((p) => ({ ...p, nome_completo: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">
                  E-mail
                </Label>
                <Input
                  type="email"
                  placeholder="joao@agir.org.br"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser((p) => ({ ...p, email: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Perfil, Cargo, Status */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">
                  Perfil de Acesso
                </Label>
                <Select
                  value={newUser.perfil}
                  onValueChange={(v) => handleProfileChange(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERFIS_ACESSO.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">
                  Cargo Hierárquico
                </Label>
                <Select
                  value={newUser.cargo}
                  onValueChange={(v) => setNewUser((p) => ({ ...p, cargo: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CARGOS_HIERARQUICOS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {newUser.cargo === "Analista Administrativo" && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">
                    Região de Suporte
                  </Label>
                  <Select
                    value={newUser.regiao_suporte || ""}
                    onValueChange={(v) =>
                      setNewUser((p) => ({ ...p, regiao_suporte: v || null }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a região..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="go_es">
                        Goiás e Espírito Santo
                      </SelectItem>
                      <SelectItem value="demais">Demais Unidades</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">
                  Status
                </Label>
                <Select
                  value={newUser.status}
                  onValueChange={(v: any) =>
                    setNewUser((p) => ({ ...p, status: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                Senha de Acesso
              </h4>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={newUser.passwordMode === "temp"}
                    onChange={() =>
                      setNewUser((p) => ({ ...p, passwordMode: "temp" }))
                    }
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-sm font-medium">
                    Gerar senha temporária
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={newUser.passwordMode === "manual"}
                    onChange={() =>
                      setNewUser((p) => ({ ...p, passwordMode: "manual" }))
                    }
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-sm font-medium">
                    Definir senha manualmente
                  </span>
                </label>
              </div>
              {newUser.passwordMode === "temp" ? (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={newUser.password}
                      readOnly
                      className="font-mono bg-muted/50 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNewUser((p) => ({
                        ...p,
                        password: generateTempPassword(),
                      }));
                      setShowNewPassword(false);
                    }}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        placeholder="Use 8+ caracteres com letra, número e símbolo"
                        value={newUser.password}
                        onChange={(e) =>
                          setNewUser((p) => ({
                            ...p,
                            password: e.target.value,
                          }))
                        }
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNewUser((p) => ({
                          ...p,
                          password: generateTempPassword(),
                        }));
                        setShowNewPassword(false);
                      }}
                    >
                      Gerar senha forte
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Senhas conhecidas em vazamentos públicos podem ser
                    bloqueadas automaticamente.
                  </p>
                </div>
              )}
            </div>

            {/* Unidades Vinculadas */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                  Unidades Vinculadas
                </h4>
                {newUser.visualiza_todas_unidades && (
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                    Acesso total
                  </Badge>
                )}
              </div>

              {/* Toggle: acesso total */}
              <div
                className={`flex items-center justify-between gap-4 p-3 rounded-xl border transition-colors cursor-pointer ${newUser.visualiza_todas_unidades ? "bg-emerald-50/60 border-emerald-200" : "bg-slate-50 border-slate-200"}`}
                onClick={() =>
                  setNewUser((p) => ({
                    ...p,
                    visualiza_todas_unidades: !p.visualiza_todas_unidades,
                    unidades_vinculadas: !p.visualiza_todas_unidades
                      ? []
                      : p.unidades_vinculadas,
                  }))
                }
              >
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold cursor-pointer">
                    Visualizar todas as unidades
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    O usuário terá acesso irrestrito a todos os registros.
                  </p>
                </div>
                <Switch
                  checked={newUser.visualiza_todas_unidades}
                  onCheckedChange={(v) =>
                    setNewUser((p) => ({
                      ...p,
                      visualiza_todas_unidades: v,
                      unidades_vinculadas: v ? [] : p.unidades_vinculadas,
                    }))
                  }
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              {/* Unit picker — only when not full access */}
              {!newUser.visualiza_todas_unidades && (
                <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4">
                  <UnidadesPicker
                    value={newUser.unidades_vinculadas}
                    onChange={(units) =>
                      setNewUser((p) => ({ ...p, unidades_vinculadas: units }))
                    }
                  />
                  {newUser.unidades_vinculadas.length === 0 && (
                    <p className="text-[11px] text-amber-600 font-medium mt-3 flex items-center gap-1.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Nenhuma unidade selecionada — o usuário não verá nenhum
                      dado.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Acesso a Módulos */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                  Módulos e Menus de Acesso
                </h4>
                <Badge
                  variant="outline"
                  className="text-[10px] bg-slate-50 text-slate-500 font-bold border-slate-200"
                >
                  Personalizado por Perfil
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-2 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                {MODULOS_SISTEMA.map((modulo) => {
                  const isChecked = newUser.modulos_acesso?.includes(modulo.id);
                  const canEdit =
                    newUser.permissoes_modulo?.[modulo.id] === "edit";

                  return (
                    <div
                      key={modulo.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-white transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`mod-${modulo.id}`}
                          checked={isChecked}
                          onCheckedChange={() => toggleModule(modulo.id)}
                        />
                        <Label
                          htmlFor={`mod-${modulo.id}`}
                          className="text-sm font-bold text-slate-700 cursor-pointer"
                        >
                          {modulo.label}
                        </Label>
                      </div>

                      {isChecked && (
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-bold cursor-pointer transition-all border-2",
                              canEdit
                                ? "bg-green-50 text-green-700 border-green-200 shadow-sm"
                                : "bg-blue-50 text-blue-700 border-blue-200 shadow-sm",
                            )}
                            onClick={() => togglePermission(modulo.id)}
                          >
                            {canEdit ? (
                              <>
                                <CheckCircle className="h-2.5 w-2.5 mr-1" />{" "}
                                Edição Completa
                              </>
                            ) : (
                              <>
                                <Eye className="h-2.5 w-2.5 mr-1" /> Somente
                                Leitura
                              </>
                            )}
                          </Badge>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Responsabilidade pelo Provimento — only for Analista profiles */}
            {(newUser.perfil === "Analista de RH" ||
              newUser.perfil === "Analista Administrativo") && (
              <div className="space-y-4 border-t pt-4">
                <div>
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    Responsabilidade pelo Provimento
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Este usuário será responsável pelo provimento de quais
                    unidades? As vagas dessas unidades serão atribuídas a ele
                    como <strong>Analista Resp.</strong>
                  </p>
                </div>

                {(() => {
                  const availableUnits = newUser.visualiza_todas_unidades
                    ? ALL_UNIDADES
                    : newUser.unidades_vinculadas;

                  if (availableUnits.length === 0) {
                    return (
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
                        <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <p className="text-[11px] text-slate-500 font-medium">
                          Selecione as unidades com acesso acima para definir a
                          responsabilidade.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 space-y-1.5 max-h-56 overflow-y-auto">
                      {availableUnits.map((unit: string) => {
                        const existingAnalyst = unitAnalystMap.get(unit);
                        const hasConflict = !!existingAnalyst;
                        const isSelected =
                          newUser.unidades_responsavel.includes(unit);
                        const toggle = () => {
                          if (hasConflict && !isSelected) return;
                          setNewUser((p) => ({
                            ...p,
                            unidades_responsavel: isSelected
                              ? p.unidades_responsavel.filter((u) => u !== unit)
                              : [...p.unidades_responsavel, unit],
                          }));
                        };
                        return (
                          <div
                            key={unit}
                            onClick={toggle}
                            className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border transition-all ${
                              isSelected
                                ? "bg-indigo-50 border-indigo-300 cursor-pointer"
                                : hasConflict
                                  ? "bg-red-50/50 border-red-100 opacity-60 cursor-not-allowed"
                                  : "bg-white border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 cursor-pointer"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Checkbox
                                checked={isSelected}
                                disabled={hasConflict && !isSelected}
                                onCheckedChange={toggle}
                                className="shrink-0"
                              />
                              <span className="text-[12px] font-semibold text-slate-700 truncate">
                                {unit}
                              </span>
                            </div>
                            {hasConflict && !isSelected && (
                              <span className="text-[10px] font-bold text-red-500 shrink-0 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {existingAnalyst}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {newUser.unidades_responsavel.length > 1 && (
                  <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                      Não é comum que um mesmo analista seja responsável pelo
                      provimento de mais de uma unidade. Siga somente se tiver
                      certeza.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Banco de Talentos */}
            <div className="space-y-4 border-t pt-4">
              <div>
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500" />
                  Banco de Talentos
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Selecione as unidades do banco de candidatos que este usuário
                  poderá visualizar.
                </p>
              </div>
              <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                {BANCO_TALENTOS_UNIDADES.map((unit) => {
                  const isSelected =
                    newUser.unidades_banco_talentos.includes(unit);
                  const toggle = () => {
                    setNewUser((p) => ({
                      ...p,
                      unidades_banco_talentos: isSelected
                        ? p.unidades_banco_talentos.filter((u) => u !== unit)
                        : [...p.unidades_banco_talentos, unit],
                    }));
                  };
                  return (
                    <div
                      key={unit}
                      onClick={toggle}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-teal-50 border-teal-300"
                          : "bg-white border-slate-200 hover:border-teal-200 hover:bg-teal-50/30"
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={toggle}
                        className="shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-[12px] font-semibold text-slate-700">
                        {unit}
                      </span>
                    </div>
                  );
                })}
              </div>
              {newUser.unidades_banco_talentos.length === 0 && (
                <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Nenhuma unidade selecionada — o usuário não terá acesso ao
                  banco de candidatos.
                </p>
              )}
            </div>

            {/* Permissões específicas (Legacy Flags) */}
            <div className="space-y-3 border-t pt-4">
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                Outras Permissões
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newUser.pode_incluir_registros}
                    onCheckedChange={(v) =>
                      setNewUser((p) => ({ ...p, pode_incluir_registros: v }))
                    }
                  />
                  <Label className="text-xs font-bold">
                    Pode incluir registros
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newUser.pode_excluir_requisicoes}
                    onCheckedChange={(v) =>
                      setNewUser((p) => ({ ...p, pode_excluir_requisicoes: v }))
                    }
                  />
                  <Label className="text-xs font-bold">
                    Pode excluir requisições
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newUser.pode_editar_configuracoes}
                    onCheckedChange={(v) =>
                      setNewUser((p) => ({
                        ...p,
                        pode_editar_configuracoes: v,
                      }))
                    }
                  />
                  <Label className="text-xs font-bold">
                    Pode editar configurações
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newUser.pode_gerenciar_usuarios}
                    onCheckedChange={(v) =>
                      setNewUser((p) => ({ ...p, pode_gerenciar_usuarios: v }))
                    }
                  />
                  <Label className="text-xs font-bold">
                    Pode gerenciar usuários
                  </Label>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <Switch
                  checked={newUser.acesso_portal_unidade}
                  onCheckedChange={(v) =>
                    setNewUser((p) => ({ ...p, acesso_portal_unidade: v }))
                  }
                />
                <div>
                  <Label className="text-xs font-bold text-blue-800">
                    Habilitar acesso ao Portal da Unidade
                  </Label>
                  <p className="text-[10px] text-blue-600 mt-0.5">
                    O usuário poderá acessar o Portal com as mesmas credenciais
                    e unidades vinculadas.
                  </p>
                </div>
              </div>
            </div>

            {/* E-mail de boas-vindas */}
            <div className="flex items-center gap-3 border-t pt-4">
              <Checkbox
                id="sendWelcome"
                checked={newUser.sendWelcomeEmail}
                onCheckedChange={(v) =>
                  setNewUser((p) => ({ ...p, sendWelcomeEmail: !!v }))
                }
              />
              <label
                htmlFor="sendWelcome"
                className="text-sm font-medium cursor-pointer flex items-center gap-2"
              >
                <Mail className="h-4 w-4 text-primary" /> Enviar e-mail de
                boas-vindas agora
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewUserOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={saving}
              className="bg-primary gap-2"
            >
              {saving ? (
                "Criando..."
              ) : (
                <>
                  <UserPlus className="h-4 w-4" /> Criar Usuário
                </>
              )}
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
            <DialogDescription>
              Altere perfil, cargo, permissões e unidades sem excluir o
              cadastro.
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="grid gap-5 py-4">
              <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="relative group">
                  <div className="h-20 w-20 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
                    {editingUser.avatar_url ? (
                      <img
                        src={editingUser.avatar_url}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
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
                  <h4 className="text-sm font-bold text-slate-800">
                    Foto de Perfil
                  </h4>
                  <p className="text-xs text-slate-500">
                    Adicione uma foto para facilitar a identificação do usuário
                    no sistema.
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[10px] font-bold text-primary px-0 hover:bg-transparent"
                    onClick={() => editFileInputRef.current?.click()}
                  >
                    <Upload className="h-3 w-3 mr-1" /> Alterar foto
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">
                    Nome Completo
                  </Label>
                  <Input
                    value={editingUser.nome_completo}
                    onChange={(e) =>
                      setEditingUser((p: any) => ({
                        ...p,
                        nome_completo: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">
                    E-mail (somente leitura)
                  </Label>
                  <Input
                    value={editingUser.email}
                    readOnly
                    className="bg-muted/50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">
                    Perfil de Acesso
                  </Label>
                  <Select
                    value={editingUser.perfil}
                    onValueChange={(v) => handleProfileChange(v, true)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERFIS_ACESSO.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">
                    Cargo Hierárquico
                  </Label>
                  <Select
                    value={editingUser.cargo || ""}
                    onValueChange={(v) =>
                      setEditingUser((p: any) => ({ ...p, cargo: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CARGOS_HIERARQUICOS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {editingUser.cargo === "Analista Administrativo" && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">
                      Região de Suporte
                    </Label>
                    <Select
                      value={editingUser.regiao_suporte || ""}
                      onValueChange={(v) =>
                        setEditingUser((p: any) => ({
                          ...p,
                          regiao_suporte: v || null,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a região..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="go_es">
                          Goiás e Espírito Santo
                        </SelectItem>
                        <SelectItem value="demais">Demais Unidades</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {editingUser.perfil === "Administrador" ? (
                <div className="border-t pt-4">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-violet-50 border border-violet-200">
                    <ShieldCheck className="h-8 w-8 text-violet-500 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-violet-800">
                        Acesso Total de Administrador
                      </p>
                      <p className="text-[11px] text-violet-600 mt-0.5">
                        Este perfil possui acesso irrestrito a todas as
                        unidades, módulos e permissões do sistema. Nenhuma
                        configuração adicional é necessária.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-4 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                        Unidades Vinculadas
                      </h4>
                      {editingUser.visualiza_todas_unidades && (
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                          Acesso total
                        </Badge>
                      )}
                    </div>

                    {/* Toggle: acesso total */}
                    <div
                      className={`flex items-center justify-between gap-4 p-3 rounded-xl border transition-colors cursor-pointer ${editingUser.visualiza_todas_unidades ? "bg-emerald-50/60 border-emerald-200" : "bg-slate-50 border-slate-200"}`}
                      onClick={() =>
                        setEditingUser((p: any) => ({
                          ...p,
                          visualiza_todas_unidades: !p.visualiza_todas_unidades,
                        }))
                      }
                    >
                      <div className="space-y-0.5">
                        <Label className="text-sm font-bold cursor-pointer">
                          Visualizar todas as unidades
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          O usuário terá acesso irrestrito a todos os registros.
                        </p>
                      </div>
                      <Switch
                        checked={editingUser.visualiza_todas_unidades}
                        onCheckedChange={(v) =>
                          setEditingUser((p: any) => ({
                            ...p,
                            visualiza_todas_unidades: v,
                          }))
                        }
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      />
                    </div>

                    {/* Unit picker — only when not full access */}
                    {!editingUser.visualiza_todas_unidades && (
                      <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4">
                        <UnidadesPicker
                          value={editingUser.unidades_vinculadas || []}
                          onChange={(units) =>
                            setEditingUser((p: any) => ({
                              ...p,
                              unidades_vinculadas: units,
                            }))
                          }
                        />
                        {(editingUser.unidades_vinculadas || []).length ===
                          0 && (
                          <p className="text-[11px] text-amber-600 font-medium mt-3 flex items-center gap-1.5">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Nenhuma unidade selecionada — o usuário não verá
                            nenhum dado.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Responsabilidade pelo Provimento — only for Analista profiles */}
                  {(editingUser.perfil === "Analista de RH" ||
                    editingUser.perfil === "Analista Administrativo") && (
                    <div className="space-y-4 border-t pt-4">
                      <div>
                        <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          Responsabilidade pelo Provimento
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          Este usuário será responsável pelo provimento de quais
                          unidades? As vagas dessas unidades serão atribuídas a
                          ele como <strong>Analista Resp.</strong>
                        </p>
                      </div>

                      {(() => {
                        const availableUnits =
                          editingUser.visualiza_todas_unidades
                            ? ALL_UNIDADES
                            : editingUser.unidades_vinculadas || [];

                        if (availableUnits.length === 0) {
                          return (
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
                              <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <p className="text-[11px] text-slate-500 font-medium">
                                Selecione as unidades com acesso acima para
                                definir a responsabilidade.
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 space-y-1.5 max-h-56 overflow-y-auto">
                            {availableUnits.map((unit: string) => {
                              const existingAnalyst = unitAnalystMap.get(unit);
                              const hasConflict =
                                !!existingAnalyst &&
                                existingAnalyst !== editingUser.nome_completo;
                              const isSelected = (
                                editingUser.unidades_responsavel || []
                              ).includes(unit);
                              const toggle = () => {
                                if (hasConflict && !isSelected) return;
                                setEditingUser((p: any) => ({
                                  ...p,
                                  unidades_responsavel: isSelected
                                    ? (p.unidades_responsavel || []).filter(
                                        (u: string) => u !== unit,
                                      )
                                    : [...(p.unidades_responsavel || []), unit],
                                }));
                              };
                              return (
                                <div
                                  key={unit}
                                  onClick={toggle}
                                  className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border transition-all ${
                                    isSelected
                                      ? "bg-indigo-50 border-indigo-300 cursor-pointer"
                                      : hasConflict
                                        ? "bg-red-50/50 border-red-100 opacity-60 cursor-not-allowed"
                                        : "bg-white border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 cursor-pointer"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <Checkbox
                                      checked={isSelected}
                                      disabled={hasConflict && !isSelected}
                                      onCheckedChange={toggle}
                                      className="shrink-0"
                                    />
                                    <span className="text-[12px] font-semibold text-slate-700 truncate">
                                      {unit}
                                    </span>
                                  </div>
                                  {hasConflict && !isSelected && (
                                    <span className="text-[10px] font-bold text-red-500 shrink-0 flex items-center gap-1">
                                      <AlertTriangle className="h-3 w-3" />
                                      {existingAnalyst}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}

                      {(editingUser.unidades_responsavel || []).length > 1 && (
                        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3">
                          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                          <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                            Não é comum que um mesmo analista seja responsável
                            pelo provimento de mais de uma unidade. Siga somente
                            se tiver certeza.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Banco de Talentos */}
                  <div className="space-y-4 border-t pt-4">
                    <div>
                      <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500" />
                        Banco de Talentos
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Selecione as unidades do banco de candidatos que este
                        usuário poderá visualizar.
                      </p>
                    </div>
                    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                      {BANCO_TALENTOS_UNIDADES.map((unit) => {
                        const isSelected = (
                          editingUser.unidades_banco_talentos || []
                        ).includes(unit);
                        const toggle = () => {
                          setEditingUser((p: any) => ({
                            ...p,
                            unidades_banco_talentos: isSelected
                              ? (p.unidades_banco_talentos || []).filter(
                                  (u: string) => u !== unit,
                                )
                              : [...(p.unidades_banco_talentos || []), unit],
                          }));
                        };
                        return (
                          <div
                            key={unit}
                            onClick={toggle}
                            className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-teal-50 border-teal-300"
                                : "bg-white border-slate-200 hover:border-teal-200 hover:bg-teal-50/30"
                            }`}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={toggle}
                              className="shrink-0"
                              onClick={(e: React.MouseEvent) =>
                                e.stopPropagation()
                              }
                            />
                            <span className="text-[12px] font-semibold text-slate-700">
                              {unit}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {(editingUser.unidades_banco_talentos || []).length ===
                      0 && (
                      <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Nenhuma unidade selecionada — o usuário não terá acesso
                        ao banco de candidatos.
                      </p>
                    )}
                  </div>

                  {/* Acesso a Módulos */}
                  <div className="space-y-4 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                        Módulos e Menus de Acesso
                      </h4>
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-slate-50 text-slate-500 font-bold border-slate-200"
                      >
                        Personalizado por Perfil
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 gap-2 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                      {MODULOS_SISTEMA.map((modulo) => {
                        const isChecked = editingUser.modulos_acesso?.includes(
                          modulo.id,
                        );
                        const canEdit =
                          editingUser.permissoes_modulo?.[modulo.id] === "edit";

                        return (
                          <div
                            key={modulo.id}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-white transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox
                                id={`edit-mod-${modulo.id}`}
                                checked={isChecked}
                                onCheckedChange={() =>
                                  toggleModule(modulo.id, true)
                                }
                              />
                              <Label
                                htmlFor={`edit-mod-${modulo.id}`}
                                className="text-sm font-bold text-slate-700 cursor-pointer"
                              >
                                {modulo.label}
                              </Label>
                            </div>

                            {isChecked && (
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px] font-bold cursor-pointer transition-all border-2",
                                    canEdit
                                      ? "bg-green-50 text-green-700 border-green-200 shadow-sm"
                                      : "bg-blue-50 text-blue-700 border-blue-200 shadow-sm",
                                  )}
                                  onClick={() =>
                                    togglePermission(modulo.id, true)
                                  }
                                >
                                  {canEdit ? (
                                    <>
                                      <CheckCircle className="h-2.5 w-2.5 mr-1" />{" "}
                                      Edição Completa
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="h-2.5 w-2.5 mr-1" />{" "}
                                      Somente Leitura
                                    </>
                                  )}
                                </Badge>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3 border-t pt-4">
                    <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                      Outras Permissões
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={editingUser.pode_incluir_registros}
                          onCheckedChange={(v) =>
                            setEditingUser((p: any) => ({
                              ...p,
                              pode_incluir_registros: v,
                            }))
                          }
                        />
                        <Label className="text-xs font-bold">
                          Pode incluir registros
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={editingUser.pode_excluir_requisicoes}
                          onCheckedChange={(v) =>
                            setEditingUser((p: any) => ({
                              ...p,
                              pode_excluir_requisicoes: v,
                            }))
                          }
                        />
                        <Label className="text-xs font-bold">
                          Pode excluir requisições
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={editingUser.pode_editar_configuracoes}
                          onCheckedChange={(v) =>
                            setEditingUser((p: any) => ({
                              ...p,
                              pode_editar_configuracoes: v,
                            }))
                          }
                        />
                        <Label className="text-xs font-bold">
                          Pode editar configurações
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={editingUser.pode_gerenciar_usuarios}
                          onCheckedChange={(v) =>
                            setEditingUser((p: any) => ({
                              ...p,
                              pode_gerenciar_usuarios: v,
                            }))
                          }
                        />
                        <Label className="text-xs font-bold">
                          Pode gerenciar usuários
                        </Label>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <Switch
                        checked={editingUser?.acesso_portal_unidade || false}
                        onCheckedChange={(v) =>
                          setEditingUser((p: any) => ({
                            ...p,
                            acesso_portal_unidade: v,
                          }))
                        }
                      />
                      <div>
                        <Label className="text-xs font-bold text-blue-800">
                          Habilitar acesso ao Portal da Unidade
                        </Label>
                        <p className="text-[10px] text-blue-600 mt-0.5">
                          O usuário poderá acessar o Portal com as mesmas
                          credenciais e unidades vinculadas.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEditUser}
              disabled={saving}
              className="bg-primary gap-2"
            >
              {saving ? (
                "Salvando..."
              ) : (
                <>
                  <Save className="h-4 w-4" /> Salvar Alterações
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: REDEFINIR SENHA */}
      <Dialog
        open={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
      >
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" /> Redefinir senha
            </DialogTitle>
            <DialogDescription>
              {passwordUser ? `Redefinir senha de ${passwordUser.nome}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={passwordMode === "temp"}
                  onChange={() => {
                    setPasswordMode("temp");
                    setGeneratedPassword(generateTempPassword());
                  }}
                  className="h-3.5 w-3.5"
                />
                <span className="text-sm font-medium">
                  Gerar senha temporária
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={passwordMode === "manual"}
                  onChange={() => setPasswordMode("manual")}
                  className="h-3.5 w-3.5"
                />
                <span className="text-sm font-medium">Definir manualmente</span>
              </label>
            </div>
            {passwordMode === "temp" ? (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showResetPassword ? "text" : "password"}
                    value={generatedPassword}
                    readOnly
                    className="font-mono bg-muted/50 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showResetPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setGeneratedPassword(generateTempPassword());
                    setShowResetPassword(false);
                  }}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showResetPassword ? "text" : "password"}
                      placeholder="Nova senha com 8+ caracteres, letra, número e símbolo"
                      value={manualPassword}
                      onChange={(e) => setManualPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showResetPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setManualPassword(generateTempPassword());
                      setShowResetPassword(false);
                    }}
                  >
                    Gerar senha forte
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Se a senha já tiver aparecido em vazamentos conhecidos, ela
                  será recusada por segurança.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPasswordDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={saving}
              className="bg-primary gap-2"
            >
              {saving ? (
                "Redefinindo..."
              ) : (
                <>
                  <KeyRound className="h-4 w-4" /> Redefinir Senha
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: EXCLUIR */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Excluir acesso do usuário?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O usuário perderá o acesso ao
              sistema permanentemente e seu cadastro será removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUsuarioParaExcluir(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? "Excluindo..." : "Confirmar Exclusão"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
