import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
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
import ValidacaoEditaisPage from "@/pages/ValidacaoEditaisPage";
import AdministracaoPage from "@/pages/AdministracaoPage";
import AlertasTarefasPage from "@/pages/AlertasTarefasPage";
import MonitoramentoAdminPage from "@/pages/MonitoramentoAdminPage";
import FilaAnalistaEditalPage from "@/pages/FilaAnalistaEditalPage";
import LoginPage from "@/pages/LoginPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";


const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/vagas" element={<VagasPage />} />
        <Route path="/vagas/:id" element={<VagaDetalhePage />} />
        <Route path="/banco-talentos" element={<BancoTalentosPage />} />
        <Route path="/fila-editais" element={<FilaEditaisPage />} />
        <Route path="/fila-analista-edital" element={<FilaAnalistaEditalPage />} />
        <Route path="/convocacoes" element={<ConvocacoesPage />} />
        <Route path="/validacao" element={<ValidacaoPage />} />
        <Route path="/importacoes" element={<ImportacoesPage />} />
        <Route path="/validacao-editais" element={<ValidacaoEditaisPage />} />
        <Route path="/gestor" element={<AdministracaoPage />} />
        <Route path="/alertas-tarefas" element={<AlertasTarefasPage />} />
        <Route path="/monitoramento" element={<MonitoramentoAdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
