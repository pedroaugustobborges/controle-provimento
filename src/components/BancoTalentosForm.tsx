import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useVagasStore } from '@/store/vagasStore';
import { useAdminStore } from '@/store/adminStore';
import { toast } from 'sonner';
import { BancoTalentos } from '@/types/vaga';
import { normalizeCargo, UNIDADES_POR_REGIAO } from '@/lib/vagaUtils';
import { calculateBancoStatus } from '@/lib/bancoTalentosUtils';

const formSchema = z.object({
  unidade: z.string().min(1, 'Unidade é obrigatória'),
  cargo: z.string().min(1, 'Cargo é obrigatório'),
  secao: z.string().optional(),
  numero_edital: z.string().min(1, 'Número do edital é obrigatório'),
  numero_processo: z.string().optional(),
  nome: z.string().optional(),
  classificacao: z.string().optional(),
  quantidade_banco: z.string().optional(),
  status_import: z.string().optional(),
  data_abertura_edital: z.string().min(1, 'Data do resultado final é obrigatória'),
  data_validade: z.string().min(1, 'Data de validade é obrigatória'),
  is_prorrogado: z.boolean().default(false),
  nova_data_validade: z.string().optional(),
  data_convocacao: z.string().optional(),
  unidade_convocacao: z.string().optional(),
  numero_chamada: z.string().optional(),
  numero_processo_seletivo: z.string().optional(),
  numero_vaga_aproveitamento: z.string().optional(),
  observacoes: z.string().optional(),
});

interface BancoTalentosFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function BancoTalentosForm({ onSuccess, onCancel }: BancoTalentosFormProps) {
  const { addBanco, vagas } = useVagasStore();
  const { currentUser } = useAdminStore();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      unidade: '',
      cargo: '',
      secao: '',
      numero_edital: '',
      numero_processo: '',
      nome: '',
      classificacao: '',
      quantidade_banco: '',
      status_import: '',
      data_abertura_edital: '',
      data_validade: '',
      is_prorrogado: false,
      nova_data_validade: '',
      data_convocacao: '',
      unidade_convocacao: '',
      numero_chamada: '',
      numero_processo_seletivo: '',
      numero_vaga_aproveitamento: '',
      observacoes: '',
    },
  });

  const dataResultado = form.watch('data_abertura_edital');

  useEffect(() => {
    if (dataResultado) {
      const date = new Date(dataResultado);
      if (!isNaN(date.getTime())) {
        date.setMonth(date.getMonth() + 6);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        form.setValue('data_validade', `${year}-${month}-${day}`);
      }
    }
  }, [dataResultado, form]);

  const allUnidades = React.useMemo(() => {
    const fromVagas = new Set(vagas.map(v => v.unidade));
    const fromRegions = new Set(Object.values(UNIDADES_POR_REGIAO).flat());
    return Array.from(new Set([...fromVagas, ...fromRegions])).filter(Boolean).sort();
  }, [vagas]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const statusOriginal = (values.status_import || 'CADASTRO RESERVA').toUpperCase();
    
    const calculation = calculateBancoStatus({
      status: statusOriginal,
      status_original: statusOriginal,
      prorrogacao: '',
      data_publicacao: values.data_abertura_edital,
      data_validade: values.data_validade,
      data_convocacao: values.data_convocacao
    });

    const newBanco: BancoTalentos = {
      id: `banco-${Date.now()}`,
      unidade: values.unidade,
      cargo: values.cargo,
      cargo_normalizado: normalizeCargo(values.cargo),
      secao: values.secao || '',
      numero_edital: values.numero_edital,
      numero_processo: values.numero_processo,
      nome: values.nome,
      classificacao: values.classificacao,
      quantidade_banco: values.quantidade_banco,
      status_import: values.status_import,
      data_abertura_edital: values.data_abertura_edital,
      data_publicacao: values.data_abertura_edital,
      data_validade: values.data_validade,
      is_prorrogado: false,
      prorrogacao: '',
      nova_data_validade: '',
      data_convocacao: values.data_convocacao,
      unidade_convocacao: values.unidade_convocacao,
      numero_chamada: values.numero_chamada,
      numero_processo_seletivo: values.numero_processo_seletivo,
      numero_vaga_aproveitamento: values.numero_vaga_aproveitamento,
      status: calculation.status as any,
      status_original: statusOriginal,
      status_calculado: calculation.status,
      motivo_do_calculo: calculation.motivo,
      data_base_do_calculo: new Date().toISOString(),
      data_referencia_usada: calculation.dataReferencia,
      observacoes: values.observacoes || '',
    };

    await addBanco(newBanco);
    onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="unidade"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unidade</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a unidade" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-[300px]">
                    {allUnidades.map(unidade => (
                      <SelectItem key={unidade} value={unidade}>{unidade}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cargo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cargo</FormLabel>
                <FormControl>
                  <Input placeholder="Nome do cargo" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="secao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Seção</FormLabel>
                <FormControl>
                  <Input placeholder="Seção / Setor" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="numero_edital"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número do Edital</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: 001/2024" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="data_abertura_edital"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data do Resultado Final</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="data_validade"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Validade</FormLabel>
                <FormControl>
                  <Input type="date" {...field} readOnly className="bg-slate-50 cursor-not-allowed" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Removido campos de prorrogação do cadastro conforme solicitado */}

        <FormField
          control={form.control}
          name="observacoes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Informações adicionais sobre o banco..." 
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-between gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <div className="flex gap-2">
            <Button type="submit">
              Salvar Banco
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
