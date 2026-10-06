"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../../lib/supabase/client";

type Profile = { id: string; username: string; display_name: string | null; bio: string | null; location: string | null };
type Post = { id: string; caption: string; poster_path: string | null; video_path: string; created_at: string };
const supabase = createClient();

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null); const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]); const [stats, setStats] = useState({ following: 0, followers: 0, likes: 0 });
  const [editing, setEditing] = useState(false); const [draft, setDraft] = useState({ display_name: "", bio: "", location: "" }); const [message, setMessage] = useState("");
  useEffect(() => { void load(); }, []);
  const load = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) { router.replace("/login"); return; } setUser(currentUser);
    const { data: profileData } = await supabase.from("profiles").select("id, username, display_name, bio, location").eq("id", currentUser.id).maybeSingle();
    if (!profileData) { setMessage("Your profile is being created. Please refresh once."); return; }
    setProfile(profileData); setDraft({ display_name: profileData.display_name || "", bio: profileData.bio || "", location: profileData.location || "" });
    const { data: postData } = await supabase.from("posts").select("id, caption, poster_path, video_path, created_at").eq("author_id", currentUser.id).order("created_at", { ascending: false });
    const ownPosts = postData || []; setPosts(ownPosts);
    const [{ count: following }, { count: followers }] = await Promise.all([supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", currentUser.id), supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", currentUser.id)]);
    const { count: likes } = ownPosts.length ? await supabase.from("post_likes").select("*", { count: "exact", head: true }).in("post_id", ownPosts.map(post => post.id)) : { count: 0 };
    setStats({ following: following || 0, followers: followers || 0, likes: likes || 0 });
  };
  const save = async () => { if (!user) return; const { data, error } = await supabase.from("profiles").update(draft).eq("id", user.id).select("id, username, display_name, bio, location").single(); if (error) { setMessage(error.message); return; } setProfile(data); setEditing(false); setMessage("Profile saved."); };
  if (!profile) return <main className="real-profile"><p>{message || "Loading your profile…"}</p></main>;
  return <main className="real-profile"><a href="/" className="back-home">← Back to Wildball</a><section className="real-profile-card"><div className="real-avatar">{(profile.display_name || profile.username)[0].toUpperCase()}</div><div><p className="eyebrow">YOUR PROFILE</p><h1>{profile.display_name || profile.username}</h1><p>@{profile.username}{profile.location ? ` · ${profile.location}` : ""}</p><button onClick={() => setEditing(value => !value)}>{editing ? "Cancel" : "Edit profile"}</button></div></section>{editing && <section className="real-editor"><label>Name<input value={draft.display_name} onChange={event => setDraft({ ...draft, display_name: event.target.value })}/></label><label>Location<input value={draft.location} onChange={event => setDraft({ ...draft, location: event.target.value })}/></label><label>Bio<textarea value={draft.bio} onChange={event => setDraft({ ...draft, bio: event.target.value })}/></label><button onClick={save}>Save profile</button></section>}<p className="real-bio">{profile.bio || "Add a bio so hoopers know your game."}</p><div className="real-stats"><div><b>{stats.following}</b><span>Following</span></div><div><b>{stats.followers}</b><span>Followers</span></div><div><b>{stats.likes}</b><span>Likes</span></div></div><section className="real-posts"><h2>Your posts</h2>{posts.length ? <div className="real-grid">{posts.map(post => <article key={post.id}>{post.poster_path ? <img src={post.poster_path} alt="Post cover"/> : <video src={post.video_path} controls playsInline preload="metadata"/>}<p>{post.caption || "Untitled post"}</p></article>)}</div> : <p className="empty-real">No posts yet. Your future uploads will appear here.</p>}</section>{message && <p className="login-message">{message}</p>}</main>;
}
