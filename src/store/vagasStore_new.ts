import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Vaga, Edital, ValidacaoEdital, ImportHistory, ImportedFile, Tarefa, Alerta, MensagemHistorico, BloqueioHorario } from '@/types/vaga';
import { mockConvocacoes, mockEditais, mockValidacoes } from '@/data/mockData';
import { BancoTalentos, Convocacao } from '@/types/vaga';
import { normalizeCargo, getCategoriaStatus } from '@/lib/vagaUtils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const splitAssistentes = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(item => String(item || '').trim()).filter(Boolean);
  }
  return String(value || '')
    .split(/[;,|]/)
    .map(item => item.trim())
    .filter(Boolean);
};

const mapDbVaga = (row: any): Vaga => ({
  ...row,
  version: row.version || 1,
  data_abertura: row.data_abertura || '',
  data_recebimento: row.data_recebimento || '',
  data_criacao: row.created_at || row.data_importacao || new Date().toISOString(),
  created_at: row.created_at || row.data_importacao || new Date().toISOString(),
  requisicao: row.requisicao || row.numero_requisicao || row.numero_processo_seletivo || '',
  numero_requisicao: row.numero_requisicao || row.numero_processo_seletivo || row.requisicao || '',
  numero_processo: row.numero_processo || row.numero_processo_seletivo || '',
  secao: row.secao || '',
  assistentes: splitAssistentes(row.assistentes),
  observacoes: row.observacoes || row.observacao || '',
  observacoes_internas: row.observacoes_internas || row.observacao || '',
  historico: Array.isArray(row.historico) ? row.historico : [],
  tem_banco_valido: Boolean(row.tem_banco_valido),
  origem: row.origem === 'manual' ? 'manual' : 'importada',
  categoria_status: getCategoriaStatus(row),
});

const mapDbBanco = (row: any): BancoTalentos => ({
  ...row,
  version: row.version || 1,
  observacoes: row.observacoes || row.observacao || '',
  numero_processo: row.numero_processo || row.numero_processo_seletivo || '',
  data_abertura_edital: row.data_abertura_edital || '',
  data_validade: row.data_validade || '',
  status: row.status || 'nenhum',
});

const buildImportedFileFromHistory = (history: ImportHistory): ImportedFile => ({
  id: history.id,
  nome_original: history.nome_arquivo || history.arquivo || `Importação ${history.id.slice(0, 8)}`,
  nome_interno: history.referencia_arquivo || history.id,
  tipo: history.tipo_importacao || 'importacao',
  tamanho: 0,
  data_upload: history.data_hora || history.data || '',
  usuario: history.usuario,
  email_usuario: history.email_usuario,
  modulo_origem: history.tipo_importacao === 'banco' ? 'Banco de Talentos' : 'Vagas',
  status: history.status === 'erro' ? 'erro' : history.status === 'em_processamento' ? 'processando' : 'processado',
  vaga_importacao_id: history.referencia_arquivo || history.id,
});

const fetchAllRows = async (tableName: 'vagas' | 'banco_candidatos' | 'importacoes', columns: string = '*') => {
  const { count, error: countError } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });
  if (countError) throw countError;
  if (!count || count === 0) return [];
  const CHUNK_SIZE = 1000;
  const numChunks = Math.ceil(count / CHUNK_SIZE);
  const promises = [];
  for (let i = 0; i < numChunks; i++) {
    promises.push(supabase.from(tableName).select(columns).order('created_at', { ascending: false }).range(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE - 1));
  }
  const results = await Promise.all(promises);
  return results.flatMap(r => r.data || []);
};

interface VagasState {
  vagas: Vaga[];
  bancos: BancoTalentos[];
  convocacoes: Convocacao[];
  bloqueios: BloqueioHorario[];
  editais: Edital[];
  validacoes: ValidacaoEdital[];
  importHistory: ImportHistory[];
  importedFiles: ImportedFile[];
  tarefas: Tarefa[];
  alertas: Alerta[];
  historicoMensagens: MensagemHistorico[];
  notificacoes: any[];
  editingRecords: Record<string, { userId: string; userName: string; timestamp: number }>;
  temNovasMensagens: boolean;
  isLoading: boolean;
  
  fetchVagas: () => Promise<void>;
  fetchBancos: () => Promise<void>;
  updateVagaAsync: (id: string, data: Partial<Vaga>) => Promise<boolean>;
  trackEditing: (recordId: string, userId: string, userName: string) => void;
  untrackEditing: (recordId: string) => void;
  fetchNotificacoes: () => Promise<void>;
  createNotificacao: (data: any) => Promise<void>;
  markNotificacaoLida: (id: string) => Promise<void>;
  subscribeRealtime: () => void;
  unsubscribeRealtime: () => void;
}

export const useVagasStore = create<VagasState>()(
  persist(
    (set, get) => ({
      vagas: [],
      bancos: [],
      convocacoes: mockConvocacoes,
      bloqueios: [],
      editais: mockEditais,
      validacoes: mockValidacoes,
      importHistory: [],
      importedFiles: [],
      tarefas: [],
      alertas: [],
      historicoMensagens: [],
      notificacoes: [],
      editingRecords: {},
      temNovasMensagens: false,
      isLoading: false,

      fetchVagas: async () => {
        const data = await fetchAllRows('vagas');
        set({ vagas: data.map(mapDbVaga) });
      },

      fetchBancos: async () => {
        const data = await fetchAllRows('banco_candidatos');
        set({ bancos: data.map(mapDbBanco) });
      },

      updateVagaAsync: async (id, data) => {
        const vaga = get().vagas.find(v => v.id === id);
        if (!vaga) return false;
        const { error } = await supabase
          .from('vagas')
          .update({ ...data, version: (vaga.version || 1) + 1 })
          .eq('id', id)
          .eq('version', vaga.version || 1);
        if (error) {
          toast.error("Este registro foi atualizado por outro usuário. Recarregue a página.");
          return false;
        }
        return true;
      },

      trackEditing: (recordId, userId, userName) => set(s => ({ editingRecords: { ...s.editingRecords, [recordId]: { userId, userName, timestamp: Date.now() } } })),
      untrackEditing: (recordId) => set(s => { const next = { ...s.editingRecords }; delete next[recordId]; return { editingRecords: next }; }),

      fetchNotificacoes: async () => {
        const { data } = await supabase.from('notificacoes').select('*').order('created_at', { ascending: false });
        set({ notificacoes: data || [] });
      },

      createNotificacao: async (data) => {
        await supabase.from('notificacoes').insert(data);
      },

      markNotificacaoLida: async (id) => {
        await supabase.from('notificacoes').update({ lida: true }).eq('id', id);
        get().fetchNotificacoes();
      },

      subscribeRealtime: () => {
        const channel = supabase.channel('realtime-db')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'vagas' }, (payload) => {
            if (payload.eventType === 'UPDATE') {
              const updated = mapDbVaga(payload.new);
              set(s => ({ vagas: s.vagas.map(v => v.id === updated.id ? updated : v) }));
              toast.info(`Vaga ${updated.requisicao} foi atualizada.`);
            }
          })
          .subscribe();
        (window as any).__realtimeChannel = channel;
      },

      unsubscribeRealtime: () => {
        const channel = (window as any).__realtimeChannel;
        if (channel) supabase.removeChannel(channel);
      }
    }),
    {
      name: 'vagas-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
