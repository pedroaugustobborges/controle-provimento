import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { LogIn, Mail, Lock, Eye, EyeOff, Activity } from 'lucide-react';
import logoWhite from '@/assets/logo-agir-white.png';
import mapaDark from '@/assets/mapa-agir-dark.png';

export default function LoginPage() {
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<'login' | 'forgot'>('login');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Preencha e-mail e senha.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      toast.success('Login realizado com sucesso!');
    } catch (err: any) {
      const msg = err.message?.includes('Invalid login')
        ? 'E-mail ou senha incorretos.'
        : err.message || 'Erro ao fazer login.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Informe seu e-mail.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email);
      toast.success('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
      setMode('login');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar e-mail de recuperação.');
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { label: 'Unidades', value: '20+' },
    { label: 'Estados', value: '6' },
    { label: 'Colaboradores', value: '10k+' },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a1628]">
      {/* Full-screen animated background */}
      <div className="absolute inset-0">
        {/* Gradient mesh */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1f3c] via-[#0a1628] to-[#071020]" />
        
        {/* Animated gradient orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[hsl(200,80%,30%)] opacity-[0.08] blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-15%] right-[10%] w-[500px] h-[500px] rounded-full bg-[hsl(220,70%,25%)] opacity-[0.1] blur-[130px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[30%] right-[-5%] w-[300px] h-[300px] rounded-full bg-[hsl(190,80%,35%)] opacity-[0.06] blur-[100px] animate-pulse" style={{ animationDelay: '4s' }} />
        
        {/* Grid lines */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `
            linear-gradient(rgba(100,200,255,.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(100,200,255,.15) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }} />

        {/* Horizontal scan line animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute w-full h-px bg-gradient-to-r from-transparent via-[hsl(200,80%,50%)]/20 to-transparent"
            style={{
              animation: 'scanline 8s linear infinite',
              top: '0%',
            }}
          />
        </div>
      </div>

      {/* Map as large background element */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <img 
          src={mapaDark} 
          alt="" 
          className="w-[55%] max-w-[750px] h-auto opacity-[0.35] translate-x-[-15%] translate-y-[-3%]"
        />
      </div>

      {/* Content layer */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-[1100px] flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          
          {/* Left - Branding */}
          <div className="flex-1 text-center lg:text-left space-y-8 max-w-[500px]">
            {/* Logo */}
            <div className="flex items-center gap-3 justify-center lg:justify-start">
              <img src={logoWhite} alt="AGIR" className="h-12 brightness-110 drop-shadow-lg" />
            </div>

            {/* Tagline */}
            <div className="space-y-3">
              <h2 className="text-3xl lg:text-4xl font-bold text-white leading-tight">
                Controle de
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[hsl(190,80%,55%)] to-[hsl(210,80%,60%)]">
                  Provimento
                </span>
              </h2>
              <p className="text-[hsl(210,25%,55%)] text-sm lg:text-base leading-relaxed max-w-md">
                Gestão inteligente de vagas, editais e banco de talentos com presença em 6 estados brasileiros.
              </p>
            </div>

            {/* Stats */}
            <div className="hidden lg:flex gap-6">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center lg:text-left">
                  <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">
                    {stat.value}
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.15em] text-[hsl(210,20%,45%)] font-medium mt-1">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Pulse indicator */}
            <div className="hidden lg:flex items-center gap-2 text-[hsl(200,60%,50%)]">
              <Activity className="h-3.5 w-3.5 animate-pulse" />
              <span className="text-[11px] uppercase tracking-[0.2em] font-medium">Sistema operacional</span>
            </div>
          </div>

          {/* Right - Login Card */}
          <div className="w-full max-w-[420px]">
            <div className="relative">
              {/* Card glow */}
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-[hsl(200,60%,40%)]/30 via-transparent to-[hsl(220,60%,30%)]/20 blur-sm" />
              
              {/* Glass card */}
              <div className="relative rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] p-8 lg:p-10 space-y-7 shadow-2xl shadow-black/40">
                
                {/* Card header */}
                <div className="space-y-1.5">
                  <h1 className="text-xl font-bold text-white">
                    {mode === 'login' ? 'Acessar o sistema' : 'Recuperar senha'}
                  </h1>
                  <p className="text-sm text-[hsl(210,20%,50%)]">
                    {mode === 'login'
                      ? 'Entre com suas credenciais institucionais'
                      : 'Enviaremos um link para seu e-mail'}
                  </p>
                </div>

                {/* Form */}
                {mode === 'login' ? (
                  <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-[hsl(210,20%,50%)] uppercase tracking-[0.15em]">
                        E-mail
                      </Label>
                      <div className="relative group">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(210,20%,40%)] group-focus-within:text-[hsl(200,70%,55%)] transition-colors" />
                        <input
                          type="email"
                          placeholder="seu.email@agir.org.br"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full h-12 pl-11 pr-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-[hsl(210,15%,35%)] focus:outline-none focus:border-[hsl(200,70%,45%)]/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-[hsl(200,70%,45%)]/20 transition-all"
                          autoComplete="email"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-[hsl(210,20%,50%)] uppercase tracking-[0.15em]">
                        Senha
                      </Label>
                      <div className="relative group">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(210,20%,40%)] group-focus-within:text-[hsl(200,70%,55%)] transition-colors" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full h-12 pl-11 pr-12 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-[hsl(210,15%,35%)] focus:outline-none focus:border-[hsl(200,70%,45%)]/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-[hsl(200,70%,45%)]/20 transition-all"
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[hsl(210,20%,40%)] hover:text-white/70 transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setMode('forgot')}
                        className="text-xs text-[hsl(200,60%,55%)] hover:text-[hsl(200,60%,65%)] font-medium transition-colors"
                      >
                        Esqueci minha senha
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 rounded-xl bg-gradient-to-r from-[hsl(200,70%,40%)] to-[hsl(215,65%,35%)] hover:from-[hsl(200,70%,45%)] hover:to-[hsl(215,65%,40%)] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-[hsl(200,70%,30%)]/30 hover:shadow-[hsl(200,70%,35%)]/40 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                    >
                      <LogIn className="h-4 w-4" />
                      {loading ? 'Entrando...' : 'Entrar'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-5">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-[hsl(210,20%,50%)] uppercase tracking-[0.15em]">
                        E-mail cadastrado
                      </Label>
                      <div className="relative group">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(210,20%,40%)] group-focus-within:text-[hsl(200,70%,55%)] transition-colors" />
                        <input
                          type="email"
                          placeholder="seu.email@agir.org.br"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full h-12 pl-11 pr-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-[hsl(210,15%,35%)] focus:outline-none focus:border-[hsl(200,70%,45%)]/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-[hsl(200,70%,45%)]/20 transition-all"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 rounded-xl bg-gradient-to-r from-[hsl(200,70%,40%)] to-[hsl(215,65%,35%)] hover:from-[hsl(200,70%,45%)] hover:to-[hsl(215,65%,40%)] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-[hsl(200,70%,30%)]/30 disabled:opacity-50"
                    >
                      {loading ? 'Enviando...' : 'Enviar link de recuperação'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="w-full text-center text-xs text-[hsl(200,60%,55%)] hover:text-[hsl(200,60%,65%)] font-medium transition-colors"
                    >
                      ← Voltar ao login
                    </button>
                  </form>
                )}

                {/* Footer */}
                <div className="pt-3 border-t border-white/[0.05]">
                  <p className="text-[10px] text-[hsl(210,15%,35%)] text-center tracking-wide">
                    Controle de Provimento · AGIR © {new Date().getFullYear()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS animation for scanline */}
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
