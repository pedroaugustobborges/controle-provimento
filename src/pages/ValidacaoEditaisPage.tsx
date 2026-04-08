import { useVagasStore } from '@/store/vagasStore';
import { useAdminStore } from '@/store/adminStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Filter, 
  MoreVertical, 
  Calendar,
  AlertCircle,
  Eye,
  FileCheck,
  Building2,
  FileText
} from 'lucide-react';
import { formatDate, normalizeUnitName } from '@/lib/vagaUtils';
import { useState, useMemo } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function ValidacaoEditaisPage() {
  const { vagas, updateVaga } = useVagasStore();
  const { currentUser, addAuditLog } = useAdminStore();
  const [search, setSearch] = useState('');
  const [selectedVaga, setSelectedVaga] = useState<any>(null);
  const [obs, setObs] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const pendingEditais = useMemo(() => {
    return vagas.filter(v => {
      if (v.status_validacao !== 'pendente') return false;
      
      if (!currentUser?.visualiza_todas_unidades) {
        const userUnidades = (currentUser?.unidades_vinculadas || []).map(u => normalizeUnitName(u));
        if (!userUnidades.includes(normalizeUnitName(v.unidade))) {
          return false;
        }
      }

      if (search) {
        const s = search.toLowerCase();
        return v.cargo.toLowerCase().includes(s) || 
               v.unidade.toLowerCase().includes(s) ||
               (v.numero_edital || '').toLowerCase().includes(s);
      }
      return true;
    });
  }, [vagas, currentUser, search]);

  const handleAction = (vagaId: string, status: 'aprovado' | 'reprovado') => {
    const vaga = vagas.find(v => v.id === vagaId);
    if (!vaga) return;

    const newStatus = status === 'aprovado' ? 'em_edital' : 'publicar_novo_edital';
    
    updateVaga(vagaId, {
      status: newStatus as any,
      status_validacao: status,
      validado_por: currentUser?.nome_completo,
      data_validacao: new Date().toISOString(),
      observacoes_validacao: obs,
      historico: [...vaga.historico, {
        id: `h-${Date.now()}`,
        data: new Date().toISOString().split('T')[0],
        descricao: `Edital ${status} por ${currentUser?.nome_completo}. Obs: ${obs}`,
        usuario: currentUser?.nome_completo || 'Admin'
      }]
    });

    toast.success(`Edital ${status === 'aprovado' ? 'validado' : 'reprovado'} com sucesso.`);
    setIsModalOpen(false);
    setSelectedVaga(null);
    setObs('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Validar Editais</h1>
          <p className="text-slate-500 mt-1">Área de validação administrativa de editais redigidos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
          <CardContent className="pt-6 pb-6 text-center">
            <Clock className="h-8 w-8 text-amber-600 mx-auto mb-2" />
            <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">Aguardando Validação</p>
            <p className="text-3xl font-bold text-amber-700">{pendingEditais.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b bg-slate-50/50 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg font-bold text-slate-800">Editais Pendentes</CardTitle>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Filtrar..." 
              className="pl-9 h-10 bg-white" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-wider">Unidade</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-wider">Cargo</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-wider">Nº Edital / Processo</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-wider">Redigido por</th>
                <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-wider">Ações</th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingEditais.map((v) => (
                <TableRow key={v.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 font-medium text-slate-700">{v.unidade}</td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-800">{v.cargo}</div>
                    <div className="text-[10px] text-slate-400">{v.requisicao}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-primary">{v.numero_edital}</div>
                    <div className="text-[10px] text-slate-500">{v.numero_processo}</div>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600">
                    {v.historico[v.historico.length - 1]?.usuario || 'Analista'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => { setSelectedVaga(v); setIsModalOpen(true); }}>
                        <Eye className="h-3.5 w-3.5" /> Analisar
                      </Button>
                    </div>
                  </td>
                </TableRow>
              ))}
              {pendingEditais.length === 0 && (
                <TableRow>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-400 font-medium italic">
                    Nenhum edital pendente de validação administrativa.
                  </td>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Validar Edital</DialogTitle>
            <DialogDescription>
              Analise os dados do edital para a vaga {selectedVaga?.cargo}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Nº Edital</p>
                <p className="font-semibold">{selectedVaga?.numero_edital}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Nº Processo</p>
                <p className="font-semibold">{selectedVaga?.numero_processo}</p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Observações da Validação</label>
              <Textarea 
                placeholder="Informe o motivo da reprovação ou observações da aprovação..." 
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleAction(selectedVaga.id, 'reprovado')}>
              <XCircle className="h-4 w-4 mr-2" /> Reprovar
            </Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleAction(selectedVaga.id, 'aprovado')}>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Validar Edital
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
