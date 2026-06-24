"use client";

import Image from "next/image";
import { clsx } from "@/lib/clsx";
import { event } from "@/lib/data/config";

export interface StepDef {
  key: string;
  title: string;
}

interface ShellProps {
  steps: StepDef[];
  index: number;
  canGoBack: boolean;
  onBack: () => void;
  children: React.ReactNode;
}

export function Shell({ steps, index, canGoBack, onBack, children }: ShellProps) {
  const current = steps[index];

  return (
    <div className="relative flex min-h-dvh flex-col">
      <header className="flex flex-none items-center gap-3 px-5 py-4 sm:px-8">
        <Image
          src="/verve-logo.png"
          alt="Verve Advisory"
          width={584}
          height={358}
          priority
          className="h-9 w-auto"
        />
        <span className="eyebrow ml-1 hidden text-faint sm:block">{event.edition}</span>
        <div className="ml-auto flex items-center gap-4">
          <span className="hidden font-mono text-[11px] tracking-widest text-faint sm:block">
            {current?.title}
          </span>
          <span className="font-mono text-[11px] tracking-widest text-muted">
            {String(index + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
          </span>
        </div>
      </header>

      <div className="flex flex-none items-center gap-3 px-5 sm:px-8">
        <div className="flex gap-1.5">
          {steps.map((s, i) => (
            <span
              key={s.key}
              aria-hidden
              className={clsx(
                "h-1.5 rounded-full transition-all duration-300",
                i === index ? "w-7 bg-gold" : i < index ? "w-1.5 bg-verve" : "w-1.5 bg-line",
              )}
            />
          ))}
        </div>
        {canGoBack && (
          <button
            type="button"
            onClick={onBack}
            className="ml-auto font-mono text-[11px] tracking-wider text-faint transition-colors hover:text-verve"
          >
            ← Back
          </button>
        )}
      </div>

      <main className="flex flex-1 flex-col items-center justify-center px-5 py-8 sm:px-8">
        {children}
      </main>
    </div>
  );
}
