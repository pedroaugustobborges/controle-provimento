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