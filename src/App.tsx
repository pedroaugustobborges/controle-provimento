import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { PageSkeleton } from "@/components/PageSkeleton";
import { LogoutOverlay } from "@/components/LogoutOverlay";
import { useMaintenanceMode } from "@/hooks/useMaintenanceMode";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import MaintenancePage from "@/pages/MaintenancePage";
import { useEffect } from "react";

const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const VagasPage = lazy(() => import("@/pages/VagasPage"));
const VagaDetalhePage = lazy(() => import("@/pages/VagaDetalhePage"));
const EditaisPage = lazy(() => import("@/pages/EditaisPage"));

const ConvocacoesPage = lazy(() => import("@/pages/ConvocacoesPage"));
const ConvocacoesDashboardPage = lazy(() => import("@/pages/ConvocacoesDashboardPage"));
const FilaEditaisPage = lazy(() => import("@/pages/FilaEditaisPage"));
const BancoTalentosPage = lazy(() => import("@/pages/BancoTalentosPage"));
const ImportacoesPage = lazy(() => import("@/pages/ImportacoesPage"));
const ValidacaoEditaisPage = lazy(() => import("@/pages/ValidacaoEditaisPage"));
const AdministracaoPage = lazy(() => import("@/pages/AdministracaoPage"));
const AlertasTarefasPage = lazy(() => import("@/pages/AlertasTarefasPage"));
const MonitoramentoAdminPage = lazy(() => import("@/pages/MonitoramentoAdminPage"));
const FilaAnalistaEditalPage = lazy(() => import("@/pages/FilaAnalistaEditalPage"));
const MensagensPage = lazy(() => import("@/pages/MensagensPage"));
const RelatoriosPage = lazy(() => import("@/pages/RelatoriosPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const UnidadePortalPage = lazy(() => import("@/pages/UnidadePortalPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // 5 min — dados ficam "frescos" por 5 min
      gcTime: 10 * 60 * 1000,     // 10 min — cache mantido por 10 min
      refetchOnWindowFocus: false, // evita refetch ao alternar janelas
      retry: 1,
    },
  },
});

function ProtectedRouteWrapper() {
  const { isAuthenticated, loading, signOut } = useAuth();
  const { state: maintenance, loading: maintLoading } = useMaintenanceMode();
  const isAdmin = useIsAdmin();

  // Auto-deslogar não-admin quando manutenção é ativada em tempo real
  useEffect(() => {
    if (maintenance?.is_active && isAdmin === false && isAuthenticated) {
      signOut();
    }
  }, [maintenance?.is_active, isAdmin, isAuthenticated, signOut]);

  if (loading || maintLoading || isAdmin === null) {
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

  if (maintenance?.is_active && !isAdmin) {
    return <MaintenancePage message={maintenance.message} expectedReturnAt={maintenance.expected_return_at} />;
  }

  return (
    <AppLayout>
      <Suspense fallback={<PageSkeleton />}>
        <Outlet />
      </Suspense>
    </AppLayout>
  );
}

function UnidadeRouteWrapper() {
  const { isAuthenticated, loading, signOut } = useAuth();
  const { state: maintenance, loading: maintLoading } = useMaintenanceMode();
  const isAdmin = useIsAdmin();

  useEffect(() => {
    if (maintenance?.is_active && isAdmin === false && isAuthenticated) {
      signOut();
    }
  }, [maintenance?.is_active, isAdmin, isAuthenticated, signOut]);

  if (loading || maintLoading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (maintenance?.is_active && !isAdmin) {
    return <MaintenancePage message={maintenance.message} expectedReturnAt={maintenance.expected_return_at} />;
  }

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
      <Outlet />
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <LogoutOverlay />
      <BrowserRouter basename="/">
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            
            <Route element={<ProtectedRouteWrapper />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/vagas" element={<VagasPage />} />
              <Route path="/vagas/:id" element={<VagaDetalhePage />} />
              <Route path="/banco-talentos" element={<BancoTalentosPage />} />
              <Route path="/fila-editais" element={<FilaEditaisPage />} />
              <Route path="/fila-analista-edital" element={<FilaAnalistaEditalPage />} />
              <Route path="/convocacoes" element={<ConvocacoesPage />} />
              <Route path="/convocacoes/dashboard" element={<ConvocacoesDashboardPage />} />
              
              <Route path="/importacoes" element={<ImportacoesPage />} />
              <Route path="/validacao-editais" element={<ValidacaoEditaisPage />} />
              <Route path="/gestor" element={<AdministracaoPage />} />
              <Route path="/alertas-tarefas" element={<AlertasTarefasPage />} />
              <Route path="/monitoramento" element={<MonitoramentoAdminPage />} />
              <Route path="/mensagens" element={<MensagensPage />} />
              <Route path="/relatorios" element={<RelatoriosPage />} />
              <Route path="/editais" element={<EditaisPage />} />
            </Route>

            <Route element={<UnidadeRouteWrapper />}>
              <Route path="/portal-unidade" element={<UnidadePortalPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;