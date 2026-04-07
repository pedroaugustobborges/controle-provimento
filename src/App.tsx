import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import DashboardPage from "@/pages/DashboardPage";
import VagasPage from "@/pages/VagasPage";
import VagaDetalhePage from "@/pages/VagaDetalhePage";
import EditaisPage from "@/pages/EditaisPage";
import ValidacaoPage from "@/pages/ValidacaoPage";
import GestorPage from "@/pages/GestorPage";
import ConvocacoesPage from "@/pages/ConvocacoesPage";
import FilaEditaisPage from "@/pages/FilaEditaisPage";
import BancoTalentosPage from "@/pages/BancoTalentosPage";
import ImportacoesPage from "@/pages/ImportacoesPage";
import AdministracaoPage from "@/pages/AdministracaoPage";
import NotFound from "./pages/NotFound.tsx";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/vagas" element={<VagasPage />} />
            <Route path="/vagas/:id" element={<VagaDetalhePage />} />
            <Route path="/banco-talentos" element={<BancoTalentosPage />} />
            <Route path="/fila-editais" element={<FilaEditaisPage />} />
            <Route path="/convocacoes" element={<ConvocacoesPage />} />
            <Route path="/validacao" element={<ValidacaoPage />} />
            <Route path="/importacoes" element={<ImportacoesPage />} />
            <Route path="/gestor" element={<AdministracaoPage />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;