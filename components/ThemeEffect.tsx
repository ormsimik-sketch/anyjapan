"use client";

import { useEffect } from "react";

import { useWaterData } from "@/hooks/useWaterData";

function applyTheme(theme: "system" | "light" | "dark") {
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

export function ThemeEffect() {
  const { settings, hydrated } = useWaterData();

  useEffect(() => {
    if (!hydrated) return;
    applyTheme(settings.theme);

    if (settings.theme !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => applyTheme("system");
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [settings.theme, hydrated]);

  return null;
}
