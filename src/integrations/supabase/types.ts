export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          acao: string
          created_at: string
          id: string
          ip: string | null
          modulo: string
          perfil: string | null
          registro_afetado: string | null
          usuario_email: string | null
          usuario_id: string | null
          usuario_nome: string
          valor_anterior: Json | null
          valor_novo: Json | null
        }
        Insert: {
          acao: string
          created_at?: string
          id?: string
          ip?: string | null
          modulo: string
          perfil?: string | null
          registro_afetado?: string | null
          usuario_email?: string | null
          usuario_id?: string | null
          usuario_nome?: string
          valor_anterior?: Json | null
          valor_novo?: Json | null
        }
        Update: {
          acao?: string
          created_at?: string
          id?: string
          ip?: string | null
          modulo?: string
          perfil?: string | null
          registro_afetado?: string | null
          usuario_email?: string | null
          usuario_id?: string | null
          usuario_nome?: string
          valor_anterior?: Json | null
          valor_novo?: Json | null
        }
        Relationships: []
      }
      banco_candidatos: {
        Row: {
          cargo: string | null
          cargo_normalizado: string | null
          classificacao: string | null
          created_at: string
          created_by: string | null
          data_convocacao: string | null
          data_importacao: string | null
          data_validade: string | null
          email: string | null
          id: string
          import_batch_id: string | null
          is_prorrogado: boolean | null
          nome: string | null
          numero_edital: string | null
          numero_processo_seletivo: string | null
          observacao: string | null
          origem: string | null
          quantidade_banco: number | null
          status: string | null
          telefone: string | null
          unidade: string | null
          unidade_convocacao: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cargo?: string | null
          cargo_normalizado?: string | null
          classificacao?: string | null
          created_at?: string
          created_by?: string | null
          data_convocacao?: string | null
          data_importacao?: string | null
          data_validade?: string | null
          email?: string | null
          id?: string
          import_batch_id?: string | null
          is_prorrogado?: boolean | null
          nome?: string | null
          numero_edital?: string | null
          numero_processo_seletivo?: string | null
          observacao?: string | null
          origem?: string | null
          quantidade_banco?: number | null
          status?: string | null
          telefone?: string | null
          unidade?: string | null
          unidade_convocacao?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cargo?: string | null
          cargo_normalizado?: string | null
          classificacao?: string | null
          created_at?: string
          created_by?: string | null
          data_convocacao?: string | null
          data_importacao?: string | null
          data_validade?: string | null
          email?: string | null
          id?: string
          import_batch_id?: string | null
          is_prorrogado?: boolean | null
          nome?: string | null
          numero_edital?: string | null
          numero_processo_seletivo?: string | null
          observacao?: string | null
          origem?: string | null
          quantidade_banco?: number | null
          status?: string | null
          telefone?: string | null
          unidade?: string | null
          unidade_convocacao?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      importacoes: {
        Row: {
          aba_planilha: string | null
          arquivo: string | null
          created_at: string
          detalhes: Json
          id: string
          linha_cabecalho: number | null
          modo_importacao: string | null
          nome_arquivo: string | null
          observacoes: string | null
          origem_base: string | null
          quantidade_apagada: number | null
          quantidade_atualizada: number
          quantidade_confirmada: number
          quantidade_erro: number
          quantidade_ignorada: number
          quantidade_inserida: number | null
          quantidade_processada: number
          status: string | null
          tabela_destino: string | null
          tipo: string | null
          updated_at: string
          usuario_id: string | null
        }
        Insert: {
          aba_planilha?: string | null
          arquivo?: string | null
          created_at?: string
          detalhes?: Json
          id?: string
          linha_cabecalho?: number | null
          modo_importacao?: string | null
          nome_arquivo?: string | null
          observacoes?: string | null
          origem_base?: string | null
          quantidade_apagada?: number | null
          quantidade_atualizada?: number
          quantidade_confirmada?: number
          quantidade_erro?: number
          quantidade_ignorada?: number
          quantidade_inserida?: number | null
          quantidade_processada?: number
          status?: string | null
          tabela_destino?: string | null
          tipo?: string | null
          updated_at?: string
          usuario_id?: string | null
        }
        Update: {
          aba_planilha?: string | null
          arquivo?: string | null
          created_at?: string
          detalhes?: Json
          id?: string
          linha_cabecalho?: number | null
          modo_importacao?: string | null
          nome_arquivo?: string | null
          observacoes?: string | null
          origem_base?: string | null
          quantidade_apagada?: number | null
          quantidade_atualizada?: number
          quantidade_confirmada?: number
          quantidade_erro?: number
          quantidade_ignorada?: number
          quantidade_inserida?: number | null
          quantidade_processada?: number
          status?: string | null
          tabela_destino?: string | null
          tipo?: string | null
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          cargo: string | null
          created_at: string
          email: string
          id: string
          nome_completo: string
          perfil: string
          pode_editar_configuracoes: boolean
          pode_excluir_requisicoes: boolean
          pode_gerenciar_usuarios: boolean
          pode_incluir_registros: boolean
          status: string
          ultimo_acesso: string | null
          unidades_vinculadas: string[]
          updated_at: string
          visualiza_todas_unidades: boolean
        }
        Insert: {
          cargo?: string | null
          created_at?: string
          email?: string
          id: string
          nome_completo?: string
          perfil?: string
          pode_editar_configuracoes?: boolean
          pode_excluir_requisicoes?: boolean
          pode_gerenciar_usuarios?: boolean
          pode_incluir_registros?: boolean
          status?: string
          ultimo_acesso?: string | null
          unidades_vinculadas?: string[]
          updated_at?: string
          visualiza_todas_unidades?: boolean
        }
        Update: {
          cargo?: string | null
          created_at?: string
          email?: string
          id?: string
          nome_completo?: string
          perfil?: string
          pode_editar_configuracoes?: boolean
          pode_excluir_requisicoes?: boolean
          pode_gerenciar_usuarios?: boolean
          pode_incluir_registros?: boolean
          status?: string
          ultimo_acesso?: string | null
          unidades_vinculadas?: string[]
          updated_at?: string
          visualiza_todas_unidades?: boolean
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vagas: {
        Row: {
          analista_responsavel: string | null
          assistentes: string | null
          cargo: string | null
          created_at: string
          created_by: string | null
          data_abertura: string | null
          data_convocacao: string | null
          data_envio_edital: string | null
          data_homologacao: string | null
          data_importacao: string | null
          data_publicacao: string | null
          data_recebimento: string | null
          etapa: string | null
          id: string
          import_batch_id: string | null
          mes_referencia: string | null
          motivo: string | null
          nome_substituido: string | null
          numero_edital: string | null
          numero_processo_seletivo: string | null
          numero_vagas: number | null
          observacao: string | null
          origem: string | null
          prioridade: string | null
          publicacao: string | null
          quantidade: number | null
          status: string | null
          status_geral: string | null
          tipo_vaga: string | null
          unidade: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          analista_responsavel?: string | null
          assistentes?: string | null
          cargo?: string | null
          created_at?: string
          created_by?: string | null
          data_abertura?: string | null
          data_convocacao?: string | null
          data_envio_edital?: string | null
          data_homologacao?: string | null
          data_importacao?: string | null
          data_publicacao?: string | null
          data_recebimento?: string | null
          etapa?: string | null
          id?: string
          import_batch_id?: string | null
          mes_referencia?: string | null
          motivo?: string | null
          nome_substituido?: string | null
          numero_edital?: string | null
          numero_processo_seletivo?: string | null
          numero_vagas?: number | null
          observacao?: string | null
          origem?: string | null
          prioridade?: string | null
          publicacao?: string | null
          quantidade?: number | null
          status?: string | null
          status_geral?: string | null
          tipo_vaga?: string | null
          unidade?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          analista_responsavel?: string | null
          assistentes?: string | null
          cargo?: string | null
          created_at?: string
          created_by?: string | null
          data_abertura?: string | null
          data_convocacao?: string | null
          data_envio_edital?: string | null
          data_homologacao?: string | null
          data_importacao?: string | null
          data_publicacao?: string | null
          data_recebimento?: string | null
          etapa?: string | null
          id?: string
          import_batch_id?: string | null
          mes_referencia?: string | null
          motivo?: string | null
          nome_substituido?: string | null
          numero_edital?: string | null
          numero_processo_seletivo?: string | null
          numero_vagas?: number | null
          observacao?: string | null
          origem?: string | null
          prioridade?: string | null
          publicacao?: string | null
          quantidade?: number | null
          status?: string | null
          status_geral?: string | null
          tipo_vaga?: string | null
          unidade?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "analista" | "assistente" | "gestor" | "visualizador"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "analista", "assistente", "gestor", "visualizador"],
    },
  },
} as const
