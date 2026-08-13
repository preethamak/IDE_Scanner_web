"use client";

import { useEffect, useRef } from "react";

type VantaEffect = { destroy: () => void };

export default function FogBackdrop({ className = "" }: { className?: string }) {
  const element = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!element.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let effect: VantaEffect | undefined;
    let disposed = false;

    Promise.all([import("three"), import("vanta/dist/vanta.fog.min")]).then(
      ([THREE, { default: FOG }]) => {
        if (disposed || !element.current) return;
        effect = FOG({
          el: element.current,
          THREE,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200,
          minWidth: 200,
          highlightColor: 0xf4c9d8,
          midtoneColor: 0xf8dfce,
          lowlightColor: 0xdfeab7,
          baseColor: 0xfffbf8,
          blurFactor: 0.72,
          speed: 0.55,
          zoom: 0.72,
        }) as VantaEffect;
      },
    );

    return () => {
      disposed = true;
      effect?.destroy();
    };
  }, []);

  return <div ref={element} className={className} aria-hidden="true" />;
}
