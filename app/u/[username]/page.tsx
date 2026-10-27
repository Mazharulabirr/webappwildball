"use client";
import LoadingState from "../../loading-state";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import CreditGiftDialog from "../../credit-gift-dialog";
import ProfileVideoGallery from "../../profile-video-gallery";
import { getProfileStats, setPlayerFollow } from "../../../lib/social";
import { notifyFollowChange, useSocialRefresh } from "../../../lib/use-social-refresh";

type Profile = { id:string; username:string; display_name:string|null; bio:string|null; location:string|null; avatar_path:string|null };
type AthletePassport = { sport:string; position:string; team_name:string; jersey_number:string; height:string; dominant_hand:string; age_group:string; play_style:string; season_games:number; season_points:number; season_rebounds:number; season_assists:number; achievements:string[]; awards:string[]; career_history:string[] };
type Post = { id:string; caption:string; poster_path:string|null; video_path:string; created_at:string };
const supabase = createClient();
const count = (value:number) => value >= 1000 ? `${(value/1000).toFixed(value>=10000?0:1)}K` : `${value}`;

function avatarUrl(path:string|null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}

function AthletePassportCard({passport:rawPassport,posts,player}:{passport:AthletePassport|null;posts:Post[];player:Profile}) {
  const [activeSection,setActiveSection]=useState<"overview"|"gameday"|"scout"|"fan">("overview");
  useEffect(()=>{const fanButton=document.querySelector<HTMLButtonElement>(".passport-icon-nav button:nth-child(5)");const openFanMode=()=>setActiveSection("fan");fanButton?.addEventListener("click",openFanMode);return()=>fanButton?.removeEventListener("click",openFanMode)},[]);
  useEffect(()=>{document.querySelector<HTMLButtonElement>(".passport-icon-nav button:nth-child(5)")?.classList.toggle("active",activeSection==="fan")},[activeSection]);
  const card=rawPassport||{sport:"Basketball",position:"Point Guard",team_name:"Wildball Community",jersey_number:"10",height:"6'1\"",dominant_hand:"Right handed",age_group:"Open division",play_style:"Two-way playmaker",season_games:22,season_points:286,season_rebounds:84,season_assists:61,achievements:["Active Wildball athlete","Season highlight creator"],awards:["Wildball Community player"],career_history:["2026 · Wildball Community","2025 · Local basketball circuit"]};
  const passport=card;
  const games=card.season_games;
  const average=(value:number)=>games?((value/games).toFixed(1)):"—";
  const hasDetails=Boolean(card.achievements.length||card.awards.length||card.career_history.length);
  const snapshot=[{label:"Height",value:card.height||"6'1\""},{label:"Hand",value:card.dominant_hand||"Right handed"},{label:"Division",value:card.age_group||"Open division"},{label:"Play style",value:card.play_style||"Two-way playmaker"}];
  return <><nav className="passport-icon-nav" aria-label="Athlete Passport sections"><button type="button" className={activeSection==="overview"?"active":""} onClick={()=>setActiveSection("overview")} aria-label="Passport overview" title="Passport overview"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M3.8 9h16.4M3.8 15h16.4M12 3.5c2.2 2.3 3.3 5.1 3.3 8.5S14.2 18.2 12 20.5C9.8 18.2 8.7 15.4 8.7 12S9.8 5.8 12 3.5Z"/></svg><i/></button><button type="button" className={activeSection==="gameday"?"active":""} onClick={()=>setActiveSection("gameday")} aria-label="GameDay Hub" title="GameDay Hub"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.1 3.1 3.7-.6-.6 3.7 3.1 2.1-3.1 2.1.6 3.7-3.7-.6L12 20l-2.1-3.1-3.7.6.6-3.7-3.1-2.1 3.1-2.1-.6-3.7 3.7.6L12 3Z"/><circle cx="12" cy="11.5" r="2.3"/></svg><i/></button><button type="button" className={activeSection==="scout"?"active":""} onClick={()=>setActiveSection("scout")} aria-label="Scout and Discover" title="Scout and Discover"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="m6.3 6.3 11.4 11.4M17.7 6.3 6.3 17.7M4.9 10.1c4.5 1.6 9.7 1.6 14.2 0M4.9 13.9c4.5-1.6 9.7-1.6 14.2 0"/></svg><i/></button><button type="button" aria-label="Highlights" title="Highlights"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M10 8.5 15 12l-5 3.5V8.5Z"/></svg></button><button type="button" aria-label="Awards" title="Awards"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 4.5h9v5a4.5 4.5 0 0 1-9 0v-5ZM9 17h6M12 14v3M8 20h8"/><path d="M7.5 6H5.7a1.7 1.7 0 0 0 1.7 3.2M16.5 6h1.8a1.7 1.7 0 0 1-1.7 3.2"/></svg></button></nav>{activeSection==="overview"&&<section className="public-passport">
    <div className="passport-ribbon"><span>WILDBALL ATHLETE PASSPORT</span><i>SHAREABLE PLAYER CARD</i></div>
    <div className="public-passport-head"><div><p>{card.sport}</p><h2>{player.display_name||player.username}</h2></div><span>JERSEY #{card.jersey_number}</span></div>
    <div className="passport-player-line"><b>{passport?.position||"Athlete Passport not completed yet"}</b>{passport?<small>{passport.team_name||"Independent athlete"} · Current season</small>:<small>Players can add their details from Athlete Passport</small>}</div>
    {passport?<>{snapshot.length>0&&<div className="passport-snapshot">{snapshot.map(item=><div key={item.label}><small>{item.label}</small><b>{item.value}</b></div>)}</div>}<div className="passport-stat-band"><div><strong>{passport.season_games}</strong><small>Games</small></div><div><strong>{passport.season_points}</strong><small>Points</small></div><div><strong>{passport.season_rebounds}</strong><small>Rebounds</small></div><div><strong>{passport.season_assists}</strong><small>Assists</small></div></div><div className="passport-averages"><div><span>{average(passport.season_points)}</span><small>PPG</small></div><div><span>{average(passport.season_rebounds)}</span><small>RPG</small></div><div><span>{average(passport.season_assists)}</span><small>APG</small></div><a href="#highlight-clips"><b>{posts.length}</b><small>Highlight clips</small></a></div>{hasDetails&&<div className="passport-details">{passport.achievements?.length>0&&<div><h3>Achievements</h3>{passport.achievements.map((item,index)=><span key={`achievement-${index}`}>✦ {item}</span>)}</div>}{passport.awards?.length>0&&<div><h3>Awards</h3>{passport.awards.map((item,index)=><span key={`award-${index}`}>🏆 {item}</span>)}</div>}{passport.career_history?.length>0&&<div><h3>Career journey</h3>{passport.career_history.map((item,index)=><span key={`history-${index}`}>{item}</span>)}</div>}</div>}</>:<p className="passport-empty-public">This player has not added their sports details yet.</p>}
  </section>}{activeSection==="gameday"&&<GameDayHub player={player}/>}{activeSection==="scout"&&<ScoutDiscover/>}{activeSection==="fan"&&<FanMode/>}</>;
}

