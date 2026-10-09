"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

type Profile = { id:string; username:string; display_name:string|null; bio:string|null; location:string|null; avatar_path:string|null };
const supabase = createClient();

function avatarUrl(path: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState(""), [results, setResults] = useState<Profile[]>([]), [loading, setLoading] = useState(false), [message, setMessage] = useState("");
  const requestId = useRef(0);

  const search = async (raw: string) => {
    const term = raw.trim().replace(/^@+/, "").replace(/[%_,()]/g, " ").trim();
    const currentRequest = ++requestId.current;
    if (!term) { setResults([]); setMessage(""); setLoading(false); return; }
    setLoading(true); setMessage("");
    const { data, error } = await supabase.from("profiles").select("id,username,display_name,bio,location,avatar_path").or(`username.ilike.%${term}%,display_name.ilike.%${term}%`).limit(30);
    if (currentRequest !== requestId.current) return;
    setLoading(false);
    if (error) { setResults([]); setMessage("Could not search players right now. Please try again."); return; }
    const needle = term.toLowerCase();
    const ranked = ((data || []) as Profile[]).sort((a, b) => {
      const score = (p: Profile) => p.username.toLowerCase() === needle ? 0 : p.username.toLowerCase().startsWith(needle) ? 1 : (p.display_name || "").toLowerCase() === needle ? 2 : (p.display_name || "").toLowerCase().startsWith(needle) ? 3 : 4;
      return score(a) - score(b) || a.username.localeCompare(b.username);
    });
    setResults(ranked);
    setMessage(ranked.length ? "" : `No player found for “${term}”.`);
  };

  useEffect(() => { const timer = window.setTimeout(() => void search(query), 250); return () => window.clearTimeout(timer); }, [query]);
  const submit = (event: FormEvent) => { event.preventDefault(); void search(query); };

  return <main className="player-search">
    <header><a href="/" className="search-back">← Back to Wildball</a><span>DISCOVER PLAYERS</span></header>
    <section><p className="search-kicker">FIND YOUR COURT</p><h1>Search players</h1><p className="search-copy">Search anyone by their name or exact <b>@username</b>.</p>
      <form className="player-search-input" onSubmit={submit}><span>⌕</span><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Name or @username" autoComplete="off" spellCheck={false}/><button type="button" onClick={() => setQuery("")} aria-label="Clear search" hidden={!query}>×</button></form>
      {loading && <p className="search-state search-loading"><i/>Searching players…</p>}{message && <p className="search-state">{message}</p>}
      <div className="search-results">{results.map(profile => { const avatar = avatarUrl(profile.avatar_path); return <button key={profile.id} onClick={() => router.push(`/u/${encodeURIComponent(profile.username)}`)}>{avatar ? <img src={avatar} alt=""/> : <span>{(profile.display_name || profile.username)[0].toUpperCase()}</span>}<div><b>{profile.display_name || profile.username}</b><small>@{profile.username}{profile.location ? ` · ${profile.location}` : ""}</small><p>{profile.bio || "Wildball player"}</p></div><em>View profile ›</em></button>; })}</div>
    </section>
  </main>;
}
