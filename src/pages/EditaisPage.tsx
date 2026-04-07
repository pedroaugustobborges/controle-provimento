import { useVagasStore } from '@/store/vagasStore';
import { useAdminStore } from '@/store/adminStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { ETAPA_LABELS } from '@/types/vaga';
import { getEtapaColor, getPublicacaoColor, formatDate } from '@/lib/vagaUtils';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';

export default function EditaisPage() {
  const { vagas, editais } = useVagasStore();
  const { currentUser } = useAdminStore();
  const navigate = useNavigate();

  const editaisComVaga = useMemo(() => {
    return editais.map((e) => ({
      ...e,
      vaga: vagas.find((v) => v.id === e.vaga_id),
    })).filter(e => {
      // Unit access restriction
      if (!e.vaga) return false; // Filter out editais without a linked vaga
      if (!currentUser?.visualiza_todas_unidades && !currentUser?.unidades_vinculadas.includes(e.vaga.unidade)) {
        return false;
      }
      return true;
    });
  }, [editais, vagas, currentUser]);

  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold tracking-tight text-foreground/90">Editais e Publicações</h2>
      <p className="text-muted-foreground text-sm font-medium">Gerencie o fluxo de editais de seleção e publicações.</p>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50/80 whitespace-nowrap">
                  <th className="text-left p-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Cargo / Unidade</th>
                  <th className="text-left p-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Nº Processo</th>
                  <th className="text-left p-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Nº Edital</th>
                  <th className="text-left p-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Abertura</th>
                  <th className="text-left p-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Etapa</th>
                  <th className="text-left p-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Publicação</th>
                  <th className="text-right p-3 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody>
                {editaisComVaga.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b last:border-0 hover:bg-slate-50/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/vagas/${e.vaga_id}`)}
                  >
                    <td className="p-3">
                      <div className="font-semibold text-slate-800">{e.vaga?.cargo || '—'}</div>
                      <div className="text-[10px] text-slate-500">{e.vaga?.unidade || '—'}</div>
                    </td>
                    <td className="p-3 font-mono text-xs text-slate-700">{e.numero_processo || '—'}</td>
                    <td className="p-3 font-mono text-xs text-primary font-bold">{e.numero_edital || '—'}</td>
                    <td className="p-3 text-xs text-slate-600">{formatDate(e.data_abertura_edital)}</td>
                    <td className="p-3">
                      <Badge className={`${getEtapaColor(e.etapa_atual)} font-bold text-[10px]`}>{ETAPA_LABELS[e.etapa_atual]}</Badge>
                    </td>
                    <td className="p-3">
                      <Badge className={`${getPublicacaoColor(e.status_publicacao)} font-bold text-[10px]`}>
                        {e.status_publicacao === 'pendente' ? 'Pendente' : e.status_publicacao === 'publicado' ? 'Publicado' : 'Encerrado'}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="sm" className="font-bold text-xs text-primary hover:bg-primary/5">Ver Vaga</Button>
                    </td>
                  </tr>
                ))}
                {editaisComVaga.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum edital registrado ou visível para sua unidade.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
