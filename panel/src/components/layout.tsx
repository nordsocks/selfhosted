import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Server, LogOut, LayoutDashboard, PlusCircle, UserCircle, Sun, Moon, Heart } from "lucide-react";
import { useLang } from "@/lib/use-lang";
import { LangSelector } from "@/components/lang-selector";
import { useTheme } from "@/lib/theme";

interface LayoutProps {
  children: React.ReactNode;
  noPadding?: boolean;
}

export function Layout({ children, noPadding = false }: LayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { t } = useLang();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2">

          {/* Logo */}
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 font-bold text-sm sm:text-base select-none shrink-0">
            <Server className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden xs:inline sm:inline">NordSOCKS</span>
            <span className="hidden sm:inline text-muted-foreground font-normal">Self-Hosted</span>
          </Link>

          {/* Nav links — icon-only on mobile, icon+text on desktop */}
          {user && (
            <nav className="flex items-center gap-0.5 sm:gap-1">
              <Link href="/dashboard">
                <Button variant={location === "/dashboard" ? "secondary" : "ghost"} size="sm" className="gap-1.5 px-2 sm:px-3">
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("nav_dashboard")}</span>
                </Button>
              </Link>
              <Link href="/proxies/new">
                <Button variant={location === "/proxies/new" ? "secondary" : "ghost"} size="sm" className="gap-1.5 px-2 sm:px-3">
                  <PlusCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("nav_new_proxy")}</span>
                </Button>
              </Link>
              <Link href="/account">
                <Button variant={location === "/account" ? "secondary" : "ghost"} size="sm" className="gap-1.5 px-2 sm:px-3">
                  <UserCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("acc_title")}</span>
                </Button>
              </Link>
            </nav>
          )}

          {/* Right side: theme toggle + lang + support + logout */}
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            <button
              onClick={toggleTheme}
              title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <LangSelector variant="nav" />
            <Link href="/support">
              <button
                title={t("support_nav")}
                className="p-1.5 rounded-md text-rose-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
              >
                <Heart className="h-4 w-4" />
              </button>
            </Link>
            {user ? (
              <button
                onClick={() => logout()}
                title={t("nav_logout")}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            ) : (
              <>
                <Link href="/login">
                  <button className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:inline">
                    {t("land_nav_login")}
                  </button>
                </Link>
                <Link href="/register">
                  <button className="text-sm font-semibold px-3.5 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                    {t("land_nav_register")}
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {noPadding ? children : (
          <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
            {children}
          </div>
        )}
      </main>

      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Server className="h-3.5 w-3.5" />
            <span className="font-semibold text-foreground">NordSOCKS</span>
            <span>·</span>
            <span>{t("land_footer_desc")}</span>
            <span>·</span>
            <a
              href="https://nordsocks.pro"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline underline-offset-2 transition-colors"
            >
              nordsocks.pro
            </a>
          </div>
          <div className="flex items-center gap-4">
            <span>© {new Date().getFullYear()} NordSOCKS. {t("land_footer_rights")}</span>
            <Link href="/terms">
              <span className="underline underline-offset-2 hover:text-foreground transition-colors cursor-pointer">
                {t("land_footer_terms")}
              </span>
            </Link>
            <Link href="/support">
              <span className="flex items-center gap-1 text-rose-400 hover:text-rose-500 transition-colors cursor-pointer">
                <Heart className="h-3 w-3" />
                {t("support_nav")}
              </span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
