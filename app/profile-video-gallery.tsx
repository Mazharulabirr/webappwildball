"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./profile-video-gallery.css";

export type ProfileVideo = { id: string; caption: string; video_path: string; poster_path: string | null; created_at: string };

export default function ProfileVideoGallery({ posts, username, displayName, variant = "public" }: {
  posts: ProfileVideo[]; username: string; displayName?: string | null; variant?: "public" | "own";
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const index = posts.findIndex(post => post.id === selected);
  return <>
    <div className={variant === "own" ? "wb-video-list profile-video-gallery" : "public-videos profile-video-gallery"}>
      {posts.map((post, position) => <article key={post.id}>
        <button type="button" className="profile-video-tile" aria-label={`Open video ${position + 1}: ${post.caption || "Wildball highlight"}`} onClick={() => setSelected(post.id)}>
          {post.poster_path ? <img src={post.poster_path} alt="" loading="lazy"/> : <video src={post.video_path} muted playsInline preload="metadata" tabIndex={-1} aria-hidden="true" onLoadedMetadata={event => { event.currentTarget.currentTime = Math.min(.1, event.currentTarget.duration || 0); }}/>}
          <span className="profile-video-tile-play" aria-hidden="true">▶</span>
        </button>
        <div><p>{post.caption || "Wildball highlight"}</p>{variant === "own" && <time>{new Date(post.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</time>}</div>
      </article>)}
    </div>
    {index >= 0 && <ProfileVideoViewer posts={posts} index={index} username={username} displayName={displayName} onChange={position => setSelected(posts[position].id)} onClose={() => setSelected(null)}/>}
  </>;
}

function ProfileVideoViewer({ posts, index, username, displayName, onChange, onClose }: {
  posts: ProfileVideo[]; index: number; username: string; displayName?: string | null; onChange: (index: number) => void; onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const [muted, setMuted] = useState(false);
  const [failed, setFailed] = useState(false);
  const [needsPlay, setNeedsPlay] = useState(false);
  const post = posts[index];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let active = true;
    setFailed(false); setNeedsPlay(false);
    // Mobile browsers can reject audible autoplay after navigating to the next
    // clip. Fall back to muted playback and leave a clear sound control.
    void video.play().catch(async () => {
      if (!active) return;
      video.muted = true; setMuted(true);
      try { await video.play(); } catch { if (active) setNeedsPlay(true); }
    });
    const visibility = () => { if (document.hidden) video.pause(); };
    document.addEventListener("visibilitychange", visibility);
    return () => { active = false; video.pause(); document.removeEventListener("visibilitychange", visibility); };
  }, [post.id]);

  const move = (direction: number) => {
    const next = index + direction;
    if (next >= 0 && next < posts.length) onChange(next);
  };

  return createPortal(<dialog ref={dialogRef} className="profile-video-viewer" aria-label={`Video by @${username}`} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }} onKeyDown={event => {
    if ((event.target as HTMLElement).matches("input, textarea, select")) return;
    if (["ArrowDown", "ArrowRight"].includes(event.key)) { event.preventDefault(); move(1); }
    if (["ArrowUp", "ArrowLeft"].includes(event.key)) { event.preventDefault(); move(-1); }
  }}>
    <div className="profile-video-viewer-shell">
      <button type="button" className="profile-video-close" aria-label="Close video" autoFocus onClick={onClose}>×</button>
      <div className="profile-video-stage" onTouchStart={event => {
        const point = event.touches[0], bounds = event.currentTarget.getBoundingClientRect();
        // Leave the native video's seek/volume controls free for scrubbing.
        touch.current = point.clientY < bounds.bottom - 72 ? { x: point.clientX, y: point.clientY } : null;
      }} onTouchEnd={event => {
        const start = touch.current; touch.current = null;
        if (!start || !event.changedTouches.length) return;
        const end = event.changedTouches[0], dy = start.y - end.clientY, dx = start.x - end.clientX;
        if (Math.abs(dy) > 65 && Math.abs(dy) > Math.abs(dx) * 1.4) move(dy > 0 ? 1 : -1);
      }}>
        <video key={post.id} ref={videoRef} src={post.video_path} poster={post.poster_path || undefined} controls playsInline loop autoPlay muted={muted} preload="auto" aria-label={post.caption || `Video by ${username}`} onError={() => setFailed(true)} onPlay={() => setNeedsPlay(false)}/>
        {failed ? <div className="profile-video-playback-message" role="alert"><p>This video could not load.</p><button type="button" onClick={() => { setFailed(false); videoRef.current?.load(); void videoRef.current?.play().catch(() => setNeedsPlay(true)); }}>Try again</button></div> : needsPlay && <button type="button" className="profile-video-start" onClick={() => { void videoRef.current?.play().catch(() => setNeedsPlay(true)); }}>▶ Play video</button>}
      </div>
      <aside className="profile-video-details">
        <div className="profile-video-author"><span aria-hidden="true">{(displayName || username)[0].toUpperCase()}</span><div><strong>{displayName || username}</strong><small>@{username}</small></div></div>
        <p className="profile-video-caption">{post.caption || "Wildball highlight"}</p>
        <time dateTime={post.created_at}>{new Date(post.created_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</time>
        <button type="button" className="profile-video-sound" onClick={() => setMuted(value => !value)}>{muted ? "Turn sound on" : "Mute sound"}</button>
        <div className="profile-video-navigation"><button type="button" aria-label="Previous video" disabled={index === 0} onClick={() => move(-1)}>↑</button><span aria-live="polite">{index + 1} / {posts.length}</span><button type="button" aria-label="Next video" disabled={index === posts.length - 1} onClick={() => move(1)}>↓</button></div>
        {posts.length > 1 && <small className="profile-video-hint">Swipe up or down for more videos</small>}
      </aside>
    </div>
  </dialog>, document.body);
}
