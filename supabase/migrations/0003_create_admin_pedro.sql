CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_id uuid;
BEGIN

  -- 1. Auth user: check if exists first, then insert or update
  SELECT id INTO v_id FROM auth.users WHERE email = 'pedro.borges@agirsaude.org.br';

  IF v_id IS NULL THEN
    v_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      v_id,
      'authenticated', 'authenticated',
      'pedro.borges@agirsaude.org.br',
      crypt('Agir@2025', gen_salt('bf', 10)),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Pedro Borges"}'::jsonb,
      now(), now(), '', '', '', ''
    );
  ELSE
    UPDATE auth.users
    SET encrypted_password = crypt('Agir@2025', gen_salt('bf', 10))
    WHERE id = v_id;
  END IF;

  -- 2. Identity
  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  )
  VALUES (
    gen_random_uuid(), v_id, 'pedro.borges@agirsaude.org.br',
    jsonb_build_object('sub', v_id::text, 'email', 'pedro.borges@agirsaude.org.br'),
    'email', now(), now(), now()
  )
  ON CONFLICT (provider, provider_id) DO NOTHING;

  -- 3. Profile
  INSERT INTO public.profiles (
    id, email, nome_completo, perfil, status,
    acesso_portal_unidade, visualiza_todas_unidades,
    pode_gerenciar_usuarios, pode_incluir_registros,
    pode_editar_configuracoes, pode_excluir_requisicoes,
    unidades_vinculadas, created_at, updated_at
  )
  VALUES (
    v_id, 'pedro.borges@agirsaude.org.br', 'Pedro Borges', 'admin', 'ativo',
    true, true, true, true, true, true, '{}', now(), now()
  )
  ON CONFLICT (id) DO UPDATE SET
    perfil                   = 'admin',
    visualiza_todas_unidades = true,
    pode_gerenciar_usuarios  = true,
    pode_incluir_registros   = true,
    pode_editar_configuracoes = true,
    pode_excluir_requisicoes  = true;

  -- 4. Role
  INSERT INTO public.user_roles (id, user_id, role)
  VALUES (gen_random_uuid(), v_id, 'admin')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Admin user created: % (%)', 'Pedro Borges', v_id;

END $$;
