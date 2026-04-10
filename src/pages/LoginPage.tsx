import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { LogIn, Mail, Lock, Eye, EyeOff, Activity } from 'lucide-react';
import logoWhite from '@/assets/logo-agir-white.png';
import mapaNobg from '@/assets/mapa-agir-nobg.png';

export default function LoginPage() {
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<'login' | 'forgot'>('login');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Preencha e-mail e senha.'); return; }
    setLoading(true);
    try {
      await signIn(email, password);
      toast.success('Login realizado com sucesso!');
    } catch (err: any) {
      toast.error(err.message?.includes('Invalid login') ? 'E-mail ou senha incorretos.' : err.message || 'Erro ao fazer login.');
    } finally { setLoading(false); }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error('Informe seu e-mail.'); return; }
    setLoading(true);
    try {
      await resetPassword(email);
      toast.success('E-mail de recuperação enviado!');
      setMode('login');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar e-mail de recuperação.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a1628]">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1f3c] via-[#0a1628] to-[#071020]" />
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[hsl(200,80%,30%)] opacity-[0.08] blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-15%] right-[10%] w-[500px] h-[500px] rounded-full bg-[hsl(220,70%,25%)] opacity-[0.1] blur-[130px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[30%] right-[-5%] w-[300px] h-[300px] rounded-full bg-[hsl(190,80%,35%)] opacity-[0.06] blur-[100px] animate-pulse" style={{ animationDelay: '4s' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(100,200,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(100,200,255,.15) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-[hsl(200,80%,50%)]/20 to-transparent" style={{ animation: 'scanline 8s linear infinite' }} />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 lg:p-8">
        <div className="w-full max-w-[1200px] flex flex-col lg:flex-row items-center gap-8 lg:gap-14">

          {/* LEFT — Login card (bigger, primary) */}
          <div className="w-full lg:w-[55%] max-w-[520px] order-1">
            <div className="relative">
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-[hsl(200,60%,40%)]/25 via-transparent to-[hsl(220,60%,30%)]/15 blur-sm" />
              <div className="relative rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] shadow-2xl shadow-black/40 overflow-hidden">
                
                {/* Card top bar — logo with button-matching blue */}
                <div className="bg-gradient-to-r from-[hsl(200,70%,40%)] to-[hsl(215,65%,35%)] px-8 py-5 flex items-center gap-3">
                  <img src={logoWhite} alt="AGIR" className="h-8 brightness-110 drop-shadow" />
                  <div className="h-5 w-px bg-white/20" />
                  <span className="text-white/90 text-sm font-semibold tracking-wide">Controle de Provimento</span>
                </div>

                {/* Form area */}
                <div className="p-8 lg:p-10 space-y-7">
                  <div className="space-y-1.5">
                    <h1 className="text-xl font-bold text-white">Acessar o painel</h1>
                    <p className="text-sm text-[hsl(210,20%,50%)]">Entre com as suas credenciais</p>
                  </div>

                  {mode === 'login' ? (
                    <form onSubmit={handleLogin} className="space-y-5">
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
                      <div className="flex justify-end">
                        <button type="button" onClick={() => setMode('forgot')} className="text-xs text-[hsl(200,60%,55%)] hover:text-[hsl(200,60%,65%)] font-medium transition-colors">
                          Esqueci minha senha
                        </button>
                      </div>
                      <button type="submit" disabled={loading}
                        className="w-full h-12 rounded-xl bg-gradient-to-r from-[hsl(200,70%,40%)] to-[hsl(215,65%,35%)] hover:from-[hsl(200,70%,45%)] hover:to-[hsl(215,65%,40%)] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-[hsl(200,70%,30%)]/30 hover:shadow-[hsl(200,70%,35%)]/40 disabled:opacity-50 active:scale-[0.98]">
                        <LogIn className="h-4 w-4" />
                        {loading ? 'Entrando...' : 'Entrar'}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleForgotPassword} className="space-y-5">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-[hsl(210,20%,50%)] uppercase tracking-[0.15em]">E-mail cadastrado</Label>
                        <div className="relative group">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(210,20%,40%)] group-focus-within:text-[hsl(200,70%,55%)] transition-colors" />
                          <input type="email" placeholder="seu.email@agir.org.br" value={email} onChange={(e) => setEmail(e.target.value)}
                            className="w-full h-12 pl-11 pr-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-[hsl(210,15%,35%)] focus:outline-none focus:border-[hsl(200,70%,45%)]/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-[hsl(200,70%,45%)]/20 transition-all" />
                        </div>
                      </div>
                      <button type="submit" disabled={loading}
                        className="w-full h-12 rounded-xl bg-gradient-to-r from-[hsl(200,70%,40%)] to-[hsl(215,65%,35%)] hover:from-[hsl(200,70%,45%)] hover:to-[hsl(215,65%,40%)] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-[hsl(200,70%,30%)]/30 disabled:opacity-50">
                        {loading ? 'Enviando...' : 'Enviar link de recuperação'}
                      </button>
                      <button type="button" onClick={() => setMode('login')} className="w-full text-center text-xs text-[hsl(200,60%,55%)] hover:text-[hsl(200,60%,65%)] font-medium transition-colors">
                        ← Voltar ao login
                      </button>
                    </form>
                  )}

                  <div className="pt-3 border-t border-white/[0.05]">
                    <p className="text-[10px] text-[hsl(210,15%,35%)] text-center tracking-wide">
                      Controle de Provimento · AGIR © {new Date().getFullYear()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — Info panel with map */}
          <div className="flex-1 hidden lg:flex flex-col items-center text-center space-y-8 order-2 max-w-[420px]">
            {/* Map */}
            <div className="relative">
              <img src={mapaNobg} alt="Presença AGIR no Brasil" className="w-[280px] h-auto opacity-80 drop-shadow-2xl" />
            </div>

            {/* Text */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-white leading-snug">
                Referência nacional em gestão de saúde
              </h2>
              <p className="text-[13px] text-[hsl(210,20%,50%)] leading-relaxed">
                Mais de duas décadas de experiência gerenciando hospitais, clínicas e unidades de pronto atendimento em 6 estados brasileiros — Goiás, Amazonas, São Paulo, Mato Grosso, Mato Grosso do Sul e Espírito Santo.
              </p>
            </div>

            {/* Stats row */}
            <div className="flex gap-8">
              {[
                { value: '20+', label: 'Unidades' },
                { value: '6', label: 'Estados' },
                { value: '20+', label: 'Anos' },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">{s.value}</div>
                  <div className="text-[10px] uppercase tracking-[0.15em] text-[hsl(210,20%,45%)] font-medium mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Pulse */}
            <div className="flex items-center gap-2 text-[hsl(200,60%,50%)]">
              <Activity className="h-3.5 w-3.5 animate-pulse" />
              <span className="text-[10px] uppercase tracking-[0.2em] font-medium">Sistema operacional</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scanline {
          0% { top: -2%; opacity: 0; }
          5% { opacity: 1; }
          95% { opacity: 1; }
          100% { top: 102%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
