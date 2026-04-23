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
   AlertCircle, ShieldCheck, MapPin, ListTodo
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
     { label: 'Total de Analistas', value: 8, icon: ShieldCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
     { label: 'Total de Assistentes', value: 12, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
     { label: 'Férias (Período)', value: 3, icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50' },
     { label: 'Folga/Day Off', value: 2, icon: Clock, color: 'text-emerald-600', bg: 'bg-emerald-50' },
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
               <CardContent className="p-6">
                 <div className="flex items-center justify-between">
                   <div className={cn("p-2 rounded-lg", stat.bg)}>
                     <stat.icon className={cn("h-5 w-5", stat.color)} />
                   </div>
                   <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none">+12%</Badge>
                 </div>
                 <div className="mt-4">
                   <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                   <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
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
       <div className="flex items-center justify-between">
         <h3 className="text-2xl font-bold text-slate-900">Controle de Ausências</h3>
         <Button className="bg-indigo-600 text-white rounded-full">Novo Registro</Button>
       </div>
       <Card className="border-none shadow-sm overflow-hidden rounded-2xl">
         <Table>
           <TableHeader className="bg-slate-50/50"><TableRow><TableHead>Colaborador</TableHead><TableHead>Tipo</TableHead><TableHead>Período</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
           <TableBody>
             {absences.map(item => (
               <TableRow key={item.id}>
                 <TableCell><p className="font-bold">{item.name}</p></TableCell>
                 <TableCell><Badge className="capitalize">{item.type}</Badge></TableCell>
                 <TableCell>{item.start} - {item.end}</TableCell>
                 <TableCell><Badge variant="outline">{item.status}</Badge></TableCell>
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
       <div className="flex items-center justify-between">
         <h3 className="text-2xl font-bold text-slate-900">Funções e Escopos</h3>
         <Button className="bg-indigo-600 rounded-full">Novo Escopo</Button>
       </div>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {scopes.map((s, i) => (
           <Card key={i} className="border-none shadow-sm rounded-3xl p-6">
             <div className="flex items-center gap-4 mb-4">
               <div className="h-12 w-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600">
                 <Briefcase className="h-6 w-6" />
               </div>
               <div>
                 <h4 className="font-bold text-slate-900">{s.role}</h4>
                 <p className="text-sm text-indigo-600 font-semibold">{s.name}</p>
               </div>
             </div>
             <div className="space-y-3">
               <div>
                 <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Escopo de Atuação</p>
                 <p className="text-sm text-slate-700 font-medium">{s.scope}</p>
               </div>
               <div>
                 <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Responsabilidades</p>
                 <p className="text-sm text-slate-600">{s.responsibilities}</p>
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
       <div className="flex items-center justify-between">
         <h3 className="text-2xl font-bold text-slate-900">Prazos e Rotinas</h3>
         <Button className="bg-indigo-600 rounded-full">Nova Atividade</Button>
       </div>
       <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
         <Table>
           <TableHeader className="bg-slate-50/50">
             <TableRow><TableHead>Atividade</TableHead><TableHead>Prazo</TableHead><TableHead>Prioridade</TableHead><TableHead>Status</TableHead></TableRow>
           </TableHeader>
           <TableBody>
             {routines.map((r, i) => (
               <TableRow key={i}>
                 <TableCell className="font-bold text-slate-800">{r.task}</TableCell>
                 <TableCell className="text-slate-600 font-medium">{r.deadline}</TableCell>
                 <TableCell>
                   <Badge variant="outline" className={cn(
                     "border-none font-bold text-[10px] px-2.5 py-0.5 rounded-full",
                     r.priority === 'alta' ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-blue-700"
                   )}>{r.priority}</Badge>
                 </TableCell>
                 <TableCell><Badge variant="outline" className="capitalize border-none bg-slate-100">{r.status.replace('_', ' ')}</Badge></TableCell>
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
   ];
   return (
     <div className="space-y-6">
       <h3 className="text-2xl font-bold text-slate-900">Escala e Acompanhamento</h3>
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
         {teamStatus.map((t, i) => (
           <Card key={i} className="border-none shadow-sm rounded-3xl p-5 flex items-center gap-4">
             <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">
               {t.name.charAt(0)}
             </div>
             <div className="flex-1">
               <p className="font-bold text-slate-900">{t.name}</p>
               <p className="text-xs text-slate-400 font-medium">{t.location}</p>
             </div>
             <Badge variant="outline" className={cn(
               "border-none font-bold text-[10px] px-2.5 py-0.5 rounded-full",
               t.status === 'Ativo' ? "bg-emerald-50 text-emerald-700" : 
               t.status === 'Ausente' ? "bg-rose-50 text-rose-700" : "bg-indigo-50 text-indigo-700"
             )}>{t.status}</Badge>
           </Card>
         ))}
       </div>
     </div>
   );
 };
 
 const TrainingModule = () => {
   const records = [
     { person: 'Juliana F.', type: 'Alinhamento', theme: 'Novas Regras de Escala', date: '22 Out 2023', status: 'concluido' },
     { person: 'Ricardo M.', type: 'Treinamento', theme: 'Ferramenta de Dashboards', date: '20 Out 2023', status: 'concluido' },
   ];
   return (
     <div className="space-y-6">
       <div className="flex items-center justify-between">
         <h3 className="text-2xl font-bold text-slate-900">Alinhamentos e Treinamentos</h3>
         <Button className="bg-indigo-600 rounded-full">Novo Registro</Button>
       </div>
       <div className="space-y-4">
         {records.map((r, i) => (
           <Card key={i} className="border-none shadow-sm rounded-2xl p-4 flex items-center justify-between">
             <div className="flex items-center gap-4">
               <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                 <GraduationCap className="h-5 w-5" />
               </div>
               <div>
                 <p className="font-bold text-slate-900">{r.theme}</p>
                 <p className="text-xs text-slate-500 font-medium">{r.person} • {r.date}</p>
               </div>
             </div>
             <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none font-bold text-[10px]">{r.type}</Badge>
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
     <div className="flex min-h-screen bg-[#F8FAFC]">
       <aside className="w-72 bg-white border-r border-slate-200 hidden lg:flex flex-col p-8">
         <div className="flex items-center gap-3 mb-10"><div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center"><ShieldCheck className="text-white h-6 w-6" /></div><h1 className="font-bold text-slate-900">Portal RH</h1></div>
         <nav className="space-y-1">
           {menuItems.map((item) => (
             <button key={item.id} onClick={() => setActiveTab(item.id)} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold", activeTab === item.id ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-50")}>
               <item.icon className="h-5 w-5" /> {item.label}
             </button>
           ))}
         </nav>
       </aside>
       <main className="flex-1 p-8">
         <header className="flex justify-between items-center mb-8"><h2 className="text-2xl font-bold">{menuItems.find(m => m.id === activeTab)?.label}</h2></header>
         {renderContent()}
       </main>
     </div>
   );
 }