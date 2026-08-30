import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inviteSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  role: z.enum(["Cashier", "Manager", "Admin"]),
  password: z.string().min(8).max(200),
});

/**
 * Managers invite staff: the caller's role is verified through their own
 * (RLS-scoped) client before the privileged Auth Admin call runs.
 */
export const inviteStaffMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inviteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isManager, error: roleError } = await context.supabase.rpc("is_manager", {
      _user_id: context.userId,
    });
    if (roleError) throw new Error(roleError.message);
    if (!isManager) throw new Error("Only managers can invite staff.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const created = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name },
    });
    if (created.error) throw new Error(created.error.message);
    const userId = created.data.user?.id;
    if (!userId) throw new Error("Could not create the staff account.");

    // handle_new_user() seeds a Cashier row; upgrade it cleanly when a higher role was chosen.
    if (data.role !== "Cashier") {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, role: data.role });
      if (error) throw new Error(error.message);
    }
    await supabaseAdmin.from("profiles").update({ name: data.name }).eq("id", userId);

    return { id: userId, name: data.name, email: data.email, role: data.role };
  });