function GameDayHub({player}:{player:Profile}) {
  return <section className="gameday-hub"><header className="gameday-head"><div><p>WILDBALL GAMEDAY HUB</p><h2>Game week</h2><span>Follow {player.display_name||player.username} before, during, and after the game.</span></div><b>2026<br/><small>SEASON</small></b></header><article className="gameday-next"><div className="gameday-label"><span>UP NEXT</span><time>SAT · OCT 18 · 6:30 PM</time></div><div className="gameday-matchup"><div><i>WB</i><b>Wildball<br/>Community</b></div><strong>VS</strong><div><i className="opponent">CP</i><b>City<br/>Playmakers</b></div></div><footer><span>📍 Wildball Arena · Court 2</span><b>18 players available</b></footer></article><div className="gameday-mini"><article><small>LAST RESULT</small><b>Wildball Community <em>72</em></b><b>Eastside Hoops <em>68</em></b><span>W · League game</span></article><article><small>TEAM MOMENTUM</small><div className="form-row"><i>W</i><i>W</i><i className="loss">L</i><i>W</i><i>W</i></div><span>4 wins in last 5</span></article></div><section className="gameday-schedule"><div><p>UPCOMING SCHEDULE</p><button type="button">View full schedule →</button></div><article><time>OCT<br/><b>24</b></time><span><strong>vs Northside Ballers</strong><small>7:00 PM · Wildball Arena</small></span><em>HOME</em></article><article><time>NOV<br/><b>01</b></time><span><strong>at Downtown Dribblers</strong><small>6:15 PM · Central Court</small></span><em className="away">AWAY</em></article></section></section>;
}

