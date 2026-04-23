 import { useState, useMemo } from 'react';
 import { motion, AnimatePresence } from 'framer-motion';
 import { 
   Users, Briefcase, ChevronRight, Search, Filter, 
   ShieldCheck, MapPin, ListTodo, Network, 
   Layers, LayoutGrid, Download, MoreVertical, Building2,
   Star, Target, Globe, Cpu, ChevronDown, 
   ExternalLink, Info, CheckCircle2, TrendingUp,
   ArrowRight, Award, Zap
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
 
 // --- Componentes Auxiliares ---
 
 const MemberCard = ({ member, compact = false, selected = false, onClick }: { 
   member: MembroEquipe, 
   compact?: boolean,
   selected?: boolean,
   onClick?: () => void 
 }) => {
   const isLeadership = ['Diretora', 'Gerente', 'Coordenadora', 'Supervisora'].some(role => member.cargo.includes(role));
   
   return (
     <motion.div
       whileHover={{ scale: 1.02, translateY: -2 }}
       whileTap={{ scale: 0.98 }}
       onClick={onClick}
       className={cn(
         "relative cursor-pointer transition-all duration-300",
         compact ? "w-64" : "w-full"
       )}
     >
       <Card className={cn(
         "overflow-hidden border-none shadow-sm hover:shadow-xl transition-all duration-500",
         selected ? "ring-2 ring-primary bg-primary/5 shadow-primary/10" : "bg-white/80 backdrop-blur-sm",
         isLeadership ? "border-l-4 border-l-primary" : "border-l-4 border-l-slate-200"
       )}>
         <CardContent className={cn("p-4", compact ? "px-3 py-3" : "p-5")}>
           <div className="flex items-start gap-4">
             <div className={cn(
               "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner transition-colors",
               isLeadership ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-500"
             )}>
               {isLeadership ? <Award className="h-6 w-6" /> : <Users className="h-6 w-6" />}
             </div>
             <div className="flex-1 min-w-0">
               <h4 className="font-bold text-slate-900 truncate leading-tight tracking-tight">
                 {member.nome}
               </h4>
               <p className="text-xs font-semibold text-slate-500 mt-0.5 truncate uppercase tracking-wider">
                 {member.cargo}
               </p>
               {!compact && (
                 <div className="mt-3 flex flex-wrap gap-1.5">
                   {member.escopo.map(tag => (
                     <Badge key={tag} variant="secondary" className="text-[9px] font-black tracking-widest uppercase bg-slate-100/80 text-slate-600 border-none px-2 py-0">
                       {tag}
                     </Badge>
                   ))}
                   {member.regiao && (
                     <Badge variant="outline" className="text-[9px] font-black tracking-widest uppercase border-slate-200 text-slate-500 px-2 py-0">
                       {member.regiao}
                     </Badge>
                   )}
                 </div>
               )}
             </div>
           </div>
           {member.observacao && !compact && (
             <div className="mt-4 pt-3 border-t border-slate-100 flex items-start gap-2">
               <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
               <p className="text-[11px] text-slate-600 font-medium italic">
                 {member.observacao}
               </p>
             </div>
           )}
         </CardContent>
       </Card>
     </motion.div>
   );
 };
 
 // --- Visão 1: Organograma ---
 
 const OrgChart = () => {
   return (
     <div className="w-full overflow-auto py-12 px-8 min-h-[800px] bg-slate-50/30 rounded-[40px] border border-slate-100/50">
       <div className="flex flex-col items-center space-y-12 min-w-max mx-auto">
         {/* Nível 1: Diretoria */}
         <div className="relative">
           <MemberCard member={DIRETORIA} />
           <div className="absolute left-1/2 -bottom-12 w-0.5 h-12 bg-slate-200" />
         </div>
 
         {/* Nível 2: Gerência */}
         <div className="relative">
           <MemberCard member={GERENCIA} />
           <div className="absolute left-1/2 -bottom-12 w-0.5 h-12 bg-slate-200" />
         </div>
 
         {/* Nível 3: Coordenação */}
         <div className="relative">
           <MemberCard member={COORDENACAO} />
           <div className="absolute left-1/2 -bottom-12 w-0.5 h-12 bg-slate-200" />
           <div className="absolute left-1/2 -bottom-12 w-[800px] -translate-x-1/2 h-0.5 bg-slate-200" />
         </div>
 
         {/* Blocos de Divisão: Central vs Operacional */}
         <div className="flex gap-32 pt-12 relative">
           {/* Bloco 1: Estrutura Central */}
           <div className="flex flex-col items-center space-y-8">
             <div className="bg-slate-900 text-white px-6 py-2 rounded-full text-[10px] font-black tracking-[0.2em] uppercase shadow-lg shadow-slate-200">
               Estrutura Central / Corporativa
             </div>
             <div className="grid grid-cols-2 gap-4">
               {EQUIPE_CENTRAL.map(member => (
                 <MemberCard key={member.id} member={member} compact />
               ))}
             </div>
           </div>
 
           {/* Bloco 2: Estrutura Operacional */}
           <div className="flex flex-col items-center space-y-8">
             <div className="bg-primary text-white px-6 py-2 rounded-full text-[10px] font-black tracking-[0.2em] uppercase shadow-lg shadow-primary/20">
               Estrutura Operacional por Supervisão
             </div>
             
             <div className="flex gap-12">
               {/* Ramo 1: Ana Carolina */}
               <div className="flex flex-col items-center space-y-6">
                 <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 w-full text-center">
                   Escopo GO e ES
                 </div>
                 <div className="space-y-3">
                   {EQUIPE_GO_ES.map(member => (
                     <MemberCard key={member.id} member={member} compact />
                   ))}
                 </div>
               </div>
 
               {/* Ramo 2: Renata Moiana */}
               <div className="flex flex-col items-center space-y-6">
                 <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 w-full text-center">
                   Unidades Externas
                 </div>
                 <div className="space-y-3">
                   {EQUIPE_EXTERNA.map(member => (
                     <MemberCard key={member.id} member={member} compact />
                   ))}
                 </div>
               </div>
             </div>
           </div>
         </div>
       </div>
     </div>
   );
 };
 
 // --- Visão 2: Estrutura e Escopo ---
 
 const StructureScope = () => {
   const allMembers = [
     DIRETORIA, GERENCIA, COORDENACAO, 
     ...EQUIPE_CENTRAL, ...EQUIPE_GO_ES, ...EQUIPE_EXTERNA
   ];
 
   return (
     <Card className="border-none shadow-sm overflow-hidden rounded-[32px] bg-white/60 backdrop-blur-md">
       <CardHeader className="p-8 pb-4">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div>
             <CardTitle className="text-xl font-bold text-slate-900 tracking-tight">Detalhamento de Escopo</CardTitle>
             <CardDescription className="text-sm font-medium">Visualização tabular da matriz de responsabilidades</CardDescription>
           </div>
           <div className="flex gap-2">
             <div className="relative w-64">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
               <Input placeholder="Buscar colaborador..." className="pl-10 h-10 bg-slate-50 border-none rounded-xl" />
             </div>
             <Button variant="outline" className="h-10 rounded-xl border-slate-200">
               <Filter className="h-4 w-4 mr-2" />
               Filtros
             </Button>
           </div>
         </div>
       </CardHeader>
       <CardContent className="p-0">
         <Table>
           <TableHeader className="bg-slate-50/50">
             <TableRow className="hover:bg-transparent border-slate-100">
               <TableHead className="pl-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Nome Completo</TableHead>
               <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Cargo Corporativo</TableHead>
               <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Liderança Direta</TableHead>
               <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo de Escopo</TableHead>
               <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Região / Unidade</TableHead>
               <TableHead className="pr-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</TableHead>
             </TableRow>
           </TableHeader>
           <TableBody>
             {allMembers.map((member, i) => (
               <TableRow key={member.id} className="group hover:bg-slate-50/50 transition-colors border-slate-100">
                 <TableCell className="pl-8 py-5 font-bold text-slate-900">{member.nome}</TableCell>
                 <TableCell className="py-5">
                   <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                     {member.cargo}
                   </span>
                 </TableCell>
                 <TableCell className="py-5 text-xs font-medium text-slate-500">
                   {member.liderancaImediata || "Diretoria Executiva"}
                 </TableCell>
                 <TableCell className="py-5">
                   <div className="flex gap-1">
                     {member.escopo.map(tag => (
                       <Badge key={tag} className="text-[9px] font-bold uppercase tracking-wider bg-primary/5 text-primary border-none">
                         {tag}
                       </Badge>
                     ))}
                   </div>
                 </TableCell>
                 <TableCell className="py-5 text-xs font-bold text-slate-600">
                   {member.regiao || (member.escopo.includes('Corporativo') ? 'Corporativo' : '-')}
                 </TableCell>
                 <TableCell className="pr-8 py-5">
                   <div className="flex items-center gap-2">
                     <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Ativo</span>
                   </div>
                 </TableCell>
               </TableRow>
             ))}
           </TableBody>
         </Table>
       </CardContent>
     </Card>
   );
 };
 
 // --- Visão 3: Funções ---
 
 const FunctionsView = () => {
   const functionGroups = [
     { title: 'Gestão de Unidades', icon: Building2, color: 'blue', members: EQUIPE_GO_ES.concat(EQUIPE_EXTERNA).filter(m => m.cargo.includes('Analista')) },
     { title: 'Publicação de Editais', icon: FileSpreadsheet, color: 'purple', members: EQUIPE_CENTRAL.filter(m => m.observacao?.includes('editais')) },
     { title: 'Convocações e Recepção', icon: Users, color: 'emerald', members: EQUIPE_CENTRAL.filter(m => m.observacao?.includes('convocações')) },
     { title: 'Unidades TEA', icon: Zap, color: 'amber', members: EQUIPE_CENTRAL.filter(m => m.observacao?.includes('TEA')) },
     { title: 'Apoio Corporativo', icon: Cpu, color: 'indigo', members: EQUIPE_CENTRAL.filter(m => !m.observacao) },
   ];
 
   return (
     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
       {functionGroups.map((group, i) => (
         <Card key={i} className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white/60 backdrop-blur-md group hover:shadow-xl transition-all duration-500">
           <CardHeader className="p-8 pb-4">
             <div className="flex items-center gap-4">
               <div className={cn(
                 "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-500",
                 group.color === 'blue' ? "bg-blue-50 text-blue-600" :
                 group.color === 'purple' ? "bg-purple-50 text-purple-600" :
                 group.color === 'emerald' ? "bg-emerald-50 text-emerald-600" :
                 group.color === 'amber' ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-600"
               )}>
                 <group.icon className="h-6 w-6" />
               </div>
               <div>
                 <CardTitle className="text-lg font-bold text-slate-900 tracking-tight">{group.title}</CardTitle>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">Escopo de Atuação</p>
               </div>
             </div>
           </CardHeader>
           <CardContent className="p-8 pt-4">
             <div className="space-y-4">
               {group.members.map(member => (
                 <div key={member.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                   <div className="flex flex-col">
                     <span className="text-sm font-bold text-slate-800">{member.nome}</span>
                     <span className="text-[10px] font-semibold text-slate-400">{member.cargo}</span>
                   </div>
                   <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors" />
                 </div>
               ))}
               {group.members.length === 0 && (
                 <p className="text-xs text-slate-400 italic">Nenhum membro vinculado diretamente a este escopo.</p>
               )}
             </div>
           </CardContent>
         </Card>
       ))}
     </div>
   );
 };
 
 // --- Visão 4: Divisão da Equipe ---
 
 const TeamDivision = () => {
   const teams = [
     { title: 'Equipe Corporativa / Central', leader: 'Luanna Ramos', color: 'slate', members: EQUIPE_CENTRAL },
     { title: 'Equipe Goiás e Espírito Santo', leader: 'Ana Carolina Nunes', color: 'primary', members: EQUIPE_GO_ES },
     { title: 'Equipe Unidades Externas', leader: 'Renata Moiana', color: 'emerald', members: EQUIPE_EXTERNA },
   ];
 
   return (
     <div className="space-y-12">
       {teams.map((team, i) => (
         <div key={i} className="space-y-6">
           <div className="flex items-end justify-between px-2">
             <div className="space-y-1">
               <div className="flex items-center gap-3">
                 <div className={cn("h-3 w-3 rounded-full", team.color === 'primary' ? "bg-primary" : team.color === 'emerald' ? "bg-emerald-500" : "bg-slate-900")} />
                 <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{team.title}</h3>
               </div>
               <p className="text-sm font-semibold text-slate-500 ml-6">
                 Liderança: <span className="text-slate-900">{team.leader}</span>
               </p>
             </div>
             <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-black tracking-widest text-[10px] px-3 py-1">
               {team.members.length} INTEGRANTES
             </Badge>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
             {team.members.map(member => (
               <MemberCard key={member.id} member={member} />
             ))}
           </div>
         </div>
       ))}
     </div>
   );
 };
 
 // --- Página Principal ---
 
 const PortalRHPage = () => {
   const [activeTab, setActiveTab] = useState('org');
   
   const tabs = [
     { id: 'org', label: 'Organograma', icon: Network },
     { id: 'scope', label: 'Estrutura e Escopo', icon: Layers },
     { id: 'functions', label: 'Matriz de Funções', icon: Target },
     { id: 'division', label: 'Divisões de Equipe', icon: LayoutGrid },
   ];
 
   return (
     <div className="min-h-screen bg-[#F8FAFC] p-8">
       {/* Cabeçalho Premium */}
       <header className="mb-12">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div className="space-y-2">
             <div className="flex items-center gap-2 mb-2">
               <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black tracking-[0.2em] uppercase px-3 py-1">
                 Visão Executiva
               </Badge>
               <div className="h-1 w-1 rounded-full bg-slate-300" />
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Gestão de Capital Humano</span>
             </div>
             <h1 className="text-4xl font-extrabold text-slate-900 tracking-tighter leading-none">
               Gestão Estratégica de Equipe
             </h1>
             <p className="text-slate-500 font-medium max-w-2xl leading-relaxed">
               Plataforma de visualização e monitoramento da estrutura organizacional, 
               integrando funções corporativas, estratégicas e operacionais.
             </p>
           </div>
           
           <div className="flex items-center gap-3">
             <Button className="h-12 px-6 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
               <Download className="h-4 w-4 mr-2" />
               Relatório Completo
             </Button>
             <Button variant="outline" className="h-12 w-12 rounded-2xl bg-white border-slate-200 text-slate-600 shadow-sm">
               <MoreVertical className="h-5 w-5" />
             </Button>
           </div>
         </div>
 
         {/* Navegação por Tabs Premium */}
         <nav className="mt-12 flex items-center p-1.5 bg-white/50 backdrop-blur-sm border border-slate-100 rounded-[28px] w-fit shadow-sm">
           {tabs.map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={cn(
                 "flex items-center gap-3 px-6 py-3 rounded-[22px] transition-all duration-500 relative overflow-hidden group",
                 activeTab === tab.id 
                   ? "bg-slate-900 text-white shadow-xl shadow-slate-200" 
                   : "text-slate-500 hover:text-slate-900"
               )}
             >
               <tab.icon className={cn(
                 "h-4.5 w-4.5 transition-transform duration-500 group-hover:scale-110",
                 activeTab === tab.id ? "text-primary" : "text-slate-400"
               )} />
               <span className="text-sm font-bold tracking-tight">{tab.label}</span>
               {activeTab === tab.id && (
                 <motion.div 
                   layoutId="activeTab"
                   className="absolute inset-0 bg-slate-900 -z-10"
                   transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                 />
               )}
             </button>
           ))}
         </nav>
       </header>
 
       {/* Conteúdo Principal com Animações */}
       <main className="relative">
         <AnimatePresence mode="wait">
           <motion.div
             key={activeTab}
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -20 }}
             transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
           >
             {activeTab === 'org' && <OrgChart />}
             {activeTab === 'scope' && <StructureScope />}
             {activeTab === 'functions' && <FunctionsView />}
             {activeTab === 'division' && <TeamDivision />}
           </motion.div>
         </AnimatePresence>
       </main>
 
       {/* Rodapé Informativo */}
       <footer className="mt-20 pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 opacity-60 hover:opacity-100 transition-opacity">
         <div className="flex items-center gap-4">
           <div className="h-8 w-8 bg-slate-200 rounded-lg flex items-center justify-center font-black text-xs text-slate-500">AG</div>
           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
             PROVIMENTO DIGITAL © 2024 • SISTEMA DE GESTÃO ESTRATÉGICA
           </p>
         </div>
         <div className="flex items-center gap-6">
           <div className="flex items-center gap-2">
             <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Servidor On-line</span>
           </div>
           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">v2.4.0</span>
         </div>
       </footer>
     </div>
   );
 };
 
 export default PortalRHPage;
 
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