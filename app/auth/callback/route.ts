import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { ensureProfile } from "../../../lib/auth/profile";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  // Production redirects must stay on the public HTTPS domain even when a
  // legacy VPS environment variable or reverse-proxy Host contains its IP.
  const configured = new URL(process.env.NODE_ENV === "production"
    ? "https://wildball.io"
    : process.env.NEXT_PUBLIC_SITE_URL || url.origin);
  const host = request.headers?.get("x-forwarded-host")?.split(",")[0].trim() || url.host;
  const allowedHosts = new Set([configured.host]);
  if (["wildball.io", "www.wildball.io"].includes(configured.hostname)) {
    allowedHosts.add("wildball.io"); allowedHosts.add("www.wildball.io");
  }
  // Keep the callback on the initiating host: auth cookies set on www must
  // not be lost by redirecting immediately to the apex domain (or vice versa).
  const origin = allowedHosts.has(host)
    ? `${host === "wildball.io" || host === "www.wildball.io" ? "https:" : configured.protocol}//${host}`
    : configured.origin;
  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?auth_error=${reason}`, origin));
  if (url.searchParams.has("error")) return fail("cancelled");
  const code = url.searchParams.get("code");
  const hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  if (!code && !(hash && (type === "signup" || type === "email"))) return fail("expired");
  try {
    const client = await createClient();
    const result = code ? await client.auth.exchangeCodeForSession(code)
      : await client.auth.verifyOtp({ token_hash: hash!, type: type as "signup" | "email" });
    if (result.error || !result.data.user) return fail("expired");
    await ensureProfile(client, result.data.user);
    return NextResponse.redirect(new URL("/", origin));
  } catch { return fail("profile"); }
}
