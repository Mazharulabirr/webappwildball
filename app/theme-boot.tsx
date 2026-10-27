"use client";

import { useEffect } from "react";
import { readTheme } from "../lib/theme";

export default function ThemeBoot() {
  useEffect(() => {
    const dark = readTheme() === "dark";
    document.documentElement.classList.toggle("dark-mode", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  }, []);
  return null;
}
