"use client";

import { type ReactNode } from "react";

export default function FeedSoundButton({ children, muted, onToggle }: { children: ReactNode; muted: boolean; onToggle: () => void }) {
  return <button type="button" className="sound" aria-label={muted ? "Turn sound on" : "Mute sound"} aria-pressed={!muted} title={muted ? "Turn sound on" : "Mute sound"} onClick={event => {
    onToggle();
    const video = event.currentTarget.closest(".post")?.querySelector("video");
    if (muted && video) {
      if (video.volume === 0) video.volume = 1;
      void video.play().catch(() => undefined);
    }
  }}>{children}{muted && <span aria-hidden="true" style={{ position: "absolute", width: 23, height: 2, background: "currentColor", transform: "rotate(-45deg)", pointerEvents: "none" }}/>}</button>;
}
