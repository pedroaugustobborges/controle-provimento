import { KanbanBoard } from '@/components/KanbanBoard';
import { Button } from '@/components/ui/button';
import { Plus, Search, Filter, Download, LayoutGrid, List } from 'lucide-react';
import { useState } from 'react';

export default function ConvocacoesPage() {
  const [view, setView] = useState<'kanban' | 'list'>('kanban');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground/90">Convocações</h1>
          <p className="text-muted-foreground">Consulta rápida e acompanhamento do fluxo de admissão.</p>
        </div>
        <div className="flex items-center gap-2">
           <div className="flex bg-muted p-1 rounded-lg">
              <Button 
                variant={view === 'kanban' ? 'ghost' : 'ghost'} 
                size="sm" 
                className={`h-8 px-3 text-xs font-bold gap-1 ${view === 'kanban' ? 'bg-white shadow-sm hover:bg-white text-primary' : 'text-muted-foreground'}`}
                onClick={() => setView('kanban')}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Quadro
              </Button>
              <Button 
                variant={view === 'list' ? 'ghost' : 'ghost'} 
                size="sm" 
                className={`h-8 px-3 text-xs font-bold gap-1 ${view === 'list' ? 'bg-white shadow-sm hover:bg-white text-primary' : 'text-muted-foreground'}`}
                onClick={() => setView('list')}
              >
                <List className="h-3.5 w-3.5" /> Lista
              </Button>
           </div>
           <Button className="h-9 gap-2 text-xs font-bold">
              <Plus className="h-4 w-4" /> Nova Convocação
           </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-3 bg-white/50 p-3 rounded-xl border border-slate-200/50 backdrop-blur-sm shadow-sm">
        <div className="relative flex-1 w-full">
           <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
           <input 
              type="text" 
              placeholder="Consulta rápida: candidato, cargo ou unidade..." 
              className="w-full pl-10 pr-4 h-9 text-sm rounded-lg bg-background border border-slate-200/60 focus:ring-1 focus:ring-primary/20 focus:border-primary/40 transition-all outline-none"
           />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
           <Button variant="outline" className="h-9 px-4 gap-2 text-xs font-bold text-slate-600 bg-white">
              <Filter className="h-3.5 w-3.5" /> Filtros
           </Button>
           <Button variant="outline" className="h-9 px-4 gap-2 text-xs font-bold text-slate-600 bg-white">
              <Download className="h-3.5 w-3.5" /> Exportar
           </Button>
        </div>
      </div>

      <div className="mt-2 h-full">
        {view === 'kanban' ? (
          <KanbanBoard />
        ) : (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200 border-dashed">
             <p className="text-slate-400 font-medium">Visualização em lista em desenvolvimento...</p>
          </div>
        )}
      </div>
    </div>
  );
}