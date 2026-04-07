import { useState, useRef } from 'react';
import { useVagasStore } from '@/store/vagasStore';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/StatusBadge';
import { TIPO_VAGA_LABELS, STATUS_LABELS, StatusGeral, TipoVaga, STATUS_EDITAL_COLORS } from '@/types/vaga';
import { calcDiasAberto, formatDate } from '@/lib/vagaUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, Upload, Plus, FileText, X, Building2, 
  Filter, FileSpreadsheet, ListFilter 
} from 'lucide-react';
import { toast } from 'sonner';
import { ImportExcelDialog } from '@/components/ImportExcelDialog';

export default function VagasPage() {
  const { vagas } = useVagasStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterUnidade, setFilterUnidade] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTipo, setFilterTipo] = useState('all');
  const [filterAnalista, setFilterAnalista] = useState('all');
  const [isImportOpen, setIsImportOpen] = useState(false);

  const unidades = [...new Set(vagas.map((v) => v.unidade))];
  const analistas = [...new Set(vagas.map((v) => v.analista_responsavel))];

  const filtered = vagas.filter((v) => {
    const matchSearch = !search || v.cargo.toLowerCase().includes(search.toLowerCase()) ||
      (v.requisicao || v.numero_requisicao || '').toLowerCase().includes(search.toLowerCase());
    const matchUnidade = filterUnidade === 'all' || v.unidade === filterUnidade;
    const matchStatus = filterStatus === 'all' || v.status === filterStatus || v.status_geral === filterStatus;
    const matchTipo = filterTipo === 'all' || v.tipo_vaga === filterTipo;
    const matchAnalista = filterAnalista === 'all' || v.analista_responsavel === filterAnalista;
    return matchSearch && matchUnidade && matchStatus && matchTipo && matchAnalista;
  });


  const clearFilters = () => {
    setSearch('');
    setFilterUnidade('all');
    setFilterStatus('all');
    setFilterTipo('all');
    setFilterAnalista('all');
  };

  const hasFilters = search || filterUnidade !== 'all' || filterStatus !== 'all' || filterTipo !== 'all' || filterAnalista !== 'all';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-foreground/90">Controle de Provimento</h1>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5 text-primary font-bold shadow-sm shadow-primary/5" onClick={() => setIsImportOpen(true)}>
            <FileSpreadsheet className="h-4 w-4" /> Importar Excel
          </Button>
          <Button className="gap-2 shadow-md shadow-primary/20">
            <Plus className="h-4 w-4" /> Nova Vaga
          </Button>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar cargo ou requisição..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
            </div>
            <Select value={filterUnidade} onValueChange={setFilterUnidade}>
              <SelectTrigger className="w-[160px] bg-white"><SelectValue placeholder="Unidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Unidades</SelectItem>
                {unidades.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px] bg-white"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-[160px] bg-white"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Tipos</SelectItem>
                {Object.entries(TIPO_VAGA_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-4 w-4 mr-1" /> Limpar</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50/50 whitespace-nowrap">
                  <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-left">Requisição</th>
                  <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-left">Cargo</th>
                  <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-left">Unidade</th>
                  <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-left">Edital / Processo</th>
                  <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-left">Status Geral</th>
                  <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-left whitespace-nowrap">Status Edital</th>
                  <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-center">Vagas</th>
                  <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-left">Data Abertura</th>
                  <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-center">Dias</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr
                    key={v.id}
                    className="border-b last:border-0 hover:bg-slate-50/50 cursor-pointer transition-colors whitespace-nowrap group"
                    onClick={() => navigate(`/vagas/${v.id}`)}
                  >
                    <td className="px-6 py-4 font-mono text-xs text-primary font-bold">{v.numero_requisicao}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{v.cargo}</div>
                      <div className="flex gap-1 mt-1">
                        <Badge variant="outline" className="text-[9px] font-bold py-0 h-4">{TIPO_VAGA_LABELS[v.tipo_vaga]}</Badge>
                        {v.pcd && <Badge variant="outline" className="text-[9px] font-bold py-0 h-4 bg-purple-50 text-purple-600 border-purple-100">PCD</Badge>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{v.unidade}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-slate-700 font-bold">{v.numero_edital || '—'}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{v.numero_processo || '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={v.status_geral} /></td>
                    <td className="px-6 py-4">
                      {v.status_edital && (
                        <Badge className={`${STATUS_EDITAL_COLORS[v.status_edital]} font-bold text-[10px] py-0.5 whitespace-nowrap`}>
                          {v.status_edital}
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-700">{v.quantidade}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{formatDate(v.data_abertura)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 font-bold text-[10px]">
                        {calcDiasAberto(v.data_abertura, v.data_encerramento)}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-6 py-20 text-center text-muted-foreground font-medium">Nenhuma vaga encontrada para os filtros aplicados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t text-xs text-slate-500 font-medium bg-slate-50/30">
            Exibindo {filtered.length} de {vagas.length} vagas registradas no sistema
          </div>
        </CardContent>
      </Card>

      <ImportExcelDialog open={isImportOpen} onOpenChange={setIsImportOpen} />
    </div>
  );
}
