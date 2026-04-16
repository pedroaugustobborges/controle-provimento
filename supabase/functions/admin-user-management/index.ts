import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function jsonOk(payload: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ ok: true, ...payload }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonFail(error: string, extra: Record<string, unknown> = {}) {
  // Always return 200 so the Supabase JS SDK does not swallow the body.
  return new Response(JSON.stringify({ ok: false, error, ...extra }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonFail("Não autorizado: token ausente.");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return jsonFail("Não autorizado: sessão inválida.");
    }

    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!callerRole) {
      return jsonFail("Acesso negado. Somente administradores.");
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "create_user": {
        const { email, password, nome_completo, perfil, cargo, status, visualiza_todas_unidades, unidades_vinculadas, modulos_acesso, permissoes_modulo, avatar_url, pode_incluir_registros, pode_excluir_requisicoes, pode_editar_configuracoes, pode_gerenciar_usuarios, acesso_portal_unidade, regiao_suporte } = body;

        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { nome_completo },
        });

        if (createError) return jsonFail(createError.message);
        if (!newUser.user) return jsonFail("Falha ao criar usuário");

        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .upsert({
            id: newUser.user.id,
            nome_completo: nome_completo || "",
            email,
            perfil: perfil || "Analista de RH",
            cargo: cargo || "",
            status: status || "ativo",
            visualiza_todas_unidades: visualiza_todas_unidades || false,
            unidades_vinculadas: unidades_vinculadas || [],
            modulos_acesso: modulos_acesso || [],
            permissoes_modulo: permissoes_modulo || {},
            avatar_url: avatar_url || null,
            pode_incluir_registros: pode_incluir_registros || false,
            pode_excluir_requisicoes: pode_excluir_requisicoes || false,
            pode_editar_configuracoes: pode_editar_configuracoes || false,
            pode_gerenciar_usuarios: pode_gerenciar_usuarios || false,
            acesso_portal_unidade: acesso_portal_unidade || false,
            regiao_suporte: regiao_suporte || null,
          });

        if (profileError) console.error("Profile error:", profileError);

        const roleMap: Record<string, string> = {
          "Administrador": "admin",
          "Admin": "admin",
          "Analista de RH": "analista",
          "Analista Administrativo": "analista",
          "Analista de Edital": "analista",
          "Analista das Convocações": "analista",
          "Assistente de RH": "assistente",
          "Supervisão": "gestor",
          "Coordenação": "gestor",
          "Visualizador": "visualizador",
        };
        const appRole = roleMap[perfil] || "analista";
        await supabaseAdmin.from("user_roles").upsert({
          user_id: newUser.user.id,
          role: appRole,
        }, { onConflict: "user_id,role" });

        return jsonOk({ user_id: newUser.user.id });
      }

      case "reset_password": {
        const { user_id, new_password } = body;
        console.log("[reset_password] called", {
          user_id,
          password_length: typeof new_password === "string" ? new_password.length : null,
          caller: caller.id,
        });

        if (!user_id || typeof user_id !== "string" || !UUID_RE.test(user_id)) {
          console.error("[reset_password] invalid user_id", user_id);
          return jsonFail("ID de usuário inválido.");
        }
        if (!new_password || typeof new_password !== "string") {
          return jsonFail("Nova senha não informada.");
        }
        if (new_password.length < 6) {
          return jsonFail("A senha deve ter no mínimo 6 caracteres.");
        }

        // Verify the auth user actually exists before attempting update
        const { data: existing, error: getErr } = await supabaseAdmin.auth.admin.getUserById(user_id);
        if (getErr) {
          console.error("[reset_password] getUserById error", getErr);
          return jsonFail(`Erro ao localizar usuário: ${getErr.message}`);
        }
        if (!existing?.user) {
          console.error("[reset_password] auth user not found", user_id);
          return jsonFail("Usuário não encontrado no sistema de autenticação. Pode ter sido removido — recrie o usuário.");
        }

        const { data: updated, error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
          password: new_password,
        });
        if (error) {
          console.error("[reset_password] updateUserById error", {
            message: error.message,
            status: (error as any).status,
            name: error.name,
          });
          return jsonFail(error.message || "Falha ao atualizar a senha.");
        }
        console.log("[reset_password] success", { user_id: updated?.user?.id });
        return jsonOk();
      }

      case "update_status": {
        const { user_id, new_status } = body;
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({ status: new_status })
          .eq("id", user_id);
        if (profileError) return jsonFail(profileError.message);

        if (new_status === "suspenso" || new_status === "inativo") {
          await supabaseAdmin.auth.admin.updateUserById(user_id, {
            ban_duration: "876600h",
          });
        } else if (new_status === "ativo") {
          await supabaseAdmin.auth.admin.updateUserById(user_id, {
            ban_duration: "none",
          });
        }

        return jsonOk();
      }

      case "delete_user": {
        const { user_id } = body;
        await supabaseAdmin.from("profiles").delete().eq("id", user_id);
        await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);
        const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);
        if (error) return jsonFail(error.message);
        return jsonOk();
      }

      case "send_welcome_email": {
        const { user_email, user_name, password, site_url } = body;
        const emailContent = {
          to: user_email,
          subject: "Painel de Controle de Provimento",
          body: `Olá, ${user_name}.

Seu acesso ao Painel de Controle de Provimento foi criado com sucesso.

Dados de acesso:

Site: ${site_url}
E-mail: ${user_email}
Senha: ${password}

Para acessar, utilize o e-mail e a senha informados acima.

Importante:
Recomendamos utilizar o navegador Microsoft Edge.
No Google Chrome podem ocorrer algumas inconsistências.

Ficamos felizes em contar com você no Painel de Controle de Provimento da AGIR.

Se precisar de suporte, entre em contato com a administração do sistema:
Isaac - izac.jesus@agirsaude.org.br`,
        };
        return jsonOk({ email_content: emailContent });
      }

      default:
        return jsonFail("Ação desconhecida");
    }
  } catch (err: any) {
    console.error("[admin-user-management] unexpected error", err);
    return jsonFail(err?.message || "Erro interno");
  }
});
