import React from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, User, Calendar, FileText, Database } from 'lucide-react';
import { Vaga } from '@/types/vaga';
import { formatDate } from '@/lib/vagaUtils';

interface VagaHistoryDialogProps {
  vaga: Vaga | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VagaHistoryDialog({ vaga, open, onOpenChange }: VagaHistoryDialogProps) {
  if (!vaga) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Histórico Completo da Vaga
          </DialogTitle>
          <DialogDescription>
            Trilha cronológica e auditoria da requisição #{vaga.requisicao || vaga.numero_requisicao}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-wrap gap-4 py-3 border-b mb-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black text-muted-foreground/80 uppercase">Origem</span>
            <Badge variant={vaga.origem === 'manual' ? 'default' : 'outline'} className="w-fit text-[10px] font-bold uppercase">
              {vaga.origem === 'manual' ? 'Manual' : 'Importada'}
            </Badge>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black text-muted-foreground/80 uppercase">Data de Criação</span>
            <span className="text-xs font-bold text-slate-700">{formatDate(vaga.data_criacao || vaga.data_abertura)}</span>
          </div>
          {vaga.origem_importacao && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-muted-foreground/80 uppercase">Arquivo de Origem</span>
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <FileText className="h-3 w-3" /> {vaga.origem_importacao}
              </span>
            </div>
          )}
        </div>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 relative before:absolute before:inset-0 before:left-2.5 before:w-0.5 before:bg-slate-100 pb-4">
            {vaga.historico.slice().reverse().map((h, idx) => (
              <div key={h.id} className="flex gap-4 items-start relative pl-8">
                <div className={`absolute left-0 w-5 h-5 rounded-full border-2 border-white shadow-sm z-10 ${idx === 0 ? 'bg-primary ring-4 ring-primary/10' : 'bg-slate-300'}`} />
                <div className="flex flex-col flex-1 bg-white border border-border/40 rounded-lg p-3 shadow-sm hover:border-primary/20 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-black text-foreground leading-tight">{h.descricao}</span>
                    <span className="text-[9px] font-bold text-muted-foreground/80 uppercase bg-muted/30 px-1.5 py-0.5 rounded">{formatDate(h.data)}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase">
                      <User className="h-3 w-3" />
                      {h.usuario}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
