
 export type TipoEscopo = 'Corporativo' | 'Estratégico' | 'Supervisão' | 'Regional' | 'Operacional';
 
 export interface MembroEquipe {
   id: string;
   nome: string;
   cargo: string;
   liderancaImediata?: string;
   escopo: TipoEscopo[];
   regiao?: string;
   observacao?: string;
   tags?: string[];
   subordinados?: MembroEquipe[];
 }
 
 // Nível 1 - Topo
 export const DIRETORIA: MembroEquipe = {
   id: 'ana-karolina',
   nome: 'Ana Karolina Oliveira Barros',
   cargo: 'Diretora Corporativa de Recursos Humanos',
   escopo: ['Corporativo', 'Estratégico'],
   tags: ['Diretoria', 'Corporativo']
 };
 
 // Nível 2
 export const GERENCIA: MembroEquipe = {
   id: 'priscila-brito',
   nome: 'Priscila Brito Guimarães',
   cargo: 'Gerente Corporativa de Recursos Humanos',
   liderancaImediata: 'Ana Karolina Oliveira Barros',
   escopo: ['Corporativo', 'Estratégico'],
   tags: ['Gerência', 'Corporativo']
 };
 
 // Nível 3
 export const COORDENACAO: MembroEquipe = {
   id: 'luanna-ramos',
   nome: 'Luanna Ramos de Sousa',
   cargo: 'Coordenadora de Recursos Humanos',
   liderancaImediata: 'Priscila Brito Guimarães',
   escopo: ['Corporativo', 'Estratégico'],
   tags: ['Coordenação', 'Corporativo']
 };
 
 // BLOCO 1 — ESTRUTURA CENTRAL / CORPORATIVA
 export const EQUIPE_CENTRAL: MembroEquipe[] = [
   { id: 'ana-carolina-nunes', nome: 'Ana Carolina Nunes', cargo: 'Supervisora de Recursos Humanos', liderancaImediata: 'Luanna Ramos de Sousa', escopo: ['Supervisão', 'Corporativo'], tags: ['Supervisão', 'Corporativo'] },
   { id: 'renata-moiana', nome: 'Renata Moiana', cargo: 'Supervisora de Provimento', liderancaImediata: 'Luanna Ramos de Sousa', escopo: ['Supervisão', 'Corporativo'], tags: ['Supervisão', 'Corporativo'] },
   { id: 'carolina-leles', nome: 'Carolina Leles', cargo: 'Analista de Recursos Humanos', liderancaImediata: 'Luanna Ramos de Sousa', escopo: ['Corporativo'], tags: ['Apoio Corporativo'] },
   { id: 'ellen-leticia', nome: 'Ellen Letícia Cardoso', cargo: 'Analista de Recursos Humanos', liderancaImediata: 'Luanna Ramos de Sousa', escopo: ['Corporativo'], tags: ['Apoio Corporativo'] },
   { id: 'ana-caroline-tea', nome: 'Ana Caroline', cargo: 'Encarregada de Recursos Humanos', liderancaImediata: 'Luanna Ramos de Sousa', escopo: ['Corporativo'], observacao: 'Responsável pelas unidades TEA', tags: ['TEA', 'Corporativo'] },
   { id: 'vanessa-gomes', nome: 'Vanessa Gomes', cargo: 'Analista de Recursos Humanos', liderancaImediata: 'Luanna Ramos de Sousa', escopo: ['Corporativo'], observacao: 'Responsável pela criação e publicação de editais', tags: ['Editais', 'Corporativo'] },
   { id: 'ketlyn-lorraine', nome: 'Ketlyn Lorraine', cargo: 'Analista de Recursos Humanos', liderancaImediata: 'Luanna Ramos de Sousa', escopo: ['Corporativo'], observacao: 'Atuação junto à criação e publicação de editais', tags: ['Editais', 'Corporativo'] },
   { id: 'liz-angela', nome: 'Liz Ângela', cargo: 'Analista de Recursos Humanos', liderancaImediata: 'Luanna Ramos de Sousa', escopo: ['Corporativo'], observacao: 'Responsável pelas convocações coletivas e recepção de candidatos aprovados', tags: ['Convocações', 'Corporativo'] }
 ];
 
 // BLOCO 2 — ESTRUTURA OPERACIONAL POR SUPERVISÃO / REGIÃO
 export const EQUIPE_GO_ES: MembroEquipe[] = [
   { id: 'sannya-laryssa', nome: 'Sannya Laryssa', cargo: 'Analista de Recursos Humanos', liderancaImediata: 'Ana Carolina Nunes', escopo: ['Operacional', 'Regional'], regiao: 'Goiás e Espírito Santo' },
   { id: 'geovana-miranda', nome: 'Geovana Miranda', cargo: 'Analista de Recursos Humanos', liderancaImediata: 'Ana Carolina Nunes', escopo: ['Operacional', 'Regional'], regiao: 'Goiás e Espírito Santo' },
   { id: 'jullyana-marcal', nome: 'Jullyana Marçal', cargo: 'Analista de Recursos Humanos', liderancaImediata: 'Ana Carolina Nunes', escopo: ['Operacional', 'Regional'], regiao: 'Goiás e Espírito Santo' },
   { id: 'eduarda-oliveira', nome: 'Eduarda Oliveira', cargo: 'Assistente de Recursos Humanos', liderancaImediata: 'Ana Carolina Nunes', escopo: ['Operacional', 'Regional'], regiao: 'Goiás e Espírito Santo' },
   { id: 'thays-silva', nome: 'Thays Silva', cargo: 'Analista de Recursos Humanos', liderancaImediata: 'Ana Carolina Nunes', escopo: ['Operacional', 'Regional'], regiao: 'Goiás e Espírito Santo' },
   { id: 'anna-julia', nome: 'Anna Julia Felipe', cargo: 'Assistente de Recursos Humanos', liderancaImediata: 'Ana Carolina Nunes', escopo: ['Operacional', 'Regional'], regiao: 'Goiás e Espírito Santo' },
   { id: 'flavia-vaz', nome: 'Flavia Vaz', cargo: 'Assistente de Recursos Humanos', liderancaImediata: 'Ana Carolina Nunes', escopo: ['Operacional', 'Regional'], regiao: 'Goiás e Espírito Santo' },
   { id: 'izac-jesus', nome: 'Izac De Jesus Cezar', cargo: 'Analista Administrativo', liderancaImediata: 'Ana Carolina Nunes', escopo: ['Operacional', 'Regional'], regiao: 'Goiás e Espírito Santo' },
   { id: 'ana-caroline-feitoza', nome: 'Ana Caroline Feitoza', cargo: 'Assistente de Recursos Humanos', liderancaImediata: 'Ana Carolina Nunes', escopo: ['Operacional', 'Regional'], regiao: 'Goiás e Espírito Santo' },
   { id: 'hayane-paula', nome: 'Hayane de Paula', cargo: 'Assistente de Recursos Humanos', liderancaImediata: 'Ana Carolina Nunes', escopo: ['Operacional', 'Regional'], regiao: 'Goiás e Espírito Santo' },
   { id: 'samara-silva', nome: 'Samara Silva', cargo: 'Analista de Recursos Humanos', liderancaImediata: 'Ana Carolina Nunes', escopo: ['Operacional', 'Regional'], regiao: 'Goiás e Espírito Santo' }
 ];
 
 export const EQUIPE_EXTERNA: MembroEquipe[] = [
   { id: 'geovana-arantes', nome: 'Geovana Arantes', cargo: 'Assistente de Recursos Humanos', liderancaImediata: 'Renata Moiana', escopo: ['Operacional', 'Regional'], regiao: 'Outras Unidades' },
   { id: 'maria-eduarda', nome: 'Maria Eduarda Miulk', cargo: 'Assistente de Recursos Humanos', liderancaImediata: 'Renata Moiana', escopo: ['Operacional', 'Regional'], regiao: 'Outras Unidades' },
   { id: 'jessica-almeida', nome: 'Jessica Almeida do Nascimento', cargo: 'Assistente de Recursos Humanos', liderancaImediata: 'Renata Moiana', escopo: ['Operacional', 'Regional'], regiao: 'Outras Unidades' },
   { id: 'pricila-paula', nome: 'Pricila Paula da Silva', cargo: 'Assistente de Recursos Humanos', liderancaImediata: 'Renata Moiana', escopo: ['Operacional', 'Regional'], regiao: 'Outras Unidades' },
   { id: 'beatriz-almeida', nome: 'Beatriz Almeida', cargo: 'Analista de Recursos Humanos', liderancaImediata: 'Renata Moiana', escopo: ['Operacional', 'Regional'], regiao: 'Outras Unidades' },
   { id: 'kaio-dias', nome: 'Kaio Dias da Silva', cargo: 'Analista de Recursos Humanos', liderancaImediata: 'Renata Moiana', escopo: ['Operacional', 'Regional'], regiao: 'Outras Unidades' },
   { id: 'lorrane-augusto', nome: 'Lorrane Augusto', cargo: 'Analista de Recursos Humanos', liderancaImediata: 'Renata Moiana', escopo: ['Operacional', 'Regional'], regiao: 'Outras Unidades' },
   { id: 'lorraine-sirqueira', nome: 'Lorraine Sirqueira', cargo: 'Analista de Recursos Humanos', liderancaImediata: 'Renata Moiana', escopo: ['Operacional', 'Regional'], regiao: 'Outras Unidades' }
 ];
 
 export interface EquipeResponsavel { unidade: string; analista: string; assistentes: string[]; }
 export const EQUIPE_POR_UNIDADE: EquipeResponsavel[] = [
   { unidade: 'HUGOL', analista: 'Sannya Laryssa', assistentes: ['Eduarda Oliveira', 'Flavia Vaz'] },
   { unidade: 'CRER', analista: 'Samara Silva', assistentes: ['Ana Caroline Feitoza'] },
   { unidade: 'HECAD', analista: 'Thays Silva', assistentes: ['Anna Julia Felipe'] },
   { unidade: 'CORPORATIVO', analista: 'Jullyana Marçal', assistentes: [] },
   { unidade: 'HDS', analista: 'Jullyana Marçal', assistentes: [] },
   { unidade: 'POLICLÍNICA', analista: 'Jullyana Marçal', assistentes: [] },
   { unidade: 'JATAÍ', analista: 'Geovana Miranda', assistentes: [] },
   { unidade: 'VITÓRIA', analista: 'Geovana Miranda', assistentes: [] }
 ];
 export const RESPONSAVEL_LIDERANCA = 'Ellen Letícia Cardoso';
 export function getResponsavelPorUnidade(unidade: string, tipoVaga?: string) {
   if (tipoVaga === 'lideranca') return { analista: RESPONSAVEL_LIDERANCA, assistentes: [] };
   const unitUpper = String(unidade || '').toUpperCase();
   const equipe = EQUIPE_POR_UNIDADE.find(e => unitUpper.includes(String(e.unidade || '').toUpperCase()));
   return equipe ? { analista: equipe.analista, assistentes: equipe.assistentes } : { analista: 'Beatriz Almeida', assistentes: [] };
 }
