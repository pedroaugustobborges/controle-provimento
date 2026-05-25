import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Convocacao } from '@/types/vaga';
import { formatDate } from '@/lib/vagaUtils';
import { Calendar, Clock, User, Building2, Briefcase, FileText, MessageSquare, CheckCircle2, XCircle, Link } from 'lucide-react';

interface ConvocacaoDetalhesModalProps {
  convocacao: Convocacao | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEVOLUTIVA_LABELS: Record<string, string> = {
  aceitou: 'Aceitou',
  recusou: 'Recusou',
};

const MOTIVO_RECUSA_LABELS: Record<string, string> = {
  recusa_unidade: 'Recusa de Unidade',
  recusa_horario: 'Recusa de Horário',
  recusa_plantao: 'Recusa de Plantão',
  outros: 'Outros',
};

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

export function ConvocacaoDetalhesModal({ convocacao, open, onOpenChange }: ConvocacaoDetalhesModalProps) {
  if (!convocacao) return null;

  const devolutivaColor =
    convocacao.devolutiva === 'aceitou'
      ? 'bg-green-100 text-green-700 border-green-200'
      : convocacao.devolutiva === 'recusou'
      ? 'bg-red-100 text-red-700 border-red-200'
      : 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-800">Detalhes da Convocação</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Candidato + Status */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-bold text-base text-slate-900">{convocacao.nome_candidato}</p>
              <p className="text-sm text-slate-500">{convocacao.tipo_convocacao} · {convocacao.classificacao}º colocado</p>
            </div>
            <Badge variant="outline" className="text-[11px] font-bold shrink-0">
              {String(convocacao.status || 'SEM STATUS').toUpperCase()}
            </Badge>
          </div>

          <Separator />

          {/* Data e horário */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
              <div className="space-y-0.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Data</p>
                <p className="text-sm font-medium text-slate-800">{formatDate(convocacao.data_convocacao)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400 shrink-0" />
              <div className="space-y-0.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Horário</p>
                <p className="text-sm font-medium text-slate-800">{convocacao.horario || '—'}</p>
              </div>
            </div>
          </div>

          {/* Cargo e Unidade */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-slate-400 shrink-0" />
              <div className="space-y-0.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Cargo</p>
                <p className="text-sm font-medium text-slate-800">{convocacao.cargo}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
              <div className="space-y-0.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Unidade</p>
                <p className="text-sm font-medium text-slate-800">{convocacao.unidade}</p>
              </div>
            </div>
          </div>

          {/* Detalhes adicionais */}
          <div className="grid grid-cols-2 gap-4">
            <DetailRow label="Seção" value={convocacao.secao} />
            <DetailRow label="Carga Horária" value={convocacao.carga_horaria} />
            <DetailRow label="Horário de Trabalho" value={convocacao.horario_trabalho} />
            <DetailRow label="Requisição" value={convocacao.requisicao} />
            <DetailRow label="E-doc" value={convocacao.edoc} />
            <DetailRow label="Responsável" value={convocacao.responsavel} />
            <DetailRow label="Edital Relacionado" value={convocacao.edital_relacionado} />
            <DetailRow label="Banco Relacionado" value={convocacao.banco_relacionado} />
          </div>

          {/* Devolutiva */}
          {convocacao.devolutiva && (
            <>
              <Separator />
              <div className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Devolutiva do Candidato</p>
                <div className="flex items-center gap-2">
                  {convocacao.devolutiva === 'aceitou' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <Badge variant="outline" className={`text-[11px] font-bold ${devolutivaColor}`}>
                    {DEVOLUTIVA_LABELS[convocacao.devolutiva]}
                  </Badge>
                  {convocacao.motivo_recusa && (
                    <span className="text-xs text-slate-500">— {MOTIVO_RECUSA_LABELS[convocacao.motivo_recusa]}</span>
                  )}
                </div>
                {convocacao.observacao_devolutiva && (
                  <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{convocacao.observacao_devolutiva}</p>
                )}
              </div>
            </>
          )}

          {/* Observações */}
          {convocacao.observacoes && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Observações</p>
                </div>
                <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{convocacao.observacoes}</p>
              </div>
            </>
          )}

          {/* Link Teams */}
          {convocacao.link_teams && (
            <div className="flex items-center gap-2">
              <Link className="h-3.5 w-3.5 text-primary" />
              <a
                href={convocacao.link_teams}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline font-medium"
              >
                Link da Entrevista (Teams)
              </a>
            </div>
          )}

          {/* Resultado final */}
          {convocacao.resultado_final && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Resultado Final</p>
              <p className="text-sm font-medium text-slate-800">{convocacao.resultado_final}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
