
export interface EquipeResponsavel {
  unidade: string;
  analista: string;
  assistentes: string[];
}

export const EQUIPE_POR_UNIDADE: EquipeResponsavel[] = [
  {
    unidade: 'HUGOL',
    analista: 'Sannya Laryssa',
    assistentes: ['Eduarda Oliveira', 'Flavia Vaz']
  },
  {
    unidade: 'CRER',
    analista: 'Samara Silva',
    assistentes: ['Ana Caroline']
  },
  {
    unidade: 'HECAD',
    analista: 'Thays Silva',
    assistentes: ['Ana Julia']
  },
  {
    unidade: 'CORPORATIVO',
    analista: 'Julyana Marçal',
    assistentes: ['Karielly Alves']
  },
  {
    unidade: 'HDS',
    analista: 'Julyana Marçal',
    assistentes: ['Karielly Alves']
  },
  {
    unidade: 'POLICLÍNICA',
    analista: 'Julyana Marçal',
    assistentes: ['Karielly Alves']
  },
  {
    unidade: 'JATAÍ',
    analista: 'Geovana Miranda',
    assistentes: ['Nara Rubia']
  },
  {
    unidade: 'VITÓRIA',
    analista: 'Geovana Miranda',
    assistentes: ['Nara Rubia']
  }
];

export const RESPONSAVEL_LIDERANCA = 'Ellen Leticia';

export function getResponsavelPorUnidade(unidade: string, tipoVaga?: string) {
  if (tipoVaga === 'lideranca') {
    return {
      analista: RESPONSAVEL_LIDERANCA,
      assistentes: []
    };
  }

  const unitUpper = String(unidade || '').toUpperCase();
  const equipe = EQUIPE_POR_UNIDADE.find(e => 
    unitUpper.includes(String(e.unidade || '').toUpperCase())
  );

  if (equipe) {
    return {
      analista: equipe.analista,
      assistentes: equipe.assistentes
    };
  }

  // Fallback para unidades fora de GO/ES
  return {
    analista: 'Beatriz Almeida Pontes',
    assistentes: []
  };
}
