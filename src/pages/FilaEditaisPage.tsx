import React, { useState, useMemo, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronDown, ChevronRight, Unlink, Link2, MapPin as MapPinIcon } from 'lucide-react';
import { HelpGuide } from '@/components/HelpGuide';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useVagasStore } from '@/store/vagasStore';
import { useAdminStore } from '@/store/adminStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, Filter, Edit, FileText, Send, MoreHorizontal, 
  Clock, AlertCircle, CheckCircle2, Building2, MapPin, 
  Tag, Briefcase, Users, Calendar, ArrowRight, ListFilter, X,
  FileUp, CheckSquare
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { STATUS_EDITAL_COLORS, StatusEdital, Vaga } from '@/types/vaga';
import { formatDate, normalizeUnitName, calcDiasAberto, getCategoriaStatus, filterByRegionAndUnit, UNIDADES_POR_REGIAO, normStatus } from '@/lib/vagaUtils';
import { UNIDADES_GOIANIA } from '@/types/vaga';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger, DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { ImportStagedDialog } from '@/components/import/ImportStagedDialog';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogFooter, DialogDescription 
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';


export default function FilaEditaisPage() {
  const navigate = useNavigate();
  const { vagas, updateVaga } = useVagasStore();
  const { currentUser } = useAdminStore();
  const permissions = usePermissions();
  const [search, setSearch] = useState('');
  const [filterUnidade, setFilterUnidade] = useState('all');
  const [isImportOpen, setIsImportOpen] = useState(false);
  
  // Modal de envio
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [selectedVaga, setSelectedVaga] = useState<Vaga | null>(null);
  const [cargoValidado, setCargoValidado] = useState(false);
  const [cargaValidada, setCargaValidada] = useState(false);
  const [salarioValidado, setSalarioValidado] = useState(false);
  const [obsUnidade, setObsUnidade] = useState('');

  const pendingVagas = useMemo(() => {
    return vagas.filter(v => {
      const vUnitNormalized = normalizeUnitName(v.unidade);
      
      // Unit access restriction (Permissions)
      if (!currentUser?.visualiza_todas_unidades) {
        const userUnidades = (currentUser?.unidades_vinculadas || []).map(u => normalizeUnitName(u));
        if (!userUnidades.includes(vUnitNormalized)) {
          return false;
        }
      }

      // Regra: Fila de Editais - Somente status PUBLICAR EDITAL
      const normalizedS = normStatus(v.status || v.status_geral || '');
      if (normalizedS !== 'publicar edital') return false;

      const searchTerm = search.toLowerCase();
      const matchSearch = !search || 
        (v.cargo || '').toLowerCase().includes(searchTerm) || 
        (v.requisicao || v.numero_requisicao || '').toLowerCase().includes(searchTerm);
      
      const matchUnidade = filterUnidade === 'all' || vUnitNormalized === filterUnidade;

      return matchSearch && matchUnidade;
    });
  }, [vagas, currentUser, search, filterUnidade]);

  const groupedVagas = useMemo(() => {
    const goianiaVagas = pendingVagas.filter(v => UNIDADES_GOIANIA.includes(normalizeUnitName(v.unidade)));
    const otherVagas = pendingVagas.filter(v => !UNIDADES_GOIANIA.includes(normalizeUnitName(v.unidade)));

    const grouped: Record<string, {
      cargo: string;
      vagas: Vaga[];
      totalVagas: number;
      unidades: string[];
    }> = {};

    goianiaVagas.forEach(v => {
      const cargo = v.cargo.toUpperCase().trim();
      if (!grouped[cargo]) {
        grouped[cargo] = {
          cargo: v.cargo,
          vagas: [],
          totalVagas: 0,
          unidades: []
        };
      }
      grouped[cargo].vagas.push(v);
      grouped[cargo].totalVagas += (v.numero_vagas || v.quantidade || 1);
      if (!grouped[cargo].unidades.includes(v.unidade)) {
        grouped[cargo].unidades.push(v.unidade);
      }
    });

    return {
      groupedGoiania: Object.values(grouped),
      otherVagas
    };
  }, [pendingVagas]);

  const unidadesAgrupadas = useMemo(() => {
    const allUnidades = Array.from(new Set(vagas.map(v => normalizeUnitName(v.unidade)))).filter(Boolean);
    
    // Labels conforme solicitado
    const REGION_LABELS: Record<string, string> = {
      'Goiás e Espírito Santo': 'Goiás e Espírito Santo',
      'Amazonas': 'Amazonas',
      'Demais Unidades': 'Outras Unidades'
    };

    return Object.entries(UNIDADES_POR_REGIAO).map(([regiao, units]) => ({
      label: REGION_LABELS[regiao] || regiao,
      units: units.map(u => normalizeUnitName(u)).filter(u => allUnidades.includes(u)).sort()
    })).filter(r => r.units.length > 0);
  }, [vagas]);

  const handleOpenSendModal = (vaga: Vaga) => {
    setSelectedVaga(vaga);
    setCargoValidado(false);
    setCargaValidada(false);
    setSalarioValidado(false);
    setObsUnidade('');
    setIsSendModalOpen(true);
  };

  const handleConfirmSend = () => {
    if (!selectedVaga) return;

    if (!cargoValidado || !cargaValidada || !salarioValidado) {
      toast.error('É necessário validar cargo, carga horária e salário com a unidade antes de enviar.');
      return;
    }

    updateVaga(selectedVaga.id, { 
      status: 'ACOMPANHAMENTO DE EDITAL',
      status_fluxo_edital: 'encaminhado_edital',
      cargo_validado: true,
      carga_horaria_validada: true,
      salario_validado: true,
      observacoes_unidade: obsUnidade,
      historico: [...selectedVaga.historico, {
        id: `h-${Date.now()}`,
        data: new Date().toISOString().split('T')[0],
        descricao: `Vaga encaminhada para redação e publicação do edital. Obs: ${obsUnidade || 'Sem observações'}`,
        usuario: currentUser?.nome_completo || 'Analista da Unidade'
      }]
    });

    setIsSendModalOpen(false);
    toast.success('Vaga encaminhada com sucesso para a redação do edital!');
  };


  const hasFilters = search !== '' || filterUnidade !== 'all';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Fila de Editais</h1>
          <p className="text-slate-500 mt-1">Vagas aguardando redação e publicação de novo edital.</p>
          <div className="mt-2"><HelpGuide /></div>
        </div>
        {permissions.canImport() && (
          <div className="flex gap-2">
            <Button variant="default" className="bg-primary hover:bg-primary/90 shadow-md shadow-primary/20" onClick={() => setIsImportOpen(true)}>
              <Building2 className="h-4 w-4 mr-2" /> Importar Excel
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-amber-50/50 border-amber-100 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-lg"><Clock className="h-5 w-5 text-amber-600" /></div>
              <div>
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Total na Fila</p>
                <p className="text-2xl font-bold text-slate-800">{pendingVagas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50/50 border-blue-100 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg"><FileText className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Aguardando Redação</p>
                <p className="text-2xl font-bold text-slate-800">{pendingVagas.filter(v => !v.numero_edital).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-slate-200 overflow-hidden">
        <CardHeader className="pb-3 border-b bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <ListFilter className="h-5 w-5 text-primary" />
            Vagas para Publicação
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar cargo ou REQ..." 
                className="pl-9 w-[250px] bg-white" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterUnidade} onValueChange={setFilterUnidade}>
              <SelectTrigger className="w-[200px] bg-white">
                <Building2 className="h-4 w-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Todas as Unidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Unidades</SelectItem>
                {unidadesAgrupadas.map((grupo) => (
                  <SelectGroup key={grupo.label}>
                    <SelectLabel>{grupo.label}</SelectLabel>
                    {grupo.units.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setFilterUnidade('all'); }}>
                <X className="h-4 w-4 mr-1" /> Limpar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requisição</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Vagas</TableHead>
                  <TableHead>Recebimento</TableHead>
                  <TableHead className="text-center">Dias Aberto</TableHead>
                  <TableHead className="text-center">Status Atual</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Vagas Agrupadas de Goiânia */}
                {groupedVagas.groupedGoiania.map((group) => (
                  <React.Fragment key={group.cargo}>
                    <TableRow className="bg-blue-50/50 hover:bg-blue-50/70 border-l-4 border-l-blue-500">
                      <TableCell colSpan={2} className="font-bold text-blue-800">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" /> 
                          Agrupado Goiás e Espírito Santo ({group.unidades.length} unidades)
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-blue-900">{group.cargo}</TableCell>
                      <TableCell colSpan={1}></TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-blue-600 text-white font-bold">{group.totalVagas}</Badge>
                      </TableCell>
                      <TableCell colSpan={2}></TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">CONSOLIDADO</Badge>
                      </TableCell>
                      <TableCell colSpan={1}></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-blue-600 font-bold hover:bg-blue-100" onClick={() => handleOpenSendModal(group.vagas[0])}>
                          <Send className="h-4 w-4 mr-1" /> Preparar Consolidado
                        </Button>
                      </TableCell>
                    </TableRow>
                    {group.vagas.map(v => (
                      <TableRow key={v.id} className="group bg-white opacity-80 hover:opacity-100">
                        <TableCell className="pl-10 font-mono text-[10px] text-slate-400">
                          {v.requisicao || v.numero_requisicao}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 ml-6">
                            <Building2 className="h-3 w-3 text-slate-300" />
                            <span className="text-xs text-slate-500">{v.unidade}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 italic pl-10">{v.cargo}</TableCell>
                        <TableCell className="text-[10px] text-slate-400">{v.tipo_vaga}</TableCell>
                        <TableCell className="text-center text-xs">{v.numero_vagas || v.quantidade}</TableCell>
                        <TableCell className="text-[10px] text-slate-400">{formatDate(v.data_recebimento!)}</TableCell>
                        <TableCell className="text-center text-[10px]">{calcDiasAberto(v.data_recebimento || v.data_abertura)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[9px] uppercase bg-slate-50 text-slate-400 border-slate-200">Individual</Badge>
                        </TableCell>
                        <TableCell className="text-[10px] text-slate-400">{v.analista_responsavel}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}

                {/* Demais Vagas */}
                {groupedVagas.otherVagas.map((v) => (
                  <TableRow key={v.id} className="group">
                    <TableCell className="font-mono text-xs text-primary font-bold">
                      {v.requisicao || v.numero_requisicao}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-medium text-slate-700">{v.unidade}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-slate-800">{v.cargo}</TableCell>
                    <TableCell className="text-[11px] font-bold uppercase text-slate-500">{v.tipo_vaga}</TableCell>
                    <TableCell className="text-center font-bold text-slate-700">{v.numero_vagas || v.quantidade}</TableCell>
                    <TableCell className="text-slate-500 whitespace-nowrap">
                      {formatDate(v.data_recebimento!)}
                    </TableCell>
                    <TableCell className="text-center font-bold text-slate-700">
                      {calcDiasAberto(v.data_recebimento || v.data_abertura)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 border-blue-200">
                        {v.status || v.status_geral || 'Sem Status'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-600">
                      {v.analista_responsavel}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" title="Redigir" onClick={() => navigate(`/vagas/${v.id}`)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" title="Encaminhar para Publicação" onClick={() => handleOpenSendModal(v)}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {pendingVagas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <CheckCircle2 className="h-10 w-10 text-slate-200" />
                        <p className="text-slate-500 font-medium">Nenhuma pendência encontrada na fila de editais.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ImportStagedDialog open={isImportOpen} onOpenChange={setIsImportOpen} type="vagas" />

      <Dialog open={isSendModalOpen} onOpenChange={setIsSendModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Send className="h-5 w-5" />
              Encaminhar para Redação do Edital
            </DialogTitle>
            <DialogDescription>
              Confirme as informações validadas com a unidade antes de encaminhar a vaga para a redação do edital.
            </DialogDescription>
          </DialogHeader>
          
          {selectedVaga && (
            <div className="space-y-6 py-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">Unidade:</span>
                  <span className="font-bold text-slate-700">{selectedVaga.unidade}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">Cargo:</span>
                  <span className="font-bold text-slate-700">{selectedVaga.cargo}</span>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-primary" />
                  Validações Obrigatórias
                </h4>
                
                <div className="space-y-3">
                  <div className="flex items-start space-x-3 p-3 rounded-md border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setCargoValidado(!cargoValidado)}>
                    <Checkbox id="cargo" checked={cargoValidado} onCheckedChange={(checked) => setCargoValidado(checked as boolean)} />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor="cargo" className="text-sm font-medium cursor-pointer">Cargo validado com a unidade</Label>
                      <p className="text-xs text-slate-500">Confirmo que a nomenclatura do cargo está correta.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 rounded-md border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setCargaValidada(!cargaValidada)}>
                    <Checkbox id="carga" checked={cargaValidada} onCheckedChange={(checked) => setCargaValidada(checked as boolean)} />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor="carga" className="text-sm font-medium cursor-pointer">Carga horária validada com a unidade</Label>
                      <p className="text-xs text-slate-500">Confirmo que a jornada semanal está correta.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 rounded-md border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSalarioValidado(!salarioValidado)}>
                    <Checkbox id="salario" checked={salarioValidado} onCheckedChange={(checked) => setSalarioValidado(checked as boolean)} />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor="salario" className="text-sm font-medium cursor-pointer">Salário validado com a unidade</Label>
                      <p className="text-xs text-slate-500">Confirmo que a remuneração está atualizada.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="obs" className="text-sm font-semibold text-slate-800">Observações para Redação/Publicação</Label>
                <Textarea 
                  id="obs" 
                  placeholder="Instruções sobre salário, carga horária, urgência ou perfil da vaga..."
                  className="min-h-[100px] resize-none"
                  value={obsUnidade}
                  onChange={(e) => setObsUnidade(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSendModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirmSend} className="bg-primary hover:bg-primary/90">
              Confirmar e Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
