"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../../lib/supabase/client";

type Profile={id:string;username:string;display_name:string|null;bio:string|null;location:string|null};
type Post={id:string;caption:string;poster_path:string|null;video_path:string;created_at:string};
const supabase=createClient();

export default function ProfilePage(){
 const router=useRouter(); const [user,setUser]=useState<User|null>(null),[profile,setProfile]=useState<Profile|null>(null),[posts,setPosts]=useState<Post[]>([]),[stats,setStats]=useState({following:0,followers:0,likes:0}),[editing,setEditing]=useState(false),[menu,setMenu]=useState(false),[draft,setDraft]=useState({display_name:"",bio:"",location:""}),[message,setMessage]=useState("");
 useEffect(()=>{void load()},[]);
 const load=async()=>{const {data:{session}}=await supabase.auth.getSession();const currentUser=session?.user;if(!currentUser){router.replace("/login");return}setUser(currentUser);const profileRequest=supabase.from("profiles").select("id,username,display_name,bio,location").eq("id",currentUser.id).maybeSingle();const postsRequest=supabase.from("posts").select("id,caption,poster_path,video_path,created_at").eq("author_id",currentUser.id).order("created_at",{ascending:false});const followingRequest=supabase.from("follows").select("*",{count:"exact",head:true}).eq("follower_id",currentUser.id);const followersRequest=supabase.from("follows").select("*",{count:"exact",head:true}).eq("following_id",currentUser.id);const [{data:profileData},{data:postData},{count:following},{count:followers}]=await Promise.all([profileRequest,postsRequest,followingRequest,followersRequest]);if(!profileData){setMessage("Your profile is being created. Please refresh once.");return}setProfile(profileData);setDraft({display_name:profileData.display_name||"",bio:profileData.bio||"",location:profileData.location||""});const own=postData||[];setPosts(own);setStats(current=>({...current,following:following||0,followers:followers||0}));if(own.length){const {count:likes}=await supabase.from("post_likes").select("*",{count:"exact",head:true}).in("post_id",own.map(post=>post.id));setStats({following:following||0,followers:followers||0,likes:likes||0})}};
 const save=async()=>{if(!user)return;const {data,error}=await supabase.from("profiles").update(draft).eq("id",user.id).select("id,username,display_name,bio,location").single();if(error){setMessage(error.message);return}setProfile(data);setEditing(false);setMessage("Profile saved.")};
 const logout=async()=>{await supabase.auth.signOut();router.replace("/")};
 if(!profile)return <main className="real-profile profile-loading-page"><div className="profile-loading-card"><i/><i/><i/><p>{message||"Preparing your profile"}</p></div></main>;
 return <main className="real-profile wb-profile">
   <div className="wb-profile-toolbar"><a href="/" className="back-home">← Wildball</a><button className="profile-menu-trigger" aria-label="Open profile menu" aria-expanded={menu} onClick={()=>setMenu(value=>!value)}><i/><i/><i/></button></div>
   {menu&&<div className="profile-menu"><button onClick={()=>{setMenu(false);setEditing(true)}}>Edit profile</button><a href="/settings">Settings</a><a href="/inbox">Inbox</a><button className="profile-menu-logout" onClick={logout}>Log out</button></div>}
   <section className="real-profile-card"><div className="real-avatar">{(profile.display_name||profile.username)[0].toUpperCase()}</div><div><p className="eyebrow">WILDBALL PLAYER</p><h1>{profile.display_name||profile.username}</h1><p>@{profile.username}</p>{profile.location&&<p>{profile.location}</p>}</div><button onClick={()=>setEditing(value=>!value)}>{editing?"Cancel":"Edit profile"}</button></section>
   {editing&&<section className="real-editor"><label>Name<input value={draft.display_name} onChange={event=>setDraft({...draft,display_name:event.target.value})}/></label><label>Location<input value={draft.location} onChange={event=>setDraft({...draft,location:event.target.value})}/></label><label>Bio<textarea value={draft.bio} onChange={event=>setDraft({...draft,bio:event.target.value})}/></label><button onClick={save}>Save profile</button></section>}
   <p className="real-bio">{profile.bio||"Add a bio so hoopers know your game."}</p>
   <div className="real-stats"><div><b>{stats.following}</b><span>Following</span></div><div><b>{stats.followers}</b><span>Followers</span></div><div><b>{stats.likes}</b><span>Likes</span></div></div>
   <section className="real-posts"><div className="wb-video-heading"><h2>Your videos</h2><span>{posts.length} {posts.length===1?"video":"videos"}</span></div>
   {posts.length?<div className="wb-video-list">{posts.map(post=><article key={post.id}><video src={post.video_path} poster={post.poster_path||undefined} controls playsInline preload="metadata" onLoadedMetadata={event=>{if(!post.poster_path)event.currentTarget.currentTime=0.1;}}/><div><p>{post.caption||"Untitled video"}</p><time>{new Date(post.created_at).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}</time></div></article>)}</div>:<p className="empty-real">No videos yet. Your uploads will appear here.</p>}</section>
   {message&&<p className="login-message">{message}</p>}
 </main>
}
