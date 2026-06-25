"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { clsx } from "@/lib/clsx";

type Variant = "gold" | "blue" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-display font-semibold text-[15px] px-7 py-4 lg:text-base lg:px-8 cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verve";

const variants: Record<Variant, string> = {
  gold: "bg-gold text-navy shadow-[0_16px_34px_-14px_rgba(224,164,54,0.7)] hover:bg-[color-mix(in_srgb,var(--color-gold)_82%,white)]",
  blue: "bg-verve text-white shadow-[0_16px_34px_-14px_rgba(47,107,255,0.6)] hover:bg-verve-glow",
  ghost: "bg-white text-ink border border-line hover:border-verve hover:text-verve",
};

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: Variant;
}

export function Button({ variant = "gold", className, children, ...props }: ButtonProps) {
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      className={clsx(base, variants[variant], className)}
      {...props}
    >
      {children}
    </motion.button>
  );
}
