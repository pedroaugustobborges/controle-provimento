// @ts-nocheck
// NOTE: This service references tables/columns not yet in the schema.
// Type-checking is disabled until the schema is updated.
import { supabase } from '../lib/supabase';

export class DashboardService {
  /**
   * 10. Dashboard - Optimized counts from the backend (parallelized)
   */
  static async getDashboardMetrics() {
    const [
      filaEditaisRes,
      cadastroReservaRes,
      convocadosRes,
      vencidosRes,
      concluidosRes,
      pendentesValidacaoRes,
      tarefasAssistenteRes,
    ] = await Promise.all([
      supabase
        .from('vagas')
        .select('*', { count: 'exact', head: true })
        .or('status_atual.eq.aberta,status_atual.eq.sem_banco_disponivel,status_atual.eq.edital_vencido'),
      supabase
        .from('banco_candidatos')
        .select('*', { count: 'exact', head: true })
        .eq('status_banco', 'cadastro reserva'),
      supabase
        .from('banco_candidatos')
        .select('*', { count: 'exact', head: true })
        .eq('status_banco', 'CONVOCADO'),
      supabase
        .from('banco_candidatos')
        .select('*', { count: 'exact', head: true })
        .eq('status_banco', 'VENCIDO'),
      supabase
        .from('vagas')
        .select('*', { count: 'exact', head: true })
        .eq('status_atual', 'admissão efetivada'),
      supabase
        .from('editais')
        .select('*', { count: 'exact', head: true })
        .eq('status_edital', 'pendente'),
      supabase
        .from('tarefas')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pendente'),
    ]);

    return {
      filaEditais: filaEditaisRes.count || 0,
      cadastroReserva: cadastroReservaRes.count || 0,
      convocados: convocadosRes.count || 0,
      vencidos: vencidosRes.count || 0,
      concluidos: concluidosRes.count || 0,
      pendentesValidacao: pendentesValidacaoRes.count || 0,
      tarefasAssistente: tarefasAssistenteRes.count || 0,
    };
  }
}
