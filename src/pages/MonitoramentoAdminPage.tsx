import React, { useMemo, useState } from 'react';
import { useVagasStore } from '@/store/vagasStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Activity, Calendar, Clock, AlertCircle, CheckCircle2, 
  Search, Filter, ArrowRight, User, Building2,
  TrendingUp, TrendingDown, ClipboardList
} from 'lucide-react';
import { formatDate } from '@/lib/vagaUtils';
import { ETAPA_LABELS, EtapaEdital } from '@/types/vaga';
import { useNavigate } from 'react-router-dom';

export default function MonitoramentoAdminPage() {
  const navigate = useNavigate();
  const { vagas } = useVagasStore();
  const [search, setSearch] = useState('');
  
  const today = new Date().toISOString().split('T')[0];
  const currentHour = new Date().getHours();
  const isAfterLimit = currentHour >= 14;

  const dailyStats = useMemo(() => {
    const editaisEmAndamento = vagas.filter(v => v.status_edital === 'Em andamento' || (v.acompanhamento?.etapa_atual && v.acompanhamento.etapa_atual !== 'encerramento'));
    
    const previstosHoje = editaisEmAndamento.filter(v => {
      const etapa = v.acompanhamento?.etapa_atual as EtapaEdital;
      const cronoKey = (v as any).cronograma_keys_map?.[etapa] || `data_${etapa}`; // Simplified for now
      // Actually let's use the same logic as the component
      const crono = v.cronograma as any;
      if (!crono || !etapa) return false;
      
      const keys: any = {
        validacao_edital: 'data_validacao_edital',
        inscricoes: 'data_inscricao',
        triagem: 'data_triagem',
        resultado_da_triagem: 'data_resultado_triagem',
        entrevistas: 'data_entrevistas',
        resultado_final: 'data_resultado_final'
      };
      
      const date = crono[keys[etapa]];
      return date === today;
    });

    const atualizadosHoje = editaisEmAndamento.filter(v => {
      const hist = v.acompanhamento?.historico_etapas || [];
      return hist.some(h => h.timestamp_conclusao?.startsWith(today));
    });

    const atrasados = previstosHoje.filter(v => {
      const hist = v.acompanhamento?.historico_etapas || [];
      const etapa = v.acompanhamento?.etapa_atual;
      const concluida = hist.find(h => h.etapa === etapa)?.concluida;
      return !concluida && isAfterLimit;
    });

    return {
      total: editaisEmAndamento.length,
      previstosHoje: previstosHoje.length,
      atualizadosHoje: atualizadosHoje.length,
      atrasados: atrasados.length
    };
  }, [vagas, today, isAfterLimit]);

  const monitoramentoItems = useMemo(() => {
    return vagas
      .filter(v => v.status_edital === 'Em andamento' || (v.acompanhamento?.etapa_atual && v.acompanhamento.etapa_atual !== 'encerramento'))
      .filter(v => {
        const term = search.toLowerCase();
        return !search || 
          v.cargo.toLowerCase().includes(term) || 
          v.unidade.toLowerCase().includes(term) || 
          v.analista_responsavel.toLowerCase().includes(term);
      })
      .map(v => {
        const etapa = v.acompanhamento?.etapa_atual as EtapaEdital;
        const crono = v.cronograma as any;
        const keys: any = {
          validacao_edital: 'data_validacao_edital',
          inscricoes: 'data_inscricao',
          triagem: 'data_triagem',
          resultado_da_triagem: 'data_resultado_triagem',
          entrevistas: 'data_entrevistas',
          resultado_final: 'data_resultado_final'
        };
        const dataPrevista = crono?.[keys[etapa]];
        const isPrevistoHoje = dataPrevista === today;
        const hist = v.acompanhamento?.historico_etapas || [];
        const statusEtapa = hist.find(h => h.etapa === etapa);
        const isAtrasado = isPrevistoHoje && !statusEtapa?.concluida && isAfterLimit;
        
        return {
          ...v,
          etapaLabel: ETAPA_LABELS[etapa] || etapa,
          dataPrevista,
          isPrevistoHoje,
          isAtrasado,
          isConcluidoHoje: statusEtapa?.timestamp_conclusao?.startsWith(today)
        };
      })
      .sort((a, b) => {
        if (a.isAtrasado && !b.isAtrasado) return -1;
        if (!a.isAtrasado && b.isAtrasado) return 1;
        if (a.isPrevistoHoje && !b.isPrevistoHoje) return -1;
        return 0;
      });
  }, [vagas, search, today, isAfterLimit]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Painel de Monitoramento</h1>
          <p className="text-slate-500 mt-1">Acompanhamento diário das atualizações de editais e cumprimento de prazos.</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold text-slate-700">{formatDate(today)}</span>
          <Badge variant="outline" className="ml-2 font-bold text-[10px] uppercase">
            {isAfterLimit ? 'Horário Limite Excedido (14h)' : 'Dentro do Horário Limite'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50/50 border-blue-100 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg"><ClipboardList className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Editais Ativos</p>
                <p className="text-2xl font-bold text-slate-800">{dailyStats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50/50 border-amber-100 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-lg"><Clock className="h-5 w-5 text-amber-600" /></div>
              <div>
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Previstos para Hoje</p>
                <p className="text-2xl font-bold text-slate-800">{dailyStats.previstosHoje}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50/50 border-green-100 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-xs font-bold text-green-600 uppercase tracking-wider">Atualizados Hoje</p>
                <p className="text-2xl font-bold text-slate-800">{dailyStats.atualizadosHoje}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`shadow-sm ${dailyStats.atrasados > 0 ? 'bg-red-50/50 border-red-100' : 'bg-slate-50/50 border-slate-100'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`${dailyStats.atrasados > 0 ? 'bg-red-100' : 'bg-slate-100'} p-2 rounded-lg`}>
                <AlertCircle className={`h-5 w-5 ${dailyStats.atrasados > 0 ? 'text-red-600' : 'text-slate-400'}`} />
              </div>
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider ${dailyStats.atrasados > 0 ? 'text-red-600' : 'text-slate-400'}`}>Pendentes/Atrasados</p>
                <p className={`text-2xl font-bold ${dailyStats.atrasados > 0 ? 'text-red-600' : 'text-slate-800'}`}>{dailyStats.atrasados}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-bold">Monitoramento de Atualizações</CardTitle>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar por cargo, unidade ou analista..." 
              className="pl-9 h-10 bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50/30 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="px-6 py-4 text-left">Processo / Cargo</th>
                  <th className="px-6 py-4 text-left">Unidade</th>
                  <th className="px-6 py-4 text-left">Analista Responsável</th>
                  <th className="px-6 py-4 text-left">Etapa Atual</th>
                  <th className="px-6 py-4 text-center">Data Prevista</th>
                  <th className="px-6 py-4 text-center">Status Hoje</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {monitoramentoItems.map((v) => (
                  <tr key={v.id} className={`border-b last:border-0 hover:bg-slate-50/50 transition-colors ${v.isAtrasado ? 'bg-red-50/20' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-mono text-[10px] text-primary font-bold">{v.numero_edital || v.numero_processo || v.requisicao}</span>
                        <span className="font-bold text-slate-700">{v.cargo}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-slate-600">{v.unidade}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-slate-600">{v.analista_responsavel}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="font-bold text-[10px] uppercase border-slate-200">
                        {v.etapaLabel}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`text-xs font-bold ${v.isPrevistoHoje ? 'text-amber-600' : 'text-slate-500'}`}>
                          {v.dataPrevista ? formatDate(v.dataPrevista) : '—'}
                        </span>
                        {v.isPrevistoHoje && <span className="text-[9px] font-black text-amber-500 uppercase">Hoje</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {v.isConcluidoHoje ? (
                        <div className="flex items-center justify-center gap-1.5 text-green-600 font-bold text-xs">
                          <CheckCircle2 className="h-4 w-4" />
                          Atualizado
                        </div>
                      ) : v.isAtrasado ? (
                        <div className="flex items-center justify-center gap-1.5 text-red-600 font-bold text-xs animate-pulse">
                          <AlertCircle className="h-4 w-4" />
                          Atrasado
                        </div>
                      ) : v.isPrevistoHoje ? (
                        <div className="flex items-center justify-center gap-1.5 text-amber-500 font-bold text-xs">
                          <Clock className="h-4 w-4" />
                          Pendente
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">Em andamento</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-primary font-bold text-xs gap-1.5"
                        onClick={() => navigate(`/vagas/${v.id}`)}
                      >
                        Ver Detalhes <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {monitoramentoItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <CheckCircle2 className="h-10 w-10 text-slate-200" />
                        <p className="text-slate-500 font-medium">Nenhum processo em acompanhamento ativo encontrado.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
