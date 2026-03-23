"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Activity } from "lucide-react";

interface IncidentNavProps {
  title: string;
  slug: string;
}

const NAV_ITEMS = [
  { label: "Overview", href: (slug: string) => `/incident/${slug}` },
  { label: "Data", href: (slug: string) => `/incident/${slug}/dashboard` },
  { label: "Timeline", href: (slug: string) => `/incident/${slug}/timeline` },
] as const;

export function IncidentNav({ title, slug }: IncidentNavProps) {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === `/incident/${slug}`) {
      return pathname === `/incident/${slug}`;
    }
    return pathname.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-black">
      <div className="max-w-[1280px] mx-auto flex items-center justify-between gap-4 px-6 h-14">
        {/* Left: brand — matches AppHeader exactly */}
        <Link href="/" className="flex items-center gap-3 shrink-0 group">
          <div className="bg-black rounded-lg w-8 h-8 flex items-center justify-center transition-transform group-hover:scale-105 shadow-lg shadow-black/10">
            <Activity className="text-[#00FF85] w-4 h-4" />
          </div>
          <div className="flex flex-col -gap-1">
            <span className="text-lg font-black tracking-[0.01em] leading-none">
              Exposure
            </span>
            <span className="text-[7px] font-semibold text-black/35 tracking-[0.06em]">
              Risk Registry
            </span>
          </div>
        </Link>

        {/* Divider + incident context */}
        <div className="hidden md:flex items-center gap-2.5 shrink-0">
          <div className="w-px h-4 bg-black/10" />
          <span
            className="font-black text-black/40 truncate max-w-[180px] uppercase"
            style={{ fontSize: 9, letterSpacing: "0.06em" }}
          >
            {title}
          </span>
        </div>

        {/* Center: nav pills — matches AppHeader pill styling */}
        <nav className="flex items-center gap-1 flex-1 justify-center">
          {NAV_ITEMS.map((item) => {
            const href = item.href(slug);
            const active = isActive(href);
            return (
              <Link
                key={item.label}
                href={href}
                className="rounded-full transition-all duration-200"
                style={{
                  padding: "5px 14px",
                  backgroundColor: active ? "#000" : "transparent",
                  color: active ? "#fff" : "rgba(0,0,0,0.4)",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  border: active
                    ? "1px solid #000"
                    : "1px solid rgba(0,0,0,0.08)",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: active indicator + back */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="relative flex" style={{ width: 6, height: 6 }}>
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: "#E11D48" }}
              />
              <span
                className="relative inline-flex rounded-full"
                style={{ width: 6, height: 6, backgroundColor: "#E11D48" }}
              />
            </span>
            <span
              className="uppercase font-semibold text-black/40"
              style={{ fontSize: 8, letterSpacing: "0.12em" }}
            >
              Active
            </span>
          </div>

          <Link
            href="/"
            className="hidden md:flex items-center rounded-full transition-all duration-200 hover:border-black/20"
            style={{
              padding: "5px 14px",
              border: "1px solid rgba(0,0,0,0.08)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "rgba(0,0,0,0.35)",
            }}
          >
            Back
          </Link>
        </div>
      </div>
    </header>
  );
}
