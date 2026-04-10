import { useVagasStore } from '@/store/vagasStore';
import { useAdminStore } from '@/store/adminStore';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, Filter, Calendar, Info, Clock, CheckCircle2, AlertTriangle, FileSpreadsheet, History, Download, Trash2, AlertCircle, User, Users, Briefcase, Building, FileText, ClipboardList, CheckCircle } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

import { formatDate, normalizeCargo, filterByRegionAndUnit, UNIDADES_POR_REGIAO, normalizeUnitName } from '@/lib/vagaUtils';
import { calculateBancoStatus, calculateStats } from '@/lib/bancoTalentosUtils';
import { useState, useMemo, useEffect } from 'react';

const getRegiaoFromUnit = (unidade: string): string | undefined => {
  const normalized = normalizeUnitName(unidade);
  for (const [regiao, units] of Object.entries(UNIDADES_POR_REGIAO)) {
    if (units.some(u => normalizeUnitName(u) === normalized || normalized.includes(normalizeUnitName(u)) || normalizeUnitName(u).includes(normalized))) {
      return regiao === 'Goiás e Vitória' ? 'GO_ES' : 'OUTRAS_UNIDADES';
    }
  }
  return undefined;
};
import { useSearchParams } from 'react-router-dom';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { BancoTalentosForm } from '@/components/BancoTalentosForm';
import { ImportStagedDialog } from '@/components/import/ImportStagedDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { BancoTalentos } from '@/types/vaga';
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
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export default function BancoTalentosPage() {
  const { bancos, importHistory, importedFiles, deleteBanco, fetchBancos } = useVagasStore();
  
  useEffect(() => {
    fetchBancos();
  }, [fetchBancos]);
  const { currentUser, selectedRegion, selectedUnit: globalUnit } = useAdminStore();
  const permissions = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'list');
  const [unidadeFilter, setUnidadeFilter] = useState('todas');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [convocadosSearch, setConvocadosSearch] = useState('');
  const [regiaoFilter, setRegiaoFilter] = useState('todas');
  const [convocadosUnidadeFilter, setConvocadosUnidadeFilter] = useState('todas');
  const [convocadosCargoFilter, setConvocadosCargoFilter] = useState('todos');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [bancoParaExcluir, setBancoParaExcluir] = useState<string | null>(null);
  const [selectedBanco, setSelectedBanco] = useState<BancoTalentos | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const handleDelete = () => {
    if (bancoParaExcluir) {
      deleteBanco(bancoParaExcluir);
      toast.success('Banco de talentos excluído com sucesso.');
      setIsDeleteDialogOpen(false);
      setBancoParaExcluir(null);
    }
  };
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['list', 'convocados', 'vencidos', 'history', 'audit'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    
    const searchParam = searchParams.get('search');
    if (searchParam) {
      setSearch(searchParam);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams(prev => {
      prev.set('tab', value);
      return prev;
    });
  };

  const filtered = useMemo(() => {
    const baseRecords = filterByRegionAndUnit(bancos, selectedRegion, globalUnit);
    return baseRecords.filter(b => {
      // Unit access restriction
      if (!currentUser?.visualiza_todas_unidades && !currentUser?.unidades_vinculadas.includes(b.unidade)) {
        return false;
      }
      
      // Exclude convocados from the main list
      if (b.status === 'CONVOCADO') return false;
      
      const normalizedSearch = normalizeCargo(search);
      const matchSearch = normalizeCargo(b.cargo).includes(normalizedSearch) || 
        normalizeCargo(b.unidade).includes(normalizedSearch) ||
        normalizeCargo(b.numero_edital).includes(normalizedSearch);

      const matchUnidade = unidadeFilter === 'todas' || b.unidade === unidadeFilter;
      
      // Corrigindo o filtro de status para ser mais flexível com case e variações
      const statusLower = (b.status || '').toLowerCase();
      const filterLower = statusFilter.toLowerCase();
      
      let matchStatus = statusFilter === 'todos';
      if (!matchStatus) {
        if (statusFilter === 'valido') {
          matchStatus = statusLower === 'valido' || statusLower === 'cadastro reserva' || statusLower === 'prorrogado';
        } else if (statusFilter === 'vencido') {
          matchStatus = statusLower === 'vencido' || statusLower === 'vencida';
        } else {
          matchStatus = statusLower === filterLower;
        }
      }
        
      return matchSearch && matchUnidade && matchStatus;
    });
  }, [bancos, currentUser, search, unidadeFilter, statusFilter]);

  const convocadosFiltered = useMemo(() => {
    return bancos.filter(b => {
      if (b.status !== 'CONVOCADO') return false;
      
      // Unit access restriction
      if (!currentUser?.visualiza_todas_unidades && !currentUser?.unidades_vinculadas.includes(b.unidade)) {
        return false;
      }
      
      const normalizedSearch = normalizeCargo(convocadosSearch);
      const matchSearch = normalizeCargo(b.nome || '').includes(normalizedSearch) || 
        normalizeCargo(b.cargo).includes(normalizedSearch) ||
        normalizeCargo(b.numero_edital).includes(normalizedSearch);

      const matchUnidade = convocadosUnidadeFilter === 'todas' || b.unidade_convocacao === convocadosUnidadeFilter;
      const matchCargo = convocadosCargoFilter === 'todos' || b.cargo === convocadosCargoFilter;
        
      return matchSearch && matchUnidade && matchCargo;
    });
  }, [bancos, currentUser, convocadosSearch, convocadosUnidadeFilter, convocadosCargoFilter]);

  const convocadosCargos = useMemo(() => {
    const cargos = [...new Set(bancos.filter(b => b.status === 'CONVOCADO').map(b => b.cargo))];
    return cargos.sort();
  }, [bancos]);

  const convocadosUnidades = useMemo(() => {
    const unidades = [...new Set(bancos.filter(b => b.status === 'CONVOCADO' && b.unidade_convocacao).map(b => b.unidade_convocacao!))];
    return unidades.sort();
  }, [bancos]);

  const groupedBancos = useMemo(() => {
    const groups: Record<string, {
      id: string;
      edital: string;
      processoSeletivo: string;
      unidade: string;
      regiao?: string;
      cargo: string;
      cargoNormalizado: string;
      status: string;
      validade: string;
      isProrrogado: boolean;
      qtdBanco: number;
      candidatos: BancoTalentos[];
    }> = {};

    // Use ALL bancos for grouping calculations to ensure cards are accurate
    // regardless of the list filter (which excludes Convocados)
    const baseRecords = filterByRegionAndUnit(bancos, selectedRegion, globalUnit);
    baseRecords.forEach(b => {
      // Restricted access check
      if (!currentUser?.visualiza_todas_unidades && !currentUser?.unidades_vinculadas.includes(b.unidade)) {
        return;
      }

      const calculation = calculateBancoStatus(b);
      const bStatus = calculation.status;

      const cargoNorm = b.cargo_normalizado || normalizeCargo(b.cargo);
      // REGRA DE IDENTIFICAÇÃO DO BANCO (Auditada: PS ou Edital + Unidade + Cargo)
      const key = b.numero_processo_seletivo 
        ? `PS-${b.numero_processo_seletivo}` 
        : `${b.numero_edital}-${b.unidade}-${cargoNorm}`;

      if (!groups[key]) {
        let qtd = 0;
        const rawQtd = b.quantidade_banco;
        if (typeof rawQtd === 'number') {
          qtd = rawQtd;
        } else if (rawQtd) {
          qtd = parseInt(String(rawQtd).replace(/[^\d]/g, '')) || 0;
        }

        groups[key] = {
          id: b.id,
          edital: b.numero_edital,
          processoSeletivo: b.numero_processo_seletivo || b.numero_processo || '',
          unidade: b.unidade,
          regiao: b.regiao || getRegiaoFromUnit(b.unidade),
          cargo: b.cargo,
          cargoNormalizado: cargoNorm,
          status: bStatus,
          validade: calculation.dataReferencia,
          isProrrogado: bStatus === 'prorrogado',
          // QNTD BANCO: Pegamos a maior quantidade informada para este grupo para evitar erro de leitura
          qtdBanco: qtd,
          candidatos: []
        };
      } else {
        // Se encontrarmos uma quantidade maior em outra linha do mesmo banco, atualizamos
        const rawQtd = b.quantidade_banco;
        let currentQtd = 0;
        if (typeof rawQtd === 'number') currentQtd = rawQtd;
        else if (rawQtd) currentQtd = parseInt(String(rawQtd).replace(/[^\d]/g, '')) || 0;
        
        if (currentQtd > groups[key].qtdBanco) {
          groups[key].qtdBanco = currentQtd;
        }
      }
      
      groups[key].candidatos.push(b);
    });

    return Object.values(groups).sort((a, b) => a.cargo.localeCompare(b.cargo));
  }, [bancos, currentUser]);

  // filteredGroups for the list display
  const filteredGroups = useMemo(() => {
    return groupedBancos.filter(group => {
      // Exclude convocados from the main list view tab
      if (group.status === 'CONVOCADO') return false;
      
      const normalizedSearch = normalizeCargo(search);
      const matchSearch = normalizeCargo(group.cargo).includes(normalizedSearch) || 
        normalizeCargo(group.unidade).includes(normalizedSearch) ||
        normalizeCargo(group.edital).includes(normalizedSearch);

      const matchUnidade = unidadeFilter === 'todas' || group.unidade === unidadeFilter;
      
      const statusLower = (group.status || '').toLowerCase();
      const filterLower = statusFilter.toLowerCase();
      
      let matchStatus = statusFilter === 'todos';
      if (!matchStatus) {
        if (statusFilter === 'valido') {
          matchStatus = statusLower === 'valido' || statusLower === 'cadastro reserva' || statusLower === 'prorrogado';
        } else if (statusFilter === 'vencido') {
          matchStatus = statusLower === 'vencido' || statusLower === 'vencida';
        } else {
          matchStatus = statusLower === filterLower;
        }
      }
        
      const matchRegiao = regiaoFilter === 'todas' || group.regiao === regiaoFilter;

      return matchSearch && matchUnidade && matchStatus && matchRegiao;
    });
  }, [groupedBancos, search, unidadeFilter, statusFilter, regiaoFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, unidadeFilter, statusFilter, regiaoFilter]);

  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredGroups.slice(start, start + pageSize);
  }, [filteredGroups, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredGroups.length / pageSize);

  const selectedGroupCandidates = useMemo(() => {
    if (!selectedBanco) return [];
    
    const cargoNorm = selectedBanco.cargo_normalizado || normalizeCargo(selectedBanco.cargo);
    const selectedKey = selectedBanco.numero_processo_seletivo
      ? `PS-${selectedBanco.numero_processo_seletivo}`
      : `${selectedBanco.numero_edital}-${selectedBanco.unidade}-${cargoNorm}`;

    return filtered.filter(b => {
      const bCargoNorm = b.cargo_normalizado || normalizeCargo(b.cargo);
      const bKey = b.numero_processo_seletivo
        ? `PS-${b.numero_processo_seletivo}`
        : `${b.numero_edital}-${b.unidade}-${bCargoNorm}`;
      
      return bKey === selectedKey;
    }).sort((a, b) => {
      const classA = typeof a.classificacao === 'number' ? a.classificacao : parseInt(String(a.classificacao)) || 999;
      const classB = typeof b.classificacao === 'number' ? b.classificacao : parseInt(String(b.classificacao)) || 999;
      return classA - classB;
    });
  }, [selectedBanco, filtered]);

  const [vencidosSearch, setVencidosSearch] = useState('');
  const [prorrogandoId, setProrrogandoId] = useState<string | null>(null);

  const vencidosFiltered = useMemo(() => {
    return bancos.filter(b => {
      if (b.status !== 'VENCIDO') return false;
      if (!currentUser?.visualiza_todas_unidades && !currentUser?.unidades_vinculadas.includes(b.unidade)) {
        return false;
      }
      if (!vencidosSearch) return true;
      const normalizedSearch = normalizeCargo(vencidosSearch);
      return normalizeCargo(b.nome || '').includes(normalizedSearch) || 
        normalizeCargo(b.cargo).includes(normalizedSearch) ||
        normalizeCargo(b.numero_edital).includes(normalizedSearch);
    });
  }, [bancos, currentUser, vencidosSearch]);

  const canProrrogate = useMemo(() => {
    if (!currentUser) return false;
    const perfil = (currentUser.perfil || '').toLowerCase();
    return perfil.includes('admin') || perfil.includes('gestão') || perfil.includes('gestor') || perfil.includes('gestao');
  }, [currentUser]);

  const handleProrrogacao = async (banco: BancoTalentos) => {
    if (!currentUser) return;
    setProrrogandoId(banco.id);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      let newValidade = '';
      if (banco.data_validade) {
        const parts = banco.data_validade.split(/[-\/]/);
        let dateObj: Date | null = null;
        if (parts.length >= 3) {
          if (parts[0].length === 4) {
            dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          } else {
            dateObj = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          }
        }
        if (dateObj && !isNaN(dateObj.getTime())) {
          dateObj.setMonth(dateObj.getMonth() + 6);
          newValidade = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
        }
      }

      const updateData: any = {
        is_prorrogado: true,
        status: 'prorrogado',
        updated_by: currentUser.id,
        observacao: `${banco.observacoes || ''} | Prorrogado por ${currentUser.nome_completo} em ${new Date().toLocaleString('pt-BR')}`.trim(),
      };
      if (newValidade) {
        updateData.data_validade = newValidade;
      }

      const { error } = await supabase
        .from('banco_candidatos')
        .update(updateData)
        .eq('id', banco.id);

      if (error) throw error;

      const { updateBanco } = useVagasStore.getState();
      updateBanco(banco.id, {
        is_prorrogado: true,
        status: 'prorrogado',
        data_validade: newValidade || banco.data_validade,
        observacoes: updateData.observacao,
      });

      try {
        await supabase.from('audit_logs').insert({
          usuario_id: currentUser.id,
          usuario_nome: currentUser.nome_completo,
          usuario_email: currentUser.email,
          perfil: currentUser.perfil,
          acao: 'Prorrogação de banco',
          modulo: 'Banco de Talentos',
          registro_afetado: banco.id,
          valor_anterior: JSON.stringify({ status: banco.status, data_validade: banco.data_validade, is_prorrogado: banco.is_prorrogado }),
          valor_novo: JSON.stringify({ status: 'prorrogado', data_validade: newValidade, is_prorrogado: true }),
        });
      } catch (auditErr) {
        console.warn('Audit log error:', auditErr);
      }

      toast.success(`Banco prorrogado com sucesso! Nova validade: ${newValidade ? formatDate(newValidade) : 'atualizada'}`);
    } catch (err: any) {
      console.error('Erro ao prorrogar:', err);
      toast.error(`Erro ao prorrogar: ${err.message}`);
    } finally {
      setProrrogandoId(null);
    }
  };

  const historyBT = useMemo(() => {
    return importHistory.filter(h => h.tipo_importacao === 'banco');
  }, [importHistory]);

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'CADASTRO RESERVA': 
      case 'VALIDO': return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 font-bold border-green-200 text-[10px] whitespace-nowrap">Cad. Reserva</Badge>;
      case 'VENCIDO': return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 font-bold border-red-200 text-[10px] whitespace-nowrap">Vencido</Badge>;
      case 'PRORROGADO': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 font-bold border-blue-200 text-[10px] whitespace-nowrap">Prorrogado</Badge>;
      case 'CONVOCADO': return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 font-bold border-purple-200 text-[10px] whitespace-nowrap">Convocado</Badge>;
      default: return <Badge variant="outline" className="text-[10px] whitespace-nowrap">{status || 'Indeterminado'}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Banco de Talentos"
        subtitle="Gestão estratégica de validade e disponibilidade de candidatos aprovados nos processos seletivos."
        badge="Recursos Humanos"
        actions={
          <>
            {permissions.canImport() && (
              <Button 
                variant="outline" 
                className="gap-2 border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm h-10 px-4 transition-all rounded-xl font-bold"
                onClick={() => setIsImportOpen(true)}
              >
                <FileSpreadsheet className="h-4 w-4 text-primary" /> Importar Excel
              </Button>
            )}
            <Button 
              className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 h-10 px-4 transition-all rounded-xl font-bold"
              onClick={() => setIsFormOpen(true)}
            >
              <Plus className="h-4 w-4" /> Novo Banco
            </Button>
          </>
        }
      />


      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Cadastrar Novo Banco de Talentos</DialogTitle>
          </DialogHeader>
          <BancoTalentosForm 
            onSuccess={() => setIsFormOpen(false)} 
            onCancel={() => setIsFormOpen(false)} 
          />
        </DialogContent>
      </Dialog>

      <ImportStagedDialog 
        open={isImportOpen} 
        onOpenChange={setIsImportOpen} 
        type="banco"
      />

      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="sm:max-w-md md:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-xl font-bold">{selectedBanco?.cargo || "Detalhes do Banco"}</SheetTitle>
                <SheetDescription>Banco total: <span className="font-bold text-primary">{selectedBanco?.quantidade_banco || 'Não informado'}</span></SheetDescription>

              </div>
            </div>
            {selectedBanco && (
              <div className="flex gap-2 mt-2">
                {getStatusBadge(selectedBanco.status)}
                {selectedBanco.is_prorrogado && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Prorrogado</Badge>}
              </div>
            )}
          </SheetHeader>

          {selectedBanco && (
            <div className="space-y-6">
              {/* Candidatos */}
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2"><User className="h-3 w-3" /> Candidatos Classificados ({selectedGroupCandidates.length})</div>
                </h3>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {selectedGroupCandidates.map((c, idx) => (
                    <div key={c.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-primary shadow-sm">
                            {c.classificacao}°
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{c.nome || "Não identificado"}</p>
                            <p className="text-[11px] text-slate-400 font-medium uppercase">Candidato</p>
                          </div>
                        </div>
                        {getStatusBadge(c.status)}
                      </div>

                      {/* Dados de Convocação e Detalhes */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t border-slate-200/50">
                        <div className="space-y-0.5">
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Chamada</p>
                          <p className="text-[11px] font-semibold text-slate-700">{c.numero_chamada || "—"}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Vagas Aproveitamento</p>
                          <p className="text-[11px] font-semibold text-slate-700">{c.numero_vaga_aproveitamento || "—"}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Data Convocação</p>
                          <p className="text-[11px] font-semibold text-green-600">{c.data_convocacao ? formatDate(c.data_convocacao) : "—"}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Unidade Convocação</p>
                          <p className="text-[11px] font-semibold text-slate-700">{c.unidade_convocacao || "—"}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {selectedGroupCandidates.length === 0 && (
                    <p className="text-sm text-slate-400 italic text-center py-4">Nenhum candidato listado.</p>
                  )}
                </div>
              </section>

              <Separator />

              {/* Identificação do Grupo */}
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Building className="h-3 w-3" /> Unidade e Cargo
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tighter">Unidade</p>
                    <p className="text-sm font-semibold text-slate-800">{selectedBanco?.unidade}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tighter">Cargo</p>
                    <p className="text-sm font-semibold text-slate-800">{selectedBanco?.cargo}</p>
                  </div>
                </div>
              </section>


              <Separator />

              {/* Edital */}
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <FileText className="h-3 w-3" /> Edital e Processo
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tighter">Número Edital</p>
                    <p className="text-sm font-semibold text-slate-800">{selectedBanco.numero_edital}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tighter">Número Processo</p>
                    <p className="text-sm font-semibold text-slate-800">{selectedBanco.numero_processo || "Não informado"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tighter">Classificação</p>
                    <p className="text-sm font-semibold text-slate-800">{selectedBanco.classificacao || "Não informado"}</p>
                  </div>
                </div>
              </section>

              <Separator />

              {/* Datas */}
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Calendar className="h-3 w-3" /> Datas Importantes
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tighter">Publicação</p>
                    <p className="text-sm font-semibold text-slate-800">{formatDate(selectedBanco.data_abertura_edital)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tighter">Validade Original</p>
                    <p className="text-sm font-semibold text-slate-800">{formatDate(selectedBanco.data_validade)}</p>
                  </div>
                  {selectedBanco.nova_data_validade && (
                    <div className="space-y-1">
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tighter">Validade Prorrogada</p>
                      <p className="text-sm font-semibold text-blue-600 font-bold">{formatDate(selectedBanco.nova_data_validade)}</p>
                    </div>
                  )}
                  {selectedBanco.data_convocacao && (
                    <div className="space-y-1">
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tighter">Data Convocação</p>
                      <p className="text-sm font-semibold text-green-600 font-bold">{formatDate(selectedBanco.data_convocacao)}</p>
                    </div>
                  )}
                </div>
              </section>

              <Separator />

              {/* Convocação */}
              {(selectedBanco.data_convocacao || selectedBanco.status === 'CONVOCADO') && (
                <>
                  <section>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <ClipboardList className="h-3 w-3" /> Detalhes da Convocação
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedBanco.unidade_convocacao && (
                        <div className="space-y-1">
                          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tighter">Unidade de Convocação</p>
                          <p className="text-sm font-semibold text-slate-800">{selectedBanco.unidade_convocacao}</p>
                        </div>
                      )}
                      {selectedBanco.numero_chamada && (
                        <div className="space-y-1">
                          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tighter">Número da Chamada</p>
                          <p className="text-sm font-semibold text-slate-800">{selectedBanco.numero_chamada}</p>
                        </div>
                      )}
                      {selectedBanco.numero_processo_seletivo && (
                        <div className="space-y-1">
                          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tighter">Proc. Seletivo</p>
                          <p className="text-sm font-semibold text-slate-800">{selectedBanco.numero_processo_seletivo}</p>
                        </div>
                      )}
                      {selectedBanco.numero_vaga_aproveitamento && (
                        <div className="space-y-1">
                          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tighter">Vaga Aproveitamento</p>
                          <p className="text-sm font-semibold text-slate-800">{selectedBanco.numero_vaga_aproveitamento}</p>
                        </div>
                      )}
                    </div>
                  </section>
                  <Separator />
                </>
              )}

              {/* Observações */}
              {selectedBanco.observacoes && (
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Info className="h-3 w-3" /> Observações
                  </h3>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-sm text-slate-600 leading-relaxed italic">
                      "{selectedBanco.observacoes}"
                    </p>
                  </div>
                </section>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Dynamic status computation based on business logic */}
      {useMemo(() => {
        const stats = calculateStats(bancos);
        console.log('--- AUDITORIA BANCO (Lógica de Negócio) ---', stats);
        return null;
      }, [bancos])}

      {(() => {
        const stats = calculateStats(bancos);
        return (
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card className="border-slate-200 shadow-sm bg-white border-l-4 border-l-primary">
              <CardContent className="pt-6 px-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2.5 rounded-lg shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider truncate">Cadastro Reserva</p>
                    <div className="flex flex-col">
                      <p className="text-2xl font-bold text-slate-900 leading-none">
                        {stats['Total Cadastro Reserva']}
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold italic mt-1 leading-none">Vigente (Normal)</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm bg-white border-l-4 border-l-purple-500">
              <CardContent className="pt-6 px-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 p-2.5 rounded-lg shrink-0">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider truncate">Convocados</p>
                    <div className="flex flex-col">
                      <p className="text-2xl font-bold text-slate-900 leading-none">
                        {stats['Total Convocados']}
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold italic mt-1 leading-none">Status Convocado</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm bg-white border-l-4 border-l-blue-500">
              <CardContent className="pt-6 px-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2.5 rounded-lg shrink-0">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider truncate">Prorrogados</p>
                    <div className="flex flex-col">
                      <p className="text-2xl font-bold text-slate-900 leading-none">
                        {stats['Total Prorrogados']}
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold italic mt-1 leading-none">SIM ou Data Manual</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm bg-white border-l-4 border-l-red-500">
              <CardContent className="pt-6 px-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-red-100 p-2.5 rounded-lg shrink-0">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider truncate">Vencidos</p>
                    <div className="flex flex-col">
                      <p className="text-2xl font-bold text-slate-900 leading-none">
                        {stats['Total Vencidos']}
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold italic mt-1 leading-none">Validade Expirada</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm bg-white border-l-4 border-l-green-500">
              <CardContent className="pt-6 px-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-2.5 rounded-lg shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider truncate">Total Vigentes</p>
                    <div className="flex flex-col">
                      <p className="text-2xl font-bold text-slate-900 leading-none">
                        {stats['Total Cadastro Reserva'] + stats['Total Prorrogados']}
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold italic mt-1 leading-none">Disponíveis para uso</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm bg-white border-l-4 border-l-slate-400">
              <CardContent className="pt-6 px-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 p-2.5 rounded-lg shrink-0">
                    <Calendar className="h-5 w-5 text-slate-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider truncate">Banco Total</p>
                    <div className="flex flex-col">
                      <p className="text-2xl font-bold text-slate-900 leading-none">
                        {bancos.length}
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold italic mt-1 leading-none">Base completa</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="list" className="gap-2">
            <Filter className="h-4 w-4" /> Cadastro Reserva
          </TabsTrigger>
          <TabsTrigger value="convocados" className="gap-2">
            <CheckCircle className="h-4 w-4" /> Convocados
          </TabsTrigger>
          <TabsTrigger value="vencidos" className="gap-2">
            <AlertTriangle className="h-4 w-4" /> Vencidos
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" /> Histórico de Importações
          </TabsTrigger>
          {permissions.canViewAudit() && (
            <TabsTrigger value="audit" className="gap-2 text-destructive font-bold">
              <AlertCircle className="h-4 w-4" /> Auditoria de Grupos
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b bg-slate-50/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Buscar por cargo, unidade ou edital..." 
                    className="pl-9 bg-white"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={unidadeFilter} onValueChange={setUnidadeFilter}>
                    <SelectTrigger className="w-[140px] h-9 bg-white text-xs">
                      <SelectValue placeholder="Unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas Unidades</SelectItem>
                      <SelectItem value="HGG">HGG</SelectItem>
                      <SelectItem value="HUGO">HUGO</SelectItem>
                      <SelectItem value="HEAPA">HEAPA</SelectItem>
                    </SelectContent>
                  </Select>
                   <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px] h-9 bg-white text-xs">
                      <SelectValue placeholder="Situação" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos Status</SelectItem>
                      <SelectItem value="valido">Válidos</SelectItem>
                      <SelectItem value="vencido">Vencidos</SelectItem>
                      <SelectItem value="prorrogado">Prorrogados</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={regiaoFilter} onValueChange={setRegiaoFilter}>
                    <SelectTrigger className="w-[140px] h-9 bg-white text-xs">
                      <SelectValue placeholder="Região" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas Regiões</SelectItem>
                      <SelectItem value="GO_ES">GO e ES</SelectItem>
                      <SelectItem value="OUTRAS_UNIDADES">Outras Unidades</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Edital</TableHead>
                    <TableHead className="whitespace-nowrap">Proc. Seletivo</TableHead>
                    <TableHead className="whitespace-nowrap">Cargo</TableHead>
                    <TableHead className="whitespace-nowrap">Unidade</TableHead>
                    <TableHead className="whitespace-nowrap">Região</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="whitespace-nowrap text-center">Qtd.</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {paginatedGroups.map((group) => (
                    <TableRow key={group.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-bold text-primary text-xs">{group.edital}</TableCell>
                      <TableCell className="text-xs font-semibold text-slate-600 italic">
                        {group.processoSeletivo || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-800">{group.cargo}</div>
                        <div className="text-[11px] text-slate-400 font-medium uppercase tracking-tighter">{group.candidatos[0]?.secao || '—'}</div>
                      </TableCell>
                       <TableCell className="text-slate-600 font-medium">{group.unidade}</TableCell>
                      <TableCell>
                        {group.regiao ? (
                          <Badge variant="outline" className={`text-[10px] font-bold ${group.regiao === 'GO_ES' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                            {group.regiao === 'GO_ES' ? 'GO/ES' : 'OUTRAS'}
                          </Badge>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(group.status)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-bold bg-slate-50 text-[10px]">{group.qtdBanco || group.candidatos.length}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="font-bold text-xs text-primary hover:bg-primary/5 h-8"
                            onClick={() => {
                              setSelectedBanco(group.candidatos[0]);
                              setIsDetailsOpen(true);
                            }}
                          >
                            Detalhes ({group.candidatos.length})
                          </Button>
                          {currentUser?.perfil === 'Admin' && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setBancoParaExcluir(group.id);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredGroups.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="h-40 text-center text-slate-400 font-medium italic">
                        Nenhum banco de talentos encontrado para os filtros aplicados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          {totalPages > 1 && (
            <div className="mt-4 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {[...Array(totalPages)].map((_, i) => {
                    const page = i + 1;
                    if (
                      page === 1 || 
                      page === totalPages || 
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink 
                            isActive={currentPage === page}
                            onClick={() => setCurrentPage(page)}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    } else if (
                      page === currentPage - 2 || 
                      page === currentPage + 2
                    ) {
                      return <PaginationEllipsis key={page} />;
                    }
                    return null;
                  })}

                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </TabsContent>

        <TabsContent value="convocados" className="space-y-4">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b bg-slate-50/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Buscar por nome, cargo ou edital..." 
                    className="pl-9 bg-white"
                    value={convocadosSearch}
                    onChange={(e) => setConvocadosSearch(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={convocadosUnidadeFilter} onValueChange={setConvocadosUnidadeFilter}>
                    <SelectTrigger className="w-[180px] h-9 bg-white text-xs">
                      <SelectValue placeholder="Unidade Convocada" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas Unidades</SelectItem>
                      {convocadosUnidades.map(u => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={convocadosCargoFilter} onValueChange={setConvocadosCargoFilter}>
                    <SelectTrigger className="w-[180px] h-9 bg-white text-xs">
                      <SelectValue placeholder="Cargo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos Cargos</SelectItem>
                      {convocadosCargos.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader >
                    <TableRow>
                      <TableHead >Nome</TableHead>
                      <TableHead >Cargo</TableHead>
                      <TableHead >Edital</TableHead>
                      <TableHead className="text-center">Class.</TableHead>
                      <TableHead >Data Conv.</TableHead>
                      <TableHead >Unid. Conv.</TableHead>
                      <TableHead className="text-center">N° Chamada</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {convocadosFiltered.map((b) => (
                      <TableRow key={b.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-bold text-slate-900 text-xs">{b.nome || "Não identificado"}</TableCell>
                        <TableCell className="text-xs font-medium text-slate-700">{b.cargo}</TableCell>
                        <TableCell className="text-primary font-bold text-xs">{b.numero_edital}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-bold bg-white text-primary border-primary/20">
                            {b.classificacao}°
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-bold text-green-600">
                          {b.data_convocacao ? formatDate(b.data_convocacao) : '-'}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <Building className="h-3 w-3 text-slate-400" />
                            {b.unidade_convocacao || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-xs font-bold text-slate-500">
                          {b.numero_chamada || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="font-bold text-xs text-primary hover:bg-primary/5 h-8"
                            onClick={() => {
                              setSelectedBanco(b);
                              setIsDetailsOpen(true);
                            }}
                          >
                            Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {convocadosFiltered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="h-40 text-center text-slate-400 font-medium italic">
                          Nenhum convocado encontrado para os filtros aplicados.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vencidos" className="space-y-4">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b bg-slate-50/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Buscar por nome, cargo ou edital..." 
                    className="pl-9 bg-white"
                    value={vencidosSearch}
                    onChange={(e) => setVencidosSearch(e.target.value)}
                  />
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  {vencidosFiltered.length} banco(s) vencido(s)
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Nome</TableHead>
                      <TableHead className="whitespace-nowrap">Cargo</TableHead>
                      <TableHead className="whitespace-nowrap">Edital</TableHead>
                      <TableHead className="whitespace-nowrap">Unidade</TableHead>
                      <TableHead className="text-center whitespace-nowrap">Class.</TableHead>
                      <TableHead className="whitespace-nowrap">Validade</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vencidosFiltered.map((b) => (
                      <TableRow key={b.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-bold text-slate-900 text-xs">{b.nome || "Não identificado"}</TableCell>
                        <TableCell className="text-xs font-medium text-slate-700">{b.cargo}</TableCell>
                        <TableCell className="text-primary font-bold text-xs">{b.numero_edital}</TableCell>
                        <TableCell className="text-xs font-medium text-slate-600">{b.unidade}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-bold bg-white text-primary border-primary/20">
                            {b.classificacao}°
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-bold text-red-600">
                          {b.data_validade ? formatDate(b.data_validade) : '-'}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(b.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {canProrrogate && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="font-bold text-xs text-blue-600 border-blue-200 hover:bg-blue-50 h-8 gap-1"
                                disabled={prorrogandoId === b.id}
                                onClick={() => handleProrrogacao(b)}
                              >
                                <Clock className="h-3 w-3" />
                                {prorrogandoId === b.id ? 'Prorrogando...' : 'Prorrogar'}
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="font-bold text-xs text-primary hover:bg-primary/5 h-8"
                              onClick={() => {
                                setSelectedBanco(b);
                                setIsDetailsOpen(true);
                              }}
                            >
                              Detalhes
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {vencidosFiltered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="h-40 text-center text-slate-400 font-medium italic">
                          Nenhum banco vencido encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader >
                <TableRow>
                  <TableHead >Data/Hora</TableHead>
                  <TableHead >Arquivo</TableHead>
                  <TableHead className="text-center">Registros</TableHead>
                  <TableHead >Usuário</TableHead>
                  <TableHead >Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyBT.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="text-xs">{h.data_hora ? formatDate(h.data_hora.split('T')[0]) : '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-green-600" />
                        <span className="text-xs font-medium">{h.arquivo || h.nome_arquivo}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-center font-bold">{h.total_novos}</TableCell>
                    <TableCell className="text-xs text-slate-500">{h.usuario}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[11px]">Concluído</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {historyBT.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-40 text-center text-slate-400 font-medium italic">
                      Nenhuma importação realizada até o momento.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {permissions.canViewAudit() && (
          <TabsContent value="audit" className="space-y-6">
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl space-y-4 shadow-sm">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" /> RESUMO FINAL DA AUDITORIA (STATUS CALCULADO)
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Este painel reflete o <strong>Status Calculado</strong> em tempo real, aplicando as regras de prioridade: 
                <span className="mx-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-bold">1. Convocado</span>
                <span className="mx-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded font-bold">2. Prorrogação Manual</span>
                <span className="mx-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-bold">3. Prorrogação "SIM"</span>
                <span className="mx-1 px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-bold">4. Validade Normal</span>.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(() => {
                const stats = calculateStats(bancos);
                const auditItems = [
                  { label: 'Cadastro Reserva', value: stats['Cadastro Reserva'], color: 'text-primary', description: 'Vigente pela validade normal' },
                  { label: 'Convocados', value: stats['Convocados'], color: 'text-purple-600', description: 'Status original CONVOCADO' },
                  { label: 'Prorrogados ("SIM")', value: stats['Prorrogados por "SIM"'], color: 'text-blue-600', description: 'Coluna prorrogação = SIM' },
                  { label: 'Prorrogados (Data)', value: stats['Prorrogados por data manual'], color: 'text-indigo-600', description: 'Coluna prorrogação = data' },
                  { label: 'Prorrogados (Original)', value: stats['Prorrogados por status original'], color: 'text-cyan-600', description: 'Status/flag já era PRORROGADO' },
                  { label: 'Vencidos (Validade)', value: stats['Vencidos por validade normal'], color: 'text-red-500', description: 'Validade original expirada' },
                  { label: 'Vencidos (Prorrog.)', value: stats['Vencidos por prorrogação expirada'], color: 'text-red-700', description: 'Prorrogação expirada' },
                  { label: 'Vencidos (Original)', value: stats['Vencidos por status original'], color: 'text-red-900', description: 'Status original VENCIDO confirmado' },
                ];
                
                return auditItems.map((item, i) => (
                  <Card key={i} className="border-slate-200 shadow-sm">
                    <CardContent className="pt-4 px-4 pb-4 flex flex-col items-center justify-center text-center">
                      <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                      <p className="text-xs font-bold text-slate-800 uppercase tracking-tighter mt-1">{item.label}</p>
                      <p className="text-[10px] text-slate-400 italic mt-0.5">{item.description}</p>
                    </CardContent>
                  </Card>
                ));
              })()}
            </div>

            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50 border-b py-3 px-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-primary" /> 
                  Detalhamento de Cálculo por Registro
                </CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead className="text-[10px] font-bold uppercase">Candidato / Cargo</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-center">Status Orig.</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-center">Prorrog.</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-center">Validade</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-center">Status Calc.</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase">Motivo do Cálculo</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-center">Data Ref.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bancos.slice(0, 100).map((b) => {
                      const calc = calculateBancoStatus(b);
                      return (
                        <TableRow key={b.id} className="text-[11px] hover:bg-slate-50">
                          <TableCell className="max-w-[200px]">
                            <p className="font-bold truncate" title={b.nome}>{b.nome || 'N/A'}</p>
                            <p className="text-slate-400 text-[10px] truncate" title={b.cargo}>{b.cargo}</p>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-[9px] h-5">{b.status || 'N/A'}</Badge>
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {b.prorrogacao || (b.is_prorrogado ? 'SIM' : 'NÃO')}
                          </TableCell>
                          <TableCell className="text-center text-slate-500">
                            {b.data_validade ? formatDate(b.data_validade) : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(calc.status)}
                          </TableCell>
                          <TableCell className="text-slate-500 italic">
                            {calc.motivo}
                          </TableCell>
                          <TableCell className="text-center font-bold text-slate-700">
                            {calc.dataReferencia ? formatDate(calc.dataReferencia) : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {bancos.length > 100 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4 text-slate-400 italic">
                          Exibindo apenas os primeiros 100 registros para performance. 
                          Total na base: {bancos.length}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Excluir banco de talentos?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O registro será removido permanentemente do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBancoParaExcluir(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
