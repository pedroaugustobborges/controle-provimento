import { Unit, Role } from "@/types/chat";

export const UNITS: Unit[] = [
  // GOIÁS E ESPÍRITO SANTO
  { 
    id: 'hecad', 
    name: 'HECAD', 
    region: 'GOIÁS E ESPÍRITO SANTO', 
    analysts: ['Ana Karolina Oliveira Barros'], 
    assistants: ['ANA CAROLINE GONÇALVES'] 
  },
  { 
    id: 'crer', 
    name: 'CRER', 
    region: 'GOIÁS E ESPÍRITO SANTO', 
    analysts: ['Rayanne Pereira de Sousa'], 
    assistants: ['Priscila Brito Guimarães'] 
  },
  { 
    id: 'agir', 
    name: 'AGIR', 
    region: 'GOIÁS E ESPÍRITO SANTO', 
    analysts: ['Izac Cézar'], 
    assistants: ['Ana Karolina Oliveira Barros'] 
  },
  { 
    id: 'hugol', 
    name: 'HUGOL', 
    region: 'GOIÁS E ESPÍRITO SANTO', 
    analysts: ['Rayanne Pereira de Sousa'], 
    assistants: ['ANA CAROLINE GONÇALVES'] 
  },
  
  // AMAZONAS
  { 
    id: 'chs', 
    name: 'CHS', 
    region: 'AMAZONAS', 
    analysts: ['Beatriz Almeida Pontes da Silva'], 
    assistants: [] 
  },
  { 
    id: 'teia-man', 
    name: 'TEIA MAN', 
    region: 'AMAZONAS', 
    analysts: ['Beatriz Almeida Pontes da Silva'], 
    assistants: [] 
  },

  // OUTRAS UNIDADES
  { 
    id: 'hmsa', 
    name: 'HMSA', 
    region: 'OUTRAS UNIDADES', 
    analysts: ['Beatriz Almeida Pontes da Silva'], 
    assistants: ['Luanna Ramos de Sousa'] 
  },
];

export const ROLES: Role[] = [
  { 
    id: 'lideranca', 
    label: 'Analista de Vagas de Liderança', 
    users: ['Rayanne Pereira de Sousa'] 
  },
  { 
    id: 'adm-go-vit', 
    label: 'Analista Administrativo — Unidades de GO e ES', 
    users: ['Izac Cézar', 'ANA CAROLINE GONÇALVES'] 
  },
  { 
    id: 'adm-fora', 
    label: 'Analista Administrativo — Outras Unidades', 
    users: ['Beatriz Almeida Pontes da Silva'] 
  },
  { 
    id: 'super-go-vit', 
    label: 'Supervisora — Unidades de GO e ES', 
    users: ['Ana Carolina Nunes Monteiro'] 
  },
  { 
    id: 'super-fora', 
    label: 'Supervisora — Outras Unidades', 
    users: ['Renata Moiana Da Costa'] 
  },
  { 
    id: 'coordenadora', 
    label: 'Coordenadora', 
    users: ['Luanna Ramos de Sousa'] 
  },
];
