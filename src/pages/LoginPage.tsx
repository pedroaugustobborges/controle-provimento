import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { LogIn, Mail, Lock, Eye, EyeOff, X, UserPlus, ChevronRight, Building2, Briefcase, User, MessageSquare, Users } from 'lucide-react';
import { Label } from '@/components/ui/label';
import logoWhite from '@/assets/logo-agir-white.png';
import mapaNobg from '@/assets/mapa-agir-nobg.png';

// ─── Login Modal ───
function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phase, setPhase] = useState<'form' | 'loading' | 'error'>('form');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (open) { setPhase('form'); setErrorMsg(''); }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Preencha e-mail e senha.'); return; }
    setPhase('loading');
    try {
      await new Promise(r => setTimeout(r, 1500)); // branded delay
      await signIn(email, password);
      navigate('/', { replace: true });
    } catch (err: any) {
      const msg = err.message?.includes('Invalid login')
        ? 'E-mail ou senha incorretos.'
        : err.message || 'Erro ao fazer login.';
      setErrorMsg(msg);
      setPhase('error');
      setTimeout(() => setPhase('form'), 3000);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 animate-[fadeIn_0.3s_ease-out]"
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => e.preventDefault()}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-[572px] animate-[modalIn_0.6s_cubic-bezier(0.34,1.56,0.64,1)]"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-[hsl(200,60%,45%)]/30 via-transparent to-[hsl(220,60%,30%)]/20 blur-sm" />
        <div className="relative rounded-2xl bg-white/[0.08] backdrop-blur-sm border border-white/[0.15] shadow-2xl shadow-black/40 overflow-hidden">
          {/* Top bar */}
          <div className="bg-gradient-to-r from-[hsl(200,70%,40%)] to-[hsl(215,65%,35%)] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src={logoWhite} alt="AGIR" className="h-7 brightness-110" />
              <div className="h-4 w-px bg-white/20" />
              <span className="text-white/90 text-xs font-semibold tracking-wide">Controle de Provimento</span>
            </div>
            <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-8 py-12">
            {phase === 'loading' ? (
              <div className="flex flex-col items-center justify-center py-20 animate-[fadeIn_0.3s_ease-out]">
                <div className="relative">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[hsl(200,70%,40%)] to-[hsl(215,65%,35%)] flex items-center justify-center shadow-lg shadow-[hsl(200,70%,30%)]/30 animate-pulse">
                    <img src={logoWhite} alt="" className="h-9 w-9 object-contain brightness-110" />
                  </div>
                  <div className="absolute -inset-2 rounded-3xl border-2 border-[hsl(200,70%,50%)]/20 animate-[ping_1.5s_ease-in-out_infinite]" />
                </div>
                <p className="text-sm text-[hsl(210,20%,55%)] mt-6 font-medium">Autenticando...</p>
              </div>
            ) : phase === 'error' ? (
              <div className="flex flex-col items-center justify-center py-12 animate-[fadeIn_0.3s_ease-out]">
                <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <X className="h-8 w-8 text-red-400" />
                </div>
                <p className="text-sm text-red-400 mt-4 font-medium">{errorMsg}</p>
                <p className="text-xs text-[hsl(210,15%,40%)] mt-1">Tente novamente em instantes...</p>
              </div>
            ) : (
              <>
                <div className="space-y-1 mb-6">
                  <h2 className="text-lg font-bold text-white">Acessar o painel</h2>
                  <p className="text-sm text-[hsl(210,20%,50%)]">Entre com as suas credenciais</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-[hsl(210,20%,50%)] uppercase tracking-[0.15em]">E-mail</Label>
                    <div className="relative group">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(210,20%,40%)] group-focus-within:text-[hsl(200,70%,55%)] transition-colors" />
                      <input type="email" placeholder="seu.email@agir.org.br" value={email} onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-12 pl-11 pr-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-[hsl(210,15%,35%)] focus:outline-none focus:border-[hsl(200,70%,45%)]/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-[hsl(200,70%,45%)]/20 transition-all" autoComplete="email" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-[hsl(210,20%,50%)] uppercase tracking-[0.15em]">Senha</Label>
                    <div className="relative group">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(210,20%,40%)] group-focus-within:text-[hsl(200,70%,55%)] transition-colors" />
                      <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-12 pl-11 pr-12 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-[hsl(210,15%,35%)] focus:outline-none focus:border-[hsl(200,70%,45%)]/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-[hsl(200,70%,45%)]/20 transition-all" autoComplete="current-password" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[hsl(210,20%,40%)] hover:text-white/70 transition-colors">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <button type="submit"
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-[hsl(200,70%,40%)] to-[hsl(215,65%,35%)] hover:from-[hsl(200,70%,45%)] hover:to-[hsl(215,65%,40%)] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-[hsl(200,70%,30%)]/30 active:scale-[0.98] mt-2">
                    <LogIn className="h-4 w-4" /> Entrar
                  </button>
                  <p className="text-center text-[11px] text-[hsl(210,20%,45%)] mt-3">
                    Esqueceu sua senha? Entre em contato com a administração do sistema.
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

