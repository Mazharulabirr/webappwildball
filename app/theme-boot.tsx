"use client";

import { useEffect } from "react";

export default function ThemeBoot() {
  useEffect(() => {
    const saved = window.localStorage.getItem("wildball-theme");
    // Wildball opens in its light theme by default. A player can still opt into
    // dark mode from Settings, and that explicit choice is remembered.
    const dark = saved === "dark";
    document.documentElement.classList.toggle("dark-mode", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  }, []);
  return null;
}
