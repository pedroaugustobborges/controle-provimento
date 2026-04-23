 import { useState, useMemo, useRef } from 'react';
 import { motion, AnimatePresence } from 'framer-motion';
 import { 
   Users, Briefcase, ChevronRight, Search, Filter, 
   ShieldCheck, MapPin, ListTodo, Network, 
   Layers, LayoutGrid, Maximize2, Minimize2, 
   Move, Download, MoreVertical, Building2,
   Star, Target, Globe, Cpu
 } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
 import { Input } from '@/components/ui/input';
 import { Badge } from '@/components/ui/badge';
 import { 
   Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
 } from '@/components/ui/table';
 import { cn } from '@/lib/utils';
 import { 
   DIRETORIA, GERENCIA, COORDENACAO, 
   EQUIPE_CENTRAL, EQUIPE_GO_ES, EQUIPE_EXTERNA,
   MembroEquipe
 } from '@/data/equipe';
 
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
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900">{item.name}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">{item.role}</span>
                  </div>
                </TableCell>
                <TableCell><Badge className={cn("capitalize border-none font-bold text-[10px] px-2 py-0.5", item.type === 'férias' ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700")}>{item.type}</Badge></TableCell>
                <TableCell className="text-sm font-medium text-slate-600">{item.start} - {item.end}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700">{item.coverage}</span>
                    {item.coveredBy !== '-' && <span className="text-[10px] text-slate-400">Por: {item.coveredBy}</span>}
                  </div>
                </TableCell>
                <TableCell><Badge variant="outline" className="capitalize border-none bg-slate-100 font-bold text-[10px]">{item.status}</Badge></TableCell>
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