"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

const supabase = createClient();

export default function LoginPage() {
  const router = useRouter();
  const [signup, setSignup] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    if (!email || !password || (signup && !username)) { setMessage("Please fill in every field."); return; }
    if (signup && !/^[a-z0-9._]{3,30}$/.test(username.trim().toLowerCase())) { setMessage("Username must be 3–30 characters: letters, numbers, dots, or underscores."); return; }
    if (password.length < 6) { setMessage("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      if (signup) {
        const handle = username.trim().toLowerCase();
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { username: handle }, emailRedirectTo: `${window.location.origin}/` } });
        if (error) { setMessage(error.message); return; }
        if (data.user && data.session) await supabase.from("profiles").upsert({ id: data.user.id, username: handle, display_name: username.trim() });
        setMessage(data.session ? "Account created. Redirecting you home…" : "Account created. Check your email, confirm your account, then log in.");
        if (data.session) window.setTimeout(() => router.replace("/"), 700);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) { setMessage(error.message); return; }
        if (data.user) {
          const handle = ((data.user.user_metadata.username as string | undefined) || email.split("@")[0]).toLowerCase().replace(/[^a-z0-9._]/g, "").slice(0, 24) || "hooper";
          await supabase.from("profiles").upsert({ id: data.user.id, username: handle, display_name: handle }, { onConflict: "id", ignoreDuplicates: true });
        }
        router.replace("/");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not reach the account service. Please try again.");
    } finally { setLoading(false); }
  };

  return <main className="login-page"><section className="login-card"><a className="login-brand" href="/">WILDBALL <small>MEDIA</small></a><p className="eyebrow">WELCOME TO THE COURT</p><h1>{signup ? "Create your account" : "Welcome back"}</h1><p className="login-intro">{signup ? "Join the basketball community." : "Log in to your Wildball profile."}</p><form onSubmit={submit}>{signup && <label>Username<input value={username} onChange={e => setUsername(e.target.value)} placeholder="your.handle" autoComplete="username"/></label>}<label>Email<input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@email.com" autoComplete="email"/></label><label>Password<input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="At least 6 characters" autoComplete={signup ? "new-password" : "current-password"}/></label>{message && <p className="login-message" role="alert">{message}</p>}<button type="submit" disabled={loading}>{loading ? "Please wait…" : signup ? "Create account" : "Log in"}</button></form><button className="login-switch" onClick={() => { setSignup(value => !value); setMessage(""); }}>{signup ? "Already a member? Log in" : "New here? Create an account"}</button><a className="back-home" href="/">← Back to Wildball</a></section></main>;
}
