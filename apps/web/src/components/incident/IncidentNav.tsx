"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

interface IncidentNavProps {
  title: string;
  slug: string;
}

export function IncidentNav({ title, slug }: IncidentNavProps) {
  const pathname = usePathname();

  const isDashboard = pathname.endsWith("/dashboard");
  const isVault = pathname.includes("/vault/");
  const isStory = !isDashboard && !isVault;

  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 md:px-6"
      style={{
        backgroundColor: "#09090b",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Left: title */}
      <span className="font-semibold text-white text-sm truncate max-w-[180px] md:max-w-xs">
        {title}
      </span>

      {/* Center: nav links */}
      <nav className="flex items-center gap-1">
        <Link
          href={`/incident/${slug}`}
          className="px-3 py-1.5 text-sm transition-colors rounded"
          style={{
            color: isStory ? "white" : "rgba(255,255,255,0.5)",
            borderBottom: isStory ? "2px solid white" : "2px solid transparent",
          }}
        >
          Story
        </Link>
        <Link
          href={`/incident/${slug}/dashboard`}
          className="px-3 py-1.5 text-sm transition-colors rounded"
          style={{
            color: isDashboard ? "white" : "rgba(255,255,255,0.5)",
            borderBottom: isDashboard
              ? "2px solid white"
              : "2px solid transparent",
          }}
        >
          Dashboard
        </Link>
      </nav>

      {/* Right: back link */}
      <Link
        href="/"
        className="text-sm transition-colors whitespace-nowrap"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        ← Back to Exposure
      </Link>
    </header>
  );
}
