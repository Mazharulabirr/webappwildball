"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";

type Profile = { id: string; username: string; display_name: string | null; bio: string | null; location: string | null };
type Post = { id: string; caption: string; poster_path: string | null; video_path: string; created_at: string };
type Stats = { following: number; followers: number; likes: number };
const supabase = createClient();
const formatCount = (value: number) => value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K` : String(value);

export default function PublicProfilePage() {
  const params = useParams<{ username: string }>();
  const username = decodeURIComponent(params.username || "").toLowerCase();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<Stats>({ following: 0, followers: 0, likes: 0 });
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageDraft, setMessageDraft] = useState("");
  const [notice, setNotice] = useState("");
  const notify = (text: string) => { setNotice(text); window.setTimeout(() => setNotice(""), 2400); };

  useEffect(() => {
    const load = async () => {
      const { data: profileData } = await supabase.from("profiles").select("id, username, display_name, bio, location").eq("username", username).maybeSingle();
      if (!profileData) { setNotice("This player profile was not found."); return; }
      setProfile(profileData);
      const [{ data: postData }, { data: authData }] = await Promise.all([
        supabase.from("posts").select("id, caption, poster_path, video_path, created_at").eq("author_id", profileData.id).eq("status", "published").order("created_at", { ascending: false }),
        supabase.auth.getUser(),
      ]);
      const ownPosts = postData || [];
      setPosts(ownPosts);
      const [{ count: following }, { count: followers }, { count: likes }] = await Promise.all([
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profileData.id),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profileData.id),
        ownPosts.length ? supabase.from("post_likes").select("*", { count: "exact", head: true }).in("post_id", ownPosts.map(post => post.id)) : Promise.resolve({ count: 0 }),
      ]);
      setStats({ following: following || 0, followers: followers || 0, likes: likes || 0 });
      const currentUser = authData.user;
      setViewerId(currentUser?.id || null);
      if (currentUser) {
        const { data: relationship } = await supabase.from("follows").select("follower_id").eq("follower_id", currentUser.id).eq("following_id", profileData.id).maybeSingle();
        setIsFollowing(Boolean(relationship));
      }
    };
    if (username) void load();
  }, [username]);

  const toggleFollow = async () => {
    if (!profile) return;
    if (!viewerId) { window.location.assign("/login"); return; }
    if (viewerId === profile.id) { notify("This is your profile."); return; }
    const action = isFollowing ? supabase.from("follows").delete().eq("follower_id", viewerId).eq("following_id", profile.id) : supabase.from("follows").insert({ follower_id: viewerId, following_id: profile.id });
    const { error } = await action;
    if (error) { notify(error.message); return; }
    setIsFollowing(value => !value);
    setStats(current => ({ ...current, followers: Math.max(0, current.followers + (isFollowing ? -1 : 1)) }));
  };
  const sendMessage = () => {
    if (!messageDraft.trim()) { notify("Write a message first."); return; }
    localStorage.setItem(`wildball-message-${username}`, messageDraft.trim());
    setMessageDraft(""); setMessageOpen(false); notify(`Message saved for @${username}.`);
  };
  const shareProfile = async () => { await navigator.clipboard?.writeText(window.location.href); notify("Profile link copied."); };

  if (!profile) return <main className="public-profile"><a href="/" className="public-back">← Back to Wildball</a><p className="profile-loading">{notice || "Loading profile…"}</p></main>;
  return <main className="public-profile"><a href="/" className="public-back">← Back to Wildball</a><section className="public-profile-head"><div className="public-avatar">{(profile.display_name || profile.username)[0].toUpperCase()}</div><div className="public-profile-info"><div className="profile-title"><h1>{profile.display_name || profile.username}</h1><span>@{profile.username}</span></div><div className="public-stats"><b>{formatCount(stats.following)} <small>Following</small></b><b>{formatCount(stats.followers)} <small>Followers</small></b><b>{formatCount(stats.likes)} <small>Likes</small></b></div><div className="public-actions"><button className={`profile-follow ${isFollowing ? "following" : ""}`} onClick={toggleFollow}>{isFollowing ? "Following" : "Follow"}</button><button onClick={() => setMessageOpen(true)}>Message</button><button className="round-action" onClick={shareProfile} aria-label="Share profile">↗</button><button className="round-action" onClick={() => notify("More profile options coming soon.")} aria-label="More profile options">•••</button></div><p className="public-bio">{profile.bio || "Basketball lives here."}{profile.location && <small>{profile.location}</small>}</p></div></section><nav className="public-tabs"><b>▥ Videos</b><span>↻ Reposts</span><span>♡ Liked</span></nav><section className="public-videos">{posts.length ? posts.map(post => <article key={post.id}><video src={post.video_path} controls playsInline preload="metadata" poster={post.poster_path || undefined}/><p>{post.caption || "Wildball post"}</p></article>) : <p className="profile-loading">No published videos yet.</p>}</section>{messageOpen && <div className="message-panel" role="dialog" aria-modal="true"><div><button className="message-close" onClick={() => setMessageOpen(false)} aria-label="Close">×</button><small>MESSAGE @{profile.username}</small><h2>Start a conversation</h2><textarea value={messageDraft} onChange={event => setMessageDraft(event.target.value)} maxLength={500} placeholder="Write your message…"/><button className="message-send" onClick={sendMessage}>Send message</button></div></div>}{notice && <p className="profile-notice">{notice}</p>}</main>;
}
