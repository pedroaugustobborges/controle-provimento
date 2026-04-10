import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { normalizeStatus, normalizeCargo } from '@/lib/vagaUtils';
import { convertDateValue } from '@/lib/dateImportUtils';
import { getResponsavelPorUnidade } from '@/data/equipe';
import { TipoVaga } from '@/types/vaga';
import {
  ImportExecutionOptions,
  buildBancoImportObservation,
  extractNormalizedUnitsFromRows,
  normalizeImportSystemKey,
  shouldReplaceBancoRecord,
} from '@/lib/importScopeUtils';

export type ImportPhase = 'upload' | 'mapping' | 'processing' | 'finishing' | 'error' | 'success';

export interface ImportProgress {
  phase: ImportPhase;
  percentage: number;
  label: string;
  processedRows: number;
  totalRows: number;
  errors: string[];
}

export interface ColumnMapping {
  excel: string;
  system: string;
  isDate?: boolean;
  format?: string;
}

export class ImportService {
  /**
   * Reads basic file info without processing all data
   */
  static async analyzeFile(file: File) {
    return new Promise<{
      sheetNames: string[];
      sampleData: Record<string, any[][]>;
      workbook: XLSX.WorkBook;
    }>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { 
            type: 'array', 
            cellDates: true, 
            cellNF: false, 
            cellText: false 
          });
          
          const sampleData: Record<string, any[][]> = {};
          workbook.SheetNames.forEach(name => {
            const sheet = workbook.Sheets[name];
            sampleData[name] = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 }).slice(0, 20);
          });
          
          resolve({ sheetNames: workbook.SheetNames, sampleData, workbook });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Processes an import in chunks to prevent UI freezing and memory issues
   */
  static async processImportInChunks(
    params: {
      type: 'vagas' | 'banco';
      workbook: XLSX.WorkBook;
      sheetName: string;
      headerRow: number;
      mappings: ColumnMapping[];
      options?: ImportExecutionOptions;
      userId: string;
      fileName?: string;
      userName?: string;
      userEmail?: string;
      onProgress: (progress: ImportProgress) => void;
    }
  ) {
    const { type, workbook, sheetName, headerRow, mappings, options, userId, fileName, userName, userEmail, onProgress } = params;
    
    try {
      const sheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: true });
      
      const headers = (rawRows[headerRow] || []).map(c => String(c || '').trim().toUpperCase());
      const dataRows = rawRows.slice(headerRow + 1);
      const totalRows = dataRows.length;
      const normalizedMappings = mappings.map(mapping => {
        const normalizedSystem = normalizeImportSystemKey(mapping.system);
        return {
          ...mapping,
          system: normalizedSystem,
          isDate: mapping.isDate ?? normalizedSystem.startsWith('data_'),
        };
      });
      const resolvedOptions: ImportExecutionOptions = type === 'banco'
        ? {
            bancoTipo: options?.bancoTipo || 'por_unidades',
            bancoEscopo: options?.bancoEscopo,
            bancoModo: options?.bancoModo || 'substituir',
          }
        : (options || {});
      const importObservation = type === 'banco' ? buildBancoImportObservation(resolvedOptions) : '';
      
      if (totalRows === 0) {
        throw new Error("Nenhum dado encontrado na aba selecionada.");
      }

      const batchId = `IMPORT-${Date.now()}`;
      const tableName = type === 'vagas' ? 'vagas' : 'banco_candidatos';
      const chunkSize = 200;
      const errors: string[] = [];
      let deletedCount = 0;
      let ignoredCount = 0;
      let updatedCount = 0;
      
      onProgress({
        phase: 'processing',
        percentage: 0,
        label: 'Iniciando processamento...',
        processedRows: 0,
        totalRows,
        errors: []
      });

      // Step 1: Record start in importacoes table
      const importMode = type === 'vagas'
        ? 'substituir_todas_as_vagas'
        : resolvedOptions.bancoModo === 'adicionar'
          ? 'adicionar_ao_banco'
          : 'substituir_escopo_do_banco';
      const importOrigin = type === 'vagas'
        ? 'planilha_de_vagas'
        : resolvedOptions.bancoTipo === 'geral'
          ? `banco_geral_${resolvedOptions.bancoEscopo || 'nao_informado'}`
          : 'banco_por_unidades_da_planilha';

      const { data: logData, error: logError } = await supabase.from('importacoes').insert({
        tipo: type,
        usuario_id: userId,
        status: 'em_processamento',
        quantidade_apagada: 0,
        quantidade_processada: totalRows,
        quantidade_inserida: 0,
        quantidade_atualizada: 0,
        quantidade_ignorada: 0,
        quantidade_erro: 0,
        quantidade_confirmada: 0,
        arquivo: batchId,
        nome_arquivo: fileName || batchId,
        observacoes: importObservation || null,
        modo_importacao: importMode,
        origem_base: importOrigin,
        tabela_destino: tableName,
        aba_planilha: sheetName,
        linha_cabecalho: headerRow + 1,
        detalhes: {
          usuario_nome: userName || null,
          usuario_email: userEmail || null,
          mapeamento: normalizedMappings.map(({ excel, system, isDate, format }) => ({ excel, system, isDate, format })),
        },
      }).select().single();

      if (logError || !logData?.id) {
        throw new Error(`Não foi possível registrar o histórico da importação: ${logError?.message || 'registro não criado'}`);
      }

      const logId = logData?.id;

      // Step 2: Clear old data if it's a "substitution" import
      onProgress({
        phase: 'processing',
        percentage: 5,
        label: type === 'banco' && resolvedOptions.bancoModo === 'adicionar'
          ? 'Mantendo base atual e preparando inclusão...'
          : 'Preparando base de destino...',
        processedRows: 0,
        totalRows,
        errors: []
      });

      if (type === 'vagas') {
        const { error: delErr } = await supabase.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (delErr) {
          console.warn("Erro ao limpar base antiga, continuando...", delErr);
          errors.push(`Aviso ao limpar vagas anteriores: ${delErr.message || 'erro desconhecido'}`);
        }
      } else if (resolvedOptions.bancoModo === 'substituir') {
        const unitsFromSheet = extractNormalizedUnitsFromRows(dataRows, headers, normalizedMappings);
        const { data: existingRows, error: fetchExistingError } = await supabase
          .from('banco_candidatos')
          .select('id, unidade');

        if (fetchExistingError) {
          console.warn('Erro ao localizar bancos existentes para substituição:', fetchExistingError);
          errors.push(`Aviso ao preparar substituição do banco: ${fetchExistingError.message || 'erro desconhecido'}`);
        } else {
          const idsToDelete = (existingRows || [])
            .filter(row => shouldReplaceBancoRecord(row.unidade || '', resolvedOptions, unitsFromSheet))
            .map(row => row.id);

          deletedCount = idsToDelete.length;

          for (let i = 0; i < idsToDelete.length; i += chunkSize) {
            const idsChunk = idsToDelete.slice(i, i + chunkSize);
            const { error: deleteChunkError } = await supabase
              .from('banco_candidatos')
              .delete()
              .in('id', idsChunk);

            if (deleteChunkError) {
              console.warn('Erro ao excluir lote anterior do banco:', deleteChunkError);
              errors.push(`Aviso ao excluir lote anterior do banco: ${deleteChunkError.message || 'erro desconhecido'}`);
            }
          }
        }
      }

      // Step 3: Process in chunks
      let processedCount = 0;
      let insertedCount = 0;

      for (let i = 0; i < totalRows; i += chunkSize) {
        const chunk = dataRows.slice(i, i + chunkSize);
        const transformedChunk: any[] = [];

        for (const row of chunk) {
          if (!row || (Array.isArray(row) && row.every(c => c === null || c === ''))) {
            ignoredCount += 1;
            continue;
          }
          
          try {
            const item = this.transformRow(row, headers, normalizedMappings, type, batchId, userId, resolvedOptions);
            if (item) transformedChunk.push(item);
            else ignoredCount += 1;
          } catch (err: any) {
            ignoredCount += 1;
            errors.push(`Erro na linha ${i + processedCount + headerRow + 2}: ${err.message}`);
          }
        }

        if (transformedChunk.length > 0) {
          try {
            const { error: insertError } = await supabase.from(tableName).insert(transformedChunk);
            if (insertError) {
              ignoredCount += transformedChunk.length;
              errors.push(`Erro Supabase no lote ${Math.floor(i/chunkSize) + 1}: ${insertError.message || JSON.stringify(insertError)}`);
            } else {
              insertedCount += transformedChunk.length;
            }
          } catch (fetchErr: any) {
            ignoredCount += transformedChunk.length;
            console.error("Fetch error during insert:", fetchErr);
            errors.push(`Erro de conexão (Failed to fetch) no lote ${Math.floor(i/chunkSize) + 1}. Verifique sua internet ou tente lotes menores.`);
          }
        }

        processedCount += chunk.length;
        const percentage = Math.min(10 + Math.round((processedCount / totalRows) * 85), 95);
        
        onProgress({
          phase: 'processing',
          percentage,
          label: `Processando: ${processedCount} de ${totalRows} registros...`,
          processedRows: processedCount,
          totalRows,
          errors: errors.slice(-3) 
        });
        
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      // Step 4: Finalize
      let finalStatus: ImportPhase = 'success';

      // Step 4a: Verify persistence - count actual records in the database
      let confirmedCount = 0;
      try {
        const { count, error: countError } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })
          .eq('import_batch_id', batchId);
        
        if (countError) {
          console.warn('Erro ao verificar contagem no banco:', countError);
          errors.push(`Aviso: Não foi possível confirmar a persistência dos dados: ${countError.message}`);
          confirmedCount = insertedCount; // Fallback to optimistic count
        } else {
          confirmedCount = count || 0;
        }
      } catch (verifyErr: any) {
        console.warn('Erro na verificação pós-importação:', verifyErr);
        confirmedCount = insertedCount;
      }

      if (confirmedCount === 0 && insertedCount > 0) {
        finalStatus = 'error';
        errors.push(`ATENÇÃO: O sistema reportou ${insertedCount} inserções, mas a verificação no banco retornou 0 registros. Os dados podem não ter sido salvos.`);
        confirmedCount = 0;
      } else if (confirmedCount === 0) {
        finalStatus = 'error';
      }

      const persistenceNote = confirmedCount > 0
        ? `Verificado: ${confirmedCount} registros confirmados na tabela ${tableName}.`
        : 'Nenhum registro confirmado no banco.';

      if (logId) {
        const { error: historyError } = await supabase.from('importacoes').update({
          status: confirmedCount === 0 ? 'erro' : (errors.length > 0 ? 'concluido_alertas' : 'concluido'),
          quantidade_apagada: deletedCount,
          quantidade_inserida: confirmedCount,
          quantidade_atualizada: updatedCount,
          quantidade_ignorada: ignoredCount,
          quantidade_erro: errors.length,
          quantidade_confirmada: confirmedCount,
          quantidade_processada: totalRows,
          observacoes: [
            importObservation,
            persistenceNote,
            errors.length > 0 ? `${errors.length} alertas. Ex: ${errors[0].substring(0, 100)}` : ''
          ].filter(Boolean).join(' • ')
        }).eq('id', logId);

        if (historyError) {
          finalStatus = 'error';
          errors.push(`Histórico não pôde ser atualizado: ${historyError.message}`);
        }
      }

      onProgress({
        phase: finalStatus,
        percentage: 100,
        label: finalStatus === 'success' 
          ? (errors.length > 0
            ? `Importação concluída parcialmente! ${confirmedCount} registros confirmados no banco.`
            : `Importação concluída com sucesso! ${confirmedCount} registros confirmados no banco.`)
          : `Falha na Importação: ${confirmedCount > 0 ? confirmedCount + ' registros salvos.' : 'Nenhum registro salvo.'}`,
        processedRows: confirmedCount,
        totalRows,
        errors
      });
    } catch (err: any) {
      console.error("Erro crítico na importação:", err);
      onProgress({
        phase: 'error',
        percentage: 0,
        label: `Erro fatal: ${err.message}`,
        processedRows: 0,
        totalRows: 0,
        errors: [err.message]
      });
    }
  }

  private static transformRow(
    row: any[], 
    headers: string[], 
    mappings: ColumnMapping[], 
    type: 'vagas' | 'banco',
    batchId: string,
    userId: string,
    options?: ImportExecutionOptions,
  ) {
    const data: any = {
      import_batch_id: batchId,
      created_by: userId,
      updated_by: userId,
      data_importacao: new Date().toISOString(),
      origem: 'importada'
    };

    mappings.forEach(m => {
      const colIndex = headers.indexOf(String(m.excel || '').toUpperCase());
      if (colIndex !== -1) {
        let val = row[colIndex];
        
        if (m.isDate) {
          const { formatted } = convertDateValue(val, (m.format as any) || 'auto');
          data[m.system] = formatted;
        } else {
          data[m.system] = val === undefined || val === null ? '' : String(val).trim();
        }
      }
    });

    if (type === 'vagas') {
      const cargo = String(data.cargo || '').trim();
      if (!cargo) return null;
      
      data.unidade = data.unidade || 'NÃO INFORMADA';
      data.status = normalizeStatus(data.status || '');
      data.status_geral = data.status;
      
      const rawTipo = (data.tipo_vaga || '').toLowerCase();
      let tipoVaga: TipoVaga = 'substituicao';
      if (rawTipo.includes('aumento')) tipoVaga = 'aumento';
      else if (rawTipo.includes('lideranca')) tipoVaga = 'lideranca';
      else if (rawTipo.includes('movimentacao')) tipoVaga = 'movimentacao_interna';
      else if (rawTipo.includes('quadro')) tipoVaga = 'quadro';
      else if (rawTipo.includes('banco')) tipoVaga = 'banco_talentos';
      else if (rawTipo.includes('edital')) tipoVaga = 'edital';
      data.tipo_vaga = tipoVaga;

      const { analista, assistentes } = getResponsavelPorUnidade(data.unidade, tipoVaga);
      data.analista_responsavel = data.analista_responsavel || analista;
      data.assistentes = data.assistentes || assistentes;
      
      const numVagas = Number(data.numero_vagas) || 1;
      data.quantidade = numVagas;
      data.numero_vagas = numVagas;
    } else {
      const nome = String(data.nome || '').trim();
      if (!nome || !data.cargo) return null;
      data.cargo_normalizado = normalizeCargo(data.cargo);

      const importObservation = buildBancoImportObservation(options);
      if (importObservation) {
        const currentObservation = String(data.observacao || '').trim();
        data.observacao = currentObservation
          ? `${currentObservation} | ${importObservation}`
          : importObservation;
      }
    }

    return data;
  }
}
