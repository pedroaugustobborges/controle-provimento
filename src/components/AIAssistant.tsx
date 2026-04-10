import { Bot, Sparkles, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVagasStore } from '@/store/vagasStore';
import { cn } from '@/lib/utils';

export function AIAssistant() {
  const { temNovasMensagens } = useVagasStore();

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {temNovasMensagens && (
        <div className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white"></span>
        </div>
      )}
      <Button 
        className={cn(
          "h-12 w-12 rounded-full shadow-lg p-0 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group",
          temNovasMensagens 
            ? "bg-[#DC2626] animate-pulse ring-4 ring-red-500/20" 
            : "bg-slate-500 hover:bg-slate-600"
        )}
      >
        {temNovasMensagens ? (
          <MessageCircle className="h-6 w-6 text-white" />
        ) : (
          <>
            <Bot className="h-6 w-6 group-hover:hidden text-white" />
            <Sparkles className="h-6 w-6 hidden group-hover:block animate-pulse text-white" />
          </>
        )}
      </Button>
    </div>
  );
}

