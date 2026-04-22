import { Link } from "wouter";
import { Server } from "lucide-react";
import { useLang } from "@/lib/use-lang";
import { Layout } from "@/components/layout";

export function Home() {
  const { t } = useLang();

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-6">
          <Server className="w-6 h-6 text-muted-foreground" />
        </div>

        <h1 className="text-3xl font-bold tracking-tight mb-3">
          NordSOCKS Self-Hosted
        </h1>
        <p className="text-muted-foreground max-w-sm mb-8 text-sm leading-relaxed">
          {t("sh_home_subtitle")}
        </p>

        <div className="flex items-center gap-3">
          <Link href="/register">
            <button className="bg-foreground text-background px-6 py-2.5 rounded-md text-sm font-medium hover:opacity-90 transition-opacity">
              {t("sh_home_get_started")}
            </button>
          </Link>
          <Link href="/login">
            <button className="border border-border px-6 py-2.5 rounded-md text-sm font-medium hover:bg-muted transition-colors">
              {t("sh_home_sign_in")}
            </button>
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg w-full text-left">
          {([
            ["sh_home_feat1_title", "sh_home_feat1_desc"],
            ["sh_home_feat2_title", "sh_home_feat2_desc"],
            ["sh_home_feat3_title", "sh_home_feat3_desc"],
          ] as const).map(([titleKey, descKey]) => (
            <div key={titleKey} className="p-4 rounded-lg border border-border bg-muted/30">
              <div className="font-medium text-sm mb-1">{t(titleKey)}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{t(descKey)}</div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
