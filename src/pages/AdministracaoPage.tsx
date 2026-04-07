import { useState } from 'react';
import { useVagasStore } from '@/store/vagasStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Settings, 
  Users, 
  Building2, 
  Clock, 
  ShieldCheck, 
  Bell, 
  Database,
  Lock,
  Plus,
  Trash2,
  Edit2
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EQUIPE_POR_UNIDADE, RESPONSAVEL_LIDERANCA } from '@/data/equipe';

export default function AdministracaoPage() {
  const [activeTab, setActiveTab] = useState('equipe');

  const unidades = [
    { id: '1', nome: 'Hospital Central (GO)', estado: 'GO', status: 'ativo', analistas: 5 },
    { id: '2', nome: 'Unidade Barra (ES)', estado: 'ES', status: 'ativo', analistas: 3 },
    { id: '3', nome: 'Hospital do Norte (GO)', estado: 'GO', status: 'ativo', analistas: 4 },
  ];

  const horarios = [
    { id: '1', hora: '08:30', capacidade: 5, status: 'ativo' },
    { id: '2', hora: '09:30', capacidade: 5, status: 'ativo' },
    { id: '3', hora: '10:30', capacidade: 5, status: 'ativo' },
    { id: '4', hora: '11:30', capacidade: 5, status: 'ativo' },
    { id: '5', hora: '12:30', capacidade: 5, status: 'ativo' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Administração</h1>
        <p className="text-slate-500 mt-1">Configurações globais do sistema e parâmetros operacionais.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="equipe" className="gap-2 font-bold px-6">
            <Users className="h-4 w-4" /> Equipe por Unidade
          </TabsTrigger>
          <TabsTrigger value="unidades" className="gap-2 font-bold px-6">
            <Building2 className="h-4 w-4" /> Unidades
          </TabsTrigger>
          <TabsTrigger value="horarios" className="gap-2 font-bold px-6">
            <Clock className="h-4 w-4" /> Horários
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="gap-2 font-bold px-6">
            <Users className="h-4 w-4" /> Usuários e Perfis
          </TabsTrigger>
          <TabsTrigger value="parametros" className="gap-2 font-bold px-6">
            <Settings className="h-4 w-4" /> Parâmetros
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unidades">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
              <div>
                <CardTitle className="text-lg font-bold">Gestão de Unidades (GO-ES)</CardTitle>
                <CardDescription>Cadastre e gerencie os complexos hospitalares participantes.</CardDescription>
              </div>
              <Button size="sm" className="gap-2 bg-primary">
                <Plus className="h-4 w-4" /> Nova Unidade
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="text-[10px] font-bold uppercase">Nome da Unidade</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-center">Estado</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-center">Analistas</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-center">Status</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unidades.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-bold text-slate-700 text-sm">{u.nome}</TableCell>
                      <TableCell className="text-center font-bold text-slate-500">{u.estado}</TableCell>
                      <TableCell className="text-center font-bold text-slate-500">{u.analistas}</TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-200 font-bold border-green-200">Ativo</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary"><Edit2 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="horarios">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
              <div>
                <CardTitle className="text-lg font-bold">Grade de Horários</CardTitle>
                <CardDescription>Defina os horários padrão e capacidade máxima para convocações em Goiânia.</CardDescription>
              </div>
              <Button size="sm" className="gap-2 bg-primary">
                <Plus className="h-4 w-4" /> Novo Horário
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="text-[10px] font-bold uppercase text-center">Horário</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-center">Capacidade Máxima</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-center">Status</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {horarios.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="text-center font-bold text-slate-800 text-lg">{h.hora}</TableCell>
                      <TableCell className="text-center font-bold text-slate-700">{h.capacidade} candidatos</TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-200 font-bold border-green-200">Ativo</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary"><Edit2 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600"><Lock className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usuarios">
          <Card className="border-slate-200 shadow-sm p-12 text-center text-slate-400 font-medium italic">
            Configurações de usuários e perfis de acesso em desenvolvimento.
          </Card>
        </TabsContent>

        <TabsContent value="parametros">
          <Card className="border-slate-200 shadow-sm p-12 text-center text-slate-400 font-medium italic">
            Parâmetros do sistema em desenvolvimento.
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
