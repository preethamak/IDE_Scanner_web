"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { isThemePreference, resolveTheme, THEME_STORAGE_KEY, type ThemePreference } from "@/lib/theme";

const choices = [
  ["light", "Light", Sun],
  ["dark", "Dark", Moon],
  ["system", "System", Monitor],
] as const;

function apply(preference: ThemePreference) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const resolved = resolveTheme(preference, media.matches);
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  window.dispatchEvent(new CustomEvent("guardrails:theme", { detail: resolved }));
}

export default function ThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>("system");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const initial = document.documentElement.dataset.themePreference;
    const next = isThemePreference(initial) ? initial : "system";
    queueMicrotask(() => setPreference(next));
    apply(next);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const systemChange = () => { if (document.documentElement.dataset.themePreference === "system") apply("system"); };
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    media.addEventListener("change", systemChange);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { media.removeEventListener("change", systemChange); document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, []);
  const Current = choices.find(([value]) => value === preference)?.[2] || Monitor;
  const choose = (value: ThemePreference) => {
    try { localStorage.setItem(THEME_STORAGE_KEY, value); } catch {}
    setPreference(value); apply(value); setOpen(false);
  };
  return <div className="themeControl" ref={root}>
    <button className="themeToggle" type="button" aria-label={`Theme: ${preference}. Change appearance`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}><Current aria-hidden="true"/></button>
    {open ? <div className="themeMenu" role="menu" aria-label="Appearance">
      <span>Appearance</span>
      {choices.map(([value, label, Icon]) => <button key={value} type="button" role="menuitemradio" aria-checked={preference === value} onClick={() => choose(value)}><Icon aria-hidden="true"/><span>{label}</span>{preference === value ? <b>Selected</b> : null}</button>)}
    </div> : null}
  </div>;
}
