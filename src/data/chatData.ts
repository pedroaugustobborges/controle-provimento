import { Unit, Role } from "@/types/chat";

export const UNITS: Unit[] = [
  // GOIAS E VITÓRIA
  { id: 'hecad', name: 'HECAD', region: 'GO_VIT', analysts: ['Ana Silva'], assistants: ['Pedro Santos'] },
  { id: 'crer', name: 'CRER', region: 'GO_VIT', analysts: ['Marcos Oliveira'], assistants: ['Juliana Lima'] },
  { id: 'agir', name: 'AGIR', region: 'GO_VIT', analysts: ['Fernanda Costa'], assistants: ['Ricardo Souza'] },
  { id: 'hugol', name: 'HUGOL', region: 'GO_VIT', analysts: ['Clara Mendes'], assistants: ['Thiago Rocha'] },
  { id: 'hds', name: 'HDS', region: 'GO_VIT', analysts: ['Paulo Bento'], assistants: ['Sofia Neves'] },
  { id: 'policlinica', name: 'POLICLÍNICA', region: 'GO_VIT', analysts: ['Renata Alves'], assistants: ['Bruno Dias'] },
  { id: 'jatai', name: 'JATAÍ', region: 'GO_VIT', analysts: ['Luciana Martins'], assistants: ['Gabriel Ferraz'] },
  { id: 'vitoria', name: 'VITÓRIA', region: 'GO_VIT', analysts: ['Mariana Lousa'], assistants: ['Vitor Hugo'] },
  { id: 'teia-anapolis', name: 'TEIA ANAPOLIS', region: 'GO_VIT', analysts: ['Beatriz Silva'], assistants: ['Hugo Lima'] },
  { id: 'teia-canedo', name: 'TEIA CANEDO', region: 'GO_VIT', analysts: ['Carlos Eduardo'], assistants: ['Aline Santos'] },
  { id: 'teia-aparecida', name: 'TEIA APARECIDA', region: 'GO_VIT', analysts: ['Daniela Soares'], assistants: ['Felipe Melo'] },
  { id: 'teia-goiania', name: 'TEIA GOIÂNIA', region: 'GO_VIT', analysts: ['Patrícia Lima'], assistants: ['Igor Rodrigues'] },
  
  // FORA
  { id: 'dourados', name: 'DOURADOS', region: 'FORA', analysts: ['Roberto Dias'], assistants: ['Larissa Vale'] },
  { id: 'chs', name: 'CHS', region: 'FORA', analysts: ['Sandra Mara'], assistants: ['Otávio Augusto'] },
  { id: 'hmsa', name: 'HMSA', region: 'FORA', analysts: ['Vanessa Rangel'], assistants: ['Luiz Felipe'] },
  { id: 'hrcac', name: 'HRCAC', region: 'FORA', analysts: ['Tereza Cristina'], assistants: ['Joaquim Neto'] },
  { id: 'teia-cen', name: 'TEIA CEN', region: 'FORA', analysts: ['Sérgio Reis'], assistants: ['Camila Loures'] },
  { id: 'teia-pin', name: 'TEIA PIN', region: 'FORA', analysts: ['Rogério Flausino'], assistants: ['Bárbara Evans'] },
  { id: 'teia-man', name: 'TEIA MAN', region: 'FORA', analysts: ['Gustavo Lima'], assistants: ['Andressa Suita'] },
  { id: 'teia-man-2', name: 'TEIA MAN 2', region: 'FORA', analysts: ['Luan Santana'], assistants: ['Jade Magalhães'] },
  { id: 'teia-man-3', name: 'TEIA MAN 3', region: 'FORA', analysts: ['Michel Teló'], assistants: ['Thaís Fersoza'] },
];

export const ROLES: Role[] = [
  { id: 'rh', label: 'Analista de RH', users: ['Ana Silva (RH)', 'Marcos Oliveira (RH)'] },
  { id: 'edital', label: 'Analista do Edital', users: ['Fernanda Costa (Edital)', 'Clara Mendes (Edital)'] },
  { id: 'adm', label: 'Analista Administrativo', users: ['Paulo Bento (ADM)', 'Renata Alves (ADM)'] },
  { id: 'gerente', label: 'Gerente', users: ['Luciana Martins (Gerente)', 'Mariana Lousa (Gerente)'] },
  { id: 'coordenadora', label: 'Coordenadora', users: ['Beatriz Silva (Coord)', 'Carlos Eduardo (Coord)'] },
  { id: 'gestao-geral', label: 'Gestão Geral', users: ['Daniela Soares (Gestão)', 'Patrícia Lima (Gestão)'] },
  { id: 'gestao-todos', label: 'Todos os cargos de gestão', users: ['Grupo de Gestão'] },
];
