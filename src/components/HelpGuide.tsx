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

const GUIDES: Record<string, GuideSection[]> = {
  "/vagas": [
    {
      title: "Todas as Vagas",
      description: "Aqui você visualiza todas as requisições de vagas da unidade. É o ponto central para gestão do provimento.",
      currentStage: "Abertura da Requisição",
      nextStage: "Análise e Elaboração de Edital"
    },
    {
      title: "Acompanhamento do Edital",
      description: "Nesta aba, você monitora o progresso dos editais que já foram publicados e estão em fase de seleção.",
      currentStage: "Publicação do Edital",
      nextStage: "Triagem e Avaliações"
    }
  ],
  "/fila-analista-edital": [
    {
      title: "Redação do Edital",
      description: "Espaço para o analista redigir o edital baseado nas informações da vaga.",
      currentStage: "Redação do Conteúdo",
      nextStage: "Validação Interna"
    }
  ],
  "/validacao-editais": [
    {
      title: "Validação de Edital",
      description: "Os gestores revisam e validam os editais redigidos antes da publicação oficial.",
      currentStage: "Revisão Final",
      nextStage: "Publicação no Site"
    }
  ]
};

export function HelpGuide() {
  const location = useLocation();
  const currentPath = location.pathname;
  const searchParams = new URLSearchParams(location.search);
  const tab = searchParams.get('tab');
  
  // Custom logic for tabs if needed
  const sections = GUIDES[currentPath] || [];

  if (sections.length === 0) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 border-blue-200 bg-blue-50/50 hover:bg-blue-100 text-blue-700 font-bold h-10 px-4 rounded-xl shadow-sm transition-all"
        >
          <HelpCircle className="h-4 w-4" />
          Como usar este menu?
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] border-none shadow-2xl bg-slate-50">
        <DialogHeader className="space-y-3 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Lightbulb className="h-5 w-5 text-blue-600" />
            </div>
            <DialogTitle className="text-xl font-black text-slate-800 tracking-tight">Guia de Uso</DialogTitle>
          </div>
          <DialogDescription className="text-slate-500 font-medium">
            Entenda como funciona cada etapa deste menu e o que vem a seguir no processo.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          {sections.map((section, idx) => (
            <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 font-bold border-none">
                  {section.title}
                </Badge>
              </div>
              
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                {section.description}
              </p>
              
              {(section.currentStage || section.nextStage) && (
                <div className="flex items-center justify-between gap-3 pt-2 bg-slate-50/50 p-3 rounded-xl border border-dashed border-slate-200">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Etapa Atual</span>
                    <span className="text-xs font-bold text-slate-700">{section.currentStage}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300" />
                  <div className="flex flex-col gap-1 text-right">
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Próxima Etapa</span>
                    <span className="text-xs font-bold text-blue-600">{section.nextStage}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex gap-3">
          <Info className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-800 font-medium leading-relaxed">
            Dica: Utilize os filtros no topo da página para refinar os resultados e focar no que é prioritário para sua unidade.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
