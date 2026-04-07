import { Bot, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AIAssistant() {
  return (
    <Button 
      className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg bg-[#DC2626] hover:bg-[#DC2626]/90 text-white p-0 flex items-center justify-center z-50 transition-all duration-300 hover:scale-110 active:scale-95 group"
    >
      <Bot className="h-6 w-6 group-hover:hidden" />
      <Sparkles className="h-6 w-6 hidden group-hover:block animate-pulse" />
    </Button>
  );
}
