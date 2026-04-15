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
          data_base_do_calculo: string | null
          data_convocacao: string | null
          data_importacao: string | null
          data_publicacao: string | null
          data_referencia_usada: string | null
          data_validade: string | null
          email: string | null
          id: string
          import_batch_id: string | null
          is_prorrogado: boolean | null
          motivo_do_calculo: string | null
          nome: string | null
          numero_chamada: string | null
          numero_edital: string | null
          numero_processo_seletivo: string | null
          observacao: string | null
          origem: string | null
          prorrogacao: string | null
          quantidade_banco: number | null
          status: string | null
          status_calculado: string | null
          status_original: string | null
          telefone: string | null
          unidade: string | null
          unidade_convocacao: string | null
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          cargo?: string | null
          cargo_normalizado?: string | null
          classificacao?: string | null
          created_at?: string
          created_by?: string | null
          data_base_do_calculo?: string | null
          data_convocacao?: string | null
          data_importacao?: string | null
          data_publicacao?: string | null
          data_referencia_usada?: string | null
          data_validade?: string | null
          email?: string | null
          id?: string
          import_batch_id?: string | null
          is_prorrogado?: boolean | null
          motivo_do_calculo?: string | null
          nome?: string | null
          numero_chamada?: string | null
          numero_edital?: string | null
          numero_processo_seletivo?: string | null
          observacao?: string | null
          origem?: string | null
          prorrogacao?: string | null
          quantidade_banco?: number | null
          status?: string | null
          status_calculado?: string | null
          status_original?: string | null
          telefone?: string | null
          unidade?: string | null
          unidade_convocacao?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          cargo?: string | null
          cargo_normalizado?: string | null
          classificacao?: string | null
          created_at?: string
          created_by?: string | null
          data_base_do_calculo?: string | null
          data_convocacao?: string | null
          data_importacao?: string | null
          data_publicacao?: string | null
          data_referencia_usada?: string | null
          data_validade?: string | null
          email?: string | null
          id?: string
          import_batch_id?: string | null
          is_prorrogado?: boolean | null
          motivo_do_calculo?: string | null
          nome?: string | null
          numero_chamada?: string | null
          numero_edital?: string | null
          numero_processo_seletivo?: string | null
          observacao?: string | null
          origem?: string | null
          prorrogacao?: string | null
          quantidade_banco?: number | null
          status?: string | null
          status_calculado?: string | null
          status_original?: string | null
          telefone?: string | null
          unidade?: string | null
          unidade_convocacao?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      feedbacks: {
        Row: {
          created_at: string
          id: string
          mensagem: string
          status: string
          tipo: string
          updated_at: string
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          mensagem: string
          status?: string
          tipo: string
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          mensagem?: string
          status?: string
          tipo?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
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
          acesso_portal_unidade: boolean
          avatar_url: string | null
          cargo: string | null
          created_at: string
          email: string
          id: string
          modulos_acesso: string[] | null
          nome_completo: string
          perfil: string
          permissoes_modulo: Json | null
          pode_editar_configuracoes: boolean
          pode_excluir_requisicoes: boolean
          pode_gerenciar_usuarios: boolean
          pode_incluir_registros: boolean
          regiao_suporte: string | null
          status: string
          ultimo_acesso: string | null
          unidades_vinculadas: string[]
          updated_at: string
          visualiza_todas_unidades: boolean
        }
        Insert: {
          acesso_portal_unidade?: boolean
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          email?: string
          id: string
          modulos_acesso?: string[] | null
          nome_completo?: string
          perfil?: string
          permissoes_modulo?: Json | null
          pode_editar_configuracoes?: boolean
          pode_excluir_requisicoes?: boolean
          pode_gerenciar_usuarios?: boolean
          pode_incluir_registros?: boolean
          regiao_suporte?: string | null
          status?: string
          ultimo_acesso?: string | null
          unidades_vinculadas?: string[]
          updated_at?: string
          visualiza_todas_unidades?: boolean
        }
        Update: {
          acesso_portal_unidade?: boolean
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          email?: string
          id?: string
          modulos_acesso?: string[] | null
          nome_completo?: string
          perfil?: string
          permissoes_modulo?: Json | null
          pode_editar_configuracoes?: boolean
          pode_excluir_requisicoes?: boolean
          pode_gerenciar_usuarios?: boolean
          pode_incluir_registros?: boolean
          regiao_suporte?: string | null
          status?: string
          ultimo_acesso?: string | null
          unidades_vinculadas?: string[]
          updated_at?: string
          visualiza_todas_unidades?: boolean
        }
        Relationships: []
      }
      support_configs: {
        Row: {
          created_at: string
          email: string
          id: string
          mensagem: string | null
          regiao: string
          responsavel: string
          status: string
          teams_user: string | null
          unidades: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string
          id?: string
          mensagem?: string | null
          regiao: string
          responsavel?: string
          status?: string
          teams_user?: string | null
          unidades?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          mensagem?: string | null
          regiao?: string
          responsavel?: string
          status?: string
          teams_user?: string | null
          unidades?: string[]
          updated_at?: string
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
      user_sessions: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          last_activity_at: string
          login_at: string
          logout_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          last_activity_at?: string
          login_at?: string
          logout_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          last_activity_at?: string
          login_at?: string
          logout_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vagas: {
        Row: {
          admissao_efetivada_acompanhamento: string | null
          admissao_enviada_acompanhamento: string | null
          analista_responsavel: string | null
          assistentes: string | null
          candidato_convocado_planilha: string | null
          cargo: string | null
          classificacao_convocacao_planilha: string | null
          created_at: string
          created_by: string | null
          data_abertura: string | null
          data_convocacao: string | null
          data_convocacao_planilha: string | null
          data_envio_edital: string | null
          data_homologacao: string | null
          data_importacao: string | null
          data_publicacao: string | null
          data_recebimento: string | null
          detalhes_acompanhamento: string | null
          distribuicao_vagas: Json | null
          etapa: string | null
          forma_convocacao_planilha: string | null
          gestor_aprovador_id: string | null
          horario_convocacao_planilha: string | null
          id: string
          import_batch_id: string | null
          mes_referencia: string | null
          motivo: string | null
          nome_substituido: string | null
          numero_edital: string | null
          numero_processo_seletivo: string | null
          numero_vagas: number | null
          observacao: string | null
          observacoes_gestor: string | null
          origem: string | null
          prioridade: string | null
          publicacao: string | null
          quantidade: number | null
          secao: string | null
          status: string | null
          status_aprovacao_gestor: string | null
          status_geral: string | null
          status_oitiva_convocacao_planilha: string | null
          tipo_vaga: string | null
          unidade: string | null
          unidade_trabalho: string | null
          unidades_banco_talentos: string[] | null
          updated_at: string
          updated_by: string | null
          url_reachr: string | null
          version: number
        }
        Insert: {
          admissao_efetivada_acompanhamento?: string | null
          admissao_enviada_acompanhamento?: string | null
          analista_responsavel?: string | null
          assistentes?: string | null
          candidato_convocado_planilha?: string | null
          cargo?: string | null
          classificacao_convocacao_planilha?: string | null
          created_at?: string
          created_by?: string | null
          data_abertura?: string | null
          data_convocacao?: string | null
          data_convocacao_planilha?: string | null
          data_envio_edital?: string | null
          data_homologacao?: string | null
          data_importacao?: string | null
          data_publicacao?: string | null
          data_recebimento?: string | null
          detalhes_acompanhamento?: string | null
          distribuicao_vagas?: Json | null
          etapa?: string | null
          forma_convocacao_planilha?: string | null
          gestor_aprovador_id?: string | null
          horario_convocacao_planilha?: string | null
          id?: string
          import_batch_id?: string | null
          mes_referencia?: string | null
          motivo?: string | null
          nome_substituido?: string | null
          numero_edital?: string | null
          numero_processo_seletivo?: string | null
          numero_vagas?: number | null
          observacao?: string | null
          observacoes_gestor?: string | null
          origem?: string | null
          prioridade?: string | null
          publicacao?: string | null
          quantidade?: number | null
          secao?: string | null
          status?: string | null
          status_aprovacao_gestor?: string | null
          status_geral?: string | null
          status_oitiva_convocacao_planilha?: string | null
          tipo_vaga?: string | null
          unidade?: string | null
          unidade_trabalho?: string | null
          unidades_banco_talentos?: string[] | null
          updated_at?: string
          updated_by?: string | null
          url_reachr?: string | null
          version?: number
        }
        Update: {
          admissao_efetivada_acompanhamento?: string | null
          admissao_enviada_acompanhamento?: string | null
          analista_responsavel?: string | null
          assistentes?: string | null
          candidato_convocado_planilha?: string | null
          cargo?: string | null
          classificacao_convocacao_planilha?: string | null
          created_at?: string
          created_by?: string | null
          data_abertura?: string | null
          data_convocacao?: string | null
          data_convocacao_planilha?: string | null
          data_envio_edital?: string | null
          data_homologacao?: string | null
          data_importacao?: string | null
          data_publicacao?: string | null
          data_recebimento?: string | null
          detalhes_acompanhamento?: string | null
          distribuicao_vagas?: Json | null
          etapa?: string | null
          forma_convocacao_planilha?: string | null
          gestor_aprovador_id?: string | null
          horario_convocacao_planilha?: string | null
          id?: string
          import_batch_id?: string | null
          mes_referencia?: string | null
          motivo?: string | null
          nome_substituido?: string | null
          numero_edital?: string | null
          numero_processo_seletivo?: string | null
          numero_vagas?: number | null
          observacao?: string | null
          observacoes_gestor?: string | null
          origem?: string | null
          prioridade?: string | null
          publicacao?: string | null
          quantidade?: number | null
          secao?: string | null
          status?: string | null
          status_aprovacao_gestor?: string | null
          status_geral?: string | null
          status_oitiva_convocacao_planilha?: string | null
          tipo_vaga?: string | null
          unidade?: string | null
          unidade_trabalho?: string | null
          unidades_banco_talentos?: string[] | null
          updated_at?: string
          updated_by?: string | null
          url_reachr?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "vagas_gestor_aprovador_id_fkey"
            columns: ["gestor_aprovador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_recruitment_data: {
        Args: { _user_id: string }
        Returns: boolean
      }
      can_view_recruitment_data: {
        Args: { _user_id: string }
        Returns: boolean
      }
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
