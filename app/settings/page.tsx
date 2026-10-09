"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

const supabase = createClient();
const sections = ["Manage account", "Appearance", "Privacy", "Notifications", "Content preferences", "Screen time", "Accessibility"];

type Settings = {
  private_account: boolean; desktop_notifications: boolean; weekly_updates: boolean; high_contrast: boolean;
  comments_audience: "everyone" | "followers" | "no_one"; region: string; screen_time_minutes: number;
  sleep_hours: string; filtered_keywords: string[];
};
const defaults: Settings = { private_account:false, desktop_notifications:true, weekly_updates:false, high_contrast:false, comments_audience:"everyone", region:"Bangladesh", screen_time_minutes:0, sleep_hours:"off", filtered_keywords:[] };

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return <button type="button" className={value ? "settings-toggle on" : "settings-toggle"} onClick={onChange} aria-pressed={value}><i /></button>;
}

export default function SettingsPage() {
  const router = useRouter();
  const [active, setActive] = useState("Manage account"), [userId, setUserId] = useState(""), [name, setName] = useState("Your account");
  const [settings, setSettings] = useState<Settings>(defaults), [keywords, setKeywords] = useState(""), [notice, setNotice] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const note = (text: string) => { setNotice(text); window.setTimeout(() => setNotice(""), 2600); };

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark-mode") ? "dark" : "light");
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setUserId(user.id);
      const [{ data: profile }, { data: stored, error }] = await Promise.all([
        supabase.from("profiles").select("display_name,username").eq("id", user.id).maybeSingle(),
        supabase.from("user_settings").select("private_account,desktop_notifications,weekly_updates,high_contrast,comments_audience,region,screen_time_minutes,sleep_hours,filtered_keywords").eq("user_id", user.id).maybeSingle()
      ]);
      setName(profile?.display_name || profile?.username || "Your account");
      if (error && error.code !== "PGRST116") note("Run supabase/settings.sql once to activate saved settings.");
      if (stored) { setSettings(stored as Settings); setKeywords((stored.filtered_keywords || []).join(", ")); }
    };
    void load();
  }, [router]);

  const applyTheme = (next: "light" | "dark") => {
    setTheme(next); window.localStorage.setItem("wildball-theme", next);
    document.documentElement.classList.toggle("dark-mode", next === "dark"); document.documentElement.style.colorScheme = next;
    note(next === "dark" ? "Dark mode enabled." : "Light mode enabled.");
  };
  const save = async (next: Settings, message = "Setting saved.") => {
    if (!userId) return; setSettings(next);
    const { error } = await supabase.from("user_settings").upsert({ ...next, user_id:userId, updated_at:new Date().toISOString() });
    if (error) { note(error.message); return; }
    if (next.private_account !== settings.private_account) await supabase.from("profiles").update({ is_private:next.private_account }).eq("id", userId);
    note(message);
  };
  const change = <K extends keyof Settings>(key:K, value:Settings[K], message?:string) => void save({ ...settings, [key]:value }, message);
  const exportData = async () => {
    if (!userId) return;
    const [{data:profile},{data:posts},{data:sent},{data:received}] = await Promise.all([supabase.from("profiles").select("*").eq("id",userId),supabase.from("posts").select("*").eq("author_id",userId),supabase.from("direct_messages").select("*").eq("sender_id",userId),supabase.from("direct_messages").select("*").eq("recipient_id",userId)]);
    const blob = new Blob([JSON.stringify({profile,posts,messages:[...(sent||[]),...(received||[])],exported_at:new Date().toISOString()},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob), link=document.createElement("a"); link.href=url; link.download="wildball-data.json"; link.click(); URL.revokeObjectURL(url); note("Your data download has started.");
  };

  return <main className={`settings-page${settings.high_contrast ? " high-contrast" : ""}`}>
    <header className="settings-top"><a href="/" className="settings-brand">◉ WILDBALL <small>MEDIA</small></a><a href="/" className="settings-close">Back to feed</a></header>
    <div className="settings-layout">
      <aside className="settings-nav"><a href="/" className="settings-back">←</a>{sections.map(item => <button key={item} className={active===item ? "active" : ""} onClick={() => setActive(item)}>{item}</button>)}</aside>
      <section key={active} className="settings-content"><p className="settings-kicker">YOUR WILDBALL</p><h1>{active}</h1>
        {active==="Manage account" && <><div className="settings-block"><h2>Account control</h2><a className="settings-row link-row" href="/profile"><span><b>Account details</b><small>{name}</small></span><em>›</em></a></div><div className="settings-block"><h2>Account information</h2><label className="settings-row static"><span><b>Account region</b><small>Used to personalize your Wildball experience.</small></span><select value={settings.region} onChange={e=>change("region",e.target.value,"Region updated.")}><option>Bangladesh</option><option>India</option><option>United States</option><option>United Kingdom</option></select></label><button className="settings-row" onClick={()=>void exportData()}><span><b>Download your data</b><small>Download your profile, posts, and messages.</small></span><em>›</em></button></div></>}
        {active==="Appearance" && <div className="settings-block appearance-settings"><h2>Color theme</h2><p className="appearance-copy">Choose how Wildball looks on this device.</p><div className="theme-options"><button className={theme==="light" ? "selected" : ""} onClick={()=>applyTheme("light")} aria-pressed={theme==="light"}><i className="theme-preview light-preview"/><span><b>Light</b><small>Bright background</small></span><em>{theme==="light" ? "✓" : ""}</em></button><button className={theme==="dark" ? "selected" : ""} onClick={()=>applyTheme("dark")} aria-pressed={theme==="dark"}><i className="theme-preview dark-preview"/><span><b>Dark</b><small>Easy on the eyes</small></span><em>{theme==="dark" ? "✓" : ""}</em></button></div></div>}
        {active==="Privacy" && <><div className="settings-block"><h2>Discoverability</h2><div className="settings-row static"><span><b>Private account</b><small>Only approved followers should view your videos.</small></span><Toggle value={settings.private_account} onChange={()=>change("private_account",!settings.private_account,"Privacy preference saved.")}/></div></div><div className="settings-block"><h2>Interactions</h2><label className="settings-row static"><span><b>Comments</b><small>Choose who can comment on your posts.</small></span><select value={settings.comments_audience} onChange={e=>change("comments_audience",e.target.value as Settings["comments_audience"])}><option value="everyone">Everyone</option><option value="followers">Followers</option><option value="no_one">No one</option></select></label><div className="settings-row static"><span><b>Direct messages</b><small>Everyone on Wildball can message you.</small></span><em>Everyone</em></div></div></>}
        {active==="Notifications" && <div className="settings-block"><h2>Push notifications</h2><div className="settings-row static"><span><b>Desktop notifications</b><small>Get alerts for new follows, comments, and messages.</small></span><Toggle value={settings.desktop_notifications} onChange={()=>change("desktop_notifications",!settings.desktop_notifications)}/></div><div className="settings-row static"><span><b>Weekly updates</b><small>Get a weekly recap of your Wildball activity.</small></span><Toggle value={settings.weekly_updates} onChange={()=>change("weekly_updates",!settings.weekly_updates)}/></div></div>}
        {active==="Content preferences" && <div className="settings-block"><h2>What you see</h2><label className="keyword-field"><b>Filter keywords</b><small>Separate words with commas. We will save this preference for your feed.</small><input value={keywords} onChange={e=>setKeywords(e.target.value)} placeholder="e.g. spoilers, trades"/></label><button className="settings-save" onClick={()=>change("filtered_keywords",keywords.split(",").map(word=>word.trim()).filter(Boolean),"Keyword filters saved.")}>Save keywords</button></div>}
        {active==="Screen time" && <div className="settings-block"><h2>Healthy court time</h2><label className="settings-row static"><span><b>Daily screen time</b><small>Get a reminder after your chosen limit.</small></span><select value={settings.screen_time_minutes} onChange={e=>change("screen_time_minutes",Number(e.target.value),"Screen-time limit saved.")}><option value={0}>Off</option><option value={30}>30 minutes</option><option value={60}>1 hour</option><option value={120}>2 hours</option><option value={180}>3 hours</option></select></label><label className="settings-row static"><span><b>Sleep hours</b><small>Mute notifications during your rest time.</small></span><select value={settings.sleep_hours} onChange={e=>change("sleep_hours",e.target.value,"Sleep hours saved.")}><option value="off">Off</option><option value="22-07">10 PM – 7 AM</option><option value="23-08">11 PM – 8 AM</option></select></label></div>}
        {active==="Accessibility" && <div className="settings-block"><h2>Display</h2><div className="settings-row static"><span><b>Increase color contrast</b><small>Make buttons and text easier to distinguish.</small></span><Toggle value={settings.high_contrast} onChange={()=>change("high_contrast",!settings.high_contrast,"Contrast preference saved.")}/></div></div>}
      </section>
    </div>{notice && <p className="settings-notice">{notice}</p>}
  </main>;
}
