import { useVagasStore } from '@/store/vagasStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { ETAPA_LABELS } from '@/types/vaga';
import { getEtapaColor, getPublicacaoColor, formatDate } from '@/lib/vagaUtils';
import { useNavigate } from 'react-router-dom';

export default function EditaisPage() {
  const { vagas, editais } = useVagasStore();
  const navigate = useNavigate();

  const editaisComVaga = editais.map((e) => ({
    ...e,
    vaga: vagas.find((v) => v.id === e.vaga_id),
  }));

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Editais e Publicações</h2>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Cargo</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Nº Processo</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Nº Edital</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Abertura</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Prova</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Entrevista</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Etapa</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Inscritos</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Publicação</th>
                </tr>
              </thead>
              <tbody>
                {editaisComVaga.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b last:border-0 hover:bg-muted/20 cursor-pointer transition-colors"
                    onClick={() => navigate(`/vagas/${e.vaga_id}`)}
                  >
                    <td className="p-3 font-medium">{e.vaga?.cargo || '—'}</td>
                    <td className="p-3 font-mono text-xs">{e.numero_processo || '—'}</td>
                    <td className="p-3 font-mono text-xs">{e.numero_edital || '—'}</td>
                    <td className="p-3 text-xs">{formatDate(e.data_abertura_edital)}</td>
                    <td className="p-3 text-xs">{formatDate(e.data_prova || '')}</td>
                    <td className="p-3 text-xs">{formatDate(e.data_entrevista || '')}</td>
                    <td className="p-3">
                      <span className={`status-badge ${getEtapaColor(e.etapa_atual)}`}>{ETAPA_LABELS[e.etapa_atual]}</span>
                    </td>
                    <td className="p-3 text-center">{e.total_inscritos}</td>
                    <td className="p-3">
                      <span className={`status-badge ${getPublicacaoColor(e.status_publicacao)}`}>
                        {e.status_publicacao === 'pendente' ? 'Pendente' : e.status_publicacao === 'publicado' ? 'Publicado' : 'Encerrado'}
                      </span>
                    </td>
                  </tr>
                ))}
                {editaisComVaga.length === 0 && (
                  <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Nenhum edital registrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
