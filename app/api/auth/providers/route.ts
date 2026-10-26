import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },
      cache: "no-store", signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error("Auth settings unavailable");
    const settings = await response.json();
    return NextResponse.json({ google: settings.external?.google === true, facebook: settings.external?.facebook === true, emailConfirmation: settings.external?.email === true && settings.disable_signup === false && settings.mailer_autoconfirm === false }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Sign-in settings could not be loaded." }, { status: 503 });
  }
}
