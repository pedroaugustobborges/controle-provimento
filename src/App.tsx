import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { PageSkeleton } from "@/components/PageSkeleton";

const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const VagasPage = lazy(() => import("@/pages/VagasPage"));
const VagaDetalhePage = lazy(() => import("@/pages/VagaDetalhePage"));
const EditaisPage = lazy(() => import("@/pages/EditaisPage"));
const ValidacaoPage = lazy(() => import("@/pages/ValidacaoPage"));
const GestorPage = lazy(() => import("@/pages/GestorPage"));
const ConvocacoesPage = lazy(() => import("@/pages/ConvocacoesPage"));
const FilaEditaisPage = lazy(() => import("@/pages/FilaEditaisPage"));
const BancoTalentosPage = lazy(() => import("@/pages/BancoTalentosPage"));
const ImportacoesPage = lazy(() => import("@/pages/ImportacoesPage"));
const ValidacaoEditaisPage = lazy(() => import("@/pages/ValidacaoEditaisPage"));
const AdministracaoPage = lazy(() => import("@/pages/AdministracaoPage"));
const AlertasTarefasPage = lazy(() => import("@/pages/AlertasTarefasPage"));
const MonitoramentoAdminPage = lazy(() => import("@/pages/MonitoramentoAdminPage"));
const FilaAnalistaEditalPage = lazy(() => import("@/pages/FilaAnalistaEditalPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));

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
      <Suspense fallback={<PageSkeleton />}>
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
      </Suspense>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
