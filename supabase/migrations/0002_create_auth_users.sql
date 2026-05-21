-- ============================================================
-- Migration: Create auth users from profiles + set initial password
-- Run this in the Supabase SQL Editor of the new project.
-- Password: Agir@123
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 1: Create entries in auth.users for every profile
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
SELECT
  '00000000-0000-0000-0000-000000000000'::uuid,
  p.id,
  'authenticated',
  'authenticated',
  p.email,
  crypt('Agir@123', gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', p.nome_completo),
  p.created_at,
  p.updated_at,
  '',
  '',
  '',
  ''
FROM public.profiles p
ON CONFLICT (id) DO UPDATE
  SET encrypted_password = crypt('Agir@123', gen_salt('bf', 10));

-- Step 2: Create email identities (required for email/password login)
INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  p.id,
  p.email,
  jsonb_build_object('sub', p.id::text, 'email', p.email),
  'email',
  now(),
  p.created_at,
  p.updated_at
FROM public.profiles p
ON CONFLICT (provider, provider_id) DO NOTHING;

-- Verify: list all created users
SELECT u.email, p.nome_completo, p.perfil, p.status
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
ORDER BY p.nome_completo;
