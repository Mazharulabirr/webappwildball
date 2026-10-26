import type { SupabaseClient, User } from "@supabase/supabase-js";

export async function ensureProfile(client: SupabaseClient, user: User) {
  const { data, error } = await client.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (error) throw error;
  if (data) return;
  const requested = typeof user.user_metadata.username === "string" ? user.user_metadata.username : "";
  const name = user.user_metadata.full_name || user.user_metadata.name || requested || "Wildball player";
  const base = (requested || user.email?.split("@")[0] || "hooper").toLowerCase().replace(/[^a-z0-9._]/g, "").slice(0, 17) || "hooper";
  for (let attempt = 0; attempt < 3; attempt++) {
    const username = attempt === 0 && /^[a-z0-9._]{3,30}$/.test(requested)
      ? requested : `${base}_${user.id.replace(/-/g, "").slice(0, 8)}${attempt || ""}`;
    // Ignore conflicts on id so concurrent callbacks never overwrite a profile.
    const { error: insertError } = await client.from("profiles").upsert({ id: user.id, username, display_name: String(name).slice(0, 100) }, { onConflict: "id", ignoreDuplicates: true });
    if (!insertError) return;
    if (insertError.code !== "23505") throw insertError;
  }
  throw new Error("Could not create your player profile. Please log in again.");
}
