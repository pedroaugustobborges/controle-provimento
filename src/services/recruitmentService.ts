import { supabase } from '../lib/supabase';
import { DatabaseService } from './databaseService';
import { Edital, EditalEtapa, Vaga, Convocacao, BancoCandidato } from '../types/schema';

export class RecruitmentService {
  /**
   * 13.1 Publicar Novo Edital
   * - Cria edital
   * - Vincula à vaga
   * - Registra no histórico
   */
  static async publicarEdital(
    vagaId: string,
    editalData: Partial<Edital>,
    userId: string
  ) {
    // Check vaga status first (not shown for brevity, but recommended)
    const { data: edital, error: editalError } = await supabase
      .from('editais')
      .insert({
        ...editalData,
        vaga_id: vagaId,
        status_edital: 'publicado',
        publicado_em: new Date().toISOString(),
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single();

    if (editalError) throw editalError;

    // Update vaga status to indicate edital published
    const { error: vagaError } = await supabase
      .from('vagas')
      .update({
        status_atual: 'edital_publicado',
        updated_by: userId,
      })
      .eq('id', vagaId);

    if (vagaError) throw vagaError;

    // Log audit
    await DatabaseService.logAudit('EDITAL', edital.id, 'PUBLISH', userId, null, edital);

    return edital;
  }

  /**
   * 13.2 Gerar Banco
   * - Etapa final marca que houve banco
   * - Cria tarefa para assistente
   */
  static async gerarBanco(
    etapaId: string,
    quantidadeBanco: number,
    userId: string
  ) {
    // 1. Update Etapa
    const { data: etapa, error: etapaError } = await supabase
      .from('edital_etapas')
      .update({
        gerou_banco: true,
        quantidade_banco: quantidadeBanco,
        updated_by: userId,
      })
      .eq('id', etapaId)
      .select()
      .single();

    if (etapaError) throw etapaError;

    // 2. Create Task for Assistant
    const { error: tarefaError } = await supabase
      .from('tarefas')
      .insert({
        titulo: `Processar Banco de Reserva - Etapa ${etapa.nome_etapa}`,
        descricao: `A etapa final foi concluída gerando ${quantidadeBanco} candidatos para o banco. Favor processar.`,
        modulo_origem: 'EDITAL',
        referencia_id: etapa.id,
        status: 'pendente',
        prioridade: 'media',
        criado_por: userId,
      });

    if (tarefaError) throw tarefaError;

    // 3. Create Alert
    await supabase.from('alertas').insert({
      titulo: 'Novo Banco Gerado',
      mensagem: `A etapa ${etapa.nome_etapa} gerou ${quantidadeBanco} novos candidatos.`,
      user_id: userId, // ideally to the assistant's ID
    });

    return etapa;
  }

  /**
   * 13.3 Realizar Convocação
   * - Selecionar candidato
   * - Atualizar status do banco para CONVOCADO
   * - Criar convocação
   * - Vincular à vaga
   * - Registrar histórico
   * - Abrir fluxo de devolutiva
   */
  static async realizarConvocacao(
    candidatoId: string,
    vagaId: string,
    unidadeId: string,
    cargo: string,
    userId: string
  ) {
    // This should be in a transaction in the backend (RPC)
    // Here we simulate sequential logic

    // 1. Update Banco status
    const { error: bancoError } = await supabase
      .from('banco_candidatos')
      .update({
        status_banco: 'CONVOCADO',
        data_convocacao: new Date().toISOString().split('T')[0],
        updated_by: userId,
      })
      .eq('id', candidatoId);

    if (bancoError) throw bancoError;

    // 2. Create Convocacao
    const { data: convocacao, error: convError } = await supabase
      .from('convocacoes')
      .insert({
        vaga_id: vagaId,
        candidato_id: candidatoId,
        unidade_id: unidadeId,
        cargo: cargo,
        status_convocacao: 'em andamento',
        responsavel_id: userId,
        updated_by: userId,
      })
      .select()
      .single();

    if (convError) throw convError;

    // 3. Update Vaga (Status)
    const { error: vagaError } = await supabase
      .from('vagas')
      .update({
        status_atual: 'convocacao_em_andamento',
        updated_by: userId,
      })
      .eq('id', vagaId);

    if (vagaError) throw vagaError;

    // 4. Audit
    await DatabaseService.logAudit('CONVOCACAO', convocacao.id, 'CREATE', userId, null, convocacao);

    return convocacao;
  }

  /**
   * 13.4 Recusa sem banco disponível
   * - Registrar recusa
   * - Verificar ausência de banco
   * - Habilitar ação para novo edital
   */
  static async registrarRecusaSemBanco(
    convocacaoId: string,
    vagaId: string,
    userId: string
  ) {
    // 1. Update Convocacao
    const { error: convError } = await supabase
      .from('convocacoes')
      .update({
        status_convocacao: 'recusado',
        devolutiva: 'Recusou e não há mais candidatos no banco.',
        updated_by: userId,
      })
      .eq('id', convocacaoId);

    if (convError) throw convError;

    // 2. Check if more candidates in bank for this vaga/cargo
    const { count } = await supabase
      .from('banco_candidatos')
      .select('*', { count: 'exact', head: true })
      .eq('vaga_id', vagaId)
      .eq('status_banco', 'cadastro reserva');

    if (!count || count === 0) {
      // 3. Update Vaga to allow re-publication
      const { error: vagaError } = await supabase
        .from('vagas')
        .update({
          status_atual: 'sem_banco_disponivel',
          updated_by: userId,
        })
        .eq('id', vagaId);
      
      if (vagaError) throw vagaError;

      // Create alert for management
      await supabase.from('alertas').insert({
        titulo: 'Vaga sem candidatos',
        mensagem: `A vaga para ${vagaId} não possui mais candidatos no banco após recusa.`,
        user_id: userId,
      });
    }

    return true;
  }
}
