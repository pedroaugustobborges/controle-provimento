import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Vaga, Edital, ValidacaoEdital, ImportHistory, ImportedFile, Tarefa, Alerta, MensagemHistorico, BloqueioHorario } from '@/types/vaga';
import { mockConvocacoes, mockEditais, mockValidacoes, mockTarefas, mockAlertas } from '@/data/mockData';
import { BancoTalentos, Convocacao } from '@/types/vaga';
import { normalizeCargo, getCategoriaStatus } from '@/lib/vagaUtils';
import { toast } from 'sonner';

const PAGE_SIZE = 1000;

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
  status: history.status === 'erro'
    ? 'erro'
    : history.status === 'em_processamento'
      ? 'processando'
      : 'processado',
  vaga_importacao_id: history.referencia_arquivo || history.id,
});

const fetchAllRows = async (tableName: 'vagas' | 'banco_candidatos' | 'importacoes', columns: string = '*') => {
  const { supabase } = await import('@/integrations/supabase/client');
  
  const { count, error: countError } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  if (countError) throw countError;
  
  if (!count || count === 0) return [];

  const CHUNK_SIZE = 1000;
  if (count <= CHUNK_SIZE) {
    const { data, error } = await supabase
      .from(tableName)
      .select(columns)
      .order('created_at', { ascending: false })
      .range(0, CHUNK_SIZE - 1);
    
    if (error) throw error;
    return data || [];
  }

  const numChunks = Math.ceil(count / CHUNK_SIZE);
  const promises = [];

  for (let i = 0; i < numChunks; i++) {
    const from = i * CHUNK_SIZE;
    const to = from + CHUNK_SIZE - 1;
    promises.push(
      supabase
        .from(tableName)
        .select(columns)
        .order('created_at', { ascending: false })
        .range(from, to)
    );
  }

  const results = await Promise.all(promises);
  const allRows: any[] = [];
  
  for (const { data, error } of results) {
    if (error) throw error;
    if (data) allRows.push(...data);
  }

  return allRows;
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
  notificacoes: any[];
  editingUsers: Record<string, any>;
  historicoMensagens: MensagemHistorico[];
  temNovasMensagens: boolean;
  isLoading: boolean;
  isInitialLoad: boolean;
  isLoadingVagas: boolean;
  isLoadingBancos: boolean;
  lastUpdated?: number;

  setVagas: (vagas: Vaga[]) => void;
  fetchVagas: (incremental?: boolean) => Promise<void>;
  fetchBancos: (incremental?: boolean) => Promise<void>;
  fetchAll: () => Promise<void>;
  fetchImportHistory: () => Promise<void>;
  fetchNotificacoes: () => Promise<void>;
  createNotificacao: (notif: { titulo: string; mensagem: string; tipo?: string; unidade?: string; registro_id?: string; regiao?: string; usuario_id?: string | null }) => Promise<void>;
  notificarMovimentacaoEdital: (vagaId: string, novaEtapa: string, mensagemExtra?: string) => Promise<void>;
  addVagas: (vagas: Vaga[]) => Promise<void> | void;
  updateVaga: (id: string, data: Partial<Vaga>) => void;
  updateVagaAsync: (id: string, data: Partial<Vaga>) => Promise<boolean>;
  deleteVaga: (id: string) => void;
  addBanco: (banco: BancoTalentos) => void;
  addBancos: (bancos: BancoTalentos[]) => void;
  updateBanco: (id: string, data: Partial<BancoTalentos>) => void;
  updateBancoAsync: (id: string, data: Partial<BancoTalentos>) => Promise<boolean>;
  deleteBanco: (id: string) => void;
  addConvocacao: (convocacao: Convocacao) => Promise<void>;
  updateConvocacao: (id: string, data: Partial<Convocacao>) => Promise<void>;
  deleteConvocacao: (id: string) => Promise<void>;
  fetchConvocacoes: () => Promise<void>;
  updateEdital: (id: string, data: Partial<Edital>) => void;
  updateValidacao: (id: string, data: Partial<ValidacaoEdital>) => void;
  addEdital: (edital: Edital) => void;
  addValidacao: (validacao: ValidacaoEdital) => void;
  addImportHistory: (history: ImportHistory) => void;
  addImportedFile: (file: ImportedFile) => void;
  updateImportedFile: (id: string, data: Partial<ImportedFile>) => void;
  deleteImportedFile: (id: string) => Promise<void>;
  addTarefa: (tarefa: Tarefa) => void;
  updateTarefa: (id: string, data: Partial<Tarefa>) => void;
  deleteTarefa: (id: string) => void;
  addAlerta: (alerta: Alerta) => void;
  addBloqueio: (bloqueio: BloqueioHorario) => void;
  removeBloqueio: (id: string) => void;
  updateAlerta: (id: string, data: Partial<Alerta>) => void;
  addMensagem: (mensagem: any) => Promise<void>;
  marcarMensagemLida: (id: string) => void;
  setTemNovasMensagens: (has: boolean) => void;
  deleteImportBatch: (batchId: string) => Promise<void>;
  clearVagas: () => void;
  clearBancos: () => void;
  clearBancosPorRegiao: (regiao: 'GO_ES' | 'OUTRAS_UNIDADES') => void;
  clearAllData: () => void;
  getVaga: (id: string) => Vaga | undefined;
  getEditalByVaga: (vagaId: string) => Edital | undefined;
  getValidacaoByVaga: (vagaId: string) => ValidacaoEdital | undefined;
  getBancoByVaga: (vagaId: string) => BancoTalentos | undefined;
  getConvocacoesByVaga: (vagaId: string) => Convocacao[];
  getMatchingDiagnostic: () => { vagaId: string; vagaCargo: string; vagaUnidade: string; vagaReq: string; potentialBancos: any[] }[];
  marcarTodasLidas: () => void;
  fixWrongImportBatches: () => void;
  subscribeRealtime: () => void;
  unsubscribeRealtime: () => void;
  trackEditing: (recordId: string) => Promise<void>;
  stopTrackingEditing: () => Promise<void>;
}

