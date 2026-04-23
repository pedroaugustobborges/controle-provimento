import { HelpCircle, Info, ArrowRight, Lightbulb } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "react-router-dom";

interface GuideSection {
  title: string;
  description: string;
  currentStage?: string;
  nextStage?: string;
}

const GUIDES: Record<string, Record<string, GuideSection[]>> = {
  "/vagas": {
    "default": [
      {
        title: "Todas as Vagas",
        description: "Aqui você visualiza todas as requisições de vagas da unidade. É o ponto central para gestão do provimento.",
        currentStage: "Abertura da Requisição",
        nextStage: "Análise e Elaboração de Edital"
      }
    ],
    "acompanhamento": [
      {
        title: "Acompanhamento do Edital",
        description: "Nesta aba, você monitora o progresso dos editais que já foram publicados e estão em andamento.",
        currentStage: "Publicação do Edital",
        nextStage: "Triagem e Avaliações"
      }
    ]
  },
  "/fila-editais": {
    "default": [
      {
        title: "Fila de Editais",
        description: "Vagas aguardando redação e publicação de novo edital. A unidade valida os dados e encaminha para o analista.",
        currentStage: "Validação pela Unidade",
        nextStage: "Redação do Edital"
      }
    ]
  },
  "/fila-analista-edital": {
    "default": [
      {
        title: "Redação do Edital",
        description: "Espaço para o analista redigir o edital baseado nas informações da vaga.",
        currentStage: "Redação do Conteúdo",
        nextStage: "Validação de Edital"
      }
    ]
  },
  "/validacao-editais": {
    "default": [
      {
        title: "Validação de Edital",
        description: "O analista administrativo revisa e valida os editais redigidos. Após a validação, o edital segue para Validados/Histórico.",
        currentStage: "Validação pelo Analista Administrativo",
        nextStage: "Validados / Histórico"
      }
    ]
  }
};

export function HelpGuide({ activeTab }: { activeTab?: string } = {}) {
  const location = useLocation();
  const currentPath = location.pathname;
  const searchParams = new URLSearchParams(location.search);
  const tab = activeTab || searchParams.get('tab') || 'default';
  
  const pathGuides = GUIDES[currentPath] || {};
  const sections = pathGuides[tab] || pathGuides['default'] || [];

  if (sections.length === 0) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button 
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-blue-800 font-medium transition-colors cursor-pointer bg-transparent border-none p-0"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          Como usar este menu?
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] border-none shadow-2xl bg-muted/30">
        <DialogHeader className="space-y-3 pb-4 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Lightbulb className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-xl font-black text-foreground tracking-tight">Guia de Uso</DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground font-medium">
            Entenda como funciona cada etapa deste menu e o que vem a seguir no processo.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          {sections.map((section, idx) => (
            <div key={idx} className="bg-white p-5 rounded-2xl border border-border/60 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 font-bold border-none">
                  {section.title}
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                {section.description}
              </p>
              
              {(section.currentStage || section.nextStage) && (
                <div className="flex items-center justify-between gap-3 pt-2 bg-muted/30/50 p-3 rounded-xl border border-dashed border-border/60">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/80">Etapa Atual</span>
                    <span className="text-xs font-bold text-slate-700">{section.currentStage}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300" />
                  <div className="flex flex-col gap-1 text-right">
                    <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/80">Próxima Etapa</span>
                    <span className="text-xs font-bold text-primary">{section.nextStage}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex gap-3">
          <Info className="h-5 w-5 text-success shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-800 font-medium leading-relaxed">
            Dica: Utilize os filtros no topo da página para refinar os resultados e focar no que é prioritário para sua unidade.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
