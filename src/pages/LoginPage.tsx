import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogIn, Mail, Lock, Eye, EyeOff, X, Building2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import logoWhite from "@/assets/logo-agir-white.png";

// ─── Login Modal ───
function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phase, setPhase] = useState<"form" | "loading" | "error">("form");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (open) {
      setPhase("form");
      setErrorMsg("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha e-mail e senha.");
      return;
    }
    setPhase("loading");
    try {
      await new Promise((r) => setTimeout(r, 1500));
      const result = await signIn(email, password);

      const { data: maint } = await supabase
        .from("system_maintenance")
        .select("is_active,message")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (maint?.is_active) {
        const userId = result.user?.id;
        let isAdmin = false;
        if (userId) {
          const { data: roleRow } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", userId)
            .eq("role", "admin")
            .maybeSingle();
          if (roleRow) isAdmin = true;
          else {
            const { data: prof } = await supabase
              .from("profiles")
              .select("perfil")
              .eq("id", userId)
              .maybeSingle();
            isAdmin =
              prof?.perfil === "Administrador" || prof?.perfil === "Admin";
          }
        }
        if (!isAdmin) {
          await supabase.auth.signOut();
          throw new Error(
            maint.message ||
              "Sistema em manutenção. Tente novamente mais tarde.",
          );
        }
      }

      if (result.user?.id) {
        const uid = result.user.id;
        supabase
          .from("audit_logs")
          .insert({
            usuario_id: uid,
            acao: "LOGIN",
            modulo: "autenticacao",
            registro_afetado: uid,
          })
          .then();
      }

      navigate("/", { replace: true });
    } catch (err: any) {
      const msg = err.message?.includes("Invalid login")
        ? "E-mail ou senha incorretos."
        : err.message || "Erro ao fazer login.";
      setErrorMsg(msg);
      setPhase("error");
      setTimeout(() => setPhase("form"), 3000);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.3s_ease-out]"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-[440px] animate-[modalIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)]"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-[hsl(200,60%,45%)]/25 via-transparent to-[hsl(220,60%,30%)]/15 blur-sm" />
        <div className="relative rounded-2xl bg-[#0d1a30]/90 backdrop-blur-2xl border border-white/[0.12] shadow-2xl shadow-black/50 overflow-hidden">
          {/* Top bar */}
          <div className="bg-gradient-to-r from-[hsl(200,70%,38%)] to-[hsl(215,65%,32%)] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src={logoWhite} alt="AGIR" className="h-6 brightness-110" />
              <div className="h-3.5 w-px bg-white/20" />
              <span className="text-white/80 text-[11px] font-semibold tracking-wider uppercase">
                GDP · Gestão de Provimento
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white/80 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-8">
            {phase === "loading" ? (
              <div className="flex flex-col items-center justify-center py-16 animate-[fadeIn_0.3s_ease-out]">
                <div className="relative">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[hsl(200,70%,38%)] to-[hsl(215,65%,32%)] flex items-center justify-center shadow-lg shadow-[hsl(200,70%,25%)]/40 animate-pulse">
                    <img
                      src={logoWhite}
                      alt=""
                      className="h-8 w-8 object-contain brightness-110"
                    />
                  </div>
                  <div className="absolute -inset-2 rounded-3xl border-2 border-[hsl(200,70%,50%)]/15 animate-[ping_1.5s_ease-in-out_infinite]" />
                </div>
                <p className="text-sm text-[hsl(210,20%,50%)] mt-5 font-medium">
                  Autenticando...
                </p>
              </div>
            ) : phase === "error" ? (
              <div className="flex flex-col items-center justify-center py-12 animate-[fadeIn_0.3s_ease-out]">
                <div className="h-14 w-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <X className="h-7 w-7 text-red-400" />
                </div>
                <p className="text-sm text-red-400 mt-4 font-medium text-center">
                  {errorMsg}
                </p>
                <p className="text-xs text-[hsl(210,15%,38%)] mt-1">
                  Tente novamente em instantes...
                </p>
              </div>
            ) : (
              <>
                <div className="mb-7">
                  <h2 className="text-lg font-bold text-white">
                    Acessar o painel
                  </h2>
                  <p className="text-sm text-[hsl(210,20%,48%)] mt-0.5">
                    Entre com suas credenciais institucionais
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-[hsl(210,20%,48%)] uppercase tracking-[0.15em]">
                      E-mail
                    </Label>
                    <div className="relative group">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(210,20%,38%)] group-focus-within:text-[hsl(200,70%,55%)] transition-colors" />
                      <input
                        type="email"
                        placeholder="seu.email@agir.org.br"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-11 pl-11 pr-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-[hsl(210,15%,32%)] focus:outline-none focus:border-[hsl(200,70%,45%)]/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-[hsl(200,70%,45%)]/20 transition-all"
                        autoComplete="email"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-[hsl(210,20%,48%)] uppercase tracking-[0.15em]">
                      Senha
                    </Label>
                    <div className="relative group">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(210,20%,38%)] group-focus-within:text-[hsl(200,70%,55%)] transition-colors" />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-11 pl-11 pr-12 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-[hsl(210,15%,32%)] focus:outline-none focus:border-[hsl(200,70%,45%)]/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-[hsl(200,70%,45%)]/20 transition-all"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[hsl(210,20%,38%)] hover:text-white/60 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-[hsl(200,70%,38%)] to-[hsl(215,65%,32%)] hover:from-[hsl(200,70%,44%)] hover:to-[hsl(215,65%,38%)] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-[hsl(200,70%,25%)]/30 active:scale-[0.98] mt-1"
                  >
                    <LogIn className="h-4 w-4" /> Entrar
                  </button>
                  <p className="text-center text-[11px] text-[hsl(210,20%,38%)] pt-1">
                    Esqueceu sua senha? Contate a administração.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Unit Login Modal ───
function UnidadeLoginModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phase, setPhase] = useState<"form" | "loading" | "error">("form");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (open) {
      setPhase("form");
      setErrorMsg("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha e-mail e senha.");
      return;
    }
    setPhase("loading");
    try {
      await new Promise((r) => setTimeout(r, 1200));
      await signIn(email, password);
      navigate("/portal-unidade", { replace: true });
    } catch (err: any) {
      const msg = err.message?.includes("Invalid login")
        ? "E-mail ou senha incorretos."
        : err.message || "Erro ao fazer login.";
      setErrorMsg(msg);
      setPhase("error");
      setTimeout(() => setPhase("form"), 3000);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.3s_ease-out]"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-[440px] animate-[modalIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)]"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-emerald-500/20 via-transparent to-emerald-900/15 blur-sm" />
        <div className="relative rounded-2xl bg-[#0d1a30]/90 backdrop-blur-2xl border border-white/[0.12] shadow-2xl shadow-black/50 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-700 to-teal-700 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src={logoWhite} alt="AGIR" className="h-6 brightness-110" />
              <div className="h-3.5 w-px bg-white/20" />
              <span className="text-white/80 text-[11px] font-semibold tracking-wider uppercase">
                Acesso da Unidade
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white/80 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-8">
            {phase === "loading" ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg animate-pulse">
                  <img
                    src={logoWhite}
                    alt=""
                    className="h-8 w-8 object-contain brightness-110"
                  />
                </div>
                <p className="text-sm text-[hsl(210,20%,50%)] mt-5 font-medium">
                  Autenticando...
                </p>
              </div>
            ) : phase === "error" ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="h-14 w-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <X className="h-7 w-7 text-red-400" />
                </div>
                <p className="text-sm text-red-400 mt-4 font-medium text-center">
                  {errorMsg}
                </p>
              </div>
            ) : (
              <>
                <div className="mb-7">
                  <h2 className="text-lg font-bold text-white">
                    Acesso da Unidade
                  </h2>
                  <p className="text-sm text-[hsl(210,20%,48%)] mt-0.5">
                    Portal exclusivo para RHs de unidade
                  </p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-[hsl(210,20%,48%)] uppercase tracking-[0.15em]">
                      E-mail
                    </Label>
                    <div className="relative group">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(210,20%,38%)] group-focus-within:text-emerald-400 transition-colors" />
                      <input
                        type="email"
                        placeholder="rh.unidade@agir.org.br"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-11 pl-11 pr-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-[hsl(210,15%,32%)] focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-emerald-500/20 transition-all"
                        autoComplete="email"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-[hsl(210,20%,48%)] uppercase tracking-[0.15em]">
                      Senha
                    </Label>
                    <div className="relative group">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(210,20%,38%)] group-focus-within:text-emerald-400 transition-colors" />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-11 pl-11 pr-12 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-[hsl(210,15%,32%)] focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-emerald-500/20 transition-all"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[hsl(210,20%,38%)] hover:text-white/60 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] mt-1"
                  >
                    <LogIn className="h-4 w-4" /> Entrar como Unidade
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Login Page ───
export default function LoginPage() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const [showUnidadeLogin, setShowUnidadeLogin] = useState(false);

  useEffect(() => {
    import("@/store/logoutStore").then(({ useLogoutStore }) => {
      useLogoutStore.getState().setIsLoggingOut(false);
    });
  }, []);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a1628]">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1f3c] via-[#0a1628] to-[#071020]" />
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[hsl(200,80%,30%)] opacity-[0.08] blur-[150px] animate-pulse" />
        <div
          className="absolute bottom-[-15%] right-[10%] w-[500px] h-[500px] rounded-full bg-[hsl(220,70%,25%)] opacity-[0.1] blur-[130px] animate-pulse"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute top-[40%] right-[-5%] w-[300px] h-[300px] rounded-full bg-[hsl(190,80%,35%)] opacity-[0.06] blur-[100px] animate-pulse"
          style={{ animationDelay: "4s" }}
        />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(100,200,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(100,200,255,.12) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute w-full h-px bg-gradient-to-r from-transparent via-[hsl(200,80%,50%)]/15 to-transparent"
            style={{ animation: "scanline 8s linear infinite" }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Top nav */}
        <header className="flex items-center justify-between px-8 lg:px-14 py-6">
          <img
            src={logoWhite}
            alt="AGIR"
            className="h-7 brightness-110 drop-shadow-lg"
          />
          <img
            src="/logo_branca_sem_slogan.png"
            alt=""
            className="h-10 opacity-80 drop-shadow-lg"
          />
        </header>

        {/* Main area */}
        <main className="flex-1 flex items-center justify-center px-6 pb-16">
          <div className="w-full max-w-[520px] text-center">
            {/* GDP logotype */}
            <div className="mb-3">
              <h1 className="text-[72px] lg:text-[88px] font-black tracking-tighter text-white leading-none select-none">
                GDP
              </h1>
            </div>

            <p className="text-[hsl(210,30%,72%)] text-xl font-medium tracking-wide mb-2">
              Gestão de Provimento
            </p>
            <p className="text-[hsl(210,20%,55%)] text-xm mb-8">
              Plataforma de gestão de vagas e controle de provimento
            </p>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setShowLogin(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[hsl(200,70%,38%)] to-[hsl(215,65%,32%)] hover:from-[hsl(200,70%,44%)] hover:to-[hsl(215,65%,38%)] shadow-lg shadow-[hsl(200,70%,25%)]/30 transition-all active:scale-[0.98]"
              >
                <LogIn className="h-4 w-4" /> Entrar no sistema
              </button>
              <button
                onClick={() => setShowUnidadeLogin(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold text-emerald-300 border border-emerald-500/25 hover:border-emerald-500/50 bg-emerald-500/[0.05] hover:bg-emerald-500/[0.12] transition-all active:scale-[0.98]"
              >
                <Building2 className="h-4 w-4" /> Acesso Unidade
              </button>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-8 lg:px-14 py-5 flex flex-col items-center justify-center text-center text-[13px] text-[hsl(210,80%,52%)] gap-1">
          <span>Powered by Daher.lab</span>
          <span>
            ©{new Date().getFullYear()} · Todos os direitos reservados
          </span>
        </footer>
      </div>

      {/* Modals */}
      <LoginModal open={showLogin} onClose={() => setShowLogin(false)} />
      <UnidadeLoginModal
        open={showUnidadeLogin}
        onClose={() => setShowUnidadeLogin(false)}
      />

      <style>{`
        @keyframes scanline {
          0% { top: -2%; opacity: 0; }
          5% { opacity: 1; }
          95% { opacity: 1; }
          100% { top: 102%; opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalIn {
          0% { opacity: 0; transform: scale(0.85) translateY(30px); filter: blur(4px); }
          60% { opacity: 1; transform: scale(1.02) translateY(-4px); filter: blur(0px); }
          80% { transform: scale(0.99) translateY(1px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
