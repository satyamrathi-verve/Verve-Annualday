"use client";

import Image from "next/image";
import { clsx } from "@/lib/clsx";

export interface StepDef {
  key: string;
  title: string;
}

interface ShellProps {
  steps: StepDef[];
  index: number;
  canGoBack: boolean;
  onBack: () => void;
  /** Optional top nav (page switcher) rendered on the right of the header. */
  nav?: React.ReactNode;
  children: React.ReactNode;
}

export function Shell({ steps, index, canGoBack, onBack, nav, children }: ShellProps) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <header className="flex flex-none items-center gap-4 px-5 py-5 sm:px-8 lg:gap-6 lg:px-12 lg:py-6">
        <Image
          src="/verve-logo.png"
          alt="Verve Advisory"
          width={720}
          height={250}
          priority
          className="h-12 w-auto sm:h-14 lg:h-16"
        />
        <div className="ml-auto flex items-center gap-3 lg:gap-5">
          {nav}
          {canGoBack && (
            <button
              type="button"
              onClick={onBack}
              className="font-mono text-sm tracking-widest text-faint transition-colors hover:text-verve lg:text-base"
            >
              ← Back
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-none items-center gap-3 px-5 sm:px-8 lg:px-12">
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
      </div>

      <main className="flex flex-1 flex-col items-center justify-center px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        {children}
      </main>
    </div>
  );
}