function ScoutDiscover() {
  const [filter,setFilter]=useState("All players");
  const athletes=[{name:"Maya Carter",role:"Point Guard · U18",place:"Dhaka, Bangladesh",tag:"Verified achievement",color:"mc"},{name:"Zane Williams",role:"Small Forward · Open",place:"Chittagong, Bangladesh",tag:"Tournament MVP",color:"zw"},{name:"Jordan Lee",role:"Shooting Guard · U16",place:"Sylhet, Bangladesh",tag:"All-Star selection",color:"jl"}];
  return <section className="scout-discover"><header><div><p>SCOUT &amp; DISCOVER</p><h2>Find the next standout</h2><span>Search athletes by sport, position, age group, location, and achievements.</span></div><b>⌕</b></header><div className="scout-search"><span>⌕</span><input aria-label="Search athletes" placeholder="Search athletes, teams, or locations"/><button type="button">Search</button></div><div className="scout-filters">{["All players","Basketball","Point Guard","U18","Verified"].map(item=><button type="button" className={filter===item?"selected":""} onClick={()=>setFilter(item)} key={item}>{item}</button>)}</div><div className="scout-meta"><span>Recommended athletes</span><button type="button">Filters ⚙</button></div><div className="scout-list">{athletes.map((athlete,index)=><article key={athlete.name}><i className={athlete.color}>{athlete.name.split(" ").map(part=>part[0]).join("")}</i><div><h3>{athlete.name}<b>✓</b></h3><p>{athlete.role}</p><small>⌖ {athlete.place}</small></div><span><em>{athlete.tag}</em><button type="button">View player →</button></span></article>)}</div><footer>Scout responsibly. Athlete contact and private details are protected.</footer></section>;
}

function FanMode() {
  const [prediction,setPrediction]=useState<string|null>(null),[vote,setVote]=useState<string|null>(null),[answer,setAnswer]=useState<string|null>(null);
  return <section className="fan-mode"><header><div><p>FAN MODE</p><h2>Make every game count</h2><span>Predict, vote, and earn points for your team.</span></div><b>420<br/><small>POINTS</small></b></header><article className="fan-prediction"><div><small>GAME PREDICTION</small><h3>Who takes the win?</h3><p>Wildball Community vs City Playmakers</p></div><div className="fan-pick-row"><button type="button" className={prediction==="Wildball"?"picked":""} onClick={()=>setPrediction("Wildball")}>Wildball<br/><b>Community</b></button><button type="button" className={prediction==="City"?"picked":""} onClick={()=>setPrediction("City")}>City<br/><b>Playmakers</b></button></div>{prediction&&<span>✓ Prediction saved · +10 points</span>}</article><div className="fan-duo"><article><small>PLAYER OF THE GAME</small><h3>Cast your vote</h3>{["J. Parker","A. Rahman","S. Carter"].map(name=><button type="button" className={vote===name?"voted":""} onClick={()=>setVote(name)} key={name}>{name}<b>{vote===name?"Voted ✓":"Vote"}</b></button>)}</article><article><small>QUICK QUIZ</small><h3>How many assists last game?</h3>{["7","9","12"].map(choice=><button type="button" className={answer===choice?"answered":""} onClick={()=>setAnswer(choice)} key={choice}>{choice} assists</button>)}{answer&&<span>{answer==="9"?"Correct! +15 points":"Nice try—come back next game."}</span>}</article></div><section className="fan-leaderboard"><div><p>TEAM LEADERBOARD</p><button type="button">This week⌄</button></div><article><b>1</b><i>MC</i><span>Maya C.<small>Wildball Community</small></span><strong>860</strong></article><article><b>2</b><i>JL</i><span>Jordan L.<small>Wildball Community</small></span><strong>715</strong></article><article className="you"><b>8</b><i>YOU</i><span>You<small>Wildball Community</small></span><strong>420</strong></article></section></section>;
}

