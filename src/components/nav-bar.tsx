"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Moon, Sun, Sparkles, NotebookPen, Flame, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { useTheme } from "@/lib/theme-provider";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Today", icon: Sparkles },
  { href: "/journal", label: "Journal", icon: NotebookPen },
  { href: "/habits", label: "Habits", icon: Flame },
];

export function NavBar({ user }: { user: { name: string } | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();

  async function handleSignOut() {
    await signOut({ redirect: false });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4 sm:px-8">
        <Link
          href="/"
          className="font-display text-xl italic tracking-tight text-text"
        >
          Daybook
        </Link>

        {user ? (
          <nav className="flex items-center gap-1 rounded-full bg-bg-subtle p-1">
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors sm:px-4",
                    active
                      ? "bg-surface text-text shadow-sm"
                      : "text-text-muted hover:text-text"
                  )}
                >
                  <Icon size={15} strokeWidth={2} />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </nav>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-1">
          <button
            onClick={toggle}
            aria-label="Toggle dark mode"
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-bg-subtle hover:text-text"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {user ? (
            <button
              onClick={handleSignOut}
              aria-label="Sign out"
              title={`Sign out (${user.name})`}
              className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-bg-subtle hover:text-text"
            >
              <LogOut size={16} />
            </button>
          ) : (
            pathname !== "/signin" && (
              <Link
                href="/signin"
                className="rounded-full px-3 py-1.5 text-sm text-text-muted transition-colors hover:text-text"
              >
                Sign in
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  );
}
