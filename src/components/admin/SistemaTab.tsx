import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Wrench, Sparkles, Send, Power, History } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MaintRow {
  id: string;
  is_active: boolean;
  message: string | null;
  expected_return_at: string | null;
  activated_at: string | null;
  deactivated_at: string | null;
  activated_by: string | null;
}

interface UpdateRow {
  id: string;
  version: string | null;
  message: string;
  action_type: 'reload' | 'relogin';
  is_mandatory: boolean;
  published_at: string;
}

export function SistemaTab() {
  return (
    <Tabs defaultValue="manutencao" className="w-full">
      <TabsList>
        <TabsTrigger value="manutencao" className="gap-2"><Wrench className="h-4 w-4" /> Manutenção</TabsTrigger>
        <TabsTrigger value="atualizacoes" className="gap-2"><Sparkles className="h-4 w-4" /> Atualizações</TabsTrigger>
      </TabsList>
      <TabsContent value="manutencao" className="mt-4">
        <ManutencaoSection />
      </TabsContent>
      <TabsContent value="atualizacoes" className="mt-4">
        <AtualizacoesSection />
      </TabsContent>
    </Tabs>
  );
}

function ManutencaoSection() {
  const [current, setCurrent] = useState<MaintRow | null>(null);
  const [history, setHistory] = useState<MaintRow[]>([]);
  const [message, setMessage] = useState('');
  const [expectedReturnAt, setExpectedReturnAt] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase
      .from('system_maintenance')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    const rows = (data || []) as MaintRow[];
    setCurrent(rows[0] || null);
    setHistory(rows);
    if (rows[0]?.is_active) {
      setMessage(rows[0].message || '');
      setExpectedReturnAt(rows[0].expected_return_at?.slice(0, 16) || '');
    }
  }

  useEffect(() => { load(); }, []);

  async function activate() {
    setBusy(true);
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id;
    const { error } = await supabase.from('system_maintenance').insert({
      is_active: true,
      message: message || null,
      expected_return_at: expectedReturnAt ? new Date(expectedReturnAt).toISOString() : null,
      activated_by: uid,
      activated_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) {
      toast.error('Erro ao ativar manutenção: ' + error.message);
      return;
    }
    toast.success('Modo de manutenção ativado. Usuários não-admin serão deslogados.');
    load();
  }

  async function deactivate() {
    if (!current) return;
    setBusy(true);
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id;
    const { error } = await supabase
      .from('system_maintenance')
      .update({
        is_active: false,
        deactivated_at: new Date().toISOString(),
        deactivated_by: uid,
      })
      .eq('id', current.id);
    setBusy(false);
    if (error) {
      toast.error('Erro ao desativar: ' + error.message);
      return;
    }
    toast.success('Manutenção desativada.');
    load();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Power className="h-5 w-5" />
            Modo de Manutenção
            {current?.is_active && <Badge variant="destructive">ATIVO</Badge>}
          </CardTitle>
          <CardDescription>
            Quando ativo, todos os usuários (exceto administradores) são deslogados e bloqueados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Mensagem para os usuários</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex: Estamos realizando melhorias. Voltamos em instantes."
              rows={3}
              disabled={current?.is_active}
            />
          </div>
          <div className="space-y-2">
            <Label>Previsão de retorno (opcional)</Label>
            <Input
              type="datetime-local"
              value={expectedReturnAt}
              onChange={(e) => setExpectedReturnAt(e.target.value)}
              disabled={current?.is_active}
            />
          </div>
          <div className="flex gap-2">
            {current?.is_active ? (
              <Button onClick={deactivate} disabled={busy} variant="default">
                Desativar manutenção
              </Button>
            ) : (
              <Button onClick={activate} disabled={busy} variant="destructive">
                Ativar manutenção
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Histórico</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum registro.</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="text-sm border rounded-lg p-3 flex items-start justify-between">
                  <div>
                    <p className="font-medium">{h.message || '(sem mensagem)'}</p>
                    <p className="text-xs text-muted-foreground">
                      Ativado: {h.activated_at ? format(parseISO(h.activated_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '—'}
                      {h.deactivated_at && ` · Desativado: ${format(parseISO(h.deactivated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}`}
                    </p>
                  </div>
                  <Badge variant={h.is_active ? 'destructive' : 'secondary'}>
                    {h.is_active ? 'Ativo' : 'Encerrado'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AtualizacoesSection() {
  const [list, setList] = useState<UpdateRow[]>([]);
  const [version, setVersion] = useState('');
  const [message, setMessage] = useState('');
  const [actionType, setActionType] = useState<'reload' | 'relogin'>('reload');
  const [isMandatory, setIsMandatory] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase
      .from('system_updates')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(20);
    setList((data || []) as UpdateRow[]);
  }

  useEffect(() => { load(); }, []);

  async function publish() {
    if (!message.trim()) {
      toast.error('Informe a mensagem da atualização.');
      return;
    }
    setBusy(true);
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id;
    const { error } = await supabase.from('system_updates').insert({
      version: version || null,
      message,
      action_type: actionType,
      is_mandatory: isMandatory,
      published_by: uid,
    });
    setBusy(false);
    if (error) {
      toast.error('Erro ao publicar: ' + error.message);
      return;
    }
    toast.success('Atualização publicada. Todos os usuários serão notificados.');
    setVersion(''); setMessage(''); setActionType('reload'); setIsMandatory(false);
    load();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" /> Publicar atualização</CardTitle>
          <CardDescription>Notifica todos os usuários conectados em tempo real.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Versão (opcional)</Label>
              <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="ex: 2.4.1" />
            </div>
            <div className="space-y-2">
              <Label>Tipo de ação</Label>
              <Select value={actionType} onValueChange={(v) => setActionType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="reload">Recarregar página</SelectItem>
                  <SelectItem value="relogin">Deslogar e logar novamente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Checkbox id="mandatory" checked={isMandatory} onCheckedChange={(v) => setIsMandatory(!!v)} />
              <Label htmlFor="mandatory" className="cursor-pointer">Atualização obrigatória</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Mensagem *</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Descreva brevemente as melhorias desta versão..."
            />
          </div>
          <Button onClick={publish} disabled={busy}>Publicar atualização</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimas publicações</CardTitle>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma atualização publicada.</p>
          ) : (
            <div className="space-y-2">
              {list.map((u) => (
                <div key={u.id} className="text-sm border rounded-lg p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {u.version && <span className="text-primary mr-2">v{u.version}</span>}
                      {u.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(parseISO(u.published_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 items-end shrink-0">
                    <Badge variant="outline">{u.action_type === 'reload' ? 'Recarregar' : 'Relogar'}</Badge>
                    {u.is_mandatory && <Badge variant="destructive">Obrigatória</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
