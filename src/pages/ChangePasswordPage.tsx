import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { KeyRound, Eye, EyeOff, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import logoAgir from '@/assets/logo-agir.png';

function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return 'A senha deve ter no mínimo 8 caracteres.';
  if (!/[A-Za-z]/.test(password)) return 'A senha deve conter pelo menos uma letra.';
  if (!/\d/.test(password)) return 'A senha deve conter pelo menos um número.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'A senha deve conter pelo menos um símbolo (ex: @, #, !).';
  return null;
}

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const strengthError = newPassword ? validatePasswordStrength(newPassword) : null;
  const mismatch = confirmPassword && newPassword !== confirmPassword;
  const isValid = !strengthError && !mismatch && newPassword.length > 0 && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      // Clear the must_change_password flag
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ must_change_password: false })
          .eq('id', user.id);

        // Log to audit
        await supabase.from('audit_logs').insert({
          usuario_id: user.id,
          acao: 'PASSWORD_CHANGED_BY_USER',
          modulo: 'usuarios',
          registro_afetado: user.id,
        }).then(); // fire-and-forget; don't block on audit failure
      }

      toast.success('Senha alterada com sucesso!');
      navigate('/', { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar senha. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-slate-200">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex justify-center">
            <img src={logoAgir} alt="AGIR" className="h-12 object-contain" />
          </div>
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-7 w-7 text-primary" />
            </div>
          </div>
          <div>
            <CardTitle className="text-xl font-bold">Alterar Senha</CardTitle>
            <CardDescription className="text-sm text-slate-500 mt-1">
              Por segurança, defina uma nova senha para continuar acessando o sistema.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-sm font-semibold">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {strengthError && newPassword && (
                <p className="text-xs text-red-500">{strengthError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-sm font-semibold">Confirmar Senha</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {mismatch && (
                <p className="text-xs text-red-500">As senhas não coincidem.</p>
              )}
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700">Requisitos da senha:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li className={newPassword.length >= 8 ? 'text-green-600' : ''}>Mínimo 8 caracteres</li>
                <li className={/[A-Za-z]/.test(newPassword) ? 'text-green-600' : ''}>Pelo menos uma letra</li>
                <li className={/\d/.test(newPassword) ? 'text-green-600' : ''}>Pelo menos um número</li>
                <li className={/[^A-Za-z0-9]/.test(newPassword) ? 'text-green-600' : ''}>Pelo menos um símbolo (@, #, !, etc.)</li>
              </ul>
            </div>

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={!isValid || saving}
            >
              <KeyRound className="h-4 w-4" />
              {saving ? 'Salvando...' : 'Salvar Nova Senha'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
