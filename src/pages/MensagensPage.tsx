import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function MensagensPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-[800px] mx-auto">
      <PageHeader title="Central de Comunicação" />

      <Card className="border-none shadow-sm">
        <CardContent className="p-10 text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 flex items-center justify-center">
            <Info className="h-7 w-7 text-warning" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">Funcionalidade descontinuada</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              O envio de mensagens entre usuários foi descontinuado. A AGIE agora concentra
              apenas <strong>alertas do sistema</strong>, <strong>feedback</strong> e
              <strong> novidades</strong>. Use o assistente AGIE no canto inferior direito.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/')} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar para a Visão Geral
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
