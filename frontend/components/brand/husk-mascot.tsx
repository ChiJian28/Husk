"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import hiMascot from "@/assets/husk_mascot_hi.png";
import promptMascot from "@/assets/husk_mascot_prompt.png";
import protectionActiveMascot from "@/assets/husk_mascot_protection_active.png";
import { MASCOT, SPRING, type MascotMood } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function HuskMascot({
  mood = "normal",
  size = 220,
  className,
  priority = false,
}: {
  mood?: MascotMood;
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      layout
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      animate={reduce || !priority ? undefined : { y: [0, -4, 0] }}
      transition={reduce ? undefined : { duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
    >
      <motion.div
        key={mood}
        initial={reduce ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={SPRING}
        className="absolute inset-0"
      >
        <Image
          src={MASCOT[mood]}
          alt="Husk"
          fill
          priority={priority}
          sizes={`${size}px`}
          className="object-contain object-bottom"
        />
      </motion.div>
    </motion.div>
  );
}

export function HuskMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex size-9 shrink-0", className)}>
      <Image src={MASCOT.normal} alt="Husk" fill className="object-contain object-bottom" sizes="36px" />
    </span>
  );
}

export function HuskHiMark({
  className,
  size = 88,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src={hiMascot}
        alt="Husk"
        fill
        className="object-contain object-bottom"
        sizes={`${size}px`}
      />
    </span>
  );
}

export function HuskProtectionActiveMark({
  className,
  size = 180,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src={protectionActiveMascot}
        alt="Husk protection active"
        fill
        className="object-contain object-bottom"
        sizes={`${size}px`}
      />
    </span>
  );
}

export function HuskPromptMark({
  className,
  size = 32,
  rounded = "input",
}: {
  className?: string;
  size?: number;
  rounded?: "input" | "card" | "full";
}) {
  void rounded;

  return (
    <span
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src={promptMascot}
        alt="Husk"
        fill
        className="object-contain object-bottom"
        sizes={`${size}px`}
      />
    </span>
  );
}
