/*
  Fixed full-screen film-grain overlay. Fractal-noise SVG painted across the
  viewport, overlay-blended at ~4.5% (see .grain-overlay in globals.css) so it
  adds texture without washing the palette. Purely decorative + non-interactive.
*/
export function Grain() {
  return (
    <svg className="grain-overlay" aria-hidden focusable="false" preserveAspectRatio="none">
      <filter id="verve-grain">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.82"
          numOctaves={2}
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#verve-grain)" />
    </svg>
  );
}
