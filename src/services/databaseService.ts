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
    const { id, version, ...updateData } = data;
    
    // Attempt update where version matches
    const { data: updated, error } = await supabase
      .from(table)
      .update({
        ...updateData,
        updated_by: userId,
        updated_at: new Date().toISOString(),
        version: (version || 0) + 1, // Increment version
      } as any)
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
    // In a real environment, we would call an RPC to do this in a single transaction
    // Using supabase.rpc('import_by_substitution', { tipo, data, userId })
    
    try {
      // Step 1: Count existing
      const { count: countBefore } = await supabase
        .from(tipo === 'vagas' ? 'vagas' : 'banco_candidatos')
        .select('*', { count: 'exact', head: true });

      // Step 2: Delete existing
      const { error: deleteError } = await supabase
        .from(tipo === 'vagas' ? 'vagas' : 'banco_candidatos')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (deleteError) throw deleteError;

      // Step 3: Insert new
      const { data: inserted, error: insertError } = await supabase
        .from(tipo === 'vagas' ? 'vagas' : 'banco_candidatos')
        .insert(newData.map(item => ({ ...item, created_by: userId, updated_by: userId })))
        .select();

      if (insertError) throw insertError;

      // Step 4: Record import log
      await supabase.from('importacoes').insert({
        tipo,
        usuario_id: userId,
        quantidade_apagada: countBefore || 0,
        quantidade_inserida: inserted?.length || 0
      });

      // Audit
      this.logAudit('IMPORT', 'all', `IMPORT_${tipo.toUpperCase()}`, userId, { countBefore }, { countAfter: inserted?.length });

      return { count: inserted?.length || 0, error: null };
    } catch (err: any) {
      return { count: 0, error: err };
    }
  }
}
