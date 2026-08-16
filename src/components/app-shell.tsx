import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  Activity,
  BookOpen,
  ClipboardList,
  Hammer,
  MessageSquare,
  MoreHorizontal,
  Plug,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { AuthSlot } from "@/components/auth-slot";
import { Mark } from "@/components/mark";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";

const PRIMARY = [
  { to: "/app", label: "Incident", icon: ShieldAlert, exact: true },
  { to: "/app/ask", label: "Ask", icon: MessageSquare },
  { to: "/app/inspector", label: "Inspector", icon: Hammer },
  { to: "/app/approvals", label: "Queue", icon: ShieldCheck },
] as const;

const MORE = [
  { to: "/app/sources", label: "Sources", icon: Plug },
  { to: "/app/audit", label: "Audit", icon: ClipboardList },
  { to: "/app/health", label: "Health", icon: Activity },
  { to: "/guide", label: "How to use", icon: BookOpen },
] as const;

function isActive(pathname: string, to: string, exact?: boolean) {
  if (exact || to === "/app") return pathname === "/app" || pathname === "/app/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function AppShell() {
  const { user, isPending } = useCurrentUserState();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [moreOpen, setMoreOpen] = useState(false);

  if (isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-10 w-40 animate-pulse rounded-md bg-elevated" />
      </div>
    );
  }
  if (!user) return <RedirectToSignIn />;

  const all = [...PRIMARY, ...MORE];

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border md:flex">
        <Link to="/" className="flex items-center gap-2.5 px-5 py-5">
          <Mark className="size-7" />
          <div>
            <p className="text-sm font-medium leading-none">Conduit</p>
            <p className="mt-1 text-[11px] text-subtle">KitePay · on-call</p>
          </div>
        </Link>
        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {all.map((item) => {
            const exact = "exact" in item && item.exact;
            const active = isActive(pathname, item.to, exact);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex h-11 items-center gap-2.5 rounded-md px-3 text-sm",
                  active
                    ? "bg-elevated text-foreground"
                    : "text-muted hover:bg-elevated/60 hover:text-foreground",
                )}
              >
                <item.icon className="size-4" strokeWidth={1.6} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border px-4 py-4">
          <AuthSlot compact />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-4 md:hidden">
          <Link to="/" className="flex items-center gap-2">
            <Mark className="size-6" />
            <span className="text-sm font-medium">Conduit</span>
          </Link>
          <AuthSlot compact />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto pb-20 md:pb-0">
          <Outlet />
        </div>
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur-sm md:hidden">
          <div className="grid grid-cols-5">
            {PRIMARY.map((item) => {
              const active = isActive(pathname, item.to, "exact" in item);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex h-14 flex-col items-center justify-center gap-0.5 text-[10px]",
                    active ? "text-foreground" : "text-subtle",
                  )}
                >
                  <item.icon className="size-4" strokeWidth={1.6} />
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className={cn(
                "flex h-14 flex-col items-center justify-center gap-0.5 text-[10px]",
                moreOpen ? "text-foreground" : "text-subtle",
              )}
            >
              <MoreHorizontal className="size-4" />
              More
            </button>
          </div>
          {moreOpen && (
            <div className="grid grid-cols-2 gap-1 border-t border-border px-3 py-3">
              {MORE.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className="flex h-11 items-center gap-2 rounded-md px-3 text-sm text-muted hover:bg-elevated"
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </nav>
      </div>
    </div>
  );
}
