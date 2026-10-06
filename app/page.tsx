"use client";

import { useEffect, useState } from "react";
import { createClient as createSupabaseClient } from "../lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type IconName = "ball" | "home" | "people" | "search" | "live" | "plus" | "heart" | "comment" | "share" | "more" | "volume" | "profile" | "inbox";
type Profile = { id: string; username: string; display_name: string | null; bio: string | null; location: string | null; avatar_path: string | null };
type LivePost = { id: string; author_id: string; caption: string; video_path: string; poster_path: string | null; created_at: string; author?: { username: string; display_name: string | null } };
type DemoProfile = Pick<Profile, "id" | "username" | "display_name" | "location">;
const paths: Record<IconName, string> = {
  ball: '<circle cx="12" cy="12" r="8.5"/><path d="M3.8 12h16.4M12 3.5c2.6 2.3 3.8 5.2 3.8 8.5S14.6 18.2 12 20.5M12 3.5C9.4 5.8 8.2 8.7 8.2 12s1.2 6.2 3.8 8.5"/>',
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z"/>',
  people: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  live: '<path d="M7 4h10l3 4v8l-3 4H7l-3-4V8Z"/><path d="M10 9.5 15 12l-5 2.5Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  heart: '<path d="M20.8 8.8c0 5.7-8.8 10.5-8.8 10.5S3.2 14.5 3.2 8.8A4.8 4.8 0 0 1 12 6a4.8 4.8 0 0 1 8.8 2.8Z"/>',
  comment: '<path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.5 8.5 0 0 1-3.5-.8L4 20l1.5-4A7.3 7.3 0 0 1 4 11.5 7.5 7.5 0 0 1 12 4a7.5 7.5 0 0 1 8 7.5Z"/>',
  share: '<path d="m12 4 7 7-7 7M5 12h13"/>', more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  volume: '<path d="M5 10h3l4-3v10l-4-3H5Z"/><path d="M16 9a4.2 4.2 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',
  profile: '<circle cx="12" cy="8" r="3.5"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>', inbox: '<path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.5 8.5 0 0 1-3.5-.8L4 20l1.5-4A7.3 7.3 0 0 1 4 11.5 7.5 7.5 0 0 1 12 4a7.5 7.5 0 0 1 8 7.5Z"/>'
};
function Icon({ name, className = "" }: { name: IconName; className?: string }) { return <svg className={`icon ${className}`} viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: paths[name] }} />; }

const base = [
  ["marcus.mp4", "Brooklyn, NY", "11", "THIS IS WHY WE PLAY OUTSIDE.", "Last light at the park. Nothing but net.", "#streetball #hoopculture", "HOOPS AFTER DARK"],
  ["ria.lanes", "Los Angeles, CA", "47", "THE MIDDY IS ALIVE.", "Footwork first. Buckets second.", "#wnba #bucketculture", "FILM ROOM"],
  ["thepaintisopen", "Chicago, IL", "25", "GIVE HIM THE LANE.", "A quick cut from today’s open run.", "#chicagobasketball", "OPEN RUN"],
  ["treyhandles", "Atlanta, GA", "33", "NO LOOK. ALL FEEL.", "When the pass finds the moment.", "#pointguard #handles", "PARK TAKEOVER"],
  ["coachk", "Queens, NY", "12", "THE WORK IS QUIET.", "Every rep has a receipt.", "#basketballtraining #lockedin", "MORNING RUN"],
  ["sonia.a", "Seattle, WA", "44", "ONE MORE POSSESSION.", "The whole gym got louder after this.", "#womensbasketball #gametime", "GAME NIGHT"]
];
const covers = ["hero", "dunk", "sunset", "arena"];
const clips = ["street-dribble", "outdoor-practice", "court-action", "indoor-dribble", "indoor-training"];

