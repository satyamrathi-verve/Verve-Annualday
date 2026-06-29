"use client";

import { clsx } from "@/lib/clsx";

export interface NavItem {
  key: string;
  label: string;
  onClick: () => void;
  active: boolean;
  /** Dimmed + non-clickable (e.g. a page the host hasn't opened yet). */
  disabled?: boolean;
}

/*
  Shared top navigation. Used for the player funnel (Whispers / Briefing / The
  Wheel) and the super-admin dashboard sections (live / manage / sign-ins).
  Disabled items render dimmed so players can see what's coming without reaching
  it early.
*/
export function NavBar({ items }: { items: NavItem[] }) {
  if (items.length === 0) return null;
  return (
    <nav className="flex flex-wrap items-center gap-1.5">
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={it.disabled ? undefined : it.onClick}
          disabled={it.disabled}
          aria-current={it.active ? "page" : undefined}
          className={clsx(
            "rounded-lg px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors lg:text-[11px]",
            it.active
              ? "bg-verve-soft text-verve"
              : it.disabled
                ? "cursor-not-allowed text-faint/40"
                : "text-faint hover:text-verve",
          )}
          title={it.disabled ? "Opens when the host unlocks it" : undefined}
        >
          {it.label}
        </button>
      ))}
    </nav>
  );
}
