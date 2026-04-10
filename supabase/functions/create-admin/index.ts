import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const email = "izac.jesus@agirsaude.org.br";
  const password = "adm1234";
  const nome = "Izac Cézar";

  // Create user via admin API
  const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nome_completo: nome },
  });

  if (createError) {
    // If user already exists, try to get them
    if (createError.message?.includes("already been registered")) {
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = listData?.users?.find((u) => u.email === email);
      if (existingUser) {
        // Update password
        await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password });

        // Ensure profile exists
        await supabaseAdmin.from("profiles").upsert({
          id: existingUser.id,
          email,
          nome_completo: nome,
          perfil: "admin",
          status: "ativo",
        }, { onConflict: "id" });

        // Ensure admin role
        await supabaseAdmin.from("user_roles").upsert({
          user_id: existingUser.id,
          role: "admin",
        }, { onConflict: "user_id,role" });

        return new Response(JSON.stringify({ success: true, message: "Admin user updated", userId: existingUser.id }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
    }
    return new Response(JSON.stringify({ success: false, error: createError.message }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  const userId = userData.user.id;

  // Create profile
  await supabaseAdmin.from("profiles").upsert({
    id: userId,
    email,
    nome_completo: nome,
    perfil: "admin",
    status: "ativo",
  }, { onConflict: "id" });

  // Assign admin role
  await supabaseAdmin.from("user_roles").upsert({
    user_id: userId,
    role: "admin",
  }, { onConflict: "user_id,role" });

  return new Response(JSON.stringify({ success: true, message: "Admin user created", userId }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});
