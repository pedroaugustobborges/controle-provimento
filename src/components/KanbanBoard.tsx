import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  User, Clock, CheckCircle, MessageSquare, Paperclip, Activity, 
  MoreHorizontal, Edit, AlertCircle, Phone, XCircle, Info, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Convocacao, StatusConvocacao, STATUS_CONVOCACAO_LABELS } from '@/types/vaga';
import { 
  DndContext, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { useVagasStore } from '@/store/vagasStore';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate } from '@/lib/vagaUtils';

interface KanbanColumnProps {
  id: string;
  title: string;
  icon: React.ElementType;
  count: number;
  color: string;
  children: React.ReactNode;
}

const KanbanColumn = ({ id, title, icon: Icon, count, color, children }: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className={`flex flex-col min-w-[200px] flex-1 h-full bg-muted/30/50 rounded-xl border transition-colors ${isOver ? 'border-primary/50 bg-primary/5' : 'border-border/60/50'}`}>
      <div className="p-4 flex items-center justify-between border-b border-border/60/50 bg-white/50 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${color} bg-opacity-10`}>
            <Icon className={`h-4 w-4 ${color.replace('bg-', 'text-')}`} />
          </div>
          <h3 className="font-bold text-sm text-slate-700 uppercase tracking-tight">{title}</h3>
          <Badge variant="secondary" className="ml-2 bg-slate-200/50 text-muted-foreground font-bold text-[10px] h-5 px-1.5">
            {count}
          </Badge>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/80">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>
      <div ref={setNodeRef} className="p-3 flex flex-col gap-3 overflow-y-auto scrollbar-hide flex-1">
        {children}
      </div>
    </div>
  );
};

interface KanbanCardProps {
  convocacao: Convocacao;
  onEdit: (conv: Convocacao) => void;
}

