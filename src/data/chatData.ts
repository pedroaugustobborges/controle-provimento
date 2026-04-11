import { Unit, Role } from "@/types/chat";

export const UNITS: Unit[] = [
  // GOIÁS E VITÓRIA
  { 
    id: 'hecad', 
    name: 'HECAD', 
    region: 'GOIÁS E VITÓRIA', 
    analysts: ['Thays Silva'], 
    assistants: ['Ana Julia'] 
  },
  { 
    id: 'crer', 
    name: 'CRER', 
    region: 'GOIÁS E VITÓRIA', 
    analysts: ['Samara Silva'], 
    assistants: ['Ana Caroline'] 
  },
  { 
    id: 'agir', 
    name: 'AGIR', 
    region: 'GOIÁS E VITÓRIA', 
    analysts: ['Julyana Marçal'], 
    assistants: ['Karielly Alves'] 
  },
  { 
    id: 'hugol', 
    name: 'HUGOL', 
    region: 'GOIÁS E VITÓRIA', 
    analysts: ['Sannya Laryssa'], 
    assistants: ['Eduarda Oliveira', 'Flavia Vaz'] 
  },
  { 
    id: 'hds', 
    name: 'HDS', 
    region: 'GOIÁS E VITÓRIA', 
    analysts: ['Julyana Marçal'], 
    assistants: ['Karielly Alves'] 
  },
  { 
    id: 'policlinica', 
    name: 'POLICLÍNICA', 
    region: 'GOIÁS E VITÓRIA', 
    analysts: ['Julyana Marçal'], 
    assistants: ['Karielly Alves'] 
  },
  { 
    id: 'jatai', 
    name: 'JATAÍ', 
    region: 'GOIÁS E VITÓRIA', 
    analysts: ['Geovana Miranda'], 
    assistants: ['Nara Rubia'] 
  },
  { 
    id: 'vitoria', 
    name: 'VITÓRIA (SÃO PEDRO/SUÁ)', 
    region: 'GOIÁS E VITÓRIA', 
    analysts: ['Geovana Miranda'], 
    assistants: ['Nara Rubia'] 
  },
  { 
    id: 'teia-anapolis', 
    name: 'TEIA ANAPOLIS', 
    region: 'GOIÁS E VITÓRIA', 
    analysts: ['Julyana Marçal'], 
    assistants: ['Karielly Alves'] 
  },
  { 
    id: 'teia-canedo', 
    name: 'TEIA CANEDO', 
    region: 'GOIÁS E VITÓRIA', 
    analysts: ['Julyana Marçal'], 
    assistants: ['Karielly Alves'] 
  },
  { 
    id: 'teia-aparecida', 
    name: 'TEIA APARECIDA', 
    region: 'GOIÁS E VITÓRIA', 
    analysts: ['Julyana Marçal'], 
    assistants: ['Karielly Alves'] 
  },
  { 
    id: 'teia-goiania', 
    name: 'TEIA GOIÂNIA', 
    region: 'GOIÁS E VITÓRIA', 
    analysts: ['Julyana Marçal'], 
    assistants: ['Karielly Alves'] 
  },
  
  // OUTRAS UNIDADES
  { 
    id: 'dourados', 
    name: 'DOURADOS', 
    region: 'OUTRAS UNIDADES', 
    analysts: ['Beatriz Almeida Pontes'], 
    assistants: [] 
  },
  { 
    id: 'chs', 
    name: 'CHS', 
    region: 'OUTRAS UNIDADES', 
    analysts: ['Beatriz Almeida Pontes'], 
    assistants: [] 
  },
  { 
    id: 'hmsa', 
    name: 'HMSA', 
    region: 'OUTRAS UNIDADES', 
    analysts: ['Beatriz Almeida Pontes'], 
    assistants: [] 
  },
  { 
    id: 'hrcac', 
    name: 'HRCAC', 
    region: 'OUTRAS UNIDADES', 
    analysts: ['Beatriz Almeida Pontes'], 
    assistants: [] 
  },
  { 
    id: 'teia-cen', 
    name: 'TEIA CEN', 
    region: 'OUTRAS UNIDADES', 
    analysts: ['Beatriz Almeida Pontes'], 
    assistants: [] 
  },
  { 
    id: 'teia-pin', 
    name: 'TEIA PIN', 
    region: 'OUTRAS UNIDADES', 
    analysts: ['Beatriz Almeida Pontes'], 
    assistants: [] 
  },
  { 
    id: 'teia-man', 
    name: 'TEIA MAN', 
    region: 'OUTRAS UNIDADES', 
    analysts: ['Beatriz Almeida Pontes'], 
    assistants: [] 
  },
  { 
    id: 'teia-man-2', 
    name: 'TEIA MAN 2', 
    region: 'OUTRAS UNIDADES', 
    analysts: ['Beatriz Almeida Pontes'], 
    assistants: [] 
  },
  { 
    id: 'teia-man-3', 
    name: 'TEIA MAN 3', 
    region: 'OUTRAS UNIDADES', 
    analysts: ['Beatriz Almeida Pontes'], 
    assistants: [] 
  },
];

export const ROLES: Role[] = [
  { 
    id: 'lideranca', 
    label: 'Analista de Vagas de Liderança', 
    users: ['Ellen Leticia'] 
  },
  { 
    id: 'edital', 
    label: 'Analista de Edital', 
    users: ['Ketty Lorrane Ferreira', 'Wanessa Gomes de Sousa'] 
  },
  { 
    id: 'adm-go-vit', 
    label: 'Analista Administrativo — Unidades de GO e ES', 
    users: ['Izac Cézar'] 
  },
  { 
    id: 'adm-fora', 
    label: 'Analista Administrativo — Outras Unidades', 
    users: ['Beatriz Almeida Pontes'] 
  },
  { 
    id: 'convocacoes', 
    label: 'Analista das Convocações Diárias', 
    users: ['Lis Angela Menezes'] 
  },
  { 
    id: 'super-go-vit', 
    label: 'Supervisora — Unidades de GO e ES', 
    users: ['Ana Carolina Nunes'] 
  },
  { 
    id: 'super-fora', 
    label: 'Supervisora — Outras Unidades', 
    users: ['Renata Moiana'] 
  },
  { 
    id: 'coordenadora', 
    label: 'Coordenadora', 
    users: ['Luanna Ramos'] 
  },
];
