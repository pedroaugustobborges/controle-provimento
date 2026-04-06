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
            <Route path="/editais" element={<EditaisPage />} />
            <Route path="/validacao" element={<ValidacaoPage />} />
            <Route path="/gestor" element={<GestorPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
