import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  // These are intentionally public browser credentials for the active Wildball project.
  // Keeping one source of truth here prevents a stale Vercel environment value from
  // sending sign-up requests to a previous Supabase project.
  const supabaseUrl = "https://iuaadtiijverhgyqqzas.supabase.co";
  const supabasePublishableKey = "sb_publishable_X3L_D-TWOWYRv6_UsZhnyQ_eM_2XT0J";

  return createBrowserClient(
    supabaseUrl,
    supabasePublishableKey
  );
}
