import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle, Send } from 'lucide-react';
import { toast } from 'sonner';

interface RequestUpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recordId: string;
  recordTitle: string;
  type: 'vaga' | 'banco';
  onConfirm: (recordId: string, description: string) => void;
}

export function RequestUpdateDialog({ isOpen, onClose, recordId, recordTitle, type, onConfirm }: RequestUpdateDialogProps) {
  const [description, setDescription] = useState('');

  const handleConfirm = () => {
    if (!description.trim()) {
      toast.error('Por favor, descreva o que precisa ser atualizado.');
      return;
    }
    onConfirm(recordId, description);
    setDescription('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Solicitar Atualização
          </DialogTitle>
          <DialogDescription>
            Descreva detalhadamente o que precisa ser alterado ou atualizado no registro <strong>{recordTitle}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="description" className="font-bold text-slate-700">O que precisa ser atualizado?</Label>
            <Textarea
              id="description"
              placeholder="Ex: Atualizar número de vagas, alterar status para pausado, corrigir unidade..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[120px] resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm} className="gap-2">
            <Send className="h-4 w-4" />
            Enviar Solicitação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
