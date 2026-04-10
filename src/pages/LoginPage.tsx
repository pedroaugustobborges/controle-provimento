import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { LogIn, Mail, Lock, Eye, EyeOff, MapPin } from 'lucide-react';
import logoWhite from '@/assets/logo-agir-white.png';
import mapaAgir from '@/assets/mapa-agir.png';

const locations = [
  { state: 'Goiás', units: 'CRER, HDS, HUGOL, HECAD, Policlínica, HEJ e 4 clínicas Teia Agir' },
  { state: 'Espírito Santo', units: 'P.A. Praia do Sul e P.A. São Pedro' },
  { state: 'São Paulo', units: 'HMSA e 2 clínicas Teia Agir' },
  { state: 'Amazonas', units: 'CHS e 3 clínicas Teia Agir' },
  { state: 'Mato Grosso', units: 'HRAF' },
  { state: 'Mato Grosso do Sul', units: 'HRD' },
];

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

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left panel - Branding & Map */}
      <div className="hidden lg:flex lg:w-[55%] relative bg-gradient-to-br from-[hsl(215,50%,18%)] via-[hsl(215,48%,22%)] to-[hsl(210,45%,28%)] overflow-hidden">
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        
        {/* Glowing orb accents */}
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[hsl(200,60%,40%)] opacity-10 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-[hsl(215,60%,35%)] opacity-10 blur-[100px]" />

        <div className="relative z-10 flex flex-col justify-between p-10 w-full">
          {/* Top - Logo */}
          <div className="flex items-center gap-3">
            <img src={logoWhite} alt="AGIR" className="h-10 brightness-110" />
          </div>

          {/* Center - Map */}
          <div className="flex-1 flex items-center justify-center py-6">
            <div className="relative max-w-[480px] w-full">
              <img 
                src={mapaAgir} 
                alt="Mapa de atuação AGIR" 
                className="w-full h-auto opacity-90 drop-shadow-2xl"
              />
            </div>
          </div>

          {/* Bottom - Location chips */}
          <div className="space-y-4">
            <p className="text-[hsl(210,30%,70%)] text-xs font-medium uppercase tracking-[0.2em]">
              Presença nacional
            </p>
            <div className="flex flex-wrap gap-2">
              {locations.map((loc) => (
                <div
                  key={loc.state}
                  className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.07] border border-white/[0.08] backdrop-blur-sm hover:bg-white/[0.12] transition-all cursor-default"
                  title={loc.units}
                >
                  <MapPin className="h-3 w-3 text-[hsl(200,70%,60%)]" />
                  <span className="text-xs font-medium text-white/80">{loc.state}</span>
                </div>
              ))}
            </div>
            <p className="text-[hsl(210,20%,55%)] text-[11px]">
              Gestão de saúde com excelência em 6 estados brasileiros
            </p>
          </div>
        </div>
      </div>

      {/* Right panel - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-background p-6 lg:p-12">
        <div className="w-full max-w-[400px] space-y-8">
          {/* Mobile logo */}
          <div className="flex lg:hidden justify-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
              <img src={logoWhite} alt="AGIR" className="w-9 h-9 object-contain" />
            </div>
          </div>

          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {mode === 'login' ? 'Bem-vindo de volta' : 'Recuperar senha'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === 'login'
                ? 'Acesse o Controle de Provimento com suas credenciais'
                : 'Enviaremos um link de recuperação para seu e-mail'}
            </p>
          </div>

          {/* Form */}
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  E-mail
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu.email@agir.org.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 bg-muted/50 border-border/60 focus:bg-background transition-colors"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 bg-muted/50 border-border/60 focus:bg-background transition-colors"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Esqueci minha senha
                </button>
              </div>

              <Button type="submit" className="w-full h-11 gap-2 text-sm font-semibold shadow-lg shadow-primary/20" disabled={loading}>
                <LogIn className="h-4 w-4" />
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email-forgot" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  E-mail cadastrado
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    id="email-forgot"
                    type="email"
                    placeholder="seu.email@agir.org.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 bg-muted/50 border-border/60 focus:bg-background transition-colors"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-11 text-sm font-semibold shadow-lg shadow-primary/20" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </Button>

              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-center text-xs text-primary hover:text-primary/80 font-medium transition-colors"
              >
                ← Voltar ao login
              </button>
            </form>
          )}

          {/* Footer */}
          <div className="pt-4 border-t border-border/40">
            <p className="text-[11px] text-muted-foreground/60 text-center">
              Controle de Provimento · AGIR © {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