// ─── Access Request Modal ───
function AccessRequestModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ nome: '', email: '', setor: '', cargo: '', chefia: '', motivo: '' });
  const [sent, setSent] = useState(false);

  useEffect(() => { if (open) { setSent(false); setForm({ nome: '', email: '', setor: '', cargo: '', chefia: '', motivo: '' }); } }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.email || !form.setor || !form.cargo) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }
    setSent(true);
    toast.success('Solicitação enviada com sucesso!');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-[fadeIn_0.3s_ease-out]" />
      <div className="relative w-full max-w-[480px] animate-[modalIn_0.4s_cubic-bezier(0.16,1,0.3,1)]" onClick={(e) => e.stopPropagation()}>
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-[hsl(200,60%,45%)]/30 via-transparent to-[hsl(220,60%,30%)]/20 blur-sm" />
        <div className="relative rounded-2xl bg-[#0d1a30]/90 backdrop-blur-2xl border border-white/[0.1] shadow-2xl shadow-black/50 overflow-hidden">
          <div className="bg-gradient-to-r from-[hsl(200,70%,40%)] to-[hsl(215,65%,35%)] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <UserPlus className="h-4 w-4 text-white/80" />
              <span className="text-white/90 text-sm font-semibold">Solicitar Acesso</span>
            </div>
            <button onClick={onClose} className="text-white/50 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
          </div>

          <div className="p-7 max-h-[70vh] overflow-y-auto">
            {sent ? (
              <div className="flex flex-col items-center py-10 animate-[fadeIn_0.3s_ease-out]">
                <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                  <Mail className="h-8 w-8 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Solicitação enviada!</h3>
                <p className="text-sm text-[hsl(210,20%,50%)] mt-2 text-center max-w-xs">
                  Sua solicitação será analisada pela equipe de administração. Você receberá um e-mail quando o acesso for liberado.
                </p>
                <button onClick={onClose} className="mt-6 px-6 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white/70 text-sm hover:bg-white/[0.1] transition-colors">
                  Fechar
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-[hsl(210,20%,50%)] mb-5">Preencha as informações abaixo para solicitar acesso ao sistema.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {[
                    { key: 'nome', label: 'Nome completo', icon: User, placeholder: 'Seu nome completo', required: true },
                    { key: 'email', label: 'E-mail institucional', icon: Mail, placeholder: 'seu.email@agir.org.br', required: true, type: 'email' },
                    { key: 'setor', label: 'Setor / Unidade', icon: Building2, placeholder: 'Ex: HUGOL, CRER, RH...', required: true },
                    { key: 'cargo', label: 'Cargo', icon: Briefcase, placeholder: 'Seu cargo atual', required: true },
                    { key: 'chefia', label: 'Chefia imediata', icon: Users, placeholder: 'Nome da chefia imediata' },
                  ].map((field) => (
                    <div key={field.key} className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-[hsl(210,20%,50%)] uppercase tracking-[0.15em]">
                        {field.label} {field.required && <span className="text-[hsl(200,70%,50%)]">*</span>}
                      </Label>
                      <div className="relative group">
                        <field.icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(210,20%,40%)] group-focus-within:text-[hsl(200,70%,55%)] transition-colors" />
                        <input
                          type={field.type || 'text'}
                          placeholder={field.placeholder}
                          value={(form as any)[field.key]}
                          onChange={(e) => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                          className="w-full h-11 pl-11 pr-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-[hsl(210,15%,35%)] focus:outline-none focus:border-[hsl(200,70%,45%)]/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-[hsl(200,70%,45%)]/20 transition-all"
                        />
                      </div>
                    </div>
                  ))}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-[hsl(210,20%,50%)] uppercase tracking-[0.15em]">Motivo da solicitação</Label>
                    <div className="relative group">
                      <MessageSquare className="absolute left-3.5 top-3 h-4 w-4 text-[hsl(210,20%,40%)] group-focus-within:text-[hsl(200,70%,55%)] transition-colors" />
                      <textarea
                        placeholder="Descreva brevemente por que precisa de acesso..."
                        value={form.motivo}
                        onChange={(e) => setForm(f => ({ ...f, motivo: e.target.value }))}
                        rows={3}
                        className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-[hsl(210,15%,35%)] focus:outline-none focus:border-[hsl(200,70%,45%)]/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-[hsl(200,70%,45%)]/20 transition-all resize-none"
                      />
                    </div>
                  </div>
                  <button type="submit"
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-[hsl(200,70%,40%)] to-[hsl(215,65%,35%)] hover:from-[hsl(200,70%,45%)] hover:to-[hsl(215,65%,40%)] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-[hsl(200,70%,30%)]/30 active:scale-[0.98]">
                    <UserPlus className="h-4 w-4" /> Enviar solicitação
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