const SortableKanbanCard = ({ convocacao, onEdit }: KanbanCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: convocacao.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className="shadow-sm hover:shadow-md transition-all duration-200 border-border/60 cursor-grab active:cursor-grabbing group bg-white">
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
              <h4 className="font-bold text-sm text-foreground leading-tight group-hover:text-primary transition-colors">
                {convocacao.nome_candidato}
              </h4>
              <span className="text-[11px] text-muted-foreground font-medium mt-0.5">{convocacao.cargo}</span>
            </div>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-1.5 text-[9px] font-bold text-muted-foreground/80 hover:text-primary gap-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(convocacao);
                }}
              >
                <Edit className="h-3 w-3" />
                <span className="hidden group-hover:inline">Devolutiva</span>
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/80">
            {convocacao.horario && (
              <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/20 bg-primary/5 px-1.5 h-4">
                {convocacao.horario}
              </Badge>
            )}
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{formatDate(convocacao.data_convocacao)}</span>
            </div>
            <span>•</span>
            <span className="truncate">{convocacao.unidade}</span>
          </div>

          <div className="flex flex-wrap gap-1">
            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-muted-foreground text-[9px] font-bold">
              {convocacao.tipo_convocacao}
            </span>
            {convocacao.classificacao === 1 && (
              <Badge className="bg-destructive/10 text-destructive border-none text-[9px] font-bold h-4 px-1 uppercase tracking-tighter">
                1º Lugar
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface KanbanBoardProps {
  convocacoes: Convocacao[];
}

export function KanbanBoard({ convocacoes: initialConvocacoes }: KanbanBoardProps) {
  const updateConvocacao = useVagasStore(state => state.updateConvocacao);
  const permissions = usePermissions();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [movingConvocacao, setMovingConvocacao] = useState<Convocacao | null>(null);
  const [editingConvocacao, setEditingConvocacao] = useState<Convocacao | null>(null);
  const [targetStatus, setTargetStatus] = useState<StatusConvocacao | 'recusa' | null>(null);
  const [moveDetails, setMoveDetails] = useState({
    recusaType: 'recusa_plantao' as StatusConvocacao,
    observations: ''
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const columns = [
    { id: 'pendente', title: 'Convocações do Dia', icon: Clock, color: 'bg-blue-500' },
    { id: 'aceite', title: 'Aceite', icon: Activity, color: 'bg-green-500' },
    { id: 'faltou', title: 'Faltou', icon: XCircle, color: 'bg-red-500' },
    { id: 'desistiu', title: 'Desistiu', icon: Paperclip, color: 'bg-orange-500' },
    { id: 'recusa', title: 'Recusa', icon: AlertCircle, color: 'bg-purple-500' },
  ];

  const getItemsForColumn = (columnId: string) => {
    if (columnId === 'recusa') {
      return initialConvocacoes.filter(c => 
        c.status === 'recusa_plantao' || 
        c.status === 'recusa_unidade' || 
        c.status === 'recusa_horario'
      );
    }
    return initialConvocacoes.filter(c => c.status === columnId);
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event: any) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const conv = initialConvocacoes.find(c => c.id === activeId);
    if (!conv) return;

    // Check if dropped over a column directly or over a card in a column
    const columnIds = columns.map(c => c.id);
    let targetColId: string;
    
    if (columnIds.includes(overId)) {
      // Dropped directly on a column
      targetColId = overId;
    } else {
      // Dropped on a card — find which column that card belongs to
      const overItem = initialConvocacoes.find(c => c.id === overId);
      if (!overItem) return;
      targetColId = overItem.status;
      // Normalize recusa statuses to the 'recusa' column
      if (['recusa_plantao', 'recusa_unidade', 'recusa_horario'].includes(targetColId)) {
        targetColId = 'recusa';
      }
    }

    // If current status matches target (considering recusa grouping), do nothing
    const currentBaseStatus = ['recusa_plantao', 'recusa_unidade', 'recusa_horario'].includes(conv.status) ? 'recusa' : conv.status;
    
    if (currentBaseStatus !== targetColId) {
      setMovingConvocacao(conv);
      setTargetStatus(targetColId as any);
      setMoveDetails({
        recusaType: 'recusa_plantao',
        observations: ''
      });
      setIsMoveDialogOpen(true);
    }
  };

  const confirmMove = () => {
    if (!movingConvocacao || !targetStatus) return;

    let finalStatus: StatusConvocacao = targetStatus === 'recusa' 
      ? moveDetails.recusaType 
      : targetStatus as StatusConvocacao;

    updateConvocacao(movingConvocacao.id, {
      status: finalStatus,
      observacoes: moveDetails.observations 
        ? `${movingConvocacao.observacoes}\n[${new Date().toLocaleDateString()}]: ${moveDetails.observations}`
        : movingConvocacao.observacoes
    });

    toast.success(`Status de ${movingConvocacao.nome_candidato} atualizado para ${STATUS_CONVOCACAO_LABELS[finalStatus]}`);
    setIsMoveDialogOpen(false);
    setMovingConvocacao(null);
  };

  const activeConvocacao = activeId ? initialConvocacoes.find(c => c.id === activeId) : null;

  return (
    <div className="flex gap-6 overflow-x-auto pb-6 h-[calc(100vh-280px)] min-h-[500px]">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {columns.map(col => (
          <KanbanColumn 
            key={col.id}
            id={col.id}
            title={col.title}
            icon={col.icon}
            count={getItemsForColumn(col.id).length}
            color={col.color}
          >
            <SortableContext
              id={col.id}
              items={getItemsForColumn(col.id).map(c => c.id)}
              strategy={verticalListSortingStrategy}
            >
              {getItemsForColumn(col.id).map(conv => (
                <SortableKanbanCard 
                  key={conv.id} 
                  convocacao={conv} 
                  onEdit={(c) => {
                    setEditingConvocacao(c);
                    setIsEditModalOpen(true);
                  }}
                />
              ))}
            </SortableContext>
            {getItemsForColumn(col.id).length === 0 && (
              <div className="h-24 flex items-center justify-center border-2 border-dashed border-border/60 rounded-lg text-muted-foreground/80 text-xs italic">
                Solte aqui para mover
              </div>
            )}
          </KanbanColumn>
        ))}

        <DragOverlay>
          {activeConvocacao ? (
            <Card className="shadow-lg border-primary/30 w-[296px] bg-white opacity-90 scale-105 pointer-events-none">
              <CardContent className="p-4 space-y-2">
                <h4 className="font-bold text-sm text-foreground">{activeConvocacao.nome_candidato}</h4>
                <p className="text-[10px] text-muted-foreground">{activeConvocacao.cargo}</p>
              </CardContent>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modal de Movimentação */}
      <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Atualizar Status
            </DialogTitle>
            <DialogDescription>
              Você está movendo o candidato <strong>{movingConvocacao?.nome_candidato}</strong> para 
              <Badge variant="outline" className="ml-1 bg-muted/30">
                {targetStatus === 'recusa' ? 'Recusa' : targetStatus ? STATUS_CONVOCACAO_LABELS[targetStatus as StatusConvocacao] : ''}
              </Badge>
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {targetStatus === 'recusa' && (
              <div className="grid gap-2">
                <Label htmlFor="recusa-type">Tipo de Recusa</Label>
                <Select 
                  value={moveDetails.recusaType} 
                  onValueChange={(v: any) => setMoveDetails(prev => ({ ...prev, recusaType: v }))}
                >
                  <SelectTrigger id="recusa-type">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recusa_plantao">Recusa Plantão</SelectItem>
                    <SelectItem value="recusa_unidade">Recusa Unidade</SelectItem>
                    <SelectItem value="recusa_horario">Recusa Horário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="grid gap-2">
              <Label htmlFor="observations">Observações / Justificativa</Label>
              <Textarea 
                id="observations"
                placeholder="Adicione detalhes sobre essa movimentação..."
                value={moveDetails.observations}
                onChange={(e) => setMoveDetails(prev => ({ ...prev, observations: e.target.value }))}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMoveDialogOpen(false)}>Cancelar</Button>
            <Button onClick={confirmMove}>Confirmar Alteração</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição Rápida */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              Editar Convocação
            </DialogTitle>
          </DialogHeader>
          
          {editingConvocacao && (
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground/80 uppercase">Candidato</Label>
                  <p className="text-sm font-semibold">{editingConvocacao.nome_candidato}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground/80 uppercase">Status Atual</Label>
                  <Badge variant="outline">{STATUS_CONVOCACAO_LABELS[editingConvocacao.status]}</Badge>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-obs">Observações do Histórico</Label>
                <Textarea 
                  id="edit-obs"
                  className="min-h-[150px] text-xs font-medium leading-relaxed"
                  value={editingConvocacao.observacoes}
                  onChange={(e) => setEditingConvocacao({ ...editingConvocacao, observacoes: e.target.value })}
                />
              </div>
              
              <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg border border-border/40">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="h-4 w-4" />
                  Para alterar dados básicos, use o formulário principal.
                </div>
                {permissions.canDeleteRecords() && (
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="h-8 gap-1.5"
                    onClick={() => {
                      useVagasStore.getState().deleteConvocacao(editingConvocacao.id);
                      setIsEditModalOpen(false);
                      toast.success('Convocação removida');
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </Button>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              if (editingConvocacao) {
                updateConvocacao(editingConvocacao.id, { observacoes: editingConvocacao.observacoes });
                toast.success('Observações atualizadas');
              }
              setIsEditModalOpen(false);
            }}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
