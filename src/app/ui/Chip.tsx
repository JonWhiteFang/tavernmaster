import type { ReactNode } from "react";

type ChipTone = "default" | "success" | "error";

type ChipProps = {
  tone?: ChipTone;
  children: ReactNode;
  className?: string;
};

const toneClass: Record<ChipTone, string> = {
  default: "",
  success: "status-success",
  error: "status-error"
};

export default function Chip({ tone = "default", children, className }: ChipProps) {
  const classes = ["status-chip", toneClass[tone], className].filter(Boolean).join(" ");
  return <span className={classes}>{children}</span>;
}