// ─── Main Landing Page ───
export default function LoginPage() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const [showAccess, setShowAccess] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  const highlights = [
    { value: '20+', label: 'Unidades geridas' },
    { value: '6', label: 'Estados' },
    { value: '20+', label: 'Anos de atuação' },
    { value: '10k+', label: 'Colaboradores' },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a1628]">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1f3c] via-[#0a1628] to-[#071020]" />
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[hsl(200,80%,30%)] opacity-[0.08] blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-15%] right-[10%] w-[500px] h-[500px] rounded-full bg-[hsl(220,70%,25%)] opacity-[0.1] blur-[130px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[40%] right-[-5%] w-[300px] h-[300px] rounded-full bg-[hsl(190,80%,35%)] opacity-[0.06] blur-[100px] animate-pulse" style={{ animationDelay: '4s' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(100,200,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(100,200,255,.12) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-[hsl(200,80%,50%)]/20 to-transparent" style={{ animation: 'scanline 8s linear infinite' }} />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Top nav */}
        <header className="flex items-center justify-between px-6 lg:px-12 py-5">
          <div className="flex items-center gap-3">
            <img src={logoWhite} alt="AGIR" className="h-8 brightness-110 drop-shadow-lg" />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowAccess(true)}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white/60 hover:text-white/90 border border-white/[0.06] hover:border-white/[0.12] bg-white/[0.03] hover:bg-white/[0.06] transition-all">
              <UserPlus className="h-3.5 w-3.5" /> Solicitar acesso
            </button>
            <button onClick={() => setShowLogin(true)}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-[hsl(200,70%,40%)] to-[hsl(215,65%,35%)] hover:from-[hsl(200,70%,45%)] hover:to-[hsl(215,65%,40%)] shadow-lg shadow-[hsl(200,70%,30%)]/20 transition-all active:scale-[0.97]">
              <LogIn className="h-3.5 w-3.5" /> Entrar
            </button>
          </div>
        </header>

        {/* Main area */}
        <main className="flex-1 flex items-center px-6 lg:px-12 pb-12">
          <div className="w-full max-w-[1200px] mx-auto flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
            {/* Left text */}
            <div className="flex-1 space-y-6 text-center lg:text-left max-w-[560px]">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[hsl(200,60%,55%)] text-[10px] font-semibold uppercase tracking-[0.2em]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Sistema ativo
              </div>

              <h1 className="text-3xl lg:text-5xl font-bold text-white leading-[1.15]">
                Controle de{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(190,80%,55%)] to-[hsl(210,80%,60%)]">
                  Provimento
                </span>
              </h1>

              <p className="text-[hsl(210,20%,52%)] text-sm lg:text-base leading-relaxed">
                Referência nacional na gestão de unidades de saúde, a AGIR atua com rigor técnico, eficiência administrativa e inovação em hospitais, clínicas e policlínicas distribuídos em 6 estados brasileiros.
              </p>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 pt-2">
                {highlights.map((h) => (
                  <div key={h.label} className="text-center lg:text-left">
                    <div className="text-xl lg:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">{h.value}</div>
                    <div className="text-[10px] uppercase tracking-[0.12em] text-[hsl(210,20%,42%)] font-medium mt-0.5 leading-tight">{h.label}</div>
                  </div>
                ))}
              </div>

              {/* CTA buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center lg:justify-start">
                <button onClick={() => setShowLogin(true)}
                  className="flex items-center justify-center gap-2 px-7 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[hsl(200,70%,40%)] to-[hsl(215,65%,35%)] hover:from-[hsl(200,70%,45%)] hover:to-[hsl(215,65%,40%)] shadow-lg shadow-[hsl(200,70%,30%)]/30 transition-all active:scale-[0.98]">
                  <LogIn className="h-4 w-4" /> Acessar o painel
                  <ChevronRight className="h-4 w-4 ml-1 opacity-60" />
                </button>
                <button onClick={() => setShowAccess(true)}
                  className="flex items-center justify-center gap-2 px-7 py-3 rounded-xl text-sm font-medium text-white/70 border border-white/[0.1] hover:border-white/[0.18] bg-white/[0.03] hover:bg-white/[0.06] transition-all">
                  <UserPlus className="h-4 w-4" /> Solicitar acesso
                </button>
              </div>
            </div>

            {/* Right map */}
            <div className="hidden lg:flex flex-1 items-center justify-center max-w-[520px]">
              <div className="relative">
                <div className="absolute inset-0 bg-[hsl(200,70%,40%)]/8 rounded-full blur-[80px] scale-110" />
                <img src={mapaNobg} alt="Presença AGIR no Brasil" className="relative w-[504px] h-auto drop-shadow-2xl" />
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-6 lg:px-12 py-4 flex items-center justify-between text-[10px] text-[hsl(210,15%,30%)]">
          <span>AGIR © {new Date().getFullYear()} · Todos os direitos reservados</span>
          <span className="hidden sm:block">Gestão de saúde com excelência</span>
        </footer>
      </div>

      {/* Modals */}
      <LoginModal open={showLogin} onClose={() => setShowLogin(false)} />
      <AccessRequestModal open={showAccess} onClose={() => setShowAccess(false)} />

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
          0% { opacity: 0; transform: scale(0.8) translateY(40px) rotateX(8deg); filter: blur(4px); }
          50% { opacity: 0.8; transform: scale(1.03) translateY(-5px) rotateX(0deg); filter: blur(0px); }
          75% { transform: scale(0.98) translateY(2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0px); }
        }
      `}</style>
    </div>
  );
}