export default function Home() {
  const [composer, setComposer] = useState(false), [profile, setProfile] = useState(false), [auth, setAuth] = useState<"login" | "signup" | null>(null);
  const [liked, setLiked] = useState<number[]>([]), [following, setFollowing] = useState<string[]>([]), [toast, setToast] = useState("");
  const [activeFeed, setActiveFeed] = useState<"for-you" | "following" | "explore">("for-you");
  const [supabase] = useState(() => createSupabaseClient());
  const [user, setUser] = useState<User | null>(null);
  const [profileData, setProfileData] = useState<Profile | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ display_name: "", bio: "", location: "" });
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null), [postCaption, setPostCaption] = useState(""), [uploading, setUploading] = useState(false), [livePosts, setLivePosts] = useState<LivePost[]>([]), [demoProfiles, setDemoProfiles] = useState<DemoProfile[]>([]);
  const note = (text: string) => { setToast(text); window.setTimeout(() => setToast(""), 2200); };
  const toggleFollow = (name: string) => setFollowing(old => old.includes(name) ? old.filter(x => x !== name) : [...old, name]);
  const toggleDemoFollow = async (demo: DemoProfile) => {
    if (!user) { note("Log in to follow a player"); openAuth(); return; }
    const alreadyFollowing = following.includes(demo.username);
    const request = alreadyFollowing
      ? supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", demo.id)
      : supabase.from("follows").insert({ follower_id: user.id, following_id: demo.id });
    const { error } = await request;
    if (error) { note(error.message); return; }
    setFollowing(old => alreadyFollowing ? old.filter(name => name !== demo.username) : [...old, demo.username]);
    note(alreadyFollowing ? `Unfollowed @${demo.username}` : `Following @${demo.username}`);
  };
  const toggleLike = (i: number) => setLiked(old => old.includes(i) ? old.filter(x => x !== i) : [...old, i]);
  const openAuth = () => { window.location.assign("/login"); };
  const loadLivePosts = async () => {
    const { data: postData } = await supabase.from("posts").select("id, author_id, caption, video_path, poster_path, created_at").eq("status", "published").order("created_at", { ascending: false }).limit(30);
    const posts = (postData || []) as LivePost[];
    const authorIds = [...new Set(posts.map(post => post.author_id))];
    if (!authorIds.length) { setLivePosts([]); return; }
    const { data: authors } = await supabase.from("profiles").select("id, username, display_name").in("id", authorIds);
    const authorMap = new Map((authors || []).map(author => [author.id, author]));
    setLivePosts(posts.map(post => ({ ...post, author: authorMap.get(post.author_id) })));
  };
  const loadDemoProfiles = async () => {
    const { data } = await supabase.from("profiles").select("id, username, display_name, location").like("username", "courtvision%").order("username", { ascending: true }).limit(10);
    setDemoProfiles((data || []) as DemoProfile[]);
  };
  const publishPost = async () => {
    if (!user) { note("Log in to post a video"); openAuth(); return; }
    if (!selectedVideo) { note("Choose a video first"); return; }
    if (!selectedVideo.type.startsWith("video/")) { note("Please choose an MP4, MOV, or WEBM video"); return; }
    if (selectedVideo.size > 524288000) { note("Video must be 500 MB or smaller"); return; }
    setUploading(true);
    const safeName = selectedVideo.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const storagePath = `${user.id}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("videos").upload(storagePath, selectedVideo, { contentType: selectedVideo.type, upsert: false });
    if (uploadError) { setUploading(false); note(uploadError.message); return; }
    const { data: publicUrl } = supabase.storage.from("videos").getPublicUrl(storagePath);
    const { data: post, error: postError } = await supabase.from("posts").insert({ author_id: user.id, caption: postCaption.trim(), video_path: publicUrl.publicUrl, status: "published" }).select("id, author_id, caption, video_path, poster_path, created_at").single();
    setUploading(false);
    if (postError) { note(postError.message); return; }
    setLivePosts(current => [{ ...post, author: { username: profileData?.username || "you", display_name: profileData?.display_name || "You" } }, ...current]);
    setSelectedVideo(null); setPostCaption(""); setComposer(false); note("Video posted to Wildball!");
  };
  useEffect(() => {
    const loadProfile = async (currentUser: User | null) => {
      if (!currentUser) { setProfileData(null); return; }
      const { data } = await supabase.from("profiles").select("id, username, display_name, bio, location, avatar_path").eq("id", currentUser.id).maybeSingle();
      if (data) { setProfileData(data); return; }
      const base = ((currentUser.user_metadata.username as string | undefined) || currentUser.email?.split("@")[0] || "hooper").toLowerCase().replace(/[^a-z0-9._]/g, "").slice(0, 24);
      const username = `${base || "hooper"}_${currentUser.id.slice(0, 5)}`;
      const { data: created } = await supabase.from("profiles").upsert({ id: currentUser.id, username, display_name: base || "Wildball hooper" }).select("id, username, display_name, bio, location, avatar_path").single();
      setProfileData(created ?? null);
    };
    supabase.auth.getUser().then(({ data }) => { setUser(data.user); void loadProfile(data.user); });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user ?? null); void loadProfile(session?.user ?? null); });
    return () => subscription.subscription.unsubscribe();
  }, [supabase]);
  useEffect(() => { void loadLivePosts(); void loadDemoProfiles(); }, [supabase]);
  useEffect(() => {
    const loadFollowedDemoProfiles = async () => {
      if (!user || !demoProfiles.length) return;
      const demoById = new Map(demoProfiles.map(demo => [demo.id, demo.username]));
      const { data } = await supabase.from("follows").select("following_id").eq("follower_id", user.id).in("following_id", [...demoById.keys()]);
      setFollowing((data || []).map(row => demoById.get(row.following_id)).filter((name): name is string => Boolean(name)));
    };
    void loadFollowedDemoProfiles();
  }, [demoProfiles, supabase, user]);
  const submitAuth = async (email: string, password: string, username: string): Promise<string> => {
    if (auth === "signup") {
      const normalizedUsername = username.trim().toLowerCase();
      if (!/^[a-z0-9._]{3,30}$/.test(normalizedUsername)) return "Username must be 3–30 characters: letters, numbers, dots, or underscores.";
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { username: normalizedUsername }, emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/` } });
      if (error) return error.message;
      if (data.user && data.session) {
        const { error: profileError } = await supabase.from("profiles").upsert({ id: data.user.id, username: normalizedUsername, display_name: username.trim() });
        if (profileError) return profileError.message;
      }
      return data.session ? "Account created — welcome to Wildball!" : "Account created. Check your email to confirm it.";
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return error.message;
    if (data.user) {
      const username = (data.user.user_metadata.username as string | undefined) || email.split("@")[0].replace(/[^a-z0-9._]/gi, "").toLowerCase().slice(0, 30);
      await supabase.from("profiles").upsert({ id: data.user.id, username, display_name: username }, { onConflict: "id", ignoreDuplicates: true });
    }
    return "Welcome back to Wildball!";
  };
  const saveProfile = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("profiles").update(profileDraft).eq("id", user.id).select("id, username, display_name, bio, location, avatar_path").single();
    if (error) { note(error.message); return; }
    setProfileData(data); setEditingProfile(false); note("Profile updated!");
  };
  const selectFeed = (feed: "for-you" | "following" | "explore") => {
    setActiveFeed(feed);
    note(feed === "for-you" ? "Your curated feed is ready" : feed === "following" ? "Showing creators you follow" : "Explore the Wildball community");
  };
  const posts = activeFeed === "following"
    ? Array.from({ length: 12 }, (_, i) => ({ post: base[i % base.length], index: i })).filter(({ post }) => following.includes(post[0]))
    : activeFeed === "explore"
      ? Array.from({ length: 12 }, (_, i) => ({ post: base[(i + 2) % base.length], index: i + 20 }))
      : Array.from({ length: 12 }, (_, i) => ({ post: base[i % base.length], index: i }));

  return <>
    <div className="shell">
      <aside>
        <a className="logo" href="#feed"><Icon name="ball" className="icon-brand"/><span>WILDBALL<small>MEDIA</small></span></a>
        <nav><button className={activeFeed === "for-you" ? "selected" : ""} onClick={() => selectFeed("for-you")}><Icon name="home"/>For you</button><button className={activeFeed === "following" ? "selected" : ""} onClick={() => selectFeed("following")}><Icon name="people"/>Following</button><button className={activeFeed === "explore" ? "selected" : ""} onClick={() => selectFeed("explore")}><Icon name="search"/>Explore</button><button onClick={() => note("Live games are coming soon")}><Icon name="live"/>Live <i>3</i></button></nav>
        <button className="create" onClick={() => setComposer(true)}><Icon name="plus"/>Create a post</button>
        <p className="label">YOUR LEAGUES</p><div className="leagues">{["NBA", "WNBA", "College"].map(x => <button key={x} onClick={() => note(`${x} league selected`)}><b></b>{x}</button>)}</div>
        <button className="account" onClick={() => window.location.assign("/profile")}><span>{(profileData?.display_name || profileData?.username || user?.email || "M")[0].toUpperCase()}</span><strong>{profileData?.display_name || profileData?.username || "Your profile"}<small>{profileData ? `@${profileData.username}` : "Sign in to continue"}</small></strong><Icon name="more" className="icon-more"/></button><button className="login" onClick={user ? async () => { await supabase.auth.signOut(); note("Logged out"); } : openAuth}>{user ? "Log out" : "Log in"}</button>
      </aside>
      <main>
        <header><a className="mobile-logo" aria-label="Wildball home">W<span>•</span>B</a><div className="tabs"><button className={activeFeed === "for-you" ? "selected" : ""} onClick={() => selectFeed("for-you")}>FOR YOU</button><button className={activeFeed === "following" ? "selected" : ""} onClick={() => selectFeed("following")}>FOLLOWING</button></div><button className="search" aria-label="Search" onClick={() => selectFeed("explore")}><Icon name="search"/></button><button className="mobile-auth" onClick={openAuth}>Log in</button></header>
        <section className="stories"><button className="story" onClick={() => setComposer(true)}><span>+</span>Your story</button>{[12,32,47,49,44].map((n, i) => <button className="story" key={n} onClick={() => note("Story opened")}><img src={`https://i.pravatar.cc/100?img=${n}`} alt="Community member"/>{["coachk","kyl.v","ariahoops","jamal","sonia.a"][i]}</button>)}</section>
        <section id="feed">{activeFeed === "following" && posts.length === 0 && <div className="empty-feed"><Icon name="people"/><h1>Build your court.</h1><p>Follow hoopers from the right rail to see their clips here.</p><button onClick={() => selectFeed("explore")}>Explore players</button></div>}{activeFeed === "explore" && <div className="feed-heading"><small>DISCOVER THE COURT</small><h1>Explore</h1><p>Fresh clips and conversations from the Wildball community.</p></div>}{posts.map(({ post: p, index: i }) => { const isLiked = liked.includes(i), isFollowing = following.includes(p[0]); return <div key={i}>
          <article className={`post post-${i % 5} photo`}><div className="art"><i></i><b>●</b></div><video className="hero" autoPlay loop muted playsInline preload="metadata" poster={`/assets/wildball-${covers[i % 4]}.png`} aria-label="Basketball action video"><source src={`/videos/${clips[i % clips.length]}.mp4`} type="video/mp4"/></video><div className="veil"></div><small className="tag"><span></span>{p[6]}</small><button className="sound" aria-label="Toggle sound" onClick={() => note("Clips play muted for now")}><Icon name="volume"/></button>
            <div className="copy"><div className="creator"><img src={`https://i.pravatar.cc/80?img=${p[2]}`} alt={p[0]}/><span><b>{p[0]}</b><small>{p[1]}</small></span><button className={`follow ${isFollowing ? "on" : ""}`} onClick={() => toggleFollow(p[0])}>{isFollowing ? "Following" : "Follow"}</button></div><h1>{p[3]} <em><Icon name="ball"/></em></h1><p>{p[4]} <b>{p[5]}</b></p><button className="audio" onClick={() => note("Original sound selected")}><Icon name="volume"/>original sound · {p[0]}</button></div>
            <div className="actions"><button className="creator-action" aria-label={`Follow ${p[0]}`} onClick={() => toggleFollow(p[0])}><img src={`https://i.pravatar.cc/80?img=${p[2]}`} alt=""/><i><Icon name="plus"/></i></button><button className={`like ${isLiked ? "liked" : ""}`} aria-label="Like post" onClick={() => toggleLike(i)}><strong><Icon name="heart"/></strong><small>{8 + i * 3}.{i % 9}K</small></button><button className="comment" aria-label="Comment" onClick={() => setComposer(true)}><strong><Icon name="comment"/></strong><small>{117 + i * 83}</small></button><button className="share" aria-label="Share post" onClick={() => { navigator.clipboard?.writeText(location.href); note("Link copied — ready to share"); }}><strong><Icon name="share"/></strong><small>Share</small></button><button className="more-action" aria-label="More options" onClick={() => note("More options opened")}><strong><Icon name="more"/></strong></button></div><div className="progress"><span></span></div>
          </article>{activeFeed !== "following" && (i === 1 || i === 4) && <article className="ad"><div><small>SPONSORED · HARDWOOD HUSTLE</small><h1>Made for the last run.</h1><p>For the ones who stay late.</p></div><b>●</b><button onClick={() => note("Shop link opened")}>Shop ↗</button></article>}</div>; })}</section>
        {activeFeed !== "following" && livePosts.length > 0 && <section className="live-feed demo-feed"><h2>Fresh from demo hoopers</h2>{livePosts.map(post => <article className="live-post" key={post.id}><video src={post.video_path} controls playsInline preload="metadata" poster={post.poster_path || undefined}/><div><b>{post.author?.display_name || post.author?.username || "Wildball hooper"}</b><small>@{post.author?.username || "wildball"}</small><p>{post.caption}</p></div></article>)}</section>}
      </main>
      <aside className="right"><div className="online"><span></span>12,843 hoopers online</div><section><h2>Trending now <button onClick={() => note("All trends opened")}>See all</button></h2>{["# WNBAPlayoffs", "# InMyBag", "# DunkOfTheDay"].map((x, i) => <button className="trend" key={x} onClick={() => note(`${x} selected`)}><b>{x}</b><small>{["48.2K", "32.1K", "18.7K"][i]} posts ↗</small></button>)}</section><section><h2>Players to follow <button onClick={() => note("Suggestions opened")}>See all</button></h2>{demoProfiles.length ? demoProfiles.map((demo, i) => <div className="person" key={demo.id} role="link" tabIndex={0} onClick={() => window.location.assign(`/u/${demo.username}`)} onKeyDown={event => { if (event.key === "Enter") window.location.assign(`/u/${demo.username}`); }}><img src={`https://i.pravatar.cc/100?img=${(i + 11) % 70}`} alt={demo.username}/><span><b>{demo.username}</b><small>{demo.location || "Wildball demo hooper"}</small></span><button className={`follow ${following.includes(demo.username) ? "on" : ""}`} onClick={event => { event.stopPropagation(); void toggleDemoFollow(demo); }}>{following.includes(demo.username) ? "Following" : "Follow"}</button></div>) : <p className="empty-real">Loading demo hoopers…</p>}</section><footer>About · Newsroom · Careers · Help<br/>Community Guidelines · Privacy<br/><br/>© 2026 WILDBALL MEDIA</footer></aside>
    </div>
    <nav className="bottom"><button aria-label="Home" onClick={() => selectFeed("for-you")}><Icon name="home"/><small>Home</small></button><button aria-label="Explore" onClick={() => selectFeed("explore")}><Icon name="search"/><small>Explore</small></button><button className="add" aria-label="Create post" onClick={() => setComposer(true)}><Icon name="plus"/></button><button aria-label="Inbox" onClick={() => note("Inbox opened")}><Icon name="inbox"/><small>Inbox</small></button><button aria-label="Profile" onClick={() => window.location.assign("/profile")}><Icon name="profile"/><small>Profile</small></button></nav>
    {composer && <div className="modal-backdrop"><div className="composer"><button className="close" onClick={() => setComposer(false)} aria-label="Close">×</button><p>CREATE A WILDBALL</p><h1>What&apos;s good on the court?</h1><label><Icon name="plus"/><span><b>{selectedVideo ? selectedVideo.name : "Choose a clip"}</b><small>MP4, MOV or WEBM · up to 500 MB</small></span><input type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={event => setSelectedVideo(event.target.files?.[0] || null)}/></label><textarea value={postCaption} onChange={event => setPostCaption(event.target.value)} maxLength={2200} placeholder="Tell the story..."></textarea><div><button type="button" onClick={() => note("Sound tools are coming soon")}>Add sound</button><button type="button" onClick={() => note("Tagging is coming soon")}>@ Tag people</button></div><button className="publish" disabled={uploading} onClick={publishPost}>{uploading ? "Uploading…" : "Post to Wildball →"}</button></div></div>}
    {profile && <div id="profile-view" className="open" onClick={e => e.currentTarget === e.target && setProfile(false)}><div className="profile-sheet"><button className="profile-close" onClick={() => setProfile(false)} aria-label="Close profile">×</button><div className="profile-head"><div className="profile-avatar">{(profileData?.display_name || profileData?.username || "M")[0].toUpperCase()}</div><div><h1>{profileData?.display_name || profileData?.username || "mika.runs"} {user && <span>✓</span>}</h1><p>{profileData ? `@${profileData.username} · ${profileData.location || "Add your location"}` : "Sign in to view your profile"}</p><button className="edit-profile" onClick={() => { if (!user) return openAuth(); setProfileDraft({ display_name: profileData?.display_name || "", bio: profileData?.bio || "", location: profileData?.location || "" }); setEditingProfile(true); }}>{user ? "Edit profile" : "Log in / Sign up"}</button></div></div>{editingProfile ? <div className="profile-editor"><label>Name<input value={profileDraft.display_name} onChange={e => setProfileDraft(d => ({ ...d, display_name: e.target.value }))}/></label><label>Location<input value={profileDraft.location} onChange={e => setProfileDraft(d => ({ ...d, location: e.target.value }))}/></label><label>Bio<textarea value={profileDraft.bio} onChange={e => setProfileDraft(d => ({ ...d, bio: e.target.value }))}/></label><button onClick={saveProfile}>Save profile</button><button className="cancel" onClick={() => setEditingProfile(false)}>Cancel</button></div> : <><p className="bio">{profileData?.bio || "Basketball, stories & the culture around the court."}<br/><b>#WildballCreator</b></p><div className="profile-stats">{[["128","Following"],["14.8K","Followers"],["392K","Likes"]].map(([a,b]) => <button key={b}><strong>{a}</strong><small>{b}</small></button>)}</div><div className="profile-tabs"><button className="active">Posts</button><button>Liked</button></div><div className="profile-grid">{Array.from({length:9}, (_,i) => <button key={i} onClick={() => note("Opening your post")}><img src={`/assets/wildball-${covers[i % 4]}.png`} alt="Uploaded basketball clip"/><span>▶ <b>{12 + i * 3}.{i}K</b></span></button>)}</div></>}</div></div>}
    {auth && <div id="auth-view" className={`open ${auth === "signup" ? "signup" : ""}`}><div className="auth-card"><button className="auth-close" onClick={() => setAuth(null)} aria-label="Close">×</button><div className="auth-brand"><Icon name="ball" className="icon-brand"/> WILDBALL <small>MEDIA</small></div><div className="auth-copy"><p>WELCOME TO THE COURT</p><h1>Basketball<br/>lives here.</h1><span>Watch, post and share the game with your people.</span></div><AuthForm signup={auth === "signup"} switchMode={() => setAuth(auth === "signup" ? "login" : "signup")} submit={async (email, password, username) => { const message = await submitAuth(email, password, username); note(message); if (message.startsWith("Account created") || message.startsWith("Welcome back")) setAuth(null); return message; }}/></div></div>}
    <div id="toast" className={toast ? "show" : ""}>{toast}</div>
  </>;
}

function AuthForm({ signup, switchMode, submit }: { signup: boolean; switchMode: () => void; submit: (email: string, password: string, username: string) => Promise<string> }) {
  const [email, setEmail] = useState(""), [password, setPassword] = useState(""), [username, setUsername] = useState(""), [loading, setLoading] = useState(false), [error, setError] = useState("");
  const handleSubmit = async () => {
    if (!email || !password || (signup && !username)) { setError("Please fill in every field."); return; }
    if (signup && password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setError(""); setLoading(true);
    try {
      const message = await submit(email, password, username);
      if (!message.startsWith("Account created") && !message.startsWith("Welcome back")) setError(message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not reach the account service. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  return <div className="auth-form"><h2>{signup ? "Create account" : "Log in"}</h2><p>{signup ? "Join the Wildball community." : "Welcome back to Wildball."}</p>{signup && <label>Username<input value={username} onChange={e => setUsername(e.target.value)} placeholder="your.handle" autoComplete="username"/></label>}<label>Email<input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@email.com" autoComplete="email"/></label><label>Password<input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder={signup ? "Create a password" : "Password"} autoComplete={signup ? "new-password" : "current-password"}/></label>{error && <p className="auth-error" role="alert">{error}</p>}<button className="auth-submit" disabled={loading} onClick={handleSubmit}>{loading ? "Please wait..." : signup ? "Create account" : "Log in"}</button><button className="auth-switch" onClick={() => { setError(""); switchMode(); }}>{signup ? <>Already a member? <b>Log in</b></> : <>New here? <b>Create an account</b></>}</button></div>;
}
