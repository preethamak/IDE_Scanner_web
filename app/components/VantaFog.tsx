"use client";

import { useEffect, useRef } from "react";
import styles from "./vantaFog.module.css";

const palettes = {
  light: { highlightColor: 0xf3afc8, midtoneColor: 0xffd7c1, lowlightColor: 0xdff39b, baseColor: 0xf4f5f0 },
  dark: { highlightColor: 0x8d4168, midtoneColor: 0x5b3549, lowlightColor: 0x53652f, baseColor: 0x121315 },
} as const;

export default function VantaFog({ className = "" }: { className?: string }) {
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = element.current;
    if (!node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let effect: { destroy(): void; setOptions(options: Record<string, unknown>): void } | null = null;
    const theme = () => document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    const update = () => effect?.setOptions(palettes[theme()]);
    const start = async () => {
      if (disposed || reduced.matches || effect) return;
      const [{ default: fog }, THREE] = await Promise.all([import("vanta/dist/vanta.fog.min"), import("three")]);
      if (disposed || reduced.matches || !element.current) return;
      effect = fog({ el: element.current, THREE, ...palettes[theme()], blurFactor: 0.72, speed: 0.55, zoom: 0.82, mouseControls: false, touchControls: false, gyroControls: false, minHeight: 320, minWidth: 320 });
    };
    const motion = () => { if (reduced.matches) { effect?.destroy(); effect = null; } else void start(); };
    const visibility = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void start();
      else { effect?.destroy(); effect = null; }
    }, { rootMargin: "120px" });
    visibility.observe(node);
    reduced.addEventListener("change", motion);
    window.addEventListener("guardrails:theme", update);
    return () => { disposed = true; visibility.disconnect(); reduced.removeEventListener("change", motion); window.removeEventListener("guardrails:theme", update); effect?.destroy(); };
  }, []);
  return <div ref={element} className={`${styles.fog} ${className}`} aria-hidden="true" />;
}
