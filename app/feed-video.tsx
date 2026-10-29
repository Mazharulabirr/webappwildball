"use client";

import { memo, useEffect, useRef } from "react";

let playing: HTMLVideoElement | null = null;

// Only attach media URLs close to the viewport: distant posts cannot download video.
function FeedVideo({ src, poster, muted = true }: { src: string; poster?: string; muted?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    let visible = false;
    let startTimer: ReturnType<typeof setTimeout> | undefined;
    const attach = () => {
      if (!video.hasAttribute("src")) { video.src = src; video.load(); }
    };
    const pause = () => { clearTimeout(startTimer); startTimer = undefined; video.pause(); if (playing === video) playing = null; };
    const play = () => {
      if (!visible || document.hidden) return;
      attach();
      if (playing && playing !== video) playing.pause();
      playing = video;
      if (startTimer !== undefined || !video.paused) return;
      // Let the cover register while scrolling, even when the clip is cached.
      startTimer = setTimeout(() => {
        startTimer = undefined;
        if (visible && !document.hidden && playing === video) void video.play().catch(() => undefined);
      }, 650);
    };
    const visibility = () => document.hidden ? pause() : play();
    if (!("IntersectionObserver" in window)) { attach(); return; }
    const buffer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { video.preload = connection?.saveData ? "metadata" : "auto"; attach(); }
      else { pause(); video.removeAttribute("src"); video.load(); }
    }, { rootMargin: connection?.saveData ? "0px" : "90% 0px" });
    const playback = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) play(); else { pause(); delete video.dataset.playing; }
    }, { threshold: .6 });
    buffer.observe(video); playback.observe(video);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      buffer.disconnect(); playback.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      pause(); video.removeAttribute("src"); video.load();
    };
  }, [src]);
  return <><video ref={ref} className="hero" loop muted={muted} playsInline preload="none" poster={poster} aria-label="Basketball video" onPlaying={event => { event.currentTarget.dataset.playing = "true"; }} onError={event => { delete event.currentTarget.dataset.playing; }} onClick={event => { const video = event.currentTarget; if (video.paused) { if (playing && playing !== video) playing.pause(); playing = video; void video.play().catch(() => undefined); } else video.pause(); }}/>{poster && <img className="feed-video-cover" src={poster} alt="" aria-hidden="true" loading="lazy"/>}</>;
}

export default memo(FeedVideo);
