export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      remocao: {
        Row: {
          id: string
          tenant_id: string
          numero: string
          titulo?: string | null
          paciente_id?: number | null
          paciente_nome: string
          paciente_prontuario?: string | null
          paciente_data_nascimento?: string | null
          paciente_sexo?: string | null
          paciente_diagnostico?: string | null
          paciente_condicao_clinica?: Database['public']['Enums']['remocao_condicao_clinica'] | null
          paciente_precaucoes?: string | null
          paciente_alergias?: string | null
          paciente_necessidades_especiais?: string | null
          origem_unidade_id?: string | null
          origem_setor_id?: string | null
          origem_leito?: string | null
          origem_responsavel_id?: string | null
          destino_unidade_id?: string | null
          destino_setor_id?: string | null
          destino_endereco?: string | null
          destino_contato_nome?: string | null
          destino_contato_telefone?: string | null
          destino_medico_receptor_id?: string | null
          destino_confirmed_at?: string | null
          destino_confirmado_por?: string | null
          finalidade: Database['public']['Enums']['remocao_finalidade']
          tipo_transporte?: Database['public']['Enums']['remocao_tipo_transporte'] | null
          nivel_suporte?: Database['public']['Enums']['remocao_nivel_suporte'] | null
          prioridade: Database['public']['Enums']['remocao_prioridade']
          necessidade_medica: Database['public']['Enums']['remocao_necessidade_medica']
          justificativa_medica?: string | null
          data_prevista?: string | null
          horario_previsto_saida?: string | null
          horario_previsto_atendimento?: string | null
          veiculo_id?: string | null
          quilometragem_inicial?: number | null
          quilometragem_final?: number | null
          checkout_at?: string | null
          checkout_por?: string | null
          condicao_paciente_saida?: string | null
          liberacao_por?: string | null
          checkin_at?: string | null
          checkin_por?: string | null
          entrega_por_id?: string | null
          entrega_por_nome?: string | null
          entrega_por_cargo?: string | null
          entrega_at?: string | null
          condicao_paciente_entrega?: string | null
          checkout_motorista_at?: string | null
          checkout_motorista_por?: string | null
          retorno_com_paciente?: boolean | null
          retorno_com_equipe?: boolean | null
          quilometragem_percorrida?: number | null
          tempo_total?: string | null
          status: Database['public']['Enums']['remocao_status']
          motivo_cancelamento?: string | null
          motivo_suspensao?: string | null
          created_at: string
          updated_at: string
          created_by?: string | null
          updated_by?: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          numero?: string
          titulo?: string | null
          paciente_id?: number | null
          paciente_nome: string
          paciente_prontuario?: string | null
          paciente_data_nascimento?: string | null
          paciente_sexo?: string | null
          paciente_diagnostico?: string | null
          paciente_condicao_clinica?: Database['public']['Enums']['remocao_condicao_clinica'] | null
          paciente_precaucoes?: string | null
          paciente_alergias?: string | null
          paciente_necessidades_especiais?: string | null
          origem_unidade_id?: string | null
          origem_setor_id?: string | null
          origem_leito?: string | null
          origem_responsavel_id?: string | null
          destino_unidade_id?: string | null
          destino_setor_id?: string | null
          destino_endereco?: string | null
          destino_contato_nome?: string | null
          destino_contato_telefone?: string | null
          destino_medico_receptor_id?: string | null
          destino_confirmed_at?: string | null
          destino_confirmado_por?: string | null
          finalidade: Database['public']['Enums']['remocao_finalidade']
          tipo_transporte?: Database['public']['Enums']['remocao_tipo_transporte'] | null
          nivel_suporte?: Database['public']['Enums']['remocao_nivel_suporte'] | null
          prioridade?: Database['public']['Enums']['remocao_prioridade']
          necessidade_medica?: Database['public']['Enums']['remocao_necessidade_medica']
          justificativa_medica?: string | null
          data_prevista?: string | null
          horario_previsto_saida?: string | null
          horario_previsto_atendimento?: string | null
          veiculo_id?: string | null
          quilometragem_inicial?: number | null
          quilometragem_final?: number | null
          checkout_at?: string | null
          checkout_por?: string | null
          condicao_paciente_saida?: string | null
          liberacao_por?: string | null
          checkin_at?: string | null
          checkin_por?: string | null
          entrega_por_id?: string | null
          entrega_por_nome?: string | null
          entrega_por_cargo?: string | null
          entrega_at?: string | null
          condicao_paciente_entrega?: string | null
          checkout_motorista_at?: string | null
          checkout_motorista_por?: string | null
          retorno_com_paciente?: boolean | null
          retorno_com_equipe?: boolean | null
          quilometragem_percorrida?: number | null
          tempo_total?: string | null
          status?: Database['public']['Enums']['remocao_status']
          motivo_cancelamento?: string | null
          motivo_suspensao?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          [K in keyof Database['public']['Tables']['remocao']['Insert']]?: K extends never ? never : Database['public']['Tables']['remocao']['Insert'][K]
        }
      }

      remocao_paciente: {
        Row: {
          id: string
          remocao_id: string
          paciente_id?: number | null
          paciente_nome: string
          paciente_prontuario?: string | null
          paciente_data_nascimento?: string | null
          paciente_sexo?: string | null
          paciente_diagnostico?: string | null
          paciente_condicao_clinica?: Database['public']['Enums']['remocao_condicao_clinica'] | null
          paciente_precaucoes?: string | null
          paciente_alergias?: string | null
          paciente_necessidades_especiais?: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          remocao_id: string
          paciente_id?: number | null
          paciente_nome: string
          paciente_prontuario?: string | null
          paciente_data_nascimento?: string | null
          paciente_sexo?: string | null
          paciente_diagnostico?: string | null
          paciente_condicao_clinica?: Database['public']['Enums']['remocao_condicao_clinica'] | null
          paciente_precaucoes?: string | null
          paciente_alergias?: string | null
          paciente_necessidades_especiais?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          [K in keyof Database['public']['Tables']['remocao_paciente']['Insert']]?: K extends never ? never : Database['public']['Tables']['remocao_paciente']['Insert'][K]
        }
      }

      remocao_equipe: {
        Row: {
          id: string
          remocao_id: string
          tenant_id: string
          nome: string
          nivel_suporte: Database['public']['Enums']['remocao_nivel_suporte']
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          remocao_id: string
          tenant_id: string
          nome: string
          nivel_suporte: Database['public']['Enums']['remocao_nivel_suporte']
          created_at?: string
          updated_at?: string
        }
        Update: {
          [K in keyof Database['public']['Tables']['remocao_equipe']['Insert']]?: K extends never ? never : Database['public']['Tables']['remocao_equipe']['Insert'][K]
        }
      }

      remocao_equipe_membro: {
        Row: {
          id: string
          equipe_id: string
          profissional_id: string
          profissional_nome: string
          profissional_cargo?: string | null
          role: Database['public']['Enums']['remocao_equipe_role']
          confirmado: boolean
          confirmado_at?: string | null
          created_at: string
        }
        Insert: {
          id?: string
          equipe_id: string
          profissional_id: string
          profissional_nome: string
          profissional_cargo?: string | null
          role: Database['public']['Enums']['remocao_equipe_role']
          confirmado?: boolean
          confirmado_at?: string | null
          created_at?: string
        }
        Update: {
          [K in keyof Database['public']['Tables']['remocao_equipe_membro']['Insert']]?: K extends never ? never : Database['public']['Tables']['remocao_equipe_membro']['Insert'][K]
        }
      }

      remocao_veiculo: {
        Row: {
          id: string
          tenant_id: string
          placa: string
          marca?: string | null
          modelo?: string | null
          tipo?: Database['public']['Enums']['remocao_tipo_veiculo'] | null
          classificacao?: string | null
          situacao: Database['public']['Enums']['remocao_situacao_veiculo']
          quilometragem: number
          equipamentos?: string | null
          tem_oxigenio: boolean
          ultima_manutencao?: string | null
          proxima_manutencao?: string | null
          observacoes?: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          placa: string
          marca?: string | null
          modelo?: string | null
          tipo?: Database['public']['Enums']['remocao_tipo_veiculo'] | null
          classificacao?: string | null
          situacao?: Database['public']['Enums']['remocao_situacao_veiculo']
          quilometragem?: number
          equipamentos?: string | null
          tem_oxigenio?: boolean
          ultima_manutencao?: string | null
          proxima_manutencao?: string | null
          observacoes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          [K in keyof Database['public']['Tables']['remocao_veiculo']['Insert']]?: K extends never ? never : Database['public']['Tables']['remocao_veiculo']['Insert'][K]
        }
      }

      remocao_motorista: {
        Row: {
          id: string
          tenant_id: string
          pessoa_id?: string | null
          nome: string
          cpf?: string | null
          cnh?: string | null
          telefone?: string | null
          email?: string | null
          status: Database['public']['Enums']['remocao_motorista_status']
          ultima_posicao_lat?: number | null
          ultima_posicao_lng?: number | null
          ultima_posicao_at?: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          pessoa_id?: string | null
          nome: string
          cpf?: string | null
          cnh?: string | null
          telefone?: string | null
          email?: string | null
          status?: Database['public']['Enums']['remocao_motorista_status']
          ultima_posicao_lat?: number | null
          ultima_posicao_lng?: number | null
          ultima_posicao_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          [K in keyof Database['public']['Tables']['remocao_motorista']['Insert']]?: K extends never ? never : Database['public']['Tables']['remocao_motorista']['Insert'][K]
        }
      }

      remocao_avaliacao_clinica: {
        Row: {
          id: string
          remocao_id: string
          enfermeiro_id?: string | null
          enfermeiro_nome?: string | null
          medico_id?: string | null
          medico_nome?: string | null
          estado_clinico?: Database['public']['Enums']['remocao_condicao_clinica'] | null
          sinais_vitais?: Json | null
          nivel_consciencia?: string | null
          oxigenoterapia?: boolean | null
          concentracao_oxigenio?: number | null
          acesso_venoso?: boolean | null
          tipo_acesso?: string | null
          infusao?: boolean | null
          medicamento_infusao?: string | null
          ventilacao?: boolean | null
          tipo_ventilacao?: string | null
          mobilidade?: string | null
          risco_queda?: boolean | null
          necessidade_monitorizacao?: boolean | null
          necessidade_oxigenio?: boolean | null
          necessidade_medicamento_transporte?: boolean | null
          risco_deterioracao?: boolean | null
          necessidade_medica?: boolean | null
          avaliacao_medica?: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          remocao_id: string
          enfermeiro_id?: string | null
          enfermeiro_nome?: string | null
          medico_id?: string | null
          medico_nome?: string | null
          estado_clinico?: Database['public']['Enums']['remocao_condicao_clinica'] | null
          sinais_vitais?: Json | null
          nivel_consciencia?: string | null
          oxigenoterapia?: boolean | null
          concentracao_oxigenio?: number | null
          acesso_venoso?: boolean | null
          tipo_acesso?: string | null
          infusao?: boolean | null
          medicamento_infusao?: string | null
          ventilacao?: boolean | null
          tipo_ventilacao?: string | null
          mobilidade?: string | null
          risco_queda?: boolean | null
          necessidade_monitorizacao?: boolean | null
          necessidade_oxigenio?: boolean | null
          necessidade_medicamento_transporte?: boolean | null
          risco_deterioracao?: boolean | null
          necessidade_medica?: boolean | null
          avaliacao_medica?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          [K in keyof Database['public']['Tables']['remocao_avaliacao_clinica']['Insert']]?: K extends never ? never : Database['public']['Tables']['remocao_avaliacao_clinica']['Insert'][K]
        }
      }

      remocao_checklist: {
        Row: {
          id: string
          remocao_id: string
          secao: Database['public']['Enums']['remocao_checklist_secao']
          item_key: string
          item_label: string
          checked: boolean
          checked_by?: string | null
          checked_at?: string | null
          observacoes?: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          remocao_id: string
          secao: Database['public']['Enums']['remocao_checklist_secao']
          item_key: string
          item_label: string
          checked?: boolean
          checked_by?: string | null
          checked_at?: string | null
          observacoes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          [K in keyof Database['public']['Tables']['remocao_checklist']['Insert']]?: K extends never ? never : Database['public']['Tables']['remocao_checklist']['Insert'][K]
        }
      }

      remocao_intercorrencia: {
        Row: {
          id: string
          remocao_id: string
          tipo: Database['public']['Enums']['remocao_tipo_intercorrencia']
          data_hora: string
          profissional_id?: string | null
          profissional_nome?: string | null
          evento: string
          conduta?: string | null
          resultado?: string | null
          necessidade_acicionamento_medico?: boolean | null
          necessidade_mudanca_destino?: boolean | null
          observacoes?: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          remocao_id: string
          tipo: Database['public']['Enums']['remocao_tipo_intercorrencia']
          data_hora?: string
          profissional_id?: string | null
          profissional_nome?: string | null
          evento: string
          conduta?: string | null
          resultado?: string | null
          necessidade_acicionamento_medico?: boolean | null
          necessidade_mudanca_destino?: boolean | null
          observacoes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          [K in keyof Database['public']['Tables']['remocao_intercorrencia']['Insert']]?: K extends never ? never : Database['public']['Tables']['remocao_intercorrencia']['Insert'][K]
        }
      }

      remocao_status_historico: {
        Row: {
          id: string
          remocao_id: string
          status_anterior?: Database['public']['Enums']['remocao_status'] | null
          status_novo: Database['public']['Enums']['remocao_status']
          motivo?: string | null
          criado_por?: string | null
          criado_por_nome?: string | null
          created_at: string
        }
        Insert: {
          id?: string
          remocao_id: string
          status_anterior?: Database['public']['Enums']['remocao_status'] | null
          status_novo: Database['public']['Enums']['remocao_status']
          motivo?: string | null
          criado_por?: string | null
          criado_por_nome?: string | null
          created_at?: string
        }
        Update: {
          [K in keyof Database['public']['Tables']['remocao_status_historico']['Insert']]?: K extends never ? never : Database['public']['Tables']['remocao_status_historico']['Insert'][K]
        }
      }

      remocao_documento: {
        Row: {
          id: string
          remocao_id: string
          tenant_id: string
          tipo?: Database['public']['Enums']['remocao_documento_tipo'] | null
          titulo: string
          descricao?: string | null
          storage_path: string
          storage_bucket: string
          file_hash?: string | null
          file_size?: number | null
          mime_type?: string | null
          status: Database['public']['Enums']['remocao_documento_status']
          enviado_por?: string | null
          enviado_por_nome?: string | null
          enviado_at?: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          remocao_id: string
          tenant_id: string
          tipo?: Database['public']['Enums']['remocao_documento_tipo'] | null
          titulo: string
          descricao?: string | null
          storage_path: string
          storage_bucket: string
          file_hash?: string | null
          file_size?: number | null
          mime_type?: string | null
          status?: Database['public']['Enums']['remocao_documento_status']
          enviado_por?: string | null
          enviado_por_nome?: string | null
          enviado_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          [K in keyof Database['public']['Tables']['remocao_documento']['Insert']]?: K extends never ? never : Database['public']['Tables']['remocao_documento']['Insert'][K]
        }
      }

      remocao_documento_extracao: {
        Row: {
          id: string
          documento_id: string
          dados_estruturados?: Json | null
          dados_estruturados_brutos?: Json | null
          confianca?: number | null
          processador?: string | null
          texto_extraido?: string | null
          created_at: string
        }
        Insert: {
          id?: string
          documento_id: string
          dados_estruturados?: Json | null
          dados_estruturados_brutos?: Json | null
          confianca?: number | null
          processador?: string | null
          texto_extraido?: string | null
          created_at?: string
        }
        Update: {
          [K in keyof Database['public']['Tables']['remocao_documento_extracao']['Insert']]?: K extends never ? never : Database['public']['Tables']['remocao_documento_extracao']['Insert'][K]
        }
      }

      remocao_documento_conferencia: {
        Row: {
          id: string
          documento_id: string
          conferido_por?: string | null
          conferido_por_nome?: string | null
          conferido_at?: string | null
          alteracoes?: Json | null
          campos_aceitos?: Json | null
          resultado: Database['public']['Enums']['remocao_documento_status']
          observacoes?: string | null
          created_at: string
        }
        Insert: {
          id?: string
          documento_id: string
          conferido_por?: string | null
          conferido_por_nome?: string | null
          conferido_at?: string | null
          alteracoes?: Json | null
          campos_aceitos?: Json | null
          resultado: Database['public']['Enums']['remocao_documento_status']
          observacoes?: string | null
          created_at?: string
        }
        Update: {
          [K in keyof Database['public']['Tables']['remocao_documento_conferencia']['Insert']]?: K extends never ? never : Database['public']['Tables']['remocao_documento_conferencia']['Insert'][K]
        }
      }

      remocao_gps_posicao: {
        Row: {
          id: string
          remocao_id: string
          motorista_id?: string | null
          veiculo_id?: string | null
          latitude: number
          longitude: number
          accuracy?: number | null
          heading?: number | null
          speed?: number | null
          altitude?: number | null
          recorded_at: string
          created_at: string
        }
        Insert: {
          id?: string
          remocao_id: string
          motorista_id?: string | null
          veiculo_id?: string | null
          latitude: number
          longitude: number
          accuracy?: number | null
          heading?: number | null
          speed?: number | null
          altitude?: number | null
          recorded_at?: string
          created_at?: string
        }
        Update: {
          [K in keyof Database['public']['Tables']['remocao_gps_posicao']['Insert']]?: K extends never ? never : Database['public']['Tables']['remocao_gps_posicao']['Insert'][K]
        }
      }

      remocao_evento: {
        Row: {
          id: string
          remocao_id: string
          evento: string
          descricao?: string | null
          nivel: string
          dados?: Json | null
          criado_por?: string | null
          criado_por_nome?: string | null
          created_at: string
        }
        Insert: {
          id?: string
          remocao_id: string
          evento: string
          descricao?: string | null
          nivel?: string
          dados?: Json | null
          criado_por?: string | null
          criado_por_nome?: string | null
          created_at?: string
        }
        Update: {
          [K in keyof Database['public']['Tables']['remocao_evento']['Insert']]?: K extends never ? never : Database['public']['Tables']['remocao_evento']['Insert'][K]
        }
      }

      remocao_auditoria: {
        Row: {
          id: string
          tenant_id: string
          remocao_id?: string | null
          acao: string
          entidade: string
          registro_id?: string | null
          detalhes?: Json | null
          usuario_id?: string | null
          usuario_nome?: string | null
          usuario_role?: string | null
          ip_origem?: string | null
          user_agent?: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          remocao_id?: string | null
          acao: string
          entidade: string
          registro_id?: string | null
          detalhes?: Json | null
          usuario_id?: string | null
          usuario_nome?: string | null
          usuario_role?: string | null
          ip_origem?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          [K in keyof Database['public']['Tables']['remocao_auditoria']['Insert']]?: K extends never ? never : Database['public']['Tables']['remocao_auditoria']['Insert'][K]
        }
      }

      remocao_unidade: {
        Row: {
          id: string
          tenant_id: string
          codigo: string
          nome: string
          tipo?: string | null
          endereco?: string | null
          telefone?: string | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          codigo: string
          nome: string
          tipo?: string | null
          endereco?: string | null
          telefone?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          [K in keyof Database['public']['Tables']['remocao_unidade']['Insert']]?: K extends never ? never : Database['public']['Tables']['remocao_unidade']['Insert'][K]
        }
      }

      remocao_setor: {
        Row: {
          id: string
          tenant_id: string
          unidade_id: string
          codigo: string
          nome: string
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          unidade_id: string
          codigo: string
          nome: string
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          [K in keyof Database['public']['Tables']['remocao_setor']['Insert']]?: K extends never ? never : Database['public']['Tables']['remocao_setor']['Insert'][K]
        }
      }

      remocao_checkin: {
        Row: {
          id: string
          remocao_id: string
          motorista_id?: string | null
          veiculo_id?: string | null
          quilometragem_inicial?: number | null
          observacoes?: string | null
          created_at: string
          created_by?: string | null
        }
        Insert: {
          id?: string
          remocao_id: string
          motorista_id?: string | null
          veiculo_id?: string | null
          quilometragem_inicial?: number | null
          observacoes?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          [K in keyof Database['public']['Tables']['remocao_checkin']['Insert']]?: K extends never ? never : Database['public']['Tables']['remocao_checkin']['Insert'][K]
        }
      }

      remocao_checkout: {
        Row: {
          id: string
          remocao_id: string
          motorista_id?: string | null
          veiculo_id?: string | null
          quilometragem_final?: number | null
          retorno_com_paciente?: boolean | null
          retorno_com_equipe?: boolean | null
          intercorrencias?: string | null
          problemas_veiculo?: string | null
          observacoes?: string | null
          tempo_total?: string | null
          quilometragem_percorrida?: number | null
          created_at: string
          created_by?: string | null
        }
        Insert: {
          id?: string
          remocao_id: string
          motorista_id?: string | null
          veiculo_id?: string | null
          quilometragem_final?: number | null
          retorno_com_paciente?: boolean | null
          retorno_com_equipe?: boolean | null
          intercorrencias?: string | null
          problemas_veiculo?: string | null
          observacoes?: string | null
          tempo_total?: string | null
          quilometragem_percorrida?: number | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          [K in keyof Database['public']['Tables']['remocao_checkout']['Insert']]?: K extends never ? never : Database['public']['Tables']['remocao_checkout']['Insert'][K]
        }
      }

      remocao_destino_confirmacao: {
        Row: {
          id: string
          remocao_id: string
          unidade_id?: string | null
          setor_id?: string | null
          profissional_id?: string | null
          profissional_nome: string
          cargo?: string | null
          telefone?: string | null
          email?: string | null
          data_confirmacao: string
          observacoes?: string | null
          created_at: string
        }
        Insert: {
          id?: string
          remocao_id: string
          unidade_id?: string | null
          setor_id?: string | null
          profissional_id?: string | null
          profissional_nome: string
          cargo?: string | null
          telefone?: string | null
          email?: string | null
          data_confirmacao?: string
          observacoes?: string | null
          created_at?: string
        }
        Update: {
          [K in keyof Database['public']['Tables']['remocao_destino_confirmacao']['Insert']]?: K extends never ? never : Database['public']['Tables']['remocao_destino_confirmacao']['Insert'][K]
        }
      }

      remocao_rota: {
        Row: {
          id: string
          remocao_id: string
          origem_lat?: number | null
          origem_lng?: number | null
          destino_lat?: number | null
          destino_lng?: number | null
          origem_endereco?: string | null
          destino_endereco?: string | null
          distancia_prevista_km?: number | null
          duracao_prevista_minutos?: number | null
          status_rota?: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          remocao_id: string
          origem_lat?: number | null
          origem_lng?: number | null
          destino_lat?: number | null
          destino_lng?: number | null
          origem_endereco?: string | null
          destino_endereco?: string | null
          distancia_prevista_km?: number | null
          duracao_prevista_minutos?: number | null
          status_rota?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          [K in keyof Database['public']['Tables']['remocao_rota']['Insert']]?: K extends never ? never : Database['public']['Tables']['remocao_rota']['Insert'][K]
        }
      }

      remocao_motorista_turno: {
        Row: {
          id: string
          motorista_id: string
          tenant_id: string
          data: string
          hora_inicio: string
          hora_fim?: string | null
          ativo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          motorista_id: string
          tenant_id: string
          data: string
          hora_inicio: string
          hora_fim?: string | null
          ativo?: boolean
          created_at?: string
        }
        Update: {
          [K in keyof Database['public']['Tables']['remocao_motorista_turno']['Insert']]?: K extends never ? never : Database['public']['Tables']['remocao_motorista_turno']['Insert'][K]
        }
      }

      remocao_tabela_referencia: {
        Row: {
          id: string
          tenant_id: string
          tipo: string
          codigo: string
          descricao: string
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          tipo: string
          codigo: string
          descricao: string
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          [K in keyof Database['public']['Tables']['remocao_tabela_referencia']['Insert']]?: K extends never ? never : Database['public']['Tables']['remocao_tabela_referencia']['Insert'][K]
        }
      }

      organizations: {
        Row: {
          id: string
          nome: string
          razao_social?: string | null
          cnpj?: string | null
          email?: string | null
          telefone?: string | null
          endereco?: string | null
          ativo?: boolean | null
          config?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Insert: {
          id?: string
          nome: string
          razao_social?: string | null
          cnpj?: string | null
          email?: string | null
          telefone?: string | null
          endereco?: string | null
          ativo?: boolean | null
          config?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          [K in keyof Database['public']['Tables']['organizations']['Insert']]?: K extends never ? never : Database['public']['Tables']['organizations']['Insert'][K]
        }
      }

      people: {
        Row: {
          id: string
          nome: string
          email?: string | null
          telefone?: string | null
          data_nascimento?: string | null
          cpf?: string | null
          genero?: string | null
          ativo?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Insert: {
          id: string
          nome: string
          email?: string | null
          telefone?: string | null
          data_nascimento?: string | null
          cpf?: string | null
          genero?: string | null
          ativo?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          [K in keyof Database['public']['Tables']['people']['Insert']]?: K extends never ? never : Database['public']['Tables']['people']['Insert'][K]
        }
      }

      tenant_memberships: {
        Row: {
          id: string
          tenant_id: string
          person_id: string
          role_id: string
          papel: string
          status: Database['public']['Enums']['remocao_people_status'] | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          person_id: string
          role_id: string
          papel: string
          status?: Database['public']['Enums']['remocao_people_status'] | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          [K in keyof Database['public']['Tables']['tenant_memberships']['Insert']]?: K extends never ? never : Database['public']['Tables']['tenant_memberships']['Insert'][K]
        }
      }

      role_assignments: {
        Row: {
          id: string
          tenant_id: string
          person_id: string
          permission_key: string
          concedido_por?: string | null
          concedido_at?: string | null
          expira_em?: string | null
          created_at?: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          person_id: string
          permission_key: string
          concedido_por?: string | null
          concedido_at?: string | null
          expira_em?: string | null
          created_at?: string | null
        }
        Update: {
          [K in keyof Database['public']['Tables']['role_assignments']['Insert']]?: K extends never ? never : Database['public']['Tables']['role_assignments']['Insert'][K]
        }
      }
    }

    Views: {
      remocao_dashboard: { Row: Record<string, unknown> }
      remocao_summary: { Row: Record<string, unknown> }
    }

    Functions: {
      get_tenant_id: { Args: Record<string, unknown>; Returns: string }
      get_active_tenant_id: { Args: Record<string, unknown>; Returns: string }
      get_current_person_id: { Args: Record<string, unknown>; Returns: string }
      get_current_person_nome: { Args: Record<string, unknown>; Returns: string }
      has_permission: { Args: { permission: string }; Returns: boolean }
      is_admin_master: { Args: Record<string, unknown>; Returns: boolean }
      is_tenant_member: { Args: { p_tenant_id: string }; Returns: boolean }
      get_user_tenant_roles: { Args: { p_tenant_id: string }; Returns: unknown }
      get_user_permissions: { Args: Record<string, unknown>; Returns: unknown }
      get_current_tenant_info: { Args: Record<string, unknown>; Returns: unknown }
      set_active_tenant: { Args: { p_tenant_id: string }; Returns: boolean }
      create_default_tenant: { Args: { p_user_id: string; p_user_email: string; p_org_name?: string }; Returns: string }
      bootstrap_root_user: { Args: { p_admin_email: string }; Returns: boolean }
      revoke_root_user: { Args: { p_target_email: string }; Returns: boolean }
      invite_user_to_tenant: { Args: { p_inviter_id: string; p_invitee_email: string; p_tenant_id: string; p_role_key: string }; Returns: string }
      approve_membership: { Args: { p_membership_id: string }; Returns: boolean }
      force_password_reset: { Args: { p_person_id: string }; Returns: boolean }
      clear_password_reset_flag: { Args: { p_person_id: string }; Returns: boolean }
      generate_remocao_number: { Args: { p_tenant_id: string }; Returns: string }
      validar_transicao_status: { Args: { status_atual: Database['public']['Enums']['remocao_status']; status_novo: Database['public']['Enums']['remocao_status'] }; Returns: boolean }
      update_remocao_status: { Args: { p_remocao_id: string; p_status_novo: Database['public']['Enums']['remocao_status']; p_usuario_id: string; p_motivo?: string }; Returns: Database['public']['Enums']['remocao_status'] }
      finalizar_checkout: { Args: { p_remocao_id: string; p_quilometragem_inicial: number; p_quilometragem_final: number }; Returns: number }
    }

    Enums: {
      remocao_tipo_transporte: 'simple' | 'basico' | 'intermediario' | 'avancado' | 'urgente'
      remocao_nivel_suporte: 'basico' | 'intermediario' | 'avancado'
      remocao_finalidade: 'exame' | 'procedimento' | 'consulta' | 'transferencia_inter_hospitalar' | 'transferencia_intra_rede' | 'alta_hospitalar' | 'retorno_residencia' | 'retorno_unidade_origem' | 'outro'
      remocao_status: 'SOLICITADA' | 'EM_AVALIACAO' | 'AGUARDANDO_DESTINO' | 'DESTINO_CONFIRMADO' | 'AGUARDANDO_EQUIPE' | 'EQUIPE_CONFIRMADA' | 'AGUARDANDO_MOTORISTA' | 'MOTORISTA_CHECKIN' | 'MOTORISTA_CONFIRMADO' | 'CHECKLIST_PENDENTE' | 'PRONTA_PARA_SAIDA' | 'EM_DESLOCAMENTO' | 'CHEGADA_DESTINO' | 'PACIENTE_ENTREGUE' | 'RETORNANDO' | 'RETORNOU_UNIDADE' | 'ENCERRADA' | 'CANCELADA' | 'SUSPENSA' | 'INTERCORRENCIA' | 'NAO_REALIZADA'
      remocao_prioridade: 'rotina' | 'urgente' | 'emergencial'
      remocao_necessidade_medica: 'obrigatorio' | 'solicitado' | 'dispensado' | 'nao_disponivel' | 'nao_necessario'
      remocao_condicao_clinica: 'estavel' | 'instavel' | 'grave' | 'critico' | 'emergencia'
      remocao_tipo_intercorrencia: 'alteracao_sinais_vitais' | 'queda' | 'deterioracao_clinica' | 'parada_cardiorrespiratoria' | 'falta_equipamento' | 'falha_equipamento' | 'falta_oxigenio' | 'acidente' | 'atraso' | 'problema_destino' | 'recusa_destino' | 'retorno_origem' | 'outro'
      remocao_equipe_role: 'motorista' | 'tecnico_enfermagem' | 'enfermeiro' | 'medico' | 'outro'
      remocao_tipo_veiculo: 'ambulancia_a' | 'ambulancia_b' | 'ambulancia_c' | 'ambulancia_d' | 'veiculo_especial' | 'outro'
      remocao_situacao_veiculo: 'disponivel' | 'ocupado' | 'em_manutencao' | 'indisponivel'
      remocao_documento_status: 'UPLOADED' | 'PROCESSING' | 'EXTRACTED' | 'PENDING_REVIEW' | 'REVIEWING' | 'APPROVED' | 'IMPORTED' | 'REJECTED' | 'FAILED'
      remocao_documento_tipo: 'relatorio_medico' | 'documento_transferencia' | 'autorizacao_transferencia' | 'pedido_exame' | 'resultado_exame' | 'prescricao' | 'documento_administrativo' | 'outro'
      remocao_motorista_status: 'disponivel' | 'ocupado' | 'em_deslocamento' | 'em_retorno' | 'indisponivel'
      remocao_checklist_secao: 'identificacao' | 'condicao_clinica' | 'documentacao' | 'veiculo' | 'equipe'
      remocao_people_status: 'ativo' | 'inativo' | 'suspenso'
    }

    CompositeTypes: {
      [_ in never]: never
    }
  }
}
