 import { useState, useMemo, useEffect, useRef } from 'react';
 import { motion, AnimatePresence } from 'framer-motion';
 import { useAdminStore } from '@/store/adminStore';
 import { useAuth } from '@/hooks/useAuth';
 import { useNavigate } from 'react-router-dom';
 import { toast } from 'sonner';
 import { 
   LayoutDashboard, Calendar, Users, Briefcase, Clock, 
   Activity, GraduationCap, Download, LogOut, ChevronRight,
   Plus, Search, Filter, MoreHorizontal, CheckCircle2,
   AlertCircle, ShieldCheck, MapPin, ListTodo, MessageSquare
 } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
 import { Input } from '@/components/ui/input';
 import { Badge } from '@/components/ui/badge';
 import { 
   Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
 } from '@/components/ui/table';
 import { 
   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
 } from 'recharts';
 import { cn } from '@/lib/utils';
 
 // Helper icon for TeamModule
 const Building2 = ({ className }: { className?: string }) => (
   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/><path d="M15 2h2a2 2 0 0 1 2 2v18"/></svg>
 );
 
   const Dashboard = () => {
     const stats = [
       { label: 'Analistas', value: 8, icon: ShieldCheck, color: 'text-blue-600', bg: 'bg-blue-50/50' },
       { label: 'Assistentes', value: 12, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50/50' },
       { label: 'Férias', value: 3, icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50/50' },
       { label: 'Folgas/Day Off', value: 2, icon: Clock, color: 'text-emerald-600', bg: 'bg-emerald-50/50' },
       { label: 'Coberturas Ativas', value: 4, icon: Activity, color: 'text-rose-600', bg: 'bg-rose-50/50' },
       { label: 'Unidades Ativas', value: 24, icon: Building2, color: 'text-slate-600', bg: 'bg-slate-50/50' },
       { label: 'Alinhamentos', value: 15, icon: MessageSquare, color: 'text-cyan-600', bg: 'bg-cyan-50/50' },
       { label: 'Treinamentos', value: 6, icon: GraduationCap, color: 'text-purple-600', bg: 'bg-purple-50/50' },
     ];
 
   const chartData = [
     { name: 'Analista A', unidades: 4 },
     { name: 'Analista B', unidades: 6 },
     { name: 'Analista C', unidades: 3 },
     { name: 'Analista D', unidades: 5 },
     { name: 'Analista E', unidades: 4 },
   ];
 
   return (
     <div className="space-y-6">
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         {stats.map((stat, i) => (
           <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
             <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
               <CardContent className="p-5">
                 <div className="flex items-start justify-between">
                   <div className={cn("p-2.5 rounded-xl border border-white shadow-sm", stat.bg)}>
                     <stat.icon className={cn("h-5 w-5", stat.color)} />
                   </div>
                   <div className="flex flex-col items-end">
                     <span className="text-2xl font-black text-slate-900 tracking-tight">{stat.value}</span>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{stat.label}</span>
                   </div>
                 </div>
               </CardContent>
             </Card>
           </motion.div>
         ))}
       </div>
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <Card className="border-none shadow-sm">
           <CardHeader><CardTitle className="text-lg font-semibold">Distribuição de Unidades por Analista</CardTitle></CardHeader>
           <CardContent className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} tick={{ fill: '#64748b' }} />
                 <YAxis axisLine={false} tickLine={false} fontSize={12} tick={{ fill: '#64748b' }} />
                 <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none' }} cursor={{ fill: '#f8fafc' }} />
                 <Bar dataKey="unidades" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
               </BarChart>
             </ResponsiveContainer>
           </CardContent>
         </Card>
         <Card className="border-none shadow-sm">
           <CardHeader className="flex flex-row items-center justify-between">
             <div>
               <CardTitle className="text-lg font-semibold">Próximos Eventos</CardTitle>
               <CardDescription>Agenda interna da equipe</CardDescription>
             </div>
           </CardHeader>
           <CardContent>
             <div className="space-y-4">
               {[
                 { title: 'Treinamento de Onboarding', date: 'Amanhã, 09:00', type: 'Treinamento' },
                 { title: 'Alinhamento Trimestral', date: '25 Out, 14:00', type: 'Alinhamento' },
               ].map((event, i) => (
                 <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                   <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                     <Calendar className="h-5 w-5" />
                   </div>
                   <div className="flex-1">
                     <h4 className="text-sm font-semibold text-slate-900">{event.title}</h4>
                     <p className="text-xs text-slate-500">{event.date}</p>
                   </div>
                 </div>
               ))}
             </div>
           </CardContent>
         </Card>
       </div>
     </div>
   );
 };
 
   const AbsenceModule = () => {
     const [searchTerm, setSearchTerm] = useState('');
     const absences = [
       { id: 1, name: 'Ana Silva', role: 'Analista ADM', type: 'férias', start: '2023-11-01', end: '2023-11-30', status: 'aprovado', coverage: 'Sim', coveredBy: 'Bruno G.' },
       { id: 2, name: 'Bruno Gomes', role: 'Analista ADM', type: 'folga', start: '2023-10-25', end: '2023-10-25', status: 'em_analise', coverage: 'Não', coveredBy: '-' },
     ];
     return (
       <div className="space-y-6">
         <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
           <div>
             <h3 className="text-2xl font-black text-slate-900 tracking-tight">Férias, Folgas e Day Off</h3>
             <p className="text-sm text-slate-500 font-medium">Gestão centralizada de ausências e coberturas</p>
           </div>
           <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 h-11 font-bold shadow-lg shadow-indigo-200 transition-all">
             <Plus className="h-4 w-4 mr-2" /> Novo Registro
           </Button>
         </div>
 
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           {[
             { label: 'Férias Ativas', value: '3', color: 'text-blue-600', bg: 'bg-blue-50' },
             { label: 'Folgas Pendentes', value: '5', color: 'text-amber-600', bg: 'bg-amber-50' },
             { label: 'Day Offs (Mês)', value: '8', color: 'text-emerald-600', bg: 'bg-emerald-50' },
           ].map((stat, i) => (
             <Card key={i} className="border-none shadow-sm bg-white p-5 rounded-2xl">
               <div className="flex items-center gap-4">
                 <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", stat.bg)}>
                   <Calendar className={cn("h-5 w-5", stat.color)} />
                 </div>
                 <div>
                   <p className="text-2xl font-black text-slate-900">{stat.value}</p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                 </div>
               </div>
             </Card>
           ))}
         </div>
 
         <Card className="border-none shadow-sm overflow-hidden rounded-2xl bg-white">
           <div className="p-4 border-b border-slate-50 bg-slate-50/30 flex flex-wrap gap-4 items-center justify-between">
             <div className="relative w-full md:w-80">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
               <Input 
                 placeholder="Buscar colaborador..." 
                 className="pl-10 h-10 bg-white border-slate-200 rounded-xl focus-visible:ring-indigo-500"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
             </div>
             <div className="flex gap-2">
               <Button variant="outline" className="h-10 rounded-xl border-slate-200 font-bold text-slate-600 text-xs">
                 <Filter className="h-4 w-4 mr-2" /> Filtros
               </Button>
               <Button variant="outline" className="h-10 rounded-xl border-slate-200 font-bold text-slate-600 text-xs">
                 Outubro 2023
               </Button>
             </div>
           </div>
           <Table>
             <TableHeader className="bg-slate-50/50">
               <TableRow className="hover:bg-transparent border-slate-100">
                 <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-400 py-4">Colaborador</TableHead>
                 <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-400 py-4">Tipo</TableHead>
                 <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-400 py-4">Período</TableHead>
                 <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-400 py-4">Cobertura</TableHead>
                 <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-400 py-4">Status</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {absences.map(item => (
                 <TableRow key={item.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <TableCell className="py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 text-sm">{item.name}</span>
                      <span className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">{item.role}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn(
                      "border-none font-bold text-[9px] px-2.5 py-1 rounded-lg uppercase tracking-wider", 
                      item.type === 'férias' ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"
                    )}>
                      {item.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-slate-600">
                    {item.start} <span className="text-slate-300 mx-1">→</span> {item.end}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className={cn("text-[10px] font-black uppercase tracking-widest", item.coverage === 'Sim' ? "text-indigo-600" : "text-slate-400")}>
                        {item.coverage === 'Sim' ? 'Com Cobertura' : 'Sem Cobertura'}
                      </span>
                      {item.coveredBy !== '-' && <span className="text-xs font-bold text-slate-600 mt-0.5">{item.coveredBy}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(
                      "capitalize border-none font-bold text-[10px] px-3 py-1 rounded-full",
                      item.status === 'aprovado' ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    )}>
                      {item.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                 </TableRow>
               ))}
             </TableBody>
           </Table>
         </Card>
       </div>
     );
   };
 
   const ScopesModule = () => {
     const scopes = [
       { role: 'Analista ADM', name: 'Ricardo M.', scope: 'Gestão de Unidades e Escala', responsibilities: 'Controle de frequência, validação de plantões e cobertura de férias.' },
       { role: 'Assistente ADM', name: 'Juliana F.', scope: 'Suporte Operacional', responsibilities: 'Lançamento de dados, atendimento à ponta e auxílio em relatórios.' },
     ];
     return (
       <div className="space-y-6">
         <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
           <div>
             <h3 className="text-2xl font-black text-slate-900 tracking-tight">Funções e Escopos</h3>
             <p className="text-sm text-slate-500 font-medium">Definição clara de responsabilidades por cargo</p>
           </div>
           <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 h-11 font-bold shadow-lg shadow-indigo-200 transition-all">
             <Plus className="h-4 w-4 mr-2" /> Novo Escopo
           </Button>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {scopes.map((s, i) => (
             <Card key={i} className="border-none shadow-sm hover:shadow-xl transition-all duration-500 rounded-[2rem] bg-white overflow-hidden group">
               <div className="p-8">
                 <div className="flex items-start justify-between mb-8">
                   <div className="flex items-center gap-5">
                     <div className="h-16 w-16 bg-slate-50 rounded-[1.25rem] flex items-center justify-center text-indigo-600 border border-slate-100 shadow-inner group-hover:scale-110 transition-transform duration-500">
                       <Briefcase className="h-8 w-8" />
                     </div>
                     <div>
                       <h4 className="font-black text-xl text-slate-900 tracking-tight">{s.role}</h4>
                       <div className="flex items-center gap-2 mt-1">
                         <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                         <p className="text-sm text-indigo-600 font-black uppercase tracking-widest">{s.name}</p>
                       </div>
                     </div>
                   </div>
                   <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-50">
                     <MoreHorizontal className="h-5 w-5 text-slate-400" />
                   </Button>
                 </div>
                 <div className="space-y-6 relative">
                   <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-50 rounded-full" />
                   <div className="pl-6">
                     <p className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] mb-2">Escopo Principal</p>
                     <p className="text-base text-slate-800 font-bold leading-relaxed">{s.scope}</p>
                   </div>
                   <div className="pl-6">
                     <p className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] mb-2">Atribuições Detalhadas</p>
                     <p className="text-sm text-slate-500 leading-relaxed font-medium">{s.responsibilities}</p>
                   </div>
                 </div>
                 <div className="mt-8 pt-6 border-t border-slate-50 flex justify-end">
                    <Button variant="link" className="text-indigo-600 font-black uppercase tracking-widest text-[10px] h-auto p-0 hover:no-underline hover:translate-x-1 transition-transform">
                      Ver Histórico <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                 </div>
               </div>
             </Card>
           ))}
         </div>
       </div>
     );
   };
 
   const RoutinesModule = () => {
     const routines = [
       { task: 'Fechamento de Ponto', deadline: 'Todo dia 05', status: 'pendente', priority: 'alta' },
       { task: 'Relatório de Absenteísmo', deadline: 'Semanal (Sexta)', status: 'em_andamento', priority: 'media' },
       { task: 'Validação de Coberturas', deadline: 'Diário', status: 'concluido', priority: 'alta' },
     ];
     return (
       <div className="space-y-6">
         <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
           <div>
             <h3 className="text-2xl font-black text-slate-900 tracking-tight">Prazos e Rotinas</h3>
             <p className="text-sm text-slate-500 font-medium">Monitoramento de entregas e obrigações recorrentes</p>
           </div>
           <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 h-11 font-bold shadow-lg shadow-indigo-200 transition-all">
             <Plus className="h-4 w-4 mr-2" /> Nova Atividade
           </Button>
         </div>
 
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           {[
             { label: 'Total Tarefas', value: '12', icon: ListTodo, color: 'text-slate-600', bg: 'bg-slate-50' },
             { label: 'Em Atraso', value: '2', icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
             { label: 'Próximas 48h', value: '4', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
             { label: 'Concluídas', value: '6', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
           ].map((stat, i) => (
             <Card key={i} className="border-none shadow-sm bg-white p-5 rounded-2xl">
               <div className="flex items-center justify-between">
                 <div className={cn("p-2 rounded-xl", stat.bg)}>
                   <stat.icon className={cn("h-5 w-5", stat.color)} />
                 </div>
                 <div className="text-right">
                   <p className="text-xl font-black text-slate-900">{stat.value}</p>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                 </div>
               </div>
             </Card>
           ))}
         </div>
 
         <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
           <div className="p-4 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
             <div className="relative w-80">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
               <Input placeholder="Filtrar atividades..." className="pl-10 h-10 bg-white border-slate-200 rounded-xl" />
             </div>
             <Button variant="outline" className="h-10 rounded-xl border-slate-200 font-bold text-slate-600 text-xs">
               <Filter className="h-4 w-4 mr-2" /> Prioridade
             </Button>
           </div>
           <Table>
             <TableHeader className="bg-slate-50/50">
               <TableRow className="border-slate-100">
                 <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-4">Atividade</TableHead>
                 <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-4">Prazo Fatal</TableHead>
                 <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-4">Prioridade</TableHead>
                 <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-4">Status</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {routines.map((r, i) => (
                 <TableRow key={i} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                   <TableCell className="font-bold text-slate-800 py-5">{r.task}</TableCell>
                   <TableCell className="text-slate-500 font-bold text-xs">{r.deadline}</TableCell>
                   <TableCell>
                     <Badge className={cn(
                       "border-none font-black text-[9px] px-2.5 py-1 rounded-lg uppercase tracking-wider",
                       r.priority === 'alta' ? "bg-rose-50 text-rose-700 shadow-sm shadow-rose-100" : "bg-blue-50 text-blue-700 shadow-sm shadow-blue-100"
                     )}>{r.priority}</Badge>
                   </TableCell>
                   <TableCell>
                      <Badge variant="outline" className={cn(
                        "capitalize border-none font-bold text-[10px] px-3 py-1 rounded-full",
                        r.status === 'concluido' ? "bg-emerald-50 text-emerald-700" : 
                        r.status === 'em_andamento' ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"
                      )}>
                        {r.status.replace('_', ' ')}
                      </Badge>
                   </TableCell>
                 </TableRow>
               ))}
             </TableBody>
           </Table>
         </Card>
       </div>
     );
   };
 
   const ScaleModule = () => {
     const teamStatus = [
       { name: 'Ana Silva', status: 'Ativo', coverage: '-', location: 'Unidade Central' },
       { name: 'Bruno Gomes', status: 'Ausente', coverage: 'Ricardo M.', location: 'Unidade Sul' },
       { name: 'Ricardo M.', status: 'Cobrindo', coverage: 'Cobrindo Bruno G.', location: 'Unidade Sul' },
       { name: 'Juliana F.', status: 'Ativo', coverage: '-', location: 'Unidade Norte' },
       { name: 'Marcos P.', status: 'Ativo', coverage: '-', location: 'Unidade Leste' },
     ];
     return (
       <div className="space-y-6">
         <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
           <div>
             <h3 className="text-2xl font-black text-slate-900 tracking-tight">Escala e Acompanhamento</h3>
             <p className="text-sm text-slate-500 font-medium">Status da equipe em tempo real por unidade</p>
           </div>
           <div className="flex gap-2">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-[10px] font-bold uppercase tracking-widest">
               <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
               18 Ativos
             </div>
             <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-full border border-rose-100 text-[10px] font-bold uppercase tracking-widest">
               2 Ausentes
             </div>
           </div>
         </div>
 
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
           {teamStatus.map((t, i) => (
             <Card key={i} className="border-none shadow-sm hover:shadow-lg transition-all duration-300 rounded-[1.5rem] p-6 bg-white relative overflow-hidden group">
               <div className={cn(
                 "absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-[0.03] transition-transform duration-700 group-hover:scale-150",
                 t.status === 'Ativo' ? "bg-emerald-500" : t.status === 'Ausente' ? "bg-rose-500" : "bg-indigo-500"
               )} />
               
               <div className="flex flex-col items-center text-center">
                 <div className="relative mb-4">
                    <div className={cn(
                      "h-20 w-20 rounded-2xl flex items-center justify-center font-black text-2xl border-2 transition-transform duration-500 group-hover:rotate-6",
                      t.status === 'Ativo' ? "bg-emerald-50 border-emerald-100 text-emerald-600" : 
                      t.status === 'Ausente' ? "bg-rose-50 border-rose-100 text-rose-600" : "bg-indigo-50 border-indigo-100 text-indigo-600"
                    )}>
                      {t.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className={cn(
                      "absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white",
                      t.status === 'Ativo' ? "bg-emerald-500" : t.status === 'Ausente' ? "bg-rose-500" : "bg-indigo-500"
                    )} />
                 </div>
                 
                 <h4 className="font-black text-slate-900 tracking-tight text-lg">{t.name}</h4>
                 <div className="flex items-center gap-1.5 mt-1 text-slate-400">
                   <MapPin className="h-3 w-3" />
                   <span className="text-[10px] font-bold uppercase tracking-widest">{t.location}</span>
                 </div>
 
                 <div className="mt-6 w-full pt-6 border-t border-slate-50">
                   <div className="flex justify-between items-center mb-1">
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Situação</span>
                     <Badge className={cn(
                       "border-none font-black text-[9px] px-2.5 py-0.5 rounded-lg uppercase tracking-wider",
                       t.status === 'Ativo' ? "bg-emerald-50 text-emerald-700" : 
                       t.status === 'Ausente' ? "bg-rose-50 text-rose-700" : "bg-indigo-50 text-indigo-700"
                     )}>{t.status}</Badge>
                   </div>
                   {t.coverage !== '-' && (
                      <div className="flex justify-between items-center mt-3 p-2 bg-slate-50 rounded-xl">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cobertura</span>
                        <span className="text-[10px] font-bold text-indigo-600">{t.coverage}</span>
                      </div>
                   )}
                 </div>
               </div>
             </Card>
           ))}
         </div>
       </div>
     );
   };
 
   const TrainingModule = () => {
     const [searchTerm, setSearchTerm] = useState('');
     const records = [
       { person: 'Juliana F.', type: 'Alinhamento', theme: 'Novas Regras de Escala', date: '22 Out 2023', status: 'concluido', description: 'Revisão das normas de plantão e sobreaviso para o Q4.' },
       { person: 'Ricardo M.', type: 'Treinamento', theme: 'Ferramenta de Dashboards', date: '20 Out 2023', status: 'concluido', description: 'Capacitação no novo módulo de BI para analistas seniores.' },
       { person: 'Bruno G.', type: 'Treinamento', theme: 'Ética e Compliance', date: '18 Out 2023', status: 'pendente', description: 'Treinamento obrigatório anual de compliance corporativo.' },
     ];
     return (
       <div className="space-y-6">
         <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
           <div>
             <h3 className="text-2xl font-black text-slate-900 tracking-tight">Alinhamentos e Treinamentos</h3>
             <p className="text-sm text-slate-500 font-medium">Desenvolvimento contínuo e sincronização de processos</p>
           </div>
           <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 h-11 font-bold shadow-lg shadow-indigo-200 transition-all">
             <Plus className="h-4 w-4 mr-2" /> Novo Registro
           </Button>
         </div>
 
         <div className="flex flex-wrap gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-50 shadow-sm">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar por tema ou colaborador..." 
                className="pl-10 h-10 border-slate-200 rounded-xl focus-visible:ring-indigo-500" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="h-10 rounded-xl border-slate-200 text-xs font-bold text-slate-600">
                <Filter className="h-4 w-4 mr-2" /> Tipo
              </Button>
              <Button variant="outline" className="h-10 rounded-xl border-slate-200 text-xs font-bold text-slate-600">
                Período
              </Button>
            </div>
         </div>
 
         <div className="relative space-y-4">
           <div className="absolute left-[31px] top-4 bottom-4 w-0.5 bg-slate-100 hidden md:block" />
           {records.map((r, i) => (
             <Card key={i} className="border-none shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl bg-white overflow-hidden group">
               <div className="p-5 md:p-6 flex flex-col md:flex-row gap-6">
                 <div className="relative z-10 hidden md:flex items-center justify-center shrink-0">
                    <div className={cn(
                      "h-16 w-16 rounded-2xl flex items-center justify-center border-4 border-white shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3",
                      r.type === 'Alinhamento' ? "bg-cyan-50 text-cyan-600" : "bg-purple-50 text-purple-600"
                    )}>
                      {r.type === 'Alinhamento' ? <MessageSquare className="h-7 w-7" /> : <GraduationCap className="h-7 w-7" />}
                    </div>
                 </div>
                 
                 <div className="flex-1">
                   <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                     <div className="flex items-center gap-3">
                       <Badge className={cn(
                         "border-none font-black text-[9px] px-2.5 py-1 rounded-lg uppercase tracking-wider",
                         r.type === 'Alinhamento' ? "bg-cyan-100 text-cyan-700" : "bg-purple-100 text-purple-700"
                       )}>{r.type}</Badge>
                       <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{r.date}</span>
                     </div>
                     <Badge variant="outline" className={cn(
                        "capitalize border-none font-bold text-[10px] px-3 py-1 rounded-full",
                        r.status === 'concluido' ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                     )}>
                        {r.status}
                     </Badge>
                   </div>
                   
                   <h4 className="text-xl font-black text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">{r.theme}</h4>
                   <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">{r.description}</p>
                   
                   <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-50">
                     <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                          {r.person[0]}
                        </div>
                        <span className="text-xs font-bold text-slate-700">Responsável: {r.person}</span>
                     </div>
                     <Button variant="ghost" className="h-8 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                       Detalhes do Registro
                     </Button>
                   </div>
                 </div>
               </div>
             </Card>
           ))}
         </div>
       </div>
     );
   };
 
 const ExportModule = () => {
   const exportOptions = [
     { title: 'Quadro da Equipe', formats: ['PDF', 'Imagem', 'Excel'] },
     { title: 'Relatório de Ausências', formats: ['Excel', 'PDF'] },
     { title: 'Escala e Acompanhamento', formats: ['Excel'] },
   ];
   return (
     <div className="space-y-6">
       <h3 className="text-2xl font-bold text-slate-900">Central de Exportações</h3>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {exportOptions.map((opt, i) => (
           <Card key={i} className="border-none shadow-sm rounded-3xl p-6">
             <h4 className="font-bold text-lg mb-4">{opt.title}</h4>
             <div className="flex gap-2">
               {opt.formats.map(fmt => (
                 <Button key={fmt} variant="outline" className="rounded-xl border-slate-200 text-xs font-bold hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                   {fmt}
                 </Button>
               ))}
             </div>
           </Card>
         ))}
       </div>
     </div>
   );
 };
 
 const TeamModule = () => (
     <div className="space-y-6">
         <div className="flex items-center justify-between">
             <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Quadro da Equipe</h3>
             <div className="flex gap-2">
                 <Button variant="outline" className="rounded-full border-slate-200">Exportar PDF</Button>
                 <Button className="bg-indigo-600 rounded-full">Novo Vínculo</Button>
             </div>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
             {[1,2,3,4,5,6].map(i => (
                 <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 group hover:shadow-md transition-all">
                     <Building2 className="h-10 w-10 text-indigo-600 mb-4 bg-indigo-50 p-2 rounded-xl" />
                     <h4 className="font-bold text-slate-900">Unidade {i}</h4>
                     <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Goiânia - GO</p>
                     <div className="mt-6 pt-4 border-t border-slate-50 space-y-2">
                         <div className="flex justify-between">
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Analista</span>
                             <span className="text-xs font-bold text-slate-700">Ricardo M.</span>
                         </div>
                         <div className="flex justify-between">
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assistente</span>
                             <span className="text-xs font-bold text-slate-700">Juliana F.</span>
                         </div>
                     </div>
                 </div>
             ))}
         </div>
     </div>
 );
 
 export default function PortalRHPage() {
   const navigate = useNavigate();
   const { currentUser, fetchCurrentProfile } = useAdminStore();
   const [activeTab, setActiveTab] = useState('dashboard');
   useEffect(() => { fetchCurrentProfile(); }, [fetchCurrentProfile]);
 
   const menuItems = [
     { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
     { id: 'absences', label: 'Férias, Folgas e Day Off', icon: Calendar },
     { id: 'team', label: 'Quadro da Equipe', icon: Users },
     { id: 'scopes', label: 'Funções e Escopos', icon: Briefcase },
     { id: 'routines', label: 'Prazos e Rotinas', icon: ListTodo },
     { id: 'scale', label: 'Escala e Acompanhamento', icon: Activity },
     { id: 'training', label: 'Alinhamentos e Treinamentos', icon: GraduationCap },
     { id: 'export', label: 'Exportações', icon: Download },
   ];
 
   const renderContent = () => {
     switch (activeTab) {
       case 'dashboard': return <Dashboard />;
       case 'absences': return <AbsenceModule />;
       case 'team': return <TeamModule />;
       case 'scopes': return <ScopesModule />;
       case 'routines': return <RoutinesModule />;
       case 'scale': return <ScaleModule />;
       case 'training': return <TrainingModule />;
       case 'export': return <ExportModule />;
       default: return <div className="text-slate-400">Módulo em desenvolvimento</div>;
     }
   };
 
   return (
     <div className="flex min-h-screen bg-[#F8FAFC] font-sans">
       {/* Desktop Sidebar */}
       <aside className="w-72 bg-white border-r border-slate-100 hidden lg:flex flex-col sticky top-0 h-screen z-20">
         <div className="p-8 flex flex-col h-full">
           <div className="flex items-center gap-3 mb-10 group cursor-pointer" onClick={() => navigate('/')}>
             <div className="h-10 w-10 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 group-hover:scale-105 transition-transform">
               <ShieldCheck className="text-white h-6 w-6" />
             </div>
             <div>
               <h1 className="font-bold text-slate-900 tracking-tight leading-tight">Portal RH</h1>
               <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Gestão Interna</p>
             </div>
           </div>
 
           <nav className="space-y-1 flex-1">
             {menuItems.map((item) => {
               const isActive = activeTab === item.id;
               return (
                 <button
                   key={item.id}
                   onClick={() => setActiveTab(item.id)}
                   className={cn(
                     "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-bold transition-all duration-300 group relative",
                     isActive 
                       ? "bg-indigo-50/50 text-indigo-600 shadow-sm" 
                       : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                   )}
                 >
                   <item.icon className={cn(
                     "h-5 w-5 transition-transform duration-300 group-hover:scale-110",
                     isActive ? "text-indigo-600" : "text-slate-400"
                   )} />
                   {item.label}
                   {isActive && (
                     <motion.div 
                       layoutId="sidebar-active"
                       className="absolute left-0 w-1 h-6 bg-indigo-600 rounded-r-full"
                     />
                   )}
                 </button>
               );
             })}
           </nav>
 
           <div className="mt-auto pt-6 border-t border-slate-50">
             <button 
               onClick={() => navigate('/')}
               className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-400 hover:bg-slate-50 hover:text-rose-600 transition-all group"
             >
               <LogOut className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
               Sair do Portal
             </button>
           </div>
         </div>
       </aside>
 
       {/* Main Content Area */}
       <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto custom-scrollbar">
         {/* Header */}
         <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 flex items-center justify-between sticky top-0 z-10">
           <div className="flex items-center gap-4">
             <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
               {menuItems.find(m => m.id === activeTab)?.label}
             </h2>
             <div className="h-4 w-px bg-slate-200 hidden sm:block" />
             <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-50 border-none hidden sm:flex font-bold text-[10px] uppercase tracking-wider">
               Sistema Ativo
             </Badge>
           </div>
 
           <div className="flex items-center gap-6">
             <div className="relative hidden xl:block">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
               <Input 
                 placeholder="Pesquisa executiva..." 
                 className="pl-10 w-64 bg-slate-50 border-none focus-visible:ring-indigo-500 rounded-full h-10 text-[13px] font-medium"
               />
             </div>
             
             <div className="flex items-center gap-3 pl-6 border-l border-slate-100">
               <div className="text-right hidden sm:block">
                 <p className="text-[13px] font-bold text-slate-900 leading-none">
                   {currentUser?.nome_completo?.split(' ')[0]}
                 </p>
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                   {currentUser?.cargo || 'Analista'}
                 </p>
               </div>
               <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-100 border-2 border-white">
                 {currentUser?.nome_completo?.charAt(0)}
               </div>
             </div>
           </div>
         </header>
 
         <div className="p-8 max-w-7xl mx-auto w-full">
           <AnimatePresence mode="wait">
             <motion.div
               key={activeTab}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               transition={{ duration: 0.3, ease: "easeOut" }}
             >
               {renderContent()}
             </motion.div>
           </AnimatePresence>
         </div>
       </main>
     </div>
   );
 }