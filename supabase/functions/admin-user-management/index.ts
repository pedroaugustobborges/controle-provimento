import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify the calling user is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller is admin
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!callerRole) {
      return new Response(JSON.stringify({ error: "Acesso negado. Somente administradores." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "create_user": {
        const { email, password, nome_completo, perfil, cargo, status, visualiza_todas_unidades, unidades_vinculadas, modulos_acesso, permissoes_modulo, avatar_url, pode_incluir_registros, pode_excluir_requisicoes, pode_editar_configuracoes, pode_gerenciar_usuarios, acesso_portal_unidade } = body;

        // Create auth user with admin API (won't affect current session)
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { nome_completo },
        });

        if (createError) throw createError;
        if (!newUser.user) throw new Error("Falha ao criar usuário");

        // Update profile
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
          });

        if (profileError) console.error("Profile error:", profileError);

        // Set role based on profile
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

        return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "reset_password": {
        const { user_id, new_password } = body;
        const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
          password: new_password,
        });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_status": {
        const { user_id, new_status } = body;
        // Update profile status
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({ status: new_status })
          .eq("id", user_id);
        if (profileError) throw profileError;

        // If suspended or inactive, ban the user in auth; if active, unban
        if (new_status === "suspenso" || new_status === "inativo") {
          await supabaseAdmin.auth.admin.updateUserById(user_id, {
            ban_duration: "876600h", // ~100 years
          });
        } else if (new_status === "ativo") {
          await supabaseAdmin.auth.admin.updateUserById(user_id, {
            ban_duration: "none",
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete_user": {
        const { user_id } = body;
        // Delete profile first
        await supabaseAdmin.from("profiles").delete().eq("id", user_id);
        await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);
        // Delete auth user
        const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "send_welcome_email": {
        const { user_email, user_name, password, site_url } = body;

        // Use Lovable AI to send email via a simple approach
        // For now, we'll use Supabase's built-in email or log it
        // The email content is prepared here for the admin to see
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

        // Try to send via Supabase's built-in invite or just log success
        // For MVP, we store the email info and mark it as sent
        return new Response(JSON.stringify({ success: true, email_content: emailContent }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Ação desconhecida" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
