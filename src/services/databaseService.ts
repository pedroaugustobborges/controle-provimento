// @ts-nocheck
// NOTE: This service references tables/columns not yet in the schema.
// Type-checking is disabled until the schema is updated.
import { supabase } from '../lib/supabase';
import { PostgrestError } from '@supabase/supabase-js';

export class DatabaseService {
  /**
   * Helper to execute an operation with retries for network resilience
   */
  private static async withRetry<T>(
    operation: () => Promise<{ data: T | null; error: any }>,
    maxRetries = 3,
    delay = 1000
  ): Promise<{ data: T | null; error: any }> {
    let lastError: any = null;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await operation();
        if (!result.error) return result;
        
        lastError = result.error;
        
        // Only retry on network-related errors (fetch failures)
        const isNetworkError = 
          lastError.message?.includes('Failed to fetch') || 
          lastError.name === 'TypeError' ||
          lastError.code === 'NETWORK_ERROR' ||
          lastError.status === 0 ||
          lastError.status >= 500; // Also retry on server errors

        if (!isNetworkError) break; // Don't retry validation or logic errors
        
        console.warn(`Tentativa ${i + 1} falhou. Erro: ${lastError.message}. Tentando novamente em ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1))); // Exponential backoff
      } catch (err: any) {
        lastError = err;
        console.error(`Exceção na tentativa ${i + 1}:`, err);
        if (i === maxRetries - 1) break;
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
    
    return { data: null, error: lastError };
  }

  /**
   * Allowed columns per table for safe UPDATE payloads.
   * Prevents PostgREST errors caused by sending non-existent or computed columns.
   */
  private static ALLOWED_COLUMNS: Record<string, string[]> = {
    vagas: [
      'unidade', 'cargo', 'status', 'status_geral', 'tipo_vaga', 'is_teia', 'is_pcd',
      'quantidade', 'numero_vagas', 'motivo', 'observacao', 'analista_responsavel',
      'assistentes', 'nome_substituido', 'data_abertura', 'data_recebimento',
      'data_envio_edital', 'data_publicacao', 'data_homologacao', 'data_convocacao',
      'numero_edital', 'numero_processo_seletivo', 'etapa', 'publicacao', 'prioridade',
      'mes_referencia', 'import_batch_id', 'origem', 'data_importacao',
      'unidade_trabalho', 'unidades_banco_talentos', 'distribuicao_vagas',
      'observacoes_gestor', 'status_aprovacao_gestor', 'gestor_aprovador_id',
      'url_reachr', 'detalhes_acompanhamento', 'admissao_efetivada_acompanhamento',
      'admissao_enviada_acompanhamento', 'status_oitiva_convocacao_planilha',
      'forma_convocacao_planilha', 'classificacao_convocacao_planilha',
      'candidato_convocado_planilha', 'horario_convocacao_planilha',
      'data_convocacao_planilha', 'secao',
    ],
    banco_candidatos: [
      'nome', 'cargo', 'cargo_normalizado', 'unidade', 'status', 'numero_edital',
      'numero_processo_seletivo', 'classificacao', 'data_validade', 'data_convocacao',
      'is_prorrogado', 'quantidade_banco', 'unidade_convocacao', 'telefone', 'email',
      'observacao', 'import_batch_id', 'data_importacao', 'origem', 'numero_chamada',
      'data_publicacao', 'prorrogacao', 'status_original', 'status_calculado',
      'motivo_do_calculo', 'data_base_do_calculo', 'data_referencia_usada',
    ],
  };

  private static sanitizePayload(table: string, data: any): Record<string, any> {
    const allowed = this.ALLOWED_COLUMNS[table];
    if (!allowed) return data;
    const clean: Record<string, any> = {};
    for (const key of allowed) {
      if (key in data && data[key] !== undefined) {
        let value = data[key];
        // Convert array assistentes to string for vagas table
        if (table === 'vagas' && key === 'assistentes' && Array.isArray(value)) {
          value = value.join(', ');
        }
        clean[key] = value;
      }
    }
    return clean;
  }

  /**
   * Generic save with optimistic concurrency (versioning)
   */
  static async saveWithConcurrency<T extends { id: string; version?: number }>(
    table: string,
    data: T,
    userId: string
  ): Promise<{ data: T | null; error: PostgrestError | Error | null }> {
    const { id, version } = data as any;
    const currentVersion = typeof version === 'number' ? version : 0;

    const sanitized = this.sanitizePayload(table, data);

    const payload = {
      ...sanitized,
      updated_by: userId,
      updated_at: new Date().toISOString(),
      version: currentVersion + 1,
    };

    const operation = async () => {
      return await supabase
        .from(table)
        .update(payload)
        .eq('id', id)
        .eq('version', currentVersion)
        .select()
        .single();
    };

    const { data: updated, error } = await this.withRetry(operation);

    if (error) {
      // Log full error details for debugging
      console.error(`[saveWithConcurrency] Failed to update ${table}#${id}:`, {
        message: error.message,
        code: (error as any).code,
        details: (error as any).details,
        hint: (error as any).hint,
        payload,
        expectedVersion: currentVersion,
      });

