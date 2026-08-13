"use client";

import { useEffect, useRef } from "react";

type VantaEffect = { destroy: () => void };

export default function FogBackdrop({ className = "" }: { className?: string }) {
  const element = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!element.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let effect: VantaEffect | undefined;
    let disposed = false;

    Promise.all([import("three"), import("vanta/dist/vanta.fog.min")])
      .then(([THREE, { default: FOG }]) => {
        if (disposed || !element.current) return;
        effect = FOG({
          el: element.current,
          THREE,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200,
          minWidth: 200,
          highlightColor: 0xfc17ee,
          midtoneColor: 0x0e00ff,
          lowlightColor: 0x00e1ff,
          baseColor: 0xffebeb,
          blurFactor: 0.6,
          speed: 1,
          zoom: 1,
        }) as VantaEffect;
        element.current.dataset.ready = "true";
      })
      .catch(() => {
        // The CSS background remains as the intentional WebGL/mobile fallback.
        if (element.current) element.current.dataset.fallback = "true";
      });

    return () => {
      disposed = true;
      effect?.destroy();
    };
  }, []);

  return <div ref={element} className={className} aria-hidden="true" />;
}
