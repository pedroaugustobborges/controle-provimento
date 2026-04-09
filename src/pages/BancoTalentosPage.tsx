import { useVagasStore } from '@/store/vagasStore';
import { useAdminStore } from '@/store/adminStore';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, Filter, Calendar, Info, Clock, CheckCircle2, AlertTriangle, FileSpreadsheet, History, Download, Trash2, AlertCircle, User, Users, Briefcase, Building, FileText, ClipboardList, CheckCircle } from 'lucide-react';
import { formatDate, normalizeCargo } from '@/lib/vagaUtils';
import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { BancoTalentosForm } from '@/components/BancoTalentosForm';
import { ImportExcelDialog } from '@/components/ImportExcelDialog';
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

export default function BancoTalentosPage() {
  const { bancos, importHistory, importedFiles, deleteBanco } = useVagasStore();
  const { currentUser } = useAdminStore();
  const permissions = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'list');
  const [unidadeFilter, setUnidadeFilter] = useState('todas');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [convocadosSearch, setConvocadosSearch] = useState('');
  const [convocadosUnidadeFilter, setConvocadosUnidadeFilter] = useState('todas');
  const [convocadosCargoFilter, setConvocadosCargoFilter] = useState('todos');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [bancoParaExcluir, setBancoParaExcluir] = useState<string | null>(null);
  const [selectedBanco, setSelectedBanco] = useState<BancoTalentos | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

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
    if (tabParam && ['list', 'convocados', 'history'].includes(tabParam)) {
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
    return bancos.filter(b => {
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
    bancos.forEach(b => {
      // Restricted access check
      if (!currentUser?.visualiza_todas_unidades && !currentUser?.unidades_vinculadas.includes(b.unidade)) {
        return;
      }

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
          cargo: b.cargo,
          cargoNormalizado: cargoNorm,
          status: b.status,
          validade: b.nova_data_validade || b.data_validade,
          isProrrogado: b.is_prorrogado,
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
        
      return matchSearch && matchUnidade && matchStatus;
    });
  }, [groupedBancos, search, unidadeFilter, statusFilter]);

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

  const historyBT = useMemo(() => {


    return importHistory.filter(h => h.tipo_importacao === 'banco');
  }, [importHistory]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CADASTRO RESERVA': 
      case 'valido': return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 font-bold border-green-200">Cadastro Reserva</Badge>;
      case 'VENCIDO':
      case 'vencido': return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 font-bold border-red-200">Vencido</Badge>;
      case 'prorrogado': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 font-bold border-blue-200">Prorrogado</Badge>;
      case 'CONVOCADO':
      case 'convocado': return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 font-bold border-purple-200">Convocado</Badge>;
      default: return <Badge variant="outline">Indeterminado</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Banco de Talentos</h1>
          <p className="text-slate-500 mt-1">Gestão de validade e disponibilidade de candidatos aprovados.</p>
        </div>
        <div className="flex gap-2">
          {permissions.canImport() && (
            <Button 
              variant="outline" 
              className="gap-2 border-primary/20 text-primary hover:bg-primary/5 shadow-sm"
              onClick={() => setIsImportOpen(true)}
            >
              <FileSpreadsheet className="h-4 w-4" /> Importar Excel
            </Button>
          )}
          <Button 
            className="gap-2 bg-primary shadow-md shadow-primary/20"
            onClick={() => setIsFormOpen(true)}
          >
            <Plus className="h-4 w-4" /> Novo Banco
          </Button>
        </div>
      </div>

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

      <ImportExcelDialog 
        open={isImportOpen} 
        onOpenChange={setIsImportOpen} 
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
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">
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
                            <p className="text-[10px] text-slate-400 font-medium uppercase">Candidato</p>
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
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Building className="h-3 w-3" /> Unidade e Cargo
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Unidade</p>
                    <p className="text-sm font-semibold text-slate-800">{selectedBanco?.unidade}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Cargo</p>
                    <p className="text-sm font-semibold text-slate-800">{selectedBanco?.cargo}</p>
                  </div>
                </div>
              </section>


              <Separator />

              {/* Edital */}
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <FileText className="h-3 w-3" /> Edital e Processo
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Número Edital</p>
                    <p className="text-sm font-semibold text-slate-800">{selectedBanco.numero_edital}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Número Processo</p>
                    <p className="text-sm font-semibold text-slate-800">{selectedBanco.numero_processo || "Não informado"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Classificação</p>
                    <p className="text-sm font-semibold text-slate-800">{selectedBanco.classificacao || "Não informado"}</p>
                  </div>
                </div>
              </section>

              <Separator />

              {/* Datas */}
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Calendar className="h-3 w-3" /> Datas Importantes
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Publicação</p>
                    <p className="text-sm font-semibold text-slate-800">{formatDate(selectedBanco.data_abertura_edital)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Validade Original</p>
                    <p className="text-sm font-semibold text-slate-800">{formatDate(selectedBanco.data_validade)}</p>
                  </div>
                  {selectedBanco.nova_data_validade && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Validade Prorrogada</p>
                      <p className="text-sm font-semibold text-blue-600 font-bold">{formatDate(selectedBanco.nova_data_validade)}</p>
                    </div>
                  )}
                  {selectedBanco.data_convocacao && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Data Convocação</p>
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
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <ClipboardList className="h-3 w-3" /> Detalhes da Convocação
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedBanco.unidade_convocacao && (
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Unidade de Convocação</p>
                          <p className="text-sm font-semibold text-slate-800">{selectedBanco.unidade_convocacao}</p>
                        </div>
                      )}
                      {selectedBanco.numero_chamada && (
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Número da Chamada</p>
                          <p className="text-sm font-semibold text-slate-800">{selectedBanco.numero_chamada}</p>
                        </div>
                      )}
                      {selectedBanco.numero_processo_seletivo && (
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Proc. Seletivo</p>
                          <p className="text-sm font-semibold text-slate-800">{selectedBanco.numero_processo_seletivo}</p>
                        </div>
                      )}
                      {selectedBanco.numero_vaga_aproveitamento && (
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Vaga Aproveitamento</p>
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
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
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

      {/* Seção de Auditoria Real (Item 1) */}
      {useMemo(() => {
        const stats = bancos.reduce((acc, b) => {
          const s = (b.status || 'NENHUM').toUpperCase();
          acc[s] = (acc[s] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        console.log('--- AUDITORIA BANCO DE TALENTOS ---');
        console.log('Status encontrados na base:', Object.keys(stats));
        console.log('Quantidade por status (linhas):', stats);
        console.log('Total de bancos (agrupados):', groupedBancos.length);
        console.log('---------------------------------');
        return null;
      }, [bancos, groupedBancos])}

      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="border-slate-200 shadow-sm bg-white border-l-4 border-l-primary">
          <CardContent className="pt-6 px-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2.5 rounded-lg shrink-0">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">Cadastro Reserva</p>
                <p className="text-2xl font-bold text-slate-900">
                  {/* SOMA AGRUPADA: Total de vagas/capacidade do banco (conforme auditoria) */}
                  {groupedBancos
                    .filter(g => g.status === 'CADASTRO RESERVA')
                    .reduce((sum, g) => sum + g.qtdBanco, 0)}
                </p>
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
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">Convocados</p>
                <p className="text-2xl font-bold text-slate-900">
                  {/* CONTAGEM DE LINHAS: Total de pessoas já convocadas */}
                  {bancos.filter(b => b.status === 'CONVOCADO').length}
                </p>
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
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">Bancos Válidos</p>
                <p className="text-2xl font-bold text-slate-900">
                  {/* SOMA AGRUPADA: Capacidade total de todos os bancos que não venceram */}
                  {groupedBancos
                    .filter(g => g.status !== 'VENCIDO' && g.status !== 'CONVOCADO')
                    .reduce((sum, g) => sum + g.qtdBanco, 0)}
                </p>
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
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">Prorrogados</p>
                <p className="text-2xl font-bold text-slate-900">
                  {/* CONTAGEM DE LINHAS: Candidatos em bancos prorrogados */}
                  {bancos.filter(b => b.is_prorrogado && b.status !== 'CONVOCADO').length}
                </p>
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
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">Vencidos</p>
                <p className="text-2xl font-bold text-slate-900">
                  {/* CONTAGEM DE LINHAS: Candidatos em bancos vencidos */}
                  {bancos.filter(b => b.status === 'VENCIDO').length}
                </p>
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
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">Total Visível</p>
                <p className="text-2xl font-bold text-slate-900">
                  {/* SOMA TOTAL REAL: Soma de todas as capacidades informadas nos bancos */}
                  {groupedBancos.reduce((sum, g) => sum + g.qtdBanco, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="list" className="gap-2">
            <Filter className="h-4 w-4" /> Cadastro Reserva
          </TabsTrigger>
          <TabsTrigger value="convocados" className="gap-2">
            <CheckCircle className="h-4 w-4" /> Convocados
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
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow>
                    <TableHead className="text-[10px] font-bold uppercase">Edital</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Proc. Seletivo</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Cargo</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Unidade</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Status</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Qtd. Banco</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {filteredGroups.map((group) => (
                    <TableRow key={group.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-bold text-primary text-xs">{group.edital}</TableCell>
                      <TableCell className="text-xs font-semibold text-slate-600 italic">
                        {group.processoSeletivo || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-800">{group.cargo}</div>
                        <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">{group.candidatos[0]?.secao || '—'}</div>
                      </TableCell>
                      <TableCell className="text-slate-600 font-medium">{group.unidade}</TableCell>
                      <TableCell>{getStatusBadge(group.status)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-bold bg-slate-50">{group.qtdBanco}</Badge>
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
                      <TableCell colSpan={7} className="h-40 text-center text-slate-400 font-medium italic">
                        Nenhum banco de talentos encontrado para os filtros aplicados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
                  <TableHeader className="bg-slate-50/80">
                    <TableRow>
                      <TableHead className="text-[10px] font-bold uppercase">Nome</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase">Cargo</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase">Edital</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-center">Class.</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase">Data Conv.</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase">Unid. Conv.</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-center">N° Chamada</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-right">Ações</TableHead>
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
        <TabsContent value="history">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead className="text-[10px] font-bold uppercase">Data/Hora</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Arquivo</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-center">Registros</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Usuário</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Status</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-right">Ações</TableHead>
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
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px]">Concluído</Badge>
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
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg space-y-3">
              <h3 className="font-bold text-amber-800 flex items-center gap-2 text-sm">
                <Info className="h-4 w-4" /> RESUMO TÉCNICO DA AUDITORIA (CONFERÊNCIA INTERNA)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-2">
                  <p><strong>1. Cadastro Reserva:</strong> Usa <span className="bg-amber-100 px-1 font-bold italic">SOMA AGRUPADA</span> (sum de QNTD BANCO por grupo).</p>
                  <p><strong>2. Bancos Válidos:</strong> Mesma lógica do Cadastro Reserva (<span className="bg-amber-100 px-1 font-bold italic">SOMA AGRUPADA</span>).</p>
                  <p><strong>3. Prorrogados:</strong> Usa <span className="bg-amber-100 px-1 font-bold italic">CONTAGEM DE LINHAS</span> (quantas pessoas reais estão marcadas como prorrogadas).</p>
                </div>
                <div className="space-y-2">
                  <p><strong>4. Total Visível:</strong> Usa <span className="bg-amber-100 px-1 font-bold italic">SOMA AGRUPADA</span> de todos os grupos identificados.</p>
                  <p><strong>5. Chave de Agrupamento:</strong> Prioriza <span className="bg-amber-100 px-1 font-bold">Processo Seletivo</span>; se ausente, usa <span className="bg-amber-100 px-1 font-bold">Edital + Unidade + Cargo</span>.</p>
                  <p><strong>6. Status Predominante:</strong> Reflete o status do primeiro registro encontrado no grupo.</p>
                </div>
              </div>
            </div>

            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-100">
                    <TableRow>
                      <TableHead className="text-[10px] font-bold uppercase whitespace-nowrap">Chave do Grupo</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-center">Status</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-center">Cands (Linhas)</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-center">Qtd Banco (Lido)</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-center">Válido?</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-center">Prorrog?</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-center bg-blue-50/50">Cad. Res.</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-center bg-green-50/50">Bancos Vál.</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-center bg-purple-50/50">Prorrogados</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-center bg-slate-100">Total Visível</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedBancos.map((group) => {
                      const key = group.processoSeletivo ? `PS-${group.processoSeletivo}` : `${group.edital}-${group.unidade}-${group.cargoNormalizado}`;
                      const isValid = group.status !== 'VENCIDO' && group.status !== 'CONVOCADO';
                      const isProrrogado = group.candidatos.some(c => c.is_prorrogado) && group.status !== 'CONVOCADO';
                      const inCadReserva = group.status === 'CADASTRO RESERVA';
                      const inBancosValidos = isValid;
                      const inProrrogados = isProrrogado; // No card real, é contagem de linhas, aqui mostramos se o GRUPO contribui
                      
                      return (
                        <TableRow key={group.id} className="text-[11px] hover:bg-slate-50">
                          <TableCell className="font-mono text-[9px] max-w-[200px] truncate" title={key}>{key}</TableCell>
                          <TableCell className="text-center">{group.status}</TableCell>
                          <TableCell className="text-center font-bold">{group.candidatos.length}</TableCell>
                          <TableCell className="text-center font-bold text-primary">{group.qtdBanco}</TableCell>
                          <TableCell className="text-center">{isValid ? '✅' : '❌'}</TableCell>
                          <TableCell className="text-center">{isProrrogado ? '✅' : '❌'}</TableCell>
                          <TableCell className="text-center bg-blue-50/30">{inCadReserva ? <span className="font-bold text-blue-600">+{group.qtdBanco}</span> : '—'}</TableCell>
                          <TableCell className="text-center bg-green-50/30">{inBancosValidos ? <span className="font-bold text-green-600">+{group.qtdBanco}</span> : '—'}</TableCell>
                          <TableCell className="text-center bg-purple-50/30">{inProrrogados ? <span className="font-bold text-purple-600">+{group.candidatos.filter(c => c.is_prorrogado).length}</span> : '—'}</TableCell>
                          <TableCell className="text-center bg-slate-50 font-bold">+{group.qtdBanco}</TableCell>
                        </TableRow>
                      );
                    })}
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