export default function PublicProfilePage() {
  const router=useRouter();
  const {username:raw=""}=useParams<{username:string}>();
  const username=decodeURIComponent(raw).replace(/^@+/,"").toLowerCase();
  const [profile,setProfile]=useState<Profile|null>(null), [posts,setPosts]=useState<Post[]>([]), [viewer,setViewer]=useState<string|null>(null), [passport,setPassport]=useState<AthletePassport|null>(null);
  const [following,setFollowing]=useState(false), [followBusy,setFollowBusy]=useState(false), [giftOpen,setGiftOpen]=useState(false), [notice,setNotice]=useState("");
  const [status,setStatus]=useState<"loading"|"ready"|"not-found"|"error">("loading"), [stats,setStats]=useState({following:0,followers:0,likes:0});
  const [refreshVersion,setRefreshVersion]=useState(0);
  useSocialRefresh(()=>setRefreshVersion(value=>value+1));
  const note=(text:string)=>{setNotice(text);window.setTimeout(()=>setNotice(""),2400)};

  useEffect(()=>{
    let active=true;
    const load=async()=>{
      setStatus("loading");
      try {
      const {data:found,error:profileError}=await supabase.from("profiles").select("id,username,display_name,bio,location,avatar_path").ilike("username",username).maybeSingle();
      if(!active)return;
      if(profileError){setStatus("error");return} if(!found){setStatus("not-found");return}
      const player=found as Profile; setProfile(player);
      const {data:passportData}=await supabase.from("athlete_passports").select("sport,position,team_name,jersey_number,height,dominant_hand,age_group,play_style,season_games,season_points,season_rebounds,season_assists,achievements,awards,career_history").eq("profile_id",player.id).maybeSingle();
      if(!active)return; setPassport(passportData as AthletePassport|null);
      const [{data:published},{data:auth}]=await Promise.all([supabase.from("posts").select("id,caption,poster_path,video_path,created_at").eq("author_id",player.id).eq("status","published").order("created_at",{ascending:false}),supabase.auth.getUser()]);
      if(!active)return;
      const own=(published||[]) as Post[]; setPosts(own); setViewer(auth.user?.id||null);
      const counts=await getProfileStats(supabase,player.id);
      if(!active)return;
      setStats(counts);
      if(auth.user&&auth.user.id!==player.id){const {data:relation,error}=await supabase.from("follows").select("follower_id").eq("follower_id",auth.user.id).eq("following_id",player.id).maybeSingle();if(error)throw error;if(active)setFollowing(Boolean(relation))}else if(active)setFollowing(false);
      setStatus("ready");
      }catch{if(active){setStatus("error");note("Could not refresh this profile. Please try again.")}}
    };
    if(username)void load();else setStatus("not-found");
    return()=>{active=false};
  },[username,refreshVersion]);

  const follow=async()=>{
    if(!profile||followBusy)return; if(!viewer){router.push("/login");return} if(viewer===profile.id){router.push("/profile");return}
    setFollowBusy(true);
    try{
      const next=!following;
      await setPlayerFollow(supabase,viewer,profile.id,next);
      setFollowing(next);
      notifyFollowChange();
      setStats(await getProfileStats(supabase,profile.id));
    }catch{note("Could not update follow right now. Please try again.")}
    finally{setFollowBusy(false)}

  };

  if(!profile)return <main className="public-profile"><div className="public-profile-shell"><a href="/" className="public-back">← Back to Wildball</a>{status==="loading"?<LoadingState label="Getting this player's court ready"/>:<div className="public-profile-state"><h1>{status==="not-found"?"Player not found":"Could not load profile"}</h1><p>{status==="not-found"?"Check the username or search for the player again.":"Please refresh and try again."}</p><a href="/search">Search players</a></div>}</div></main>;

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
            {ownProfile?<><button className="profile-follow" onClick={()=>router.push("/profile")}>Edit profile</button><button className="credit-gift-button own-wallet-action" onClick={()=>router.push("/wallet")}>Wallet</button></>:<><button disabled={followBusy||status!=="ready"} className={`profile-follow ${following?"following":""}`} onClick={follow}>{followBusy?"Saving…":following?"Following":"Follow"}</button><button onClick={()=>viewer?router.push(`/inbox?to=${profile.id}`):router.push("/login")}>Message</button><button className="credit-gift-button" onClick={()=>viewer?setGiftOpen(true):router.push("/login")}>Send credits</button></>}
            <button className="round-action" onClick={async()=>{await navigator.clipboard?.writeText(location.href);note("Profile link copied.")}}>↗</button>
          </div>
          <p className="public-bio">{profile.bio||"Basketball lives here."}{profile.location&&<small>Location: {profile.location}</small>}</p>
        </div>
      </section>
      <AthletePassportCard passport={passport} posts={posts} player={profile}/>
      <nav className="public-tabs"><b>Videos <em>{posts.length}</em></b><span>Reposts</span><span>Liked</span></nav>
      <section id="highlight-clips">{posts.length?<ProfileVideoGallery posts={posts} username={profile.username} displayName={profile.display_name}/>:<p className="profile-loading">No published videos yet.</p>}</section>
    </div>
    {notice&&<p className="profile-notice">{notice}</p>}
    {giftOpen&&<CreditGiftDialog recipientId={profile.id} recipientName={profile.display_name||profile.username} onClose={()=>setGiftOpen(false)}/>}
  </main>;
}
