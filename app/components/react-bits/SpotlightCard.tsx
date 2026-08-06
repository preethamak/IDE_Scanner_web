"use client";

// React Bits SpotlightCard (free, MIT): https://reactbits.dev/components/spotlight-card
// Adapted only for this application's TypeScript and CSS-module boundary.
import { useRef, type MouseEventHandler, type PropsWithChildren } from "react";

export default function SpotlightCard({ children, className = "", spotlightColor = "rgba(198, 255, 65, 0.22)" }: PropsWithChildren<{ className?: string; spotlightColor?: string }>) {
  const ref = useRef<HTMLDivElement>(null);
  const onMouseMove: MouseEventHandler<HTMLDivElement> = (event) => {
    const node = ref.current;
    if (!node) return;
    const box = node.getBoundingClientRect();
    node.style.setProperty("--mouse-x", `${event.clientX - box.left}px`);
    node.style.setProperty("--mouse-y", `${event.clientY - box.top}px`);
    node.style.setProperty("--spotlight-color", spotlightColor);
  };
  return <div ref={ref} onMouseMove={onMouseMove} className={`reactBitsSpotlight ${className}`}>{children}</div>;
}
