export type Theme = "dark" | "light";

export function readTheme(): Theme {
  const requested = new URLSearchParams(window.location.search).get("theme");
  if (requested === "dark" || requested === "light") {
    try { window.localStorage.setItem("wildball-theme", requested); } catch {}
    return requested;
  }
  try {
    const saved = window.localStorage.getItem("wildball-theme");
    if (saved === "dark" || saved === "light") return saved;
  } catch {}
  return "dark";
}
