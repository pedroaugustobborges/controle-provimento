import { useState, useRef } from 'react';
import { useVagasStore } from '@/store/vagasStore';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/StatusBadge';
import { TIPO_VAGA_LABELS, STATUS_LABELS, StatusGeral, TipoVaga } from '@/types/vaga';
import { calcDiasAberto, formatDate } from '@/lib/vagaUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Upload, Plus, FileText, X } from 'lucide-react';
import { toast } from 'sonner';

export default function VagasPage() {
  const { vagas, addVagas } = useVagasStore();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [filterUnidade, setFilterUnidade] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTipo, setFilterTipo] = useState('all');
  const [filterAnalista, setFilterAnalista] = useState('all');

  const unidades = [...new Set(vagas.map((v) => v.unidade))];
  const analistas = [...new Set(vagas.map((v) => v.analista_responsavel))];

  const filtered = vagas.filter((v) => {
    const matchSearch = !search || v.cargo.toLowerCase().includes(search.toLowerCase()) ||
      v.numero_requisicao.toLowerCase().includes(search.toLowerCase());
    const matchUnidade = filterUnidade === 'all' || v.unidade === filterUnidade;
    const matchStatus = filterStatus === 'all' || v.status_geral === filterStatus;
    const matchTipo = filterTipo === 'all' || v.tipo_vaga === filterTipo;
    const matchAnalista = filterAnalista === 'all' || v.analista_responsavel === filterAnalista;
    return matchSearch && matchUnidade && matchStatus && matchTipo && matchAnalista;
  });

  const handleImport = () => {
    toast.info('Para importar, selecione um arquivo CSV com colunas: numero_requisicao, cargo, tipo_vaga, quantidade, secao, unidade, analista_responsavel');
    fileRef.current?.click();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text.split('\n').filter(Boolean);
        const headers = lines[0].split(/[,;]/).map((h) => h.trim().toLowerCase());
        const newVagas = lines.slice(1).map((line, i) => {
          const cols = line.split(/[,;]/).map((c) => c.trim());
          const row: Record<string, string> = {};
          headers.forEach((h, j) => { row[h] = cols[j] || ''; });
          return {
            id: `imp-${Date.now()}-${i}`,
            numero_requisicao: row.numero_requisicao || `REQ-IMP-${i + 1}`,
            data_abertura: new Date().toISOString().split('T')[0],
            cargo: row.cargo || 'Não informado',
            tipo_vaga: (row.tipo_vaga as any) || 'quadro',
            quantidade: parseInt(row.quantidade) || 1,
            secao: row.secao || '',
            unidade: row.unidade || '',
            analista_responsavel: row.analista_responsavel || '',
            status_geral: 'aberta' as const,
            origem_importacao: file.name,
            observacoes: '',
            historico: [{ id: `h-${Date.now()}-${i}`, data: new Date().toISOString().split('T')[0], descricao: `Importado de ${file.name}`, usuario: 'Sistema' }],
          };
        });
        addVagas(newVagas);
        toast.success(`${newVagas.length} vagas importadas com sucesso!`);
      } catch {
        toast.error('Erro ao processar arquivo. Verifique o formato.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

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
        <h2 className="text-2xl font-semibold">Controle de Vagas</h2>
        <div className="flex gap-2">
          <input type="file" ref={fileRef} accept=".csv,.txt" className="hidden" onChange={handleFile} />
          <Button variant="outline" size="sm" onClick={handleImport}>
            <Upload className="h-4 w-4 mr-1" /> Importar CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar cargo ou requisição..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
            </div>
            <Select value={filterUnidade} onValueChange={setFilterUnidade}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Unidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Unidades</SelectItem>
                {unidades.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Tipos</SelectItem>
                {Object.entries(TIPO_VAGA_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterAnalista} onValueChange={setFilterAnalista}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Analista" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Analistas</SelectItem>
                {analistas.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-4 w-4 mr-1" /> Limpar</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Requisição</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Cargo</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Unidade</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Seção</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Tipo</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Qtd</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Analista</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Abertura</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Dias</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr
                    key={v.id}
                    className="border-b last:border-0 hover:bg-muted/20 cursor-pointer transition-colors"
                    onClick={() => navigate(`/vagas/${v.id}`)}
                  >
                    <td className="p-3 font-mono text-xs">{v.numero_requisicao}</td>
                    <td className="p-3 font-medium">{v.cargo}</td>
                    <td className="p-3 text-muted-foreground">{v.unidade}</td>
                    <td className="p-3 text-muted-foreground">{v.secao}</td>
                    <td className="p-3 text-xs">{TIPO_VAGA_LABELS[v.tipo_vaga]}</td>
                    <td className="p-3 text-center">{v.quantidade}</td>
                    <td className="p-3 text-muted-foreground text-xs">{v.analista_responsavel}</td>
                    <td className="p-3"><StatusBadge status={v.status_geral} /></td>
                    <td className="p-3 text-xs">{formatDate(v.data_abertura)}</td>
                    <td className="p-3 text-xs font-medium">{calcDiasAberto(v.data_abertura, v.data_encerramento)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">Nenhuma vaga encontrada.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t text-xs text-muted-foreground">
            {filtered.length} de {vagas.length} vagas
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
