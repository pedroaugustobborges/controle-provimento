 import { Clock } from "lucide-react";
 import { Handle, Position } from '@xyflow/react';
 import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
 import { Badge } from "@/components/ui/badge";
 import { Card } from "@/components/ui/card";
 import { Info } from "lucide-react";
 import { cn } from "@/lib/utils";
 
 interface OrgNodeProps {
   data: {
     name: string;
     role: string;
     area?: string;
     imageUrl?: string;
     level: number;
     isExpanded?: boolean;
     onToggleExpand?: () => void;
   };
   selected?: boolean;
 }
 
 export const OrgNode = ({ data, selected }: OrgNodeProps) => {
   const getLevelStyles = (level: number) => {
     switch (level) {
       case 1:
         return "border-primary/40 bg-primary/5 shadow-primary/10";
       case 2:
         return "border-blue-500/40 bg-blue-500/5 shadow-blue-500/10";
       case 3:
         return "border-emerald-500/40 bg-emerald-500/5 shadow-emerald-500/10";
       default:
         return "border-border bg-card shadow-sm";
     }
   };
 
   const getBadgeColor = (level: number) => {
     switch (level) {
       case 1: return "bg-primary text-primary-foreground";
       case 2: return "bg-blue-600 text-white";
       case 3: return "bg-emerald-600 text-white";
       default: return "bg-secondary text-secondary-foreground";
     }
   };
 
   return (
     <div className="relative group">
       <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-primary/50 border-none" />
       
       <Card className={cn(
         "w-64 p-4 transition-all duration-300 border-2 hover:shadow-lg",
         getLevelStyles(data.level),
         selected && "ring-2 ring-primary ring-offset-2 scale-105 z-50",
         "flex flex-col items-center gap-3"
       )}>
         <div className="relative">
           <Avatar className="h-16 w-16 border-2 border-background shadow-md">
             <AvatarImage src={data.imageUrl} alt={data.name} />
             <AvatarFallback className="text-lg font-bold bg-primary/10">
               {data.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
             </AvatarFallback>
           </Avatar>
           <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 shadow-sm border border-border">
             <div className={cn("w-3 h-3 rounded-full animate-pulse", 
               data.level === 1 ? "bg-primary" : "bg-emerald-500"
             )} />
           </div>
         </div>
 
         <div className="text-center space-y-1 w-full">
           <h3 className="font-bold text-sm leading-tight text-foreground line-clamp-2">
             {data.name}
           </h3>
           <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider line-clamp-1">
             {data.role}
           </p>
           <div className="flex flex-wrap justify-center gap-1.5 mt-2">
             {data.area && (
               <Badge variant="outline" className="text-[9px] font-normal bg-background/50 border-primary/20">
                 {data.area}
               </Badge>
             )}
             <Badge variant="secondary" className="text-[9px] font-normal flex items-center gap-1">
               <Clock className="h-2 w-2" />
               Provimento Digital
             </Badge>
           </div>
         </div>
 
         <button className="absolute top-2 right-2 text-muted-foreground hover:text-primary transition-colors">
           <Info className="h-4 w-4" />
         </button>
       </Card>
 
       <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-primary/50 border-none" />
     </div>
   );
 };