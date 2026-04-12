import { useVagasStore } from '@/store/vagasStore';
import { useAdminStore } from '@/store/adminStore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ETAPA_LABELS } from '@/types/vaga';
import { getEtapaColor, getPublicacaoColor, formatDate, filterByRegionAndUnit } from '@/lib/vagaUtils';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


export default function EditaisPage() {
  const { vagas, editais } = useVagasStore();
  const { currentUser, selectedRegion, selectedUnit } = useAdminStore();
  const navigate = useNavigate();

  const editaisComVaga = useMemo(() => {
    const filteredVagas = filterByRegionAndUnit(vagas, selectedRegion, selectedUnit);
    const filteredVagaIds = new Set(filteredVagas.map(v => v.id));
    
    return editais
      .filter(e => filteredVagaIds.has(e.vaga_id))
      .map((e) => ({
        ...e,
        vaga: filteredVagas.find((v) => v.id === e.vaga_id),
      }))
      .filter(e => {
        // Unit access restriction
        if (!e.vaga) return false;
        if (!currentUser?.visualiza_todas_unidades && !currentUser?.unidades_vinculadas.includes(e.vaga.unidade)) {
          return false;
        }
        return true;
      });
  }, [editais, vagas, currentUser, selectedRegion, selectedUnit]);

  return (
    <div className="space-y-4">
      <PageHeader 
        title="Editais e Publicações"
      />


      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cargo / Unidade</TableHead>
                  <TableHead>Nº Processo</TableHead>
                  <TableHead>Nº Edital</TableHead>
                  <TableHead>Abertura</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Publicação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editaisComVaga.map((e) => (
                  <TableRow
                    key={e.id}
                    className="cursor-pointer transition-colors"
                    onClick={() => navigate(`/vagas/${e.vaga_id}`)}
                  >
                    <TableCell>
                      <div className="font-semibold text-slate-800">{e.vaga?.cargo || '—'}</div>
                      <div className="text-[11px] text-slate-500">{e.vaga?.unidade || '—'}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-700">{e.numero_processo || '—'}</TableCell>
                    <TableCell className="font-mono text-xs text-primary font-bold">{e.numero_edital || '—'}</TableCell>
                    <TableCell className="text-xs text-slate-600">{formatDate(e.data_abertura_edital)}</TableCell>
                    <TableCell>
                      <Badge className={`${getEtapaColor(e.etapa_atual)} font-bold text-[11px]`}>{ETAPA_LABELS[e.etapa_atual]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getPublicacaoColor(e.status_publicacao)} font-bold text-[11px]`}>
                        {e.status_publicacao === 'pendente' ? 'Pendente' : e.status_publicacao === 'publicado' ? 'Publicado' : 'Encerrado'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="font-bold text-xs text-primary hover:bg-primary/5">Ver Vaga</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {editaisComVaga.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Nenhum edital registrado ou visível para sua unidade.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
