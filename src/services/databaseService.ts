import { supabase } from '../lib/supabase';
import { PostgrestError } from '@supabase/supabase-js';

export class DatabaseService {
  /**
   * Generic save with optimistic concurrency (versioning)
   */
  static async saveWithConcurrency<T extends { id: string; version: number }>(
    table: string,
    data: T,
    userId: string
  ): Promise<{ data: T | null; error: PostgrestError | Error | null }> {
    const { id, version, ...updateData } = data as any;
    
    // Attempt update where version matches
    const { data: updated, error } = await supabase
      .from(table)
      .update({
        ...updateData,
        updated_by: userId,
        updated_at: new Date().toISOString(),
        version: (version || 0) + 1, // Increment version for next time
      })
      .eq('id', id)
      .eq('version', version)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null, error: new Error('Concurrency error: The record has been modified by another user.') };
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
  }

  /**
   * Import with substitution (transactional logic simulated in JS as Supabase RPC)
   * Enhanced for large datasets with chunked processing and real-time status updates
   */
  static async importBySubstitution(
    tipo: 'vagas' | 'banco',
    newData: any[],
    userId: string,
    onProgress?: (progress: number, label: string) => void
  ): Promise<{ count: number; error: Error | null }> {
    try {
      const tableName = tipo === 'vagas' ? 'vagas' : 'banco_candidatos';
      
      // Step 1: Count existing
      onProgress?.(5, "Analisando base atual...");
      const { count: countBefore } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      // Step 2: Record import log
      const { data: logData, error: logError } = await supabase.from('importacoes').insert({
        tipo,
        usuario_id: userId,
        status: 'processando',
        quantidade_apagada: countBefore || 0,
      }).select().single();

      if (logError) throw logError;

      // Step 3: Delete existing
      // For very large datasets, we might want to truncate or delete in chunks
      onProgress?.(15, "Limpando base antiga para substituição...");
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (deleteError) throw deleteError;

      // Step 4: Insert new in chunks to avoid request size limits and timeouts
      const total = newData.length;
      const chunkSize = 200; // Smaller chunks for better reliability
      let insertedCount = 0;
      
      for (let i = 0; i < total; i += chunkSize) {
        const chunk = newData.slice(i, i + chunkSize);
        const chunkProgress = Math.min(20 + Math.round((i / total) * 75), 95);
        onProgress?.(chunkProgress, `Enviando lote ${Math.floor(i / chunkSize) + 1} (${insertedCount} de ${total})...`);

        // Remove local IDs to let database handle it and avoid collisions
        const cleanChunk = chunk.map(({ id, ...rest }) => ({
          ...rest,
          created_by: userId,
          updated_by: userId
        }));

        const { data: inserted, error: insertError } = await supabase
          .from(tableName)
          .insert(cleanChunk)
          .select();

        if (insertError) {
          // Update log with error status
          await supabase.from('importacoes').update({
            status: 'erro',
            observacoes: `Erro no lote ${i}: ${insertError.message}`
          }).eq('id', logData.id);
          
          throw insertError;
        }
        
        insertedCount += inserted?.length || 0;
      }

      // Step 5: Update import log to completed
      onProgress?.(100, "Finalizando importação...");
      await supabase.from('importacoes').update({
        status: 'concluido',
        quantidade_inserida: insertedCount
      }).eq('id', logData.id);

      // Audit
      this.logAudit('IMPORT', 'all', `IMPORT_${tipo.toUpperCase()}`, userId, { countBefore }, { countAfter: insertedCount });

      return { count: insertedCount, error: null };
    } catch (err: any) {
      console.error(`Import failed for ${tipo}:`, err);
      return { count: 0, error: err };
    }
  }

  /**
   * Bulk upsert logic to avoid deleting everything
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
      const chunkSize = 150;
      let processedCount = 0;

      for (let i = 0; i < total; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        const prog = Math.min(Math.round((i / total) * 100), 99);
        onProgress?.(prog, `Processando ${i} de ${total}...`);

        const { error } = await supabase
          .from(table)
          .upsert(
            chunk.map(item => ({ ...item, updated_by: userId, updated_at: new Date().toISOString() })),
            { onConflict: matchColumns.join(',') }
          );

        if (error) throw error;
        processedCount += chunk.length;
      }

      onProgress?.(100, "Concluído!");
      return { count: processedCount, error: null };
    } catch (err: any) {
      console.error(`Bulk upsert failed for ${table}:`, err);
      return { count: 0, error: err };
    }
  }
}