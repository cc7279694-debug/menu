"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { APP_ROUTES } from "@/features/navigation/routes";
import { PROJECT_META } from "@/lib/project-meta";
import { cn } from "@/lib/utils";

export function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-dvh w-64 border-r bg-card p-5 md:block">
      <div className="mb-8 text-xl font-semibold">{PROJECT_META.name}</div>
      <nav aria-label="桌面主导航" className="space-y-1">
        {APP_ROUTES.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm",
                active && "bg-accent font-medium text-accent-foreground",
              )}
              href={href}
              key={href}
            >
              <Icon aria-hidden="true" className="size-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
