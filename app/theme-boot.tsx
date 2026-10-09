"use client";

import { useEffect } from "react";

export default function ThemeBoot() {
  useEffect(() => {
    const saved = window.localStorage.getItem("wildball-theme");
    const dark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark-mode", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  }, []);
  return null;
}
