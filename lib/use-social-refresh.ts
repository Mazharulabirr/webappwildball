"use client";
import { useEffect, useRef } from "react";

export function notifyFollowChange() {
  window.dispatchEvent(new Event("wildball:follow-change"));
  try { window.localStorage.setItem("wildball-follow-update", `${Date.now()}-${Math.random()}`); } catch { /* Same-tab updates still work without storage. */ }
}

// Refresh on returning from another profile/tab instead of keeping stale counts.
export function useSocialRefresh(refresh: () => void) {
  const latest = useRef(refresh);
  latest.current = refresh;
  useEffect(() => {
    const run = () => { if (!document.hidden) latest.current(); };
    const storage = (event: StorageEvent) => { if (event.key === "wildball-follow-update") run(); };
    window.addEventListener("wildball:follow-change", run);
    window.addEventListener("focus", run);
    window.addEventListener("pageshow", run);
    window.addEventListener("storage", storage);
    document.addEventListener("visibilitychange", run);
    const interval = window.setInterval(run, 30000);
    return () => {
      window.removeEventListener("wildball:follow-change", run);
      window.removeEventListener("focus", run);
      window.removeEventListener("pageshow", run);
      window.removeEventListener("storage", storage);
      document.removeEventListener("visibilitychange", run);
      window.clearInterval(interval);
    };
  }, []);
}
