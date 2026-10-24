import { callCategory } from "@/lib/call-category";
import type { Call } from "@/lib/types";

interface Props {
  call: Call;
  className?: string;
}

/** Scenario emoji for a call, with an accessible label and tooltip. */
export default function CallTypeIcon({ call, className = "" }: Props) {
  const category = callCategory(call);
  return (
    <span
      role="img"
      aria-label={category.label}
      title={category.label}
      className={`inline-flex shrink-0 items-center justify-center leading-none ${className}`}
    >
      {category.icon}
    </span>
  );
}