export const useVagasStore = create<VagasState>()(
  persist(
    (set, get) => ({
      vagas: [],
      bancos: [],
      convocacoes: [],
      bloqueios: [] as BloqueioHorario[],
      editais: mockEditais,
      validacoes: mockValidacoes,
      importHistory: [],
      importedFiles: [],
      notificacoes: [],
      editingUsers: {},
      tarefas: [],
      alertas: [],
      historicoMensagens: [],
      temNovasMensagens: false,
      isLoading: false,
      isInitialLoad: true,
      isLoadingVagas: false,
      isLoadingBancos: false,
      lastUpdated: undefined,

      setVagas: (vagas) => set({ vagas }),
      fetchVagas: async (incremental = false) => {
        if (get().isLoadingVagas) return;
        if (!incremental && get().vagas.length > 0 && !get().isInitialLoad) return;
        set({ isLoadingVagas: true });
        try {
          const data = await fetchAllRows('vagas');
          set({ vagas: data.map(mapDbVaga), isInitialLoad: false });
        } catch (err) {
          console.error('Error fetching vagas:', err);
        } finally {
          set({ isLoadingVagas: false });
        }
      },
      fetchBancos: async (incremental = false) => {
        if (get().isLoadingBancos) return;
        if (!incremental && get().bancos.length > 0 && !get().isInitialLoad) return;
        set({ isLoadingBancos: true });
        try {
          const data = await fetchAllRows('banco_candidatos');
          set({ bancos: data.map(mapDbBanco), isInitialLoad: false });
        } catch (err) {
          console.error('Error fetching bancos:', err);
        } finally {
          set({ isLoadingBancos: false });
        }
      },
      fetchAll: async () => {
        set({ isLoading: true });
        try {
          await Promise.all([
            get().fetchVagas(),
            get().fetchBancos(),
            get().fetchImportHistory(),
            get().fetchNotificacoes(),
            get().fetchConvocacoes(),
          ]);
        } finally {
          set({ isLoading: false, isInitialLoad: false });
        }
      },
      fetchImportHistory: async () => {
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const data = await fetchAllRows('importacoes');
          const userIds = [...new Set(data.map(item => item.usuario_id).filter(Boolean))];
          const profilesById = new Map<string, any>();

          if (userIds.length > 0) {
            const { data: profiles } = await supabase.from('profiles').select('id, nome_completo, email').in('id', userIds);
            (profiles || []).forEach(p => profilesById.set(p.id, p));
          }

          const mapped = data.map(item => {
            const p = profilesById.get(item.usuario_id || '');
            return {
              id: item.id,
              usuario: p?.nome_completo || item.usuario_id || 'Sistema',
              email_usuario: p?.email,
              total_lidos: item.quantidade_processada || 0,
              total_novos: item.quantidade_inserida || 0,
              total_atualizados: item.quantidade_atualizada || 0,
              total_ignorados: item.quantidade_ignorada || 0,
              total_erros: item.quantidade_erro || 0,
              status: item.status,
              tipo_importacao: item.tipo,
              arquivo: item.nome_arquivo || item.arquivo || `Importação ${item.id.slice(0, 8)}`,
              data_hora: item.created_at,
              referencia_arquivo: item.arquivo || item.nome_arquivo || item.id,
            } as ImportHistory;
          });

          set({ importHistory: mapped, importedFiles: mapped.map(buildImportedFileFromHistory) });
        } catch (err) {
          console.error('Error fetching import history:', err);
        }
      },
      fetchNotificacoes: async () => {
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const { data: { user: authUser } } = await supabase.auth.getUser();
          const myId = authUser?.id;
          const { data, error } = await supabase.from('notificacoes').select('*').order('created_at', { ascending: false }).limit(500);
          if (!error && data) {
            set({ notificacoes: data.slice(0, 50) });

            // Resolve destinatario_nome by fetching all involved user IDs
            const mensagensRaw = data.filter((n: any) => n.tipo === 'mensagem' && (n.usuario_id === myId || n.remetente_id === myId));
            const involvedIds = Array.from(new Set(mensagensRaw.flatMap((n: any) => [n.usuario_id, n.remetente_id]).filter(Boolean))) as string[];
            let nameById: Record<string, string> = {};
            if (involvedIds.length > 0) {
              const { data: profs } = await supabase.from('profiles').select('id, nome_completo').in('id', involvedIds);
              nameById = (profs || []).reduce((acc: any, p: any) => { acc[p.id] = p.nome_completo; return acc; }, {});
            }

            const mensagens: MensagemHistorico[] = mensagensRaw.map((n: any) => ({
              id: n.id,
              data: n.created_at || new Date().toISOString(),
              remetente: n.remetente_nome || nameById[n.remetente_id] || 'Colega',
              remetente_id: n.remetente_id || null,
              destinatario_id: n.usuario_id || null,
              destinatario_nome: nameById[n.usuario_id] || null,
              conteudo: n.mensagem || '',
              lida: n.remetente_id === myId ? true : Boolean(n.lida),
              titulo: n.titulo,
            }));
            set({
              historicoMensagens: mensagens,
              temNovasMensagens: mensagens.some(m => !m.lida),
            });
          }
        } catch (err) {
          console.error('Error fetching notifications:', err);
        }
      },
      createNotificacao: async (notif) => {
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const { useAdminStore } = await import('./adminStore');
          const { currentUser } = useAdminStore.getState();
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from('notificacoes').insert({
            ...notif,
            usuario_id: notif.usuario_id ?? null,
            remetente_id: user?.id ?? currentUser?.id,
            remetente_nome: currentUser?.nome_completo,
            created_at: new Date().toISOString()
          });
        } catch (err) {
          console.error('Error creating notification:', err);
        }
      },
      notificarMovimentacaoEdital: async (vagaId, novaEtapa, mensagemExtra) => {
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const { useAdminStore } = await import('./adminStore');
          const { currentUser } = useAdminStore.getState();
          const { data: { user } } = await supabase.auth.getUser();

          const vaga = get().vagas.find(v => v.id === vagaId);
          if (!vaga) return;

          // Identify recipients: all active Admin / Analista Administrativo / Analista do Edital
          const PERFIS_DESTINO = [
            'Administrador', 'Admin',
            'Analista Administrativo', 'Analista administrativo',
            'Analista do Edital', 'Analista de Edital', 'Analista do edital',
          ];
          const { data: destinatarios } = await supabase
            .from('profiles')
            .select('id')
            .in('perfil', PERFIS_DESTINO)
            .eq('status', 'ativo');

          const recipientIds = new Set<string>((destinatarios || []).map((d: any) => d.id));
          // Also include the original requester (created_by) so they track progress
          const createdBy = (vaga as any).created_by;
          if (createdBy && typeof createdBy === 'string' && createdBy.length === 36) {
            recipientIds.add(createdBy);
          }
          // Don't notify the actor themselves (they did the action)
          if (user?.id) recipientIds.delete(user.id);

          const ETAPA_LABELS_LOCAL: Record<string, string> = {
            encaminhado_edital: 'Redação de Edital',
            em_redacao: 'Redação de Edital',
            enviado_validacao: 'Validação de Edital',
            aguardando_aprovacao_gestor: 'Aprovação do Gestor',
            aprovado_administrativo: 'Aprovado para Publicação',
            publicado: 'Publicado',
          };
          const etapaLabel = ETAPA_LABELS_LOCAL[novaEtapa] || novaEtapa;
          const titulo = `Vaga movida → ${etapaLabel}`;
          const cargoRef = vaga.cargo || 'Vaga';
          const unidadeRef = vaga.unidade || '';
          const autor = currentUser?.nome_completo || 'Sistema';
          const mensagem = `${cargoRef}${unidadeRef ? ' • ' + unidadeRef : ''} foi movida por ${autor}.${mensagemExtra ? ' ' + mensagemExtra : ''}`;

          const rows = Array.from(recipientIds).map((uid) => ({
            usuario_id: uid,
            titulo,
            mensagem,
            tipo: 'movimentacao_edital',
            registro_id: vagaId,
            unidade: vaga.unidade || null,
            remetente_id: user?.id ?? currentUser?.id ?? null,
            remetente_nome: currentUser?.nome_completo ?? null,
          }));

          if (rows.length > 0) {
            const { error } = await supabase.from('notificacoes').insert(rows);
            if (error) console.error('[notificarMovimentacaoEdital] insert error:', error);
          }
        } catch (err) {
          console.error('[notificarMovimentacaoEdital] error:', err);
        }
      },
      addVagas: async (newVagas) => {
        // Optimistic
        set((s) => ({ vagas: [...newVagas, ...s.vagas] }));
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (!authUser) {
            toast.error('Sessão expirada. Faça login novamente para salvar a vaga.');
            const ids = new Set(newVagas.map((v: any) => v.id));
            set((s) => ({ vagas: s.vagas.filter((v) => !ids.has(v.id)) }));
            return;
          }

          const ALLOWED = new Set([
            'unidade','cargo','status','status_geral','tipo_vaga','numero_vagas','quantidade','motivo','observacao','observacoes',
            'analista_responsavel','assistentes','nome_substituido','data_abertura','data_recebimento','data_envio_edital','data_publicacao',
            'data_homologacao','data_convocacao','secao','numero_edital','numero_processo_seletivo','etapa','publicacao','prioridade',
            'mes_referencia','origem','unidade_trabalho','unidades_banco_talentos','is_pcd','is_teia','status_fluxo_edital',
            'observacoes_unidade','observacoes_edital','observacoes_validacao','arquivo_edital','historico','distribuicao_vagas','url_reachr'
          ]);

          const payloads = newVagas.map((v: any) => {
            const p: any = { created_by: authUser.id, updated_by: authUser.id };
            for (const k of Object.keys(v)) {
              if (k === 'id' && typeof v.id === 'string' && v.id.startsWith('vaga-manual-')) continue;
              if (k === 'requisicao' || k === 'numero_requisicao') {
                p.numero_processo_seletivo = v[k] || p.numero_processo_seletivo || null;
                continue;
              }
              if (k === 'assistentes' && Array.isArray(v[k])) { p.assistentes = v[k].join(', '); continue; }
              if (ALLOWED.has(k) && v[k] !== undefined) p[k] = v[k];
            }
            return p;
          });

          const { data, error } = await supabase.from('vagas').insert(payloads).select();
          if (error) {
            console.error('addVagas persist error:', error, 'payload:', payloads);
            toast.error(`Falha ao salvar vaga: ${error.message}`);
            const ids = new Set(newVagas.map((v: any) => v.id));
            set((s) => ({ vagas: s.vagas.filter((v) => !ids.has(v.id)) }));
            return;
          }

          // Replace temp rows with persisted versions
          if (data && data.length) {
            const tempIds = newVagas.map((v: any) => v.id);
            set((s) => {
              const filtered = s.vagas.filter((v) => !tempIds.includes(v.id));
              return { vagas: [...data.map(mapDbVaga), ...filtered] };
            });
          }
        } catch (e: any) {
          console.error('addVagas exception:', e);
          toast.error(`Erro ao salvar vaga: ${e?.message || 'desconhecido'}`);
        }
      },
      updateVaga: (id, data) => set((s) => ({
        vagas: s.vagas.map((v) => v.id === id ? { ...v, ...data } : v),
      })),
      updateVagaAsync: async (id, data) => {
        const { DatabaseService } = await import('@/services/databaseService');
        const { useAdminStore } = await import('./adminStore');
        const { currentUser } = useAdminStore.getState();
        if (!currentUser) return false;

        const currentVaga = get().vagas.find(v => v.id === id);
        if (!currentVaga) return false;

        // Optimistic local update so UI feels instant
        get().updateVaga(id, data);

        const { data: updated, error } = await DatabaseService.saveWithConcurrency('vagas', {
          ...currentVaga,
          ...data,
          id,
          version: currentVaga.version || 0
        }, currentUser.id);

        if (error) {
          console.error('[updateVagaAsync] Error:', error);
          toast.error(error.message || "Erro ao atualizar vaga.");
          return false;
        }

        if (updated) {
          // Merge: preserve any local-only fields (cronograma, historico, etc.) not present in DB row
          get().updateVaga(id, { ...mapDbVaga(updated), ...data });
          get().createNotificacao({
            titulo: "Vaga Atualizada",
            mensagem: `${currentUser.nome_completo} atualizou a vaga ${currentVaga.cargo}`,
            unidade: currentVaga.unidade,
            registro_id: id
          });
          return true;
        }
        return false;
      },
      deleteVaga: (id) => set((s) => ({ vagas: s.vagas.filter((v) => v.id !== id) })),
      addBanco: async (banco) => {
        // Optimistic update
        const tempId = banco.id;
        set((s) => ({ bancos: [banco, ...s.bancos] }));
        
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const { data: { user: authUser } } = await supabase.auth.getUser();
          
          if (!authUser) {
            console.error('addBanco: no authenticated user');
            toast.error('Sessão expirada. Faça login novamente para salvar o banco.');
            set((s) => ({ bancos: s.bancos.filter(b => b.id !== tempId) }));
            return;
          }

          const { id, ...rest } = banco as any;
          
          // Whitelist ONLY columns that exist in banco_candidatos table
          const qtd = rest.quantidade_banco;
          const qtdNum = qtd === '' || qtd == null ? null : (isNaN(Number(qtd)) ? null : Number(qtd));
          const payload: any = {
            unidade: rest.unidade || null,
            cargo: rest.cargo || null,
            cargo_normalizado: rest.cargo_normalizado || null,
            numero_edital: rest.numero_edital || null,
            numero_processo_seletivo: rest.numero_processo_seletivo || rest.numero_processo || null,
            nome: rest.nome || null,
            classificacao: rest.classificacao || null,
            quantidade_banco: qtdNum,
            data_publicacao: rest.data_publicacao || rest.data_abertura_edital || null,
            data_validade: rest.data_validade || null,
            is_prorrogado: !!rest.is_prorrogado,
            prorrogacao: rest.prorrogacao || null,
            data_convocacao: rest.data_convocacao || null,
            unidade_convocacao: rest.unidade_convocacao || null,
            numero_chamada: rest.numero_chamada || null,
            status: rest.status || 'CADASTRO RESERVA',
            status_original: rest.status_original || null,
            status_calculado: rest.status_calculado || null,
            motivo_do_calculo: rest.motivo_do_calculo || null,
            data_base_do_calculo: rest.data_base_do_calculo || null,
            data_referencia_usada: rest.data_referencia_usada || null,
            observacao: rest.observacoes || rest.observacao || null,
            origem: 'manual',
            created_by: authUser.id,
            updated_by: authUser.id,
          };

          const { data, error } = await supabase.from('banco_candidatos').insert(payload).select().single();
          
          if (error) {
            console.error('addBanco persist error:', error, 'payload:', payload);
            toast.error(`Falha ao salvar banco de talentos: ${error.message}`);
            set((s) => ({ bancos: s.bancos.filter(b => b.id !== tempId) }));
            return;
          }

          // Replace temp id with DB id
          set((s) => ({ bancos: s.bancos.map(b => b.id === tempId ? mapDbBanco(data) : b) }));
        } catch (e: any) {
          console.error('addBanco exception:', e);
          toast.error(`Erro ao salvar banco de talentos: ${e?.message || 'desconhecido'}`);
          set((s) => ({ bancos: s.bancos.filter(b => b.id !== tempId) }));
        }
      },
      addBancos: (newBancos) => set((s) => ({ bancos: [...newBancos, ...s.bancos] })),
      updateBanco: (id, data) => set((s) => ({ bancos: s.bancos.map((b) => b.id === id ? { ...b, ...data } : b) })),
      updateBancoAsync: async (id, data) => {
        const { DatabaseService } = await import('@/services/databaseService');
        const { useAdminStore } = await import('./adminStore');
        const { currentUser } = useAdminStore.getState();
        if (!currentUser) return false;

        const currentBanco = get().bancos.find(b => b.id === id);
        if (!currentBanco) return false;

        // Optimistic local update for snappy UX
        get().updateBanco(id, data);

        const { data: updated, error } = await DatabaseService.saveWithConcurrency('banco_candidatos', {
          ...currentBanco,
          ...data,
          id,
          version: (currentBanco as any).version || 0
        }, currentUser.id);

        if (error) {
          console.error('[updateBancoAsync] Error:', error);
          toast.error(error.message || 'Erro ao atualizar registro do banco.');
          return false;
        }

        if (updated) {
          get().updateBanco(id, mapDbBanco(updated));
          return true;
        }
        return false;
      },
      deleteBanco: (id) => set((s) => ({ bancos: s.bancos.filter((b) => b.id !== id) })),
      addConvocacao: async (convocacao) => {
        // Optimistic update
        set((s) => ({ convocacoes: [convocacao, ...s.convocacoes] }));
        const tempId = (convocacao as any).id;
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          // CRITICAL: Use auth.uid() (real Supabase auth), not adminStore.currentUser.id
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (!authUser) {
            console.error('addConvocacao: no authenticated user');
            toast.error('Sessão expirada. Faça login novamente para salvar a convocação.');
            set((s) => ({ convocacoes: s.convocacoes.filter(c => c.id !== tempId) }));
            return;
          }

          const { id, vaga_id, banco_id, ...rest } = convocacao as any;
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

          // Whitelist only DB columns to avoid PGRST204 ("column not found") errors
          const payload: any = {
            vaga_id: vaga_id && uuidRegex.test(vaga_id) ? vaga_id : null,
            banco_id: banco_id && uuidRegex.test(banco_id) ? banco_id : null,
            edital_relacionado: rest.edital_relacionado || null,
            requisicao: rest.requisicao || null,
            nome_candidato: rest.nome_candidato,
            cargo: rest.cargo || null,
            unidade: rest.unidade || null,
            unidade_alternativa: rest.unidade_alternativa || null,
            secao: rest.secao || null,
            classificacao: rest.classificacao != null ? Number(rest.classificacao) : null,
            data_convocacao: rest.data_convocacao,
            horario: rest.horario,
            carga_horaria: rest.carga_horaria || null,
            horario_trabalho: rest.horario_trabalho || null,
            edoc: rest.edoc || null,
            tipo_convocacao: rest.tipo_convocacao || 'Presencial',
            tipo_atendimento: rest.tipo_atendimento || 'presencial',
            link_teams: rest.link_teams || null,
            status: rest.status || 'pendente',
            devolutiva: rest.devolutiva || null,
            data_devolutiva: rest.data_devolutiva || null,
            responsavel: rest.responsavel || null,
            observacoes: rest.observacoes || null,
            created_by: authUser.id,
            updated_by: authUser.id,
          };

          const { data, error } = await supabase.from('convocacoes').insert(payload).select().single();
          if (error) {
            console.error('addConvocacao persist error:', error, 'payload:', payload);
            toast.error(`Falha ao salvar convocação: ${error.message}`);
            set((s) => ({ convocacoes: s.convocacoes.filter(c => c.id !== tempId) }));
            return;
          }
          // Replace temp id with DB id
          set((s) => ({ convocacoes: s.convocacoes.map(c => c.id === tempId ? { ...c, ...(data as any) } as Convocacao : c) }));
          console.log('[addConvocacao] Saved successfully:', data.id);
        } catch (e: any) {
          console.error('addConvocacao exception:', e);
          toast.error(`Erro ao salvar convocação: ${e?.message || 'desconhecido'}`);
          set((s) => ({ convocacoes: s.convocacoes.filter(c => c.id !== tempId) }));
        }
      },
      updateConvocacao: async (id, data) => {
        set((s) => ({ convocacoes: s.convocacoes.map((c) => c.id === id ? { ...c, ...data } : c) }));
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const { useAdminStore } = await import('./adminStore');
          const { currentUser } = useAdminStore.getState();
          const payload: any = { ...data, updated_by: currentUser?.id || null };
          delete payload.id;
          delete payload.requisicao;
          delete payload.edital_relacionado;
          delete payload.vaga_id;
          delete payload.banco_id;
          delete payload.created_at;
          delete payload.created_by;
          delete payload.version;
          const { error } = await supabase.from('convocacoes' as any).update(payload).eq('id', id);
          if (error) {
            console.error('updateConvocacao error:', error);
            toast.error('Falha ao atualizar convocação no servidor.');
          }
        } catch (e) {
          console.error('updateConvocacao exception:', e);
        }
      },
      deleteConvocacao: async (id) => {
        set((s) => ({ convocacoes: s.convocacoes.filter((c) => c.id !== id) }));
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          // Soft delete
          const { error } = await supabase.from('convocacoes' as any).update({ deleted_at: new Date().toISOString() }).eq('id', id);
          if (error) console.error('deleteConvocacao error:', error);
        } catch (e) {
          console.error('deleteConvocacao exception:', e);
        }
      },
      fetchConvocacoes: async () => {
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const { data, error } = await supabase.from('convocacoes' as any).select('*').is('deleted_at', null).order('data_convocacao', { ascending: false }).limit(2000);
          if (error) { console.error('fetchConvocacoes error:', error); return; }
          if (data && Array.isArray(data)) {
            set({ convocacoes: data as any });
          }
        } catch (e) {
          console.error('fetchConvocacoes exception:', e);
        }
      },
      updateEdital: (id, data) => set((s) => ({ editais: s.editais.map((e) => e.id === id ? { ...e, ...data } : e) })),
      updateValidacao: (id, data) => set((s) => ({ validacoes: s.validacoes.map((v) => v.id === id ? { ...v, ...data } : v) })),
      addEdital: (edital) => set((s) => ({ editais: [...s.editais, edital] })),
      addValidacao: (validacao) => set((s) => ({ validacoes: [...s.validacoes, validacao] })),
      addImportHistory: (history) => set((s) => ({ importHistory: [history, ...s.importHistory] })),
      addImportedFile: (file) => set((s) => ({ importedFiles: [file, ...s.importedFiles] })),
      updateImportedFile: (id, data) => set((s) => ({ importedFiles: s.importedFiles.map((f) => f.id === id ? { ...f, ...data } : f) })),
      deleteImportedFile: async (id) => {
        const { DatabaseService } = await import('@/services/databaseService');
        const { success } = await DatabaseService.deleteImportBatch(id);
        if (success) set((s) => ({ importedFiles: s.importedFiles.filter((f) => f.id !== id), importHistory: s.importHistory.filter((h) => h.id !== id) }));
      },
      addTarefa: async (tarefa: any) => {
        const tempId = tarefa.id;
        set((s) => ({ tarefas: [tarefa, ...s.tarefas] }));
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const payload: any = {
            titulo: tarefa.titulo,
            descricao: tarefa.descricao || null,
            status: tarefa.status || 'pendente',
            prioridade: tarefa.prioridade || 'media',
            atribuido_a: tarefa.atribuido_a || null,
            perfil_destinatario: tarefa.perfil_destinatario || null,
            data_vencimento: tarefa.data_vencimento || null,
            data_criacao: tarefa.data_criacao || new Date().toISOString(),
            relacionado_a_id: tarefa.relacionado_a_id || null,
            relacionado_a_tipo: tarefa.relacionado_a_tipo || null,
          };
          const { data, error } = await supabase.from('tarefas').insert(payload).select().single();
          if (error) {
            console.error('addTarefa persist error:', error);
            toast.error(`Falha ao salvar tarefa: ${error.message}`);
            set((s) => ({ tarefas: s.tarefas.filter((t) => t.id !== tempId) }));
            return;
          }
          set((s) => ({ tarefas: s.tarefas.map((t) => t.id === tempId ? (data as any) : t) }));
        } catch (e: any) {
          console.error('addTarefa exception:', e);
          set((s) => ({ tarefas: s.tarefas.filter((t) => t.id !== tempId) }));
        }
      },
      updateTarefa: (id, data) => set((s) => ({ tarefas: s.tarefas.map((t) => t.id === id ? { ...t, ...data } : t) })),
      deleteTarefa: (id) => set((s) => ({ tarefas: s.tarefas.filter((t) => t.id !== id) })),
      addAlerta: async (alerta: any) => {
        const tempId = alerta.id;
        set((s) => ({ alertas: [alerta, ...s.alertas] }));
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const payload: any = {
            titulo: alerta.titulo,
            mensagem: alerta.mensagem || null,
            tipo: alerta.tipo || 'informativo',
            status: alerta.status || 'nao_lido',
            destinatario: alerta.destinatario || null,
            link: alerta.link || null,
            data_criacao: alerta.data_criacao || new Date().toISOString(),
          };
          const { data, error } = await supabase.from('alertas').insert(payload).select().single();
          if (error) {
            console.error('addAlerta persist error:', error);
            toast.error(`Falha ao salvar alerta: ${error.message}`);
            set((s) => ({ alertas: s.alertas.filter((a) => a.id !== tempId) }));
            return;
          }
          set((s) => ({ alertas: s.alertas.map((a) => a.id === tempId ? (data as any) : a) }));
        } catch (e: any) {
          console.error('addAlerta exception:', e);
          set((s) => ({ alertas: s.alertas.filter((a) => a.id !== tempId) }));
        }
      },
      addBloqueio: (bloqueio) => set((s) => ({ bloqueios: [bloqueio, ...s.bloqueios] })),
      removeBloqueio: (id) => set((s) => ({ bloqueios: s.bloqueios.filter(b => b.id !== id) })),
      updateAlerta: (id, data) => set((s) => ({ alertas: s.alertas.map((a) => a.id === id ? { ...a, ...data } : a) })),
      addMensagem: async (mensagem: any) => {
        // Persist message in Supabase notificacoes (used as a chat backend).
        // Optimistic local update for the sender's own history.
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser();
          if (authErr || !authUser) {
            toast.error('Sessão expirada. Faça login novamente para enviar mensagens.');
            return;
          }
          const destinatarioId = mensagem.destinatario_id || mensagem.usuario_id || null;
          const conteudo = mensagem.conteudo || mensagem.mensagem || '';
          if (!destinatarioId) {
            toast.error('Destinatário não encontrado. Não foi possível enviar a mensagem.');
            return;
          }
          if (!conteudo.trim()) return;

          // Optimistic: add to sender's local history immediately
          const optimistic: MensagemHistorico = {
            id: mensagem.id || `tmp-${Date.now()}`,
            data: new Date().toISOString(),
            remetente: mensagem.remetente || 'Você',
            remetente_id: authUser.id,
            destinatario_id: destinatarioId,
            destinatario_nome: mensagem.destinatario_nome || null,
            conteudo,
            lida: true, // sender's own message is always "read" for them
            titulo: mensagem.titulo || 'Mensagem',
          };
          set((s) => ({ historicoMensagens: [optimistic, ...s.historicoMensagens] }));

          const { error } = await supabase.from('notificacoes').insert({
            usuario_id: destinatarioId,
            titulo: mensagem.titulo || `Mensagem de ${mensagem.remetente_nome || 'colega'}`,
            mensagem: conteudo,
            tipo: 'mensagem',
            remetente_id: authUser.id,
            remetente_nome: mensagem.remetente_nome || mensagem.remetente || null,
          });
          if (error) {
            console.error('[addMensagem] insert error:', error);
            toast.error('Falha ao enviar mensagem: ' + error.message);
            // rollback optimistic
            set((s) => ({ historicoMensagens: s.historicoMensagens.filter(m => m.id !== optimistic.id) }));
          }
        } catch (e: any) {
          console.error('[addMensagem] exception:', e);
          toast.error('Erro inesperado ao enviar mensagem.');
        }
      },
      marcarMensagemLida: async (id) => {
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          await supabase.from('notificacoes').update({ lida: true }).eq('id', id);
          
          set((s) => {
            const newHistory = s.historicoMensagens.map((m) => m.id === id ? { ...m, lida: true } : m);
            return { historicoMensagens: newHistory, temNovasMensagens: newHistory.some(m => !m.lida) };
          });
        } catch (err) {
          console.error('[marcarMensagemLida] error:', err);
        }
      },
      marcarTodasLidas: async () => {
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('notificacoes').update({ lida: true }).eq('usuario_id', user.id);
          }
          set((s) => ({ historicoMensagens: s.historicoMensagens.map((m) => ({ ...m, lida: true })), temNovasMensagens: false }));
        } catch (err) {
          console.error('[marcarTodasLidas] error:', err);
        }
      },
      setTemNovasMensagens: (has) => set({ temNovasMensagens: has }),
      deleteImportBatch: async (batchId) => {
        const { DatabaseService } = await import('@/services/databaseService');
        const { success } = await DatabaseService.deleteImportBatch(batchId);
        if (success) set((s) => ({ 
          vagas: s.vagas.filter((v) => v.import_batch_id !== batchId),
          bancos: s.bancos.filter((b) => b.import_batch_id !== batchId),
          importHistory: s.importHistory.filter((h) => h.id !== batchId)
        }));
      },
      clearVagas: () => set({ vagas: [] }),
      clearBancos: () => set({ bancos: [] }),
      clearBancosPorRegiao: (regiao) => set((s) => ({ bancos: s.bancos.filter((b) => b.regiao !== regiao) })),
      clearAllData: () => set({ vagas: [], bancos: [], editais: [], validacoes: [], importHistory: [], importedFiles: [], tarefas: [], alertas: [], notificacoes: [] }),
      getVaga: (id) => get().vagas.find((v) => v.id === id),
      getEditalByVaga: (vagaId) => get().editais.find((e) => e.vaga_id === vagaId),
      getValidacaoByVaga: (vagaId) => get().validacoes.find((v) => v.vaga_id === vagaId),
      getBancoByVaga: (vagaId) => {
        const state = get();
        const v = state.vagas.find(x => x.id === vagaId);
        if (!v) return undefined;
        return state.bancos.find(b => (b.numero_processo && b.numero_processo === (v.numero_processo || v.requisicao)) || (b.cargo === v.cargo && b.unidade === v.unidade));
      },
      getConvocacoesByVaga: (vagaId) => get().convocacoes.filter(c => c.vaga_id === vagaId),
      getMatchingDiagnostic: () => [],
      fixWrongImportBatches: () => {},
      subscribeRealtime: () => {
        // Avoid duplicate subscriptions
        if ((window as any).__realtimeChannel) {
          const currentChannel = (window as any).__realtimeChannel;
          if (currentChannel.state === 'joined') {
            console.log('[Realtime] Subscription already active and joined.');
            return;
          }
          console.log('[Realtime] Channel exists but state is:', currentChannel.state, '- Re-subscribing...');
          get().unsubscribeRealtime();
        }

        import('@/integrations/supabase/client').then(({ supabase }) => {
          const channelName = `realtime-vagas-bancos-${Math.random().toString(36).slice(2, 8)}`;
          console.log(`[Realtime] Initiating subscription on channel: ${channelName}`);
          
          const channel = supabase
            .channel(channelName)
            // Vagas
            .on('postgres_changes', { event: '*', schema: 'public', table: 'vagas' }, (payload) => {
              const { eventType, new: newRow, old: oldRow } = payload as any;
              console.log('[Realtime] Vagas Change:', eventType, newRow?.id || oldRow?.id);
              
              if (eventType === 'INSERT') {
                set((s) => s.vagas.some(v => v.id === newRow.id) ? s : ({ 
                  vagas: [mapDbVaga(newRow), ...s.vagas] 
                }));
              } else if (eventType === 'UPDATE') {
                set((s) => ({
                  vagas: s.vagas.map((v) => {
                    if (v.id !== newRow.id) return v;
                    if ((v.version || 0) > (newRow.version || 0)) return v;
                    return mapDbVaga(newRow);
                  })
                }));
              } else if (eventType === 'DELETE') {
                set((s) => ({ vagas: s.vagas.filter((v) => v.id !== oldRow.id) }));
              }
            })
            // Banco de Candidatos
            .on('postgres_changes', { event: '*', schema: 'public', table: 'banco_candidatos' }, (payload) => {
              const { eventType, new: newRow, old: oldRow } = payload as any;
              console.log('[Realtime] Banco Change:', eventType, newRow?.id || oldRow?.id);

              if (eventType === 'INSERT') {
                set((s) => s.bancos.some(b => b.id === newRow.id) ? s : ({ 
                  bancos: [mapDbBanco(newRow), ...s.bancos] 
                }));
              } else if (eventType === 'UPDATE') {
                set((s) => ({
                  bancos: s.bancos.map((b) => {
                    if (b.id !== newRow.id) return b;
                    if (((b as any).version || 0) > (newRow.version || 0)) return b;
                    return mapDbBanco(newRow);
                  })
                }));
              } else if (eventType === 'DELETE') {
                set((s) => ({ bancos: s.bancos.filter((b) => b.id !== oldRow.id) }));
              }
            })
            // Convocações
            .on('postgres_changes', { event: '*', schema: 'public', table: 'convocacoes' }, (payload) => {
              const { eventType, new: newRow, old: oldRow } = payload as any;
              console.log('[Realtime] Convocacoes Change:', eventType, newRow?.id || oldRow?.id);

              if (eventType === 'INSERT') {
                if (newRow.deleted_at) return;
                set((s) => s.convocacoes.some(c => c.id === newRow.id) ? s : ({ 
                  convocacoes: [newRow as any, ...s.convocacoes] 
                }));
              } else if (eventType === 'UPDATE') {
                if (newRow.deleted_at) {
                  set((s) => ({ convocacoes: s.convocacoes.filter((c) => c.id !== newRow.id) }));
                  return;
                }
                set((s) => ({ 
                  convocacoes: s.convocacoes.map((c) => c.id === newRow.id ? { ...c, ...newRow } as any : c) 
                }));
              } else if (eventType === 'DELETE') {
                set((s) => ({ convocacoes: s.convocacoes.filter((c) => c.id !== oldRow.id) }));
              }
            })
            // Notificações (inclui mensagens internas tipo='mensagem')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificacoes' }, async (payload) => {
              const newRow = payload.new as any;
              const { data: { user } } = await (await import('@/integrations/supabase/client')).supabase.auth.getUser();
              const myId = user?.id;
              
              console.log('[Realtime] New Notification:', newRow.titulo, 'tipo=', newRow.tipo);
              
              // Only show if it's for me OR I sent it (to keep history updated)
              if (newRow.usuario_id !== myId && newRow.remetente_id !== myId && newRow.usuario_id !== null) return;

              set((s) => ({ notificacoes: [newRow, ...s.notificacoes].slice(0, 50) }));

              if (newRow.tipo === 'mensagem') {
                const isFromMe = newRow.remetente_id === myId;

                // Resolve destinatario_nome via profiles when missing (needed by chat filter)
                let destinatarioNome: string | null = null;
                if (newRow.usuario_id) {
                  const { supabase: sb } = await import('@/integrations/supabase/client');
                  const { data: prof } = await sb.from('profiles').select('nome_completo').eq('id', newRow.usuario_id).maybeSingle();
                  destinatarioNome = prof?.nome_completo || null;
                }

                const mensagem: MensagemHistorico = {
                  id: newRow.id,
                  data: newRow.created_at || new Date().toISOString(),
                  remetente: newRow.remetente_nome || 'Colega',
                  remetente_id: newRow.remetente_id || null,
                  destinatario_id: newRow.usuario_id || null,
                  destinatario_nome: destinatarioNome,
                  conteudo: newRow.mensagem || '',
                  lida: isFromMe ? true : Boolean(newRow.lida),
                  titulo: newRow.titulo,
                };
                
                set((s) => {
                  if (s.historicoMensagens.some(m => m.id === newRow.id)) return s;
                  return {
                    historicoMensagens: [mensagem, ...s.historicoMensagens],
                    temNovasMensagens: isFromMe ? s.temNovasMensagens : true,
                  };
                });
                
                if (!isFromMe) {
                  toast.info(`Nova mensagem de ${newRow.remetente_nome || 'colega'}`, {
                    description: (newRow.mensagem || '').slice(0, 80),
                  });
                }
              } else {
                if (newRow.usuario_id === myId || newRow.usuario_id === null) {
                  toast.info(newRow.titulo, { description: newRow.mensagem });
                }
              }
            })
            // Alertas
            .on('postgres_changes', { event: '*', schema: 'public', table: 'alertas' }, (payload) => {
              const { eventType, new: newRow, old: oldRow } = payload as any;
              if (eventType === 'INSERT') {
                set((s) => s.alertas.some((a: any) => a.id === newRow.id) ? s : ({ alertas: [newRow as any, ...s.alertas] }));
              } else if (eventType === 'UPDATE') {
                set((s) => ({ alertas: s.alertas.map((a: any) => a.id === newRow.id ? { ...a, ...newRow } : a) }));
              } else if (eventType === 'DELETE') {
                set((s) => ({ alertas: s.alertas.filter((a: any) => a.id !== oldRow.id) }));
              }
            })
            // Tarefas
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tarefas' }, (payload) => {
              const { eventType, new: newRow, old: oldRow } = payload as any;
              if (eventType === 'INSERT') {
                set((s) => s.tarefas.some((t: any) => t.id === newRow.id) ? s : ({ tarefas: [newRow as any, ...s.tarefas] }));
              } else if (eventType === 'UPDATE') {
                set((s) => ({ tarefas: s.tarefas.map((t: any) => t.id === newRow.id ? { ...t, ...newRow } : t) }));
              } else if (eventType === 'DELETE') {
                set((s) => ({ tarefas: s.tarefas.filter((t: any) => t.id !== oldRow.id) }));
              }
            })
            // Importações
            .on('postgres_changes', { event: '*', schema: 'public', table: 'importacoes' }, (payload) => {
              const { eventType } = payload;
              console.log('[Realtime] Importacoes Change detected, refetching history...');
              get().fetchImportHistory();
            })
            // Presence
            .on('presence', { event: 'sync' }, () => {
              const state = channel.presenceState();
              const editing: Record<string, any> = {};
              Object.values(state).flat().forEach((p: any) => { 
                if (p.editingRecordId) editing[p.editingRecordId] = p; 
              });
              set({ editingUsers: editing });
            })
            .subscribe((status, err) => {
              console.log(`[Realtime] Channel status: ${status}`);
              if (err) console.error(`[Realtime] Subscription error:`, err);
              
              if (status === 'CHANNEL_ERROR') {
                console.error('[Realtime] Channel error detected, attempting to reconnect in 5s...');
                setTimeout(() => {
                  get().unsubscribeRealtime();
                  get().subscribeRealtime();
                }, 5000);
              }
            });

          (window as any).__realtimeChannel = channel;
        });
      },
      unsubscribeRealtime: () => {
        const channel = (window as any).__realtimeChannel;
        if (channel) {
          console.log('[Realtime] Unsubscribing from channel...');
          import('@/integrations/supabase/client').then(({ supabase }) => {
            supabase.removeChannel(channel);
            delete (window as any).__realtimeChannel;
          });
        }
      },
      trackEditing: async (recordId) => {
        const channel = (window as any).__realtimeChannel;
        if (!channel) return;
        const { useAdminStore } = await import('./adminStore');
        const { currentUser } = useAdminStore.getState();
        if (currentUser) await channel.track({ userId: currentUser.id, userName: currentUser.nome_completo, editingRecordId: recordId });
      },
      stopTrackingEditing: async () => {
        const channel = (window as any).__realtimeChannel;
        if (!channel) return;
        const { useAdminStore } = await import('./adminStore');
        const { currentUser } = useAdminStore.getState();
        if (currentUser) await channel.track({ userId: currentUser.id, userName: currentUser.nome_completo, editingRecordId: null });
      }
    }),
    {
      name: 'hospital-recruitment-store',
      version: 5,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ editais: state.editais, validacoes: state.validacoes, bloqueios: state.bloqueios, tarefas: state.tarefas, alertas: state.alertas, historicoMensagens: state.historicoMensagens, temNovasMensagens: state.temNovasMensagens }),
    }
  )
);
