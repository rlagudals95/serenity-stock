import type { ReactNode } from "react";

type Tone = "positive" | "negative" | "mixed" | "neutral" | "accent";

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return <span className={`status-pill status-pill--${tone}`}>{children}</span>;
}
