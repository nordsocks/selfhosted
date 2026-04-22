import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Server, LogOut, LayoutDashboard, PlusCircle, UserCircle } from "lucide-react";
import { useLang } from "@/lib/use-lang";
import { LangSelector } from "@/components/lang-selector";

interface LayoutProps {
  children: React.ReactNode;
  noPadding?: boolean;
}

export function Layout({ children, noPadding = false }: LayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { t } = useLang();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 font-bold text-base select-none">
              <Server className="h-5 w-5" />
              NordSOCKS Self-Hosted
            </Link>
            {user && (
              <nav className="flex items-center space-x-1">
                <Link href="/dashboard">
                  <Button variant={location === "/dashboard" ? "secondary" : "ghost"} size="sm" className="gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    {t("nav_dashboard")}
                  </Button>
                </Link>
                <Link href="/proxies/new">
                  <Button variant={location === "/proxies/new" ? "secondary" : "ghost"} size="sm" className="gap-2">
                    <PlusCircle className="h-4 w-4" />
                    {t("nav_new_proxy")}
                  </Button>
                </Link>
                <Link href="/account">
                  <Button variant={location === "/account" ? "secondary" : "ghost"} size="sm" className="gap-2">
                    <UserCircle className="h-4 w-4" />
                    {t("acc_title")}
                  </Button>
                </Link>
              </nav>
            )}
          </div>
          <div className="flex items-center gap-3">
            <LangSelector variant="nav" />
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
          <div className="max-w-6xl mx-auto px-4 py-8">
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
          </div>
          <div className="flex items-center gap-4">
            <span>© {new Date().getFullYear()} NordSOCKS. {t("land_footer_rights")}</span>
            <Link href="/terms">
              <span className="underline underline-offset-2 hover:text-foreground transition-colors cursor-pointer">
                {t("land_footer_terms")}
              </span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
