import { supabase } from '../lib/supabase';

export class DashboardService {
  /**
   * 10. Dashboard - Optimized counts from the backend
   */
  static async getDashboardMetrics() {
    // 1. Fila de Editais (status in {sem status, publicar novo edital})
    const { count: filaEditais } = await supabase
      .from('vagas')
      .select('*', { count: 'exact', head: true })
      .or('status_atual.eq.aberta,status_atual.eq.sem_banco_disponivel,status_atual.eq.edital_vencido');

    // 2. Cadastro Reserva (banco.status_banco = CADASTRO RESERVA)
    const { count: cadastroReserva } = await supabase
      .from('banco_candidatos')
      .select('*', { count: 'exact', head: true })
      .eq('status_banco', 'cadastro reserva');

    // 3. Convocados (banco.status_banco = CONVOCADO)
    const { count: convocados } = await supabase
      .from('banco_candidatos')
      .select('*', { count: 'exact', head: true })
      .eq('status_banco', 'CONVOCADO');

    // 4. Vencidos (banco.status_banco = VENCIDO) - simplified as hypothetical status
    const { count: vencidos } = await supabase
      .from('banco_candidatos')
      .select('*', { count: 'exact', head: true })
      .eq('status_banco', 'VENCIDO');

    // 5. Concluídos (vaga.status_atual = admissão efetivada)
    const { count: concluidos } = await supabase
      .from('vagas')
      .select('*', { count: 'exact', head: true })
      .eq('status_atual', 'admissão efetivada');

    // 6. Edital pendente de validação
    const { count: pendentesValidacao } = await supabase
      .from('editais')
      .select('*', { count: 'exact', head: true })
      .eq('status_edital', 'pendente');

    // 7. Tarefas da assistente (status pendente)
    const { count: tarefasAssistente } = await supabase
      .from('tarefas')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pendente');

    return {
      filaEditais: filaEditais || 0,
      cadastroReserva: cadastroReserva || 0,
      convocados: convocados || 0,
      vencidos: vencidos || 0,
      concluidos: concluidos || 0,
      pendentesValidacao: pendentesValidacao || 0,
      tarefasAssistente: tarefasAssistente || 0,
    };
  }
}
