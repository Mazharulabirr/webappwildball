"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import { ensureProfile } from "../../lib/auth/profile";
import "./social-auth.css";
const supabase = createClient();
type Providers = { google: boolean; facebook: boolean; emailConfirmation: boolean };
export default function LoginPage() {
  const router = useRouter();
  const [signup, setSignup] = useState(false), [username, setUsername] = useState(""), [email, setEmail] = useState(""), [password, setPassword] = useState("");
  const [message, setMessage] = useState(""), [loading, setLoading] = useState<string | null>(null), [pendingEmail, setPendingEmail] = useState(""), [cooldown, setCooldown] = useState(0);
  const [providers, setProviders] = useState<Providers | null>(null), [settingsError, setSettingsError] = useState(false);
  const callbackUrl = () => `${window.location.origin}/auth/callback`;
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "signup") setSignup(true);
    const reason = new URLSearchParams(window.location.search).get("auth_error");
    if (reason) {
      setMessage(reason === "cancelled" ? "Sign-in was cancelled or declined. Please try again." : reason === "profile" ? "Your player profile could not be loaded. Please log in again." : "This link has expired or was opened in another browser. Request a new email and open it in this browser.");
      window.history.replaceState(null, "", "/login");
    }
    const controller = new AbortController();
    fetch("/api/auth/providers", { signal: controller.signal }).then(async r => { if (!r.ok) throw new Error("Settings unavailable"); setProviders(await r.json()); }).catch(e => { if (e.name !== "AbortError") setSettingsError(true); });
    return () => controller.abort();
  }, []);
  useEffect(() => { if (!cooldown) return; const timer = window.setTimeout(() => setCooldown(v => v - 1), 1000); return () => window.clearTimeout(timer); }, [cooldown]);
  const socialLogin = async (provider: "google" | "facebook") => {
    setMessage(""); setLoading(provider);
    try { const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: callbackUrl(), scopes: provider === "facebook" ? "email" : undefined } }); if (error) throw error; }
    catch { setMessage("Could not start sign-in. Please try again or use email."); setLoading(null); }
  };
  const resend = async () => {
    setLoading("resend"); setMessage("");
    try { const { error } = await supabase.auth.resend({ type: "signup", email: pendingEmail, options: { emailRedirectTo: callbackUrl() } }); if (error) throw error; setMessage("A fresh confirmation email has been requested. Check your inbox and spam folder."); setCooldown(60); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Could not resend the email. Please try again."); } finally { setLoading(null); }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setMessage(""); const address = email.trim(), handle = username.trim().toLowerCase();
    if (!address || !password || (signup && !handle)) { setMessage("Please fill in every field."); return; }
    if (signup && !/^[a-z0-9._]{3,30}$/.test(handle)) { setMessage("Username must be 3-30 characters: letters, numbers, dots, or underscores."); return; }
    if (signup && password.length < 8) { setMessage("Use a password with at least 8 characters."); return; }
    setLoading("email");
    try {
      if (signup) {
        // Supabase Confirm Email must enforce this beyond the UI too.
        if (!providers?.emailConfirmation) { setMessage("Email signup is temporarily unavailable. Please try again shortly."); return; }
        const { data: taken, error: checkError } = await supabase.from("profiles").select("id").eq("username", handle).maybeSingle();
        if (checkError) throw checkError;
        if (taken) { setMessage("That username is taken. Please choose another one."); return; }
        const { data, error } = await supabase.auth.signUp({ email: address, password, options: { data: { username: handle }, emailRedirectTo: callbackUrl() } });
        if (error) throw error;
        if (data.session) { await supabase.auth.signOut(); throw new Error("Email verification is not ready yet. Please contact support."); }
        setPendingEmail(address); setPassword(""); setCooldown(60);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: address, password });
        if (error) { if (error.code === "email_not_confirmed") { setPendingEmail(address); setMessage("Confirm your email before logging in. You can request another confirmation below."); return; } throw error; }
        if (data.user) await ensureProfile(supabase, data.user);
        router.replace("/"); router.refresh();
      }
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not reach the account service. Please try again."); } finally { setLoading(null); }
  };
  return <main className="login-page"><section className="login-card" aria-busy={!!loading}>
    <a className="login-brand" href="/">WILDBALL <small>MEDIA</small></a><p className="eyebrow">WELCOME TO THE COURT</p>
    <h1>{pendingEmail ? "Check your inbox" : signup ? "Create your account" : "Welcome back"}</h1>
    {pendingEmail ? <div className="email-confirmation"><p>We requested a confirmation link for <strong>{pendingEmail}</strong>. If this address can be registered, an email will arrive shortly.</p><p>Open the link in this browser to verify your email and finish signing up. Check your spam folder too.</p>
      <button type="button" className="resend-email" disabled={!!loading || cooldown > 0} onClick={resend}>{loading === "resend" ? "Sending..." : cooldown ? `Resend email in ${cooldown}s` : "Resend confirmation email"}</button>
      <button type="button" className="login-switch" disabled={!!loading} onClick={() => { setPendingEmail(""); setSignup(false); setMessage(""); }}>Back to login / change email</button></div> : <>
      <p className="login-intro">{signup ? "Join the basketball community." : "Log in to your Wildball profile."}</p>
      <div className="social-auth">{(["google", "facebook"] as const).map(provider => <button type="button" key={provider} className={`social-button ${provider}`} disabled={!!loading || !providers?.[provider]} onClick={() => socialLogin(provider)}><span aria-hidden="true" className="provider-mark">{provider === "google" ? "G" : "f"}</span>{loading === provider ? "Connecting..." : `Continue with ${provider === "google" ? "Google" : "Facebook"}`}{providers && !providers[provider] && <small>Coming soon</small>}</button>)}</div>
      {settingsError && <p className="login-message">Sign-in settings could not load. Refresh this page or log in with email.</p>}
      <div className="auth-divider"><span>or continue with email</span></div><form onSubmit={submit}>
      {signup && <label>Username<input required minLength={3} maxLength={30} value={username} disabled={!!loading} onChange={e => setUsername(e.target.value)} placeholder="your.handle" autoComplete="username" autoCapitalize="none" spellCheck={false}/></label>}
      <label>Email<input required value={email} disabled={!!loading} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@email.com" autoComplete="email"/></label>
      <label>Password<input required minLength={signup ? 8 : undefined} value={password} disabled={!!loading} onChange={e => setPassword(e.target.value)} type="password" placeholder={signup ? "At least 8 characters" : "Your password"} autoComplete={signup ? "new-password" : "current-password"}/></label>
      {signup && <p className="confirmation-note">Verify your email to activate your account.</p>}
      <button type="submit" disabled={!!loading || (signup && !providers?.emailConfirmation)}>{loading === "email" ? "Please wait..." : signup ? "Create account" : "Log in"}</button>
      {signup && providers && !providers.emailConfirmation && <p className="login-message">Email signup is temporarily unavailable while we finish verification setup.</p>}
      </form><button type="button" className="login-switch" disabled={!!loading} onClick={() => { setSignup(v => !v); setMessage(""); }}>{signup ? "Already a member? Log in" : "New here? Create an account"}</button>
    </>}{message && <p className="login-message" role="alert">{message}</p>}<a className="back-home" href="/">Back to Wildball</a>
  </section></main>;
}
