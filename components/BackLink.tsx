"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { clientCache } from "@/lib/client-cache";

export const LAST_SCANNER_URL_KEY = "scanner:lastUrl";

interface Props {
  fallbackHref: string;
  className?: string;
  children: React.ReactNode;
}

/** Returns to the scanner view (date, filters, tab) the user came from, else to fallbackHref. */
export default function BackLink({ fallbackHref, className, children }: Props) {
  const router = useRouter();
  return (
    <Link
      prefetch
      href={fallbackHref}
      className={className}
      onClick={(e) => {
        // Came here from the scanner in this tab: a real history back keeps its state and scroll
        if (clientCache.returnScrollY !== null) {
          e.preventDefault();
          router.back();
          return;
        }
        const last = sessionStorage.getItem(LAST_SCANNER_URL_KEY);
        // Only same-site paths, never protocol-relative URLs
        if (last && (last === "/" || last.startsWith("/?"))) {
          e.preventDefault();
          router.push(last);
        }
      }}
    >
      {children}
    </Link>
  );
}
