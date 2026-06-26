"use client";

import { useReducedMotion } from "framer-motion";
import { clsx } from "@/lib/clsx";

interface GlassCardProps extends React.ComponentProps<"div"> {
  /**
   * Green "liquid glass" variant — used by the viewer's OWN team standings card
   * and the status / "Crew assembled." panel so they read as one surface.
   * Normal (white-tinted) variant is used for every other team's card.
   */
  accent?: boolean;
}

/*
  Frosted "liquid glass" shell: translucent 160deg gradient fill, hairline
  border, backdrop blur, and a slow diagonal sheen bar that sweeps across the
  card. Purely a box treatment — children render above the sheen (z-10). The
  sheen sweep is gated behind prefers-reduced-motion (no motion → static glass,
  border, and glow preserved). Pass padding/layout via className.
*/
export function GlassCard({ accent = false, className, children, style, ...props }: GlassCardProps) {
  const reduce = useReducedMotion();

  return (
    <div
      className={clsx("relative overflow-hidden rounded-[18px] border backdrop-blur-md", className)}
      style={{
        borderColor: accent ? "rgba(91,230,160,.40)" : "rgba(255,255,255,.09)",
        background: accent
          ? "linear-gradient(160deg, rgba(40,90,68,.30), rgba(18,28,46,.50))"
          : "linear-gradient(160deg, rgba(255,255,255,.06), rgba(18,28,46,.42))",
        boxShadow: accent ? "0 0 30px -8px rgba(91,230,160,.5)" : undefined,
        ...style,
      }}
      {...props}
    >
      {!reduce && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-[42%] animate-sheen"
          style={{
            background: accent
              ? "linear-gradient(90deg, transparent, rgba(91,230,160,.14), transparent)"
              : "linear-gradient(90deg, transparent, rgba(255,255,255,.13), transparent)",
          }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
