import { useVagasStore } from '@/store/vagasStore';
import { Card, CardContent } from '@/components/ui/card';
import { getValidacaoColor, formatDate } from '@/lib/vagaUtils';
import { CheckCircle2, XCircle, Minus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ValidacaoPage() {
  const { vagas, validacoes } = useVagasStore();
  const navigate = useNavigate();

  const validacoesComVaga = validacoes.map((v) => ({
    ...v,
    vaga: vagas.find((vg) => vg.id === v.vaga_id),
  }));

  const checklistKeys = [
    { key: 'salario_confere', label: 'Salário' },
    { key: 'requisitos_confere', label: 'Requisitos' },
    { key: 'atribuicoes_confere', label: 'Atribuições' },
    { key: 'site_confere', label: 'Site' },
    { key: 'datas_conferem', label: 'Datas' },
    { key: 'vaga_correta_para_edital', label: 'Vaga/Edital' },
    { key: 'planilha_correta', label: 'Planilha' },
  ];

  const getIcon = (val: boolean | null) => {
    if (val === true) return <CheckCircle2 className="h-4 w-4 text-success" />;
    if (val === false) return <XCircle className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Validação de Editais</h2>
      <div className="space-y-3">
        {validacoesComVaga.map((v) => (
          <Card key={v.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/vagas/${v.vaga_id}`)}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-medium text-sm">{v.vaga?.cargo || '—'}</h3>
                  <p className="text-xs text-muted-foreground">{v.vaga?.numero_requisicao} · {v.vaga?.unidade}</p>
                </div>
                <span className={`status-badge ${getValidacaoColor(v.status_validacao)}`}>
                  {v.status_validacao === 'pendente' ? 'Pendente' : v.status_validacao === 'aprovado' ? 'Aprovado' : 'Reprovado'}
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {checklistKeys.map((ck) => (
                  <div key={ck.key} className="flex items-center gap-1.5">
                    {getIcon(v[ck.key as keyof typeof v] as boolean | null)}
                    <span className="text-xs text-muted-foreground">{ck.label}</span>
                  </div>
                ))}
              </div>
              {v.observacoes_validacao && (
                <p className="text-xs text-muted-foreground mt-2 italic">"{v.observacoes_validacao}"</p>
              )}
              {v.validado_por && (
                <p className="text-[10px] text-muted-foreground mt-1">Validado por {v.validado_por} em {formatDate(v.data_validacao || '')}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
