"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import CreditGiftDialog from "../../credit-gift-dialog";

type Profile = { id:string; username:string; display_name:string|null; bio:string|null; location:string|null; avatar_path:string|null };
type Post = { id:string; caption:string; poster_path:string|null; video_path:string; created_at:string };
const supabase = createClient();
const count = (value:number) => value >= 1000 ? `${(value/1000).toFixed(value>=10000?0:1)}K` : `${value}`;

function avatarUrl(path:string|null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}

export default function PublicProfilePage() {
  const router=useRouter();
  const {username:raw=""}=useParams<{username:string}>();
  const username=decodeURIComponent(raw).replace(/^@+/,"").toLowerCase();
  const [profile,setProfile]=useState<Profile|null>(null), [posts,setPosts]=useState<Post[]>([]), [viewer,setViewer]=useState<string|null>(null);
  const [following,setFollowing]=useState(false), [followBusy,setFollowBusy]=useState(false), [giftOpen,setGiftOpen]=useState(false), [notice,setNotice]=useState("");
  const [status,setStatus]=useState<"loading"|"ready"|"not-found"|"error">("loading"), [stats,setStats]=useState({following:0,followers:0,likes:0});
  const note=(text:string)=>{setNotice(text);window.setTimeout(()=>setNotice(""),2400)};

  useEffect(()=>{
    let active=true;
    const load=async()=>{
      setStatus("loading");
      const {data:found,error:profileError}=await supabase.from("profiles").select("id,username,display_name,bio,location,avatar_path").ilike("username",username).maybeSingle();
      if(!active)return;
      if(profileError){setStatus("error");return} if(!found){setStatus("not-found");return}
      const player=found as Profile; setProfile(player);
      const [{data:published},{data:auth}]=await Promise.all([supabase.from("posts").select("id,caption,poster_path,video_path,created_at").eq("author_id",player.id).eq("status","published").order("created_at",{ascending:false}),supabase.auth.getUser()]);
      if(!active)return;
      const own=(published||[]) as Post[]; setPosts(own); setViewer(auth.user?.id||null);
      const [{count:followingCount},{count:followerCount},{count:likeCount}]=await Promise.all([supabase.from("follows").select("*",{count:"exact",head:true}).eq("follower_id",player.id),supabase.from("follows").select("*",{count:"exact",head:true}).eq("following_id",player.id),own.length?supabase.from("post_likes").select("*",{count:"exact",head:true}).in("post_id",own.map(post=>post.id)):Promise.resolve({count:0})]);
      if(!active)return;
      setStats({following:followingCount||0,followers:followerCount||0,likes:likeCount||0});
      if(auth.user&&auth.user.id!==player.id){const {data:relation}=await supabase.from("follows").select("follower_id").eq("follower_id",auth.user.id).eq("following_id",player.id).maybeSingle();if(active)setFollowing(Boolean(relation))}
      setStatus("ready");
    };
    if(username)void load();else setStatus("not-found");
    return()=>{active=false};
  },[username]);

  const follow=async()=>{
    if(!profile||followBusy)return; if(!viewer){router.push("/login");return} if(viewer===profile.id){router.push("/profile");return}
    setFollowBusy(true);
    const request=following?supabase.from("follows").delete().eq("follower_id",viewer).eq("following_id",profile.id):supabase.from("follows").insert({follower_id:viewer,following_id:profile.id});
    const {error}=await request; setFollowBusy(false); if(error){note("Could not update follow right now.");return}
    setFollowing(value=>!value);setStats(current=>({...current,followers:Math.max(0,current.followers+(following?-1:1))}));
  };

  if(!profile)return <main className="public-profile"><div className="public-profile-shell"><a href="/" className="public-back">← Back to Wildball</a><div className="public-profile-state"><i/><h1>{status==="not-found"?"Player not found":status==="error"?"Could not load profile":"Loading profile"}</h1><p>{status==="not-found"?"Check the username or search for the player again.":status==="error"?"Please refresh and try again.":"Getting this player's court ready…"}</p>{status!=="loading"&&<a href="/search">Search players</a>}</div></div></main>;

  const avatar=avatarUrl(profile.avatar_path),ownProfile=viewer===profile.id;
  return <main className="public-profile">
    <div className="public-profile-shell">
      <a href="/" className="public-back">← Back to Wildball</a>
      <section className="public-profile-head">
        {avatar?<img className="public-avatar public-avatar-image" src={avatar} alt={`${profile.display_name||profile.username} avatar`}/>:<div className="public-avatar">{(profile.display_name||profile.username)[0].toUpperCase()}</div>}
        <div className="public-profile-info">
          <div className="profile-title"><div><p className="profile-kicker">WILDBALL PLAYER</p><h1>{profile.display_name||profile.username}</h1></div><span>@{profile.username}</span></div>
          <div className="public-stats"><b><strong>{count(stats.following)}</strong><small>Following</small></b><b><strong>{count(stats.followers)}</strong><small>Followers</small></b><b><strong>{count(stats.likes)}</strong><small>Likes</small></b></div>
          <div className="public-actions">
            {ownProfile?<><button className="profile-follow" onClick={()=>router.push("/profile")}>Edit profile</button><button className="credit-gift-button" onClick={()=>router.push("/wallet")}>Wallet</button></>:<><button disabled={followBusy} className={`profile-follow ${following?"following":""}`} onClick={follow}>{followBusy?"Saving…":following?"Following":"Follow"}</button><button onClick={()=>viewer?router.push(`/inbox?to=${profile.id}`):router.push("/login")}>Message</button><button className="credit-gift-button" onClick={()=>viewer?setGiftOpen(true):router.push("/login")}>Send credits</button></>}
            <button className="round-action" onClick={async()=>{await navigator.clipboard?.writeText(location.href);note("Profile link copied.")}}>↗</button>
          </div>
          <p className="public-bio">{profile.bio||"Basketball lives here."}{profile.location&&<small>Location: {profile.location}</small>}</p>
        </div>
      </section>
      <nav className="public-tabs"><b>Videos <em>{posts.length}</em></b><span>Reposts</span><span>Liked</span></nav>
      <section className="public-videos">{posts.length?posts.map(post=><article key={post.id}><video src={post.video_path} controls playsInline preload="metadata" poster={post.poster_path||undefined}/><p>{post.caption||"Wildball post"}</p></article>):<p className="profile-loading">No published videos yet.</p>}</section>
    </div>
    {notice&&<p className="profile-notice">{notice}</p>}
    {giftOpen&&<CreditGiftDialog recipientId={profile.id} recipientName={profile.display_name||profile.username} onClose={()=>setGiftOpen(false)}/>}
  </main>;
}
