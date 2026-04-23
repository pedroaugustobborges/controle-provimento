 import { useCallback, useMemo, useState, useEffect } from 'react';
 import {
   ReactFlow,
   Background,
   Controls,
   MiniMap,
   useNodesState,
   useEdgesState,
   addEdge,
   Panel,
   MarkerType,
   Connection,
   Edge,
 } from '@xyflow/react';
 import '@xyflow/react/dist/style.css';
 import dagre from 'dagre';
 import { supabase } from "@/integrations/supabase/client";
 import { OrgNode } from '@/components/organograma/OrgNode';
 import { Button } from '@/components/ui/button';
 import { Maximize2, ZoomIn, ZoomOut, RotateCcw, Share2, Download } from 'lucide-react';
 import { useToast } from "@/hooks/use-toast";
 import { PageHeader } from '@/components/PageHeader';
 
 const nodeTypes = {
   orgNode: OrgNode,
 };
 
 const dagreGraph = new dagre.graphlib.Graph();
 dagreGraph.setDefaultEdgeLabel(() => ({}));
 
 const getLayoutedElements = (nodes: any[], edges: any[], direction = 'TB') => {
   const isHorizontal = direction === 'LR';
   dagreGraph.setGraph({ rankdir: direction, ranksep: 100, nodesep: 150 });
 
   nodes.forEach((node) => {
     dagreGraph.setNode(node.id, { width: 256, height: 200 });
   });
 
   edges.forEach((edge) => {
     dagreGraph.setEdge(edge.source, edge.target);
   });
 
   dagre.layout(dagreGraph);
 
   const layoutedNodes = nodes.map((node) => {
     const nodeWithPosition = dagreGraph.node(node.id);
     return {
       ...node,
       position: {
         x: nodeWithPosition.x - 128,
         y: nodeWithPosition.y - 100,
       },
     };
   });
 
   return { nodes: layoutedNodes, edges };
 };
 
 const OrganogramaPage = () => {
   const [nodes, setNodes, onNodesChange] = useNodesState([]);
   const [edges, setEdges, onEdgesChange] = useEdgesState([]);
   const [isLoading, setIsLoading] = useState(true);
   const { toast } = useToast();
 
   const onConnect = useCallback(
     (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
     [setEdges]
   );
 
   const fetchProfiles = async () => {
     try {
       const { data: profiles, error } = await supabase
         .from('profiles')
         .select('*')
         .eq('status', 'ativo');
 
       if (error) throw error;
 
       const hierarchy = [
         { id: "ana-karolina", name: "Ana Karolina Oliveira Barros", role: "Diretora Corporativa de recursos humanos", level: 1, reportsTo: null },
         { id: "priscila-brito", name: "Priscila Brito Guimarães", role: "Gerente Corporativa de recursos humanos", level: 2, reportsTo: "ana-karolina" },
         { id: "luanna-ramos", name: "Luanna Ramos de Sousa", role: "Coordenadora de recursos humanos", level: 3, reportsTo: "priscila-brito" },
         
         // Ramos Principais
         { id: "ana-carolina-nunes", name: "Ana Carolina Nunes Monteiro", role: "Supervisora de Recursos Humanos", level: 4, reportsTo: "luanna-ramos" },
         { id: "renata-moiana", name: "Renata Moiana Da Costa", role: "Supervisora de Provimento", level: 4, reportsTo: "luanna-ramos" },
 
         // Equipe Ana Carolina
         { id: "carolina-leles", name: "Carolina Leles", role: "Analista de Recursos Humanos", level: 5, reportsTo: "ana-carolina-nunes" },
         { id: "ellen-leticia", name: "Ellen Leticia Cardoso", role: "Analista de Recursos Humanos", level: 5, reportsTo: "ana-carolina-nunes" },
         { id: "ana-caroline-enc", name: "Ana Caroline", role: "Encarregada de Recursos Humanos", level: 5, reportsTo: "ana-carolina-nunes" },
         { id: "wanessa-gomes", name: "Wanessa Gomes", role: "Analista de Recursos Humanos", level: 5, reportsTo: "ana-carolina-nunes" },
         { id: "ketty-lorrane", name: "Ketty Lorrane", role: "Analista de Recursos Humanos", level: 5, reportsTo: "ana-carolina-nunes" },
         { id: "lis-angela", name: "Lis Angela Menezes", role: "Analista de Recursos Humanos", level: 5, reportsTo: "ana-carolina-nunes" },
         { id: "sannya-laryssa-rh", name: "Sannya Laryssa", role: "Analista de Recursos Humanos", level: 5, reportsTo: "ana-carolina-nunes" },
         { id: "geovana-miranda", name: "Geovana Miranda", role: "Analista de Recursos Humanos", level: 5, reportsTo: "ana-carolina-nunes" },
         { id: "jullyana-marcal", name: "Jullyana Marçal", role: "Analista de Recursos Humanos", level: 5, reportsTo: "ana-carolina-nunes" },
         { id: "eduarda-oliveira", name: "Eduarda Oliveira", role: "Assistente de Recursos Humanos", level: 5, reportsTo: "ana-carolina-nunes" },
         { id: "thays-silva", name: "Thays Silva", role: "Analista de Recursos Humanos", level: 5, reportsTo: "ana-carolina-nunes" },
         { id: "anna-julia", name: "Anna Julia Felipe", role: "Assistente de Recursos Humanos", level: 5, reportsTo: "ana-carolina-nunes" },
         { id: "flavia-vaz", name: "Flavia Vaz", role: "Assistente de Recursos Humanos", level: 5, reportsTo: "ana-carolina-nunes" },
         { id: "izac-jesus", name: "Izac De Jesus Cezar", role: "Analista de Recursos Humanos", level: 5, reportsTo: "ana-carolina-nunes" },
         { id: "ana-caroline-feitosa", name: "Ana Caroline Feitoza", role: "Assistente de Recursos Humanos", level: 5, reportsTo: "ana-carolina-nunes" },
         { id: "hayane-paula", name: "Hayane de Paula", role: "Assistente de Recursos Humanos", level: 5, reportsTo: "ana-carolina-nunes" },
         { id: "samara-silva", name: "Samara Silva", role: "Analista de Recursos Humanos", level: 5, reportsTo: "ana-carolina-nunes" },
 
         // Equipe Renata
         { id: "geovana-arantes", name: "Geovana Arantes", role: "Assistente de Recursos Humanos", level: 5, reportsTo: "renata-moiana" },
         { id: "maria-eduarda", name: "Maria Eduarda Miulk", role: "Assistente de Recursos Humanos", level: 5, reportsTo: "renata-moiana" },
         { id: "jessica-almeida", name: "Jessica Almeida do Nascimento", role: "Assistente de Recursos Humanos", level: 5, reportsTo: "renata-moiana" },
         { id: "pricila-paula", name: "Pricila Paula da Silva", role: "Assistente de Recursos Humanos", level: 5, reportsTo: "renata-moiana" },
         { id: "beatriz-almeida", name: "Beatriz Almeida", role: "Analista de Recursos Humanos", level: 5, reportsTo: "renata-moiana" },
         { id: "kaio-dias", name: "Kaio Dias da Silva", role: "Analista de Recursos Humanos", level: 5, reportsTo: "renata-moiana" },
         { id: "lorrane-augusto", name: "Lorrane Augusto", role: "Analista de Recursos Humanos", level: 5, reportsTo: "renata-moiana" },
         { id: "lorraine-sirqueira", name: "Lorraine Sirqueira", role: "Analista de Recursos Humanos", level: 5, reportsTo: "renata-moiana" },
         { id: "sannya-laryssa-prov", name: "Sannya Laryssa", role: "Analista de Recursos Humanos", level: 5, reportsTo: "renata-moiana" },
       ];
 
       const newNodes: any[] = [];
       const newEdges: any[] = [];
 
       hierarchy.forEach((item, index) => {
         // Tentar encontrar o perfil real no banco
         const realProfile = profiles?.find(p => 
           p.nome_completo.toLowerCase().includes(item.name.toLowerCase().split(' ')[0]) &&
           p.nome_completo.toLowerCase().includes(item.name.toLowerCase().split(' ').pop() || '')
         );
 
         const nodeId = item.id;
         
         newNodes.push({
           id: nodeId,
           type: 'orgNode',
           data: {
             name: realProfile?.nome_completo || item.name,
             role: item.role,
             level: item.level,
             imageUrl: realProfile?.avatar_url,
             area: item.level <= 3 ? "Corporativo" : (item.reportsTo === "Ana Carolina Nunes Monteiro" ? "RH" : "Provimento"),
           },
           position: { x: 0, y: 0 },
         });
 
         if (item.reportsTo) {
           newEdges.push({
             id: `edge-${item.reportsTo}-${nodeId}`,
             source: item.reportsTo,
             target: nodeId,
             type: 'smoothstep',
             animated: false,
             style: { stroke: '#94a3b8', strokeWidth: 2 },
             markerEnd: {
               type: MarkerType.ArrowClosed,
               color: '#94a3b8',
             },
           });
         }
       });
 
       const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges);
       setNodes(layoutedNodes);
       setEdges(layoutedEdges);
     } catch (error: any) {
       console.error("Erro ao carregar organograma:", error);
       toast({
         title: "Erro ao carregar",
         description: "Não foi possível carregar os dados do organograma.",
         variant: "destructive",
       });
     } finally {
       setIsLoading(false);
     }
   };
 
   useEffect(() => {
     fetchProfiles();
   }, []);
 
   return (
     <div className="flex flex-col h-[calc(100vh-64px)] w-full">
       <div className="px-6 py-4">
         <PageHeader 
           title="Organograma Corporativo" 
           subtitle="Estrutura hierárquica da equipe de Recursos Humanos e Provimento."
         />
       </div>
       
       <div className="flex-1 relative bg-slate-50/50">
         {isLoading ? (
           <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
             <div className="flex flex-col items-center gap-4">
               <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
               <p className="text-sm text-muted-foreground font-medium">Montando estrutura...</p>
             </div>
           </div>
         ) : (
           <ReactFlow
             nodes={nodes}
             edges={edges}
             onNodesChange={onNodesChange}
             onEdgesChange={onEdgesChange}
             onConnect={onConnect}
             nodeTypes={nodeTypes}
             fitView
             minZoom={0.2}
             maxZoom={2}
             className="bg-slate-50/50"
           >
             <Background color="#cbd5e1" gap={20} />
             <Controls />
             <MiniMap 
               nodeStrokeWidth={3} 
               nodeColor={(n: any) => {
                 if (n.data?.level === 1) return '#0ea5e9';
                 if (n.data?.level === 2) return '#3b82f6';
                 if (n.data?.level === 3) return '#10b981';
                 return '#cbd5e1';
               }}
             />
             
             <Panel position="top-right" className="flex gap-2 bg-background/80 p-2 rounded-lg border shadow-sm backdrop-blur-sm">
               <Button variant="outline" size="sm" onClick={() => fetchProfiles()}>
                 <RotateCcw className="h-4 w-4 mr-2" />
                 Resetar
               </Button>
               <Button variant="outline" size="sm">
                 <Download className="h-4 w-4 mr-2" />
                 Exportar
               </Button>
               <Button variant="default" size="sm">
                 <Share2 className="h-4 w-4 mr-2" />
                 Compartilhar
               </Button>
             </Panel>
 
             <Panel position="bottom-center" className="bg-background/80 px-4 py-2 rounded-full border shadow-lg backdrop-blur-sm mb-4">
               <div className="flex items-center gap-6">
                 <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-primary" />
                   <span className="text-[10px] font-bold uppercase tracking-wider">Diretoria</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-blue-500" />
                   <span className="text-[10px] font-bold uppercase tracking-wider">Gerência</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-emerald-500" />
                   <span className="text-[10px] font-bold uppercase tracking-wider">Coordenação</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-slate-400" />
                   <span className="text-[10px] font-bold uppercase tracking-wider">Operacional</span>
                 </div>
               </div>
             </Panel>
           </ReactFlow>
         )}
       </div>
     </div>
   );
 };
 
 export default OrganogramaPage;