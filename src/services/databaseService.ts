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
   * Generic save with optimistic concurrency (versioning)
   */
  static async saveWithConcurrency<T extends { id: string; version: number }>(
    table: string,
    data: T,
    userId: string
  ): Promise<{ data: T | null; error: PostgrestError | Error | null }> {
    const { id, version, ...updateData } = data as any;
    
    const operation = () => supabase
      .from(table)
      .update({
        ...updateData,
        updated_by: userId,
        updated_at: new Date().toISOString(),
        version: (version || 0) + 1,
      })
      .eq('id', id)
      .eq('version', version)
      .select()
      .single();

    const { data: updated, error } = await this.withRetry(operation);

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null, error: new Error('Erro de concorrência: O registro foi modificado por outro usuário.') };
      }
      return { data: null, error };
    }

    // Log to audit (async)
    this.logAudit(table, id, 'UPDATE', userId, { version }, updated);

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
      const { count: countBefore, error: countError } = await this.withRetry(() => 
        supabase.from(tableName).select('*', { count: 'exact', head: true })
      );

      if (countError) {
        throw new Error(`Erro ao conectar com o banco de dados: ${this.getFriendlyErrorMessage(countError)}`);
      }

      // Step 2: Record import log
      const { data: logData, error: logError } = await supabase.from('importacoes').insert({
        tipo,
        usuario_id: userId,
        status: 'processando',
        quantidade_apagada: countBefore || 0,
      }).select().single();

      if (logError) {
        console.warn("Não foi possível criar log de importação, continuando mesmo assim...");
      } else {
        logId = logData.id;
      }

      // Step 3: Delete existing
      onProgress?.(15, "Limpando base antiga para substituição...");
      const { error: deleteError } = await this.withRetry(() => 
        supabase
          .from(tableName)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000')
      );

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

        const { data: inserted, error: insertError } = await this.withRetry(() => 
          supabase
            .from(tableName)
            .insert(cleanChunk)
            .select()
        );

        if (insertError) {
          if (logId) {
            await supabase.from('importacoes').update({
              status: 'erro',
              observacoes: `Erro no lote ${i}: ${insertError.message}`
            }).eq('id', logId);
          }
          throw new Error(`Erro no envio dos dados (Lote ${Math.floor(i/chunkSize) + 1}): ${this.getFriendlyErrorMessage(insertError)}`);
        }
        
        insertedCount += inserted?.length || 0;
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

        const { error } = await this.withRetry(() => 
          supabase
            .from(table)
            .upsert(
              chunk.map(item => ({ ...item, updated_by: userId, updated_at: new Date().toISOString() })),
              { onConflict: matchColumns.join(',') }
            )
        );

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
}