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
   * For full atomicity, this should be a Postgres function (RPC).
   */
  static async importBySubstitution(
    tipo: 'vagas' | 'banco',
    newData: any[],
    userId: string
  ): Promise<{ count: number; error: Error | null }> {
    try {
      // Step 1: Count existing
      const tableName = tipo === 'vagas' ? 'vagas' : 'banco_candidatos';
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
      // IMPORTANT: In a production environment, this should be wrapped in a transaction (RPC)
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (deleteError) throw deleteError;

      // Step 4: Insert new in chunks to avoid request size limits
      const chunkSize = 500;
      let insertedCount = 0;
      
      for (let i = 0; i < newData.length; i += chunkSize) {
        const chunk = newData.slice(i, i + chunkSize);
        const { data: inserted, error: insertError } = await supabase
          .from(tableName)
          .insert(chunk.map(item => ({ ...item, created_by: userId, updated_by: userId })))
          .select();

        if (insertError) throw insertError;
        insertedCount += inserted?.length || 0;
      }

      // Step 5: Update import log to completed
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
}