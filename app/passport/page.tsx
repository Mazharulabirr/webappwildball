"use client";
import LoadingState from "../loading-state";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

type Profile = { id: string; username: string; display_name: string | null };
type Passport = {
  sport: string; position: string; team_name: string; jersey_number: string; height: string; dominant_hand: string; age_group: string; play_style: string;
  season_games: number; season_points: number; season_rebounds: number; season_assists: number;
  achievements: string[]; awards: string[]; career_history: string[];
};

const emptyPassport: Passport = { sport: "Basketball", position: "", team_name: "", jersey_number: "", height: "", dominant_hand: "", age_group: "", play_style: "", season_games: 0, season_points: 0, season_rebounds: 0, season_assists: 0, achievements: [], awards: [], career_history: [] };
const supabase = createClient();
const toList = (value: string) => value.split("\n").map(item => item.trim()).filter(Boolean);

export default function AthletePassportPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [passport, setPassport] = useState<Passport>(emptyPassport);
  const [lists, setLists] = useState({ achievements: "", awards: "", career_history: "" });
  const [status, setStatus] = useState("Loading your Athlete Passport…");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { void load(); }, []);
  const load = async () => {
    setLoaded(false); setStatus("Loading your Athlete Passport…");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setStatus("You need to log in to edit your Athlete Passport."); router.replace("/login"); return; }
      const { data: player, error: profileError } = await supabase.from("profiles").select("id,username,display_name").eq("id", session.user.id).maybeSingle();
      if (profileError || !player) { setStatus("We could not load your player profile. Please try again."); return; }
      setProfile(player);
      const { data, error } = await supabase.from("athlete_passports").select("*").eq("profile_id", player.id).maybeSingle();
      if (error && error.code !== "PGRST116") { setStatus("Passport setup is pending. Run supabase/athlete-passport.sql first."); return; }
      if (data) {
        const saved = data as Passport;
        setPassport(saved);
        setLists({ achievements: (saved.achievements || []).join("\n"), awards: (saved.awards || []).join("\n"), career_history: (saved.career_history || []).join("\n") });
      }
      setStatus("");
    } catch {
      setStatus("Could not connect to your profile right now. Please try again.");
    } finally { setLoaded(true); }
  };
  const update = <K extends keyof Passport>(key: K, value: Passport[K]) => setPassport(current => ({ ...current, [key]: value }));
  const save = async () => {
    if (!profile) return;
    setSaving(true); setStatus("");
    const payload = { ...passport, profile_id: profile.id, achievements: toList(lists.achievements), awards: toList(lists.awards), career_history: toList(lists.career_history), updated_at: new Date().toISOString() };
    const { error } = await supabase.from("athlete_passports").upsert(payload);
    setSaving(false);
    if (error) { setStatus(error.code === "42P01" ? "Passport setup is pending. Run supabase/athlete-passport.sql first." : error.message); return; }
    setPassport(current => ({ ...current, achievements: payload.achievements, awards: payload.awards, career_history: payload.career_history }));
    setStatus("Athlete Passport saved.");
  };

  if (!profile) return <main className="passport-page">{!loaded?<LoadingState label="Preparing your Athlete Passport"/>:<div className="passport-state"><p>{status}</p><button onClick={()=>void load()}>Try again</button></div>}</main>;
  return <main className="passport-page"><div className="passport-shell">
    <a className="passport-back" href="/profile">← Back to profile</a>
    <header className="passport-header"><p>WILDBALL ATHLETE PASSPORT</p><h1>{profile.display_name || profile.username}</h1><span>@{profile.username} · Keep your athletic story ready to share.</span></header>
    <section className="passport-form">
      <div className="passport-section-title"><div><p>PLAYER CARD</p><h2>On-court identity</h2></div><b>{passport.sport || "Sport"}</b></div>
      <div className="passport-grid four"><label>Sport<input value={passport.sport} maxLength={60} onChange={event => update("sport", event.target.value)} /></label><label>Position<input value={passport.position} maxLength={80} placeholder="e.g. Point Guard" onChange={event => update("position", event.target.value)} /></label><label>Team<input value={passport.team_name} maxLength={120} placeholder="e.g. Wildball Academy" onChange={event => update("team_name", event.target.value)} /></label><label>Jersey no.<input value={passport.jersey_number} maxLength={12} placeholder="e.g. 23" onChange={event => update("jersey_number", event.target.value)} /></label></div>
      <div className="passport-section-title"><div><p>PLAYER SNAPSHOT</p><h2>Scout-ready details</h2></div><small>Optional details for your public card</small></div>
      <div className="passport-grid four"><label>Height<input value={passport.height} maxLength={30} placeholder={"e.g. 6'1\""} onChange={event => update("height", event.target.value)} /></label><label>Dominant hand<input value={passport.dominant_hand} maxLength={30} placeholder="e.g. Right handed" onChange={event => update("dominant_hand", event.target.value)} /></label><label>Age group<input value={passport.age_group} maxLength={60} placeholder="e.g. U18" onChange={event => update("age_group", event.target.value)} /></label><label>Play style<input value={passport.play_style} maxLength={100} placeholder="e.g. Two-way guard" onChange={event => update("play_style", event.target.value)} /></label></div>
      <div className="passport-section-title"><div><p>SEASON STATS</p><h2>Your numbers</h2></div><small>Enter totals for the current season</small></div>
      <div className="passport-grid stats"><label>Games<input type="number" min="0" value={passport.season_games} onChange={event => update("season_games", Math.max(0, Number(event.target.value)))} /></label><label>Points<input type="number" min="0" value={passport.season_points} onChange={event => update("season_points", Math.max(0, Number(event.target.value)))} /></label><label>Rebounds<input type="number" min="0" value={passport.season_rebounds} onChange={event => update("season_rebounds", Math.max(0, Number(event.target.value)))} /></label><label>Assists<input type="number" min="0" value={passport.season_assists} onChange={event => update("season_assists", Math.max(0, Number(event.target.value)))} /></label></div>
      <div className="passport-notes"><label><span>Achievements</span><small>One achievement per line</small><textarea value={lists.achievements} placeholder={"District champion\nTournament MVP"} onChange={event => setLists(current => ({ ...current, achievements: event.target.value }))} /></label><label><span>Awards</span><small>One award per line</small><textarea value={lists.awards} placeholder={"All-Star selection\nBest defensive player"} onChange={event => setLists(current => ({ ...current, awards: event.target.value }))} /></label><label><span>Career history</span><small>One team or season per line</small><textarea value={lists.career_history} placeholder={"2025–present · Wildball Academy\n2023–2025 · City Hoops"} onChange={event => setLists(current => ({ ...current, career_history: event.target.value }))} /></label></div>
      <div className="passport-save"><span>{status}</span><button disabled={saving} onClick={save}>{saving ? "Saving…" : "Save Athlete Passport"}</button></div>
    </section>
  </div></main>;
}
