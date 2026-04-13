import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface ExportButtonProps {
  data: any[];
  filename: string;
  sheetName?: string;
  variant?: "outline" | "default" | "secondary" | "ghost" | "link" | "destructive";
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  label?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ 
  data, 
  filename, 
  sheetName = 'Dados',
  variant = "outline",
  className = "",
  size = "sm",
  label = "Exportar Excel"
}) => {
  const handleExport = () => {
    try {
      if (!data || data.length === 0) {
        toast.error('Não há dados para exportar');
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      
      // Generate Excel file and trigger download
      XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      toast.success('Arquivo exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar excel:', error);
      toast.error('Erro ao exportar arquivo');
    }
  };

  return (
    <Button 
      variant={variant} 
      size={size} 
      onClick={handleExport}
      className={`gap-2 ${className}`}
    >
      <Download className="h-4 w-4" />
      <span>{label}</span>
    </Button>
  );
};
