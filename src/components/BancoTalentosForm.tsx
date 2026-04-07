import React from 'react';
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

const formSchema = z.object({
  unidade: z.string().min(1, 'Unidade é obrigatória'),
  cargo: z.string().min(1, 'Cargo é obrigatório'),
  secao: z.string().min(1, 'Seção é obrigatória'),
  numero_edital: z.string().min(1, 'Número do edital é obrigatório'),
  data_abertura_edital: z.string().min(1, 'Data de abertura é obrigatória'),
  data_validade: z.string().min(1, 'Data de validade é obrigatória'),
  is_prorrogado: z.boolean().default(false),
  nova_data_validade: z.string().optional(),
  observacoes: z.string().optional(),
});

interface BancoTalentosFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function BancoTalentosForm({ onSuccess, onCancel }: BancoTalentosFormProps) {
  const { addBanco } = useVagasStore();
  const { currentUser } = useAdminStore();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      unidade: '',
      cargo: '',
      secao: '',
      numero_edital: '',
      data_abertura_edital: '',
      data_validade: '',
      is_prorrogado: false,
      nova_data_validade: '',
      observacoes: '',
    },
  });

  const isProrrogado = form.watch('is_prorrogado');

  function onSubmit(values: z.infer<typeof formSchema>) {
    const now = new Date();
    const expiryDate = new Date(values.nova_data_validade || values.data_validade);
    const status = expiryDate > now ? (values.is_prorrogado ? 'prorrogado' : 'valido') : 'vencido';

    const newBanco: BancoTalentos = {
      id: `banco-${Date.now()}`,
      unidade: values.unidade,
      cargo: values.cargo,
      secao: values.secao,
      numero_edital: values.numero_edital,
      data_abertura_edital: values.data_abertura_edital,
      data_validade: values.data_validade,
      is_prorrogado: values.is_prorrogado,
      nova_data_validade: values.nova_data_validade,
      status: status as any,
      observacoes: values.observacoes || '',
    };

    addBanco(newBanco);
    toast.success('Banco de talentos cadastrado com sucesso!');
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
                  <SelectContent>
                    <SelectItem value="HGG">HGG</SelectItem>
                    <SelectItem value="HUGO">HUGO</SelectItem>
                    <SelectItem value="HEAPA">HEAPA</SelectItem>
                    <SelectItem value="HDS">HDS</SelectItem>
                    <SelectItem value="CEALCON">CEALCON</SelectItem>
                    <SelectItem value="AGIR">AGIR</SelectItem>
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
                <FormLabel>Data de Abertura do Edital</FormLabel>
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
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex items-center space-x-2 bg-slate-50 p-3 rounded-md border border-slate-200">
          <FormField
            control={form.control}
            name="is_prorrogado"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="font-bold text-slate-700">
                    Banco prorrogado?
                  </FormLabel>
                </div>
              </FormItem>
            )}
          />
        </div>

        {isProrrogado && (
          <FormField
            control={form.control}
            name="nova_data_validade"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nova Data Final (Prorrogação)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

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
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => {
                form.handleSubmit(onSubmit)();
              }}
            >
              Salvar e Continuar
            </Button>
            <Button type="submit">
              Salvar
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
