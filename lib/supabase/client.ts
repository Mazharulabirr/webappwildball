import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  // These are public browser credentials. The fallback keeps the deployed app
  // connected while Vercel environment variables propagate to a new build.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://iuaadtiijverhgyqqzas.supabase.co";
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_X3L_D-TWOWYRv6_UsZhnyQ_eM_2XT0J";

  return createBrowserClient(
    supabaseUrl,
    supabasePublishableKey
  );
}