      if ((error as any).code === 'PGRST116') {
        // Could be concurrency mismatch OR RLS blocking the row
        // Verify by checking if row exists
        const { data: rowCheck } = await supabase
          .from(table)
          .select('version')
          .eq('id', id)
          .maybeSingle();

        if (rowCheck && (rowCheck as any).version !== currentVersion) {
          return { data: null, error: new Error('Erro de concorrência: O registro foi modificado por outro usuário. Recarregue a página.') };
        }
        return { data: null, error: new Error('Sem permissão para atualizar este registro ou registro não encontrado.') };
      }
      return { data: null, error };
    }

    this.logAudit(table, id, 'UPDATE', userId, { version: currentVersion }, updated);

    return { data: updated as T, error: null };
  }

  /**
   * Log audit action
   */
  static async logAudit(
    modulo: string,
    registroId: string,
    acao: string,
    usuarioId: string,
    valorAnterior?: any,
    valorNovo?: any,
    contextoAdicional?: any
  ) {
    try {
      const { error } = await supabase.from('auditoria_logs').insert({
        modulo,
        registro_id: registroId,
        acao,
        usuario_id: usuarioId,
        valor_anterior: valorAnterior,
        valor_novo: valorNovo,
        contexto_adicional: contextoAdicional,
      });
      
      if (error) console.error('Audit logging failed:', error);
    } catch (e) {
      console.error('Audit logging exception:', e);
    }
  }

  /**
   * Import with substitution
   * Enhanced for large datasets with chunked processing, retries and real-time status updates
   */
  static async importBySubstitution(
    tipo: 'vagas' | 'banco',
    newData: any[],
    userId: string,
    onProgress?: (progress: number, label: string) => void
  ): Promise<{ count: number; error: Error | null }> {
    let logId: string | null = null;
    const tableName = tipo === 'vagas' ? 'vagas' : 'banco_candidatos';

    try {
      // Step 1: Count existing
      onProgress?.(5, "Analisando base atual...");
      const { data: countBefore, error: countError } = await this.withRetry(async () => {
        const { count, error } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
        return { data: count, error };
      });

      if (countError) {
        throw new Error(`Erro ao conectar com o banco de dados: ${this.getFriendlyErrorMessage(countError)}`);
      }

      // Step 2: Record import log
      const { data: logData, error: logError } = await supabase.from('importacoes').insert({
        tipo,
        usuario_id: userId,
        status: 'em_processamento',
        quantidade_apagada: countBefore || 0,
        arquivo: newData[0]?.origem_importacao || 'Arquivo desconhecido'
      }).select().single();

      if (logError) {
        console.warn("Não foi possível criar log de importação, continuando mesmo assim...");
      } else {
        logId = logData.id;
      }

      // Step 3: Delete existing — PRESERVE manual records (origem='manual')
      // Only soft-delete records that came from previous imports.
      onProgress?.(15, "Limpando base antiga (preservando registros manuais)...");
      const { error: deleteError } = await this.withRetry(async () => {
        const { error } = await supabase
          .from(tableName)
          .update({ deleted_at: new Date().toISOString() })
          .eq('origem', 'importada')
          .is('deleted_at', null);
        return { data: null, error };
      });

      if (deleteError) {
        throw new Error(`Erro ao limpar base antiga: ${this.getFriendlyErrorMessage(deleteError)}`);
      }

      // Step 4: Insert new in smaller chunks
      const total = newData.length;
      const chunkSize = 100; // Reduced for maximum reliability
      let insertedCount = 0;
      
      for (let i = 0; i < total; i += chunkSize) {
        const chunk = newData.slice(i, i + chunkSize);
        const chunkProgress = Math.min(20 + Math.round((i / total) * 75), 95);
        onProgress?.(chunkProgress, `Enviando lote ${Math.floor(i / chunkSize) + 1} de ${Math.ceil(total / chunkSize)} (${insertedCount} de ${total})...`);

        const cleanChunk = chunk.map(({ id, ...rest }) => ({
          ...rest,
          created_by: userId,
          updated_by: userId
        }));

        const { data: inserted, error: insertError } = await this.withRetry(async () => {
          const { data, error } = await supabase
            .from(tableName)
            .insert(cleanChunk)
            .select();
          return { data, error };
        });

        if (insertError) {
          if (logId) {
            await supabase.from('importacoes').update({
              status: 'erro',
              observacoes: `Erro no lote ${i}: ${insertError.message}`
            }).eq('id', logId);
          }
          throw new Error(`Erro no envio dos dados (Lote ${Math.floor(i/chunkSize) + 1}): ${this.getFriendlyErrorMessage(insertError)}`);
        }
        
        insertedCount += (inserted as any[])?.length || 0;
      }

      // Step 5: Update import log to completed
      onProgress?.(100, "Finalizando importação...");
      if (logId) {
        await supabase.from('importacoes').update({
          status: 'concluido',
          quantidade_inserida: insertedCount
        }).eq('id', logId);
      }

      // Audit
      this.logAudit('IMPORT', 'all', `IMPORT_${tipo.toUpperCase()}`, userId, { countBefore }, { countAfter: insertedCount });

      return { count: insertedCount, error: null };
    } catch (err: any) {
      console.error(`Import failed for ${tipo}:`, err);
      
      // Attempt to mark error in log if possible
      if (logId) {
        supabase.from('importacoes').update({
          status: 'erro',
          observacoes: err.message || "Erro desconhecido"
        }).eq('id', logId).then();
      }
      
      return { count: 0, error: err };
    }
  }

  /**
   * Bulk upsert logic with retries and better error handling
   */
  static async bulkUpsert(
    table: string,
    data: any[],
    userId: string,
    matchColumns: string[],
    onProgress?: (progress: number, label: string) => void
  ): Promise<{ count: number; error: Error | null }> {
    try {
      const total = data.length;
      const chunkSize = 100;
      let processedCount = 0;

      for (let i = 0; i < total; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        const prog = Math.min(Math.round((i / total) * 100), 99);
        onProgress?.(prog, `Sincronizando ${i} de ${total}...`);

        const { error } = await this.withRetry(async () => {
          const { error } = await supabase
            .from(table)
            .upsert(
              chunk.map(item => ({ ...item, updated_by: userId, updated_at: new Date().toISOString() })),
              { onConflict: matchColumns.join(',') }
            );
          return { data: null, error };
        });

        if (error) throw new Error(`Erro no sincronismo em lote: ${this.getFriendlyErrorMessage(error)}`);
        processedCount += chunk.length;
      }

      onProgress?.(100, "Concluído!");
      return { count: processedCount, error: null };
    } catch (err: any) {
      console.error(`Bulk upsert failed for ${table}:`, err);
      return { count: 0, error: err };
    }
  }

  /**
   * Translates technical database errors into user-friendly messages
   */
  private static getFriendlyErrorMessage(error: any): string {
    if (!error) return "Erro desconhecido";
    
    const message = error.message || "";
    
    if (message.includes('Failed to fetch') || error.name === 'TypeError' || error.status === 0) {
      return "Falha de conexão com o servidor. Verifique sua internet ou tente novamente em alguns instantes (Erro de Rede/Timeout).";
    }
    
    if (message.includes('payload too large') || error.status === 413) {
      return "O arquivo ou o lote de dados é muito grande para o servidor. Reduzimos o tamanho dos lotes, tente novamente.";
    }

    if (error.code === '42P01') {
      return "Tabela não encontrada no banco de dados. Contate o suporte técnico.";
    }

    if (error.code === '23505') {
      return "Erro de duplicidade: Alguns registros já existem e não puderam ser inseridos.";
    }

    return message || "Erro técnico inesperado ao processar a requisição.";
  }

  /**
   * Delete an import batch and all its associated records
   */
  static async deleteImportBatch(id: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      // 1. Get the import log record to find the batch reference
      const { data: importLog, error: logError } = await supabase
        .from('importacoes')
        .select('arquivo, nome_arquivo')
        .eq('id', id)
        .single();
      
      if (logError) throw logError;
      
      const batchRef = importLog.arquivo || id;

      // 2. Delete associated records from vagas
      const { error: vagasError } = await supabase
        .from('vagas')
        .delete()
        .eq('import_batch_id', batchRef);
      
      if (vagasError) console.error('Error deleting vagas for batch:', vagasError);

      // 3. Delete associated records from banco_candidatos
      const { error: bancoError } = await supabase
        .from('banco_candidatos')
        .delete()
        .eq('import_batch_id', batchRef);

      if (bancoError) console.error('Error deleting banco for batch:', bancoError);

      // 4. Delete from importacoes table
      const { error: importError } = await supabase
        .from('importacoes')
        .delete()
        .eq('id', id);

      if (importError) throw importError;

      return { success: true, error: null };
    } catch (err: any) {
      console.error('Failed to delete import batch:', err);
      return { success: false, error: err };
    }
  }
}