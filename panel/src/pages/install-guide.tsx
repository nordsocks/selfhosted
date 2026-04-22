import { useState, useEffect } from "react";
import { Server, Terminal, Download, Settings2, Play, ChevronRight, Package, Monitor, Globe, RotateCw, Languages, Container, Database, Copy, Check } from "lucide-react";
import { useLang } from "@/lib/use-lang";
import { PublicLayout } from "@/components/public-layout";
import type { TranslationKey } from "@/lib/lang-context";

type PublicBanner = {
  id: number;
  imageUrl: string;
  linkUrl: string;
  altText: string;
};

function BannerRotation() {
  const [data, setData] = useState<{ banners: PublicBanner[]; rotationMs: number } | null>(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    fetch("/api/public/banners")
      .then(r => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!data || data.banners.length <= 1) return;
    const timer = setInterval(() => {
      setIdx(i => (i + 1) % data.banners.length);
    }, data.rotationMs ?? 5000);
    return () => clearInterval(timer);
  }, [data]);

  if (!data || data.banners.length === 0) return null;

  return (
    <div className="flex justify-center">
      <div
        className="relative overflow-hidden rounded-xl border border-border bg-muted/10 shadow-sm"
        style={{ width: "100%", maxWidth: 728, height: 90 }}
      >
        {data.banners.map((b, i) => (
          <a
            key={b.id}
            href={b.linkUrl || undefined}
            target={b.linkUrl ? "_blank" : undefined}
            rel="noopener noreferrer"
            className={`absolute inset-0 transition-opacity duration-700 ${i === idx ? "opacity-100 z-10" : "opacity-0 z-0"}`}
            tabIndex={i === idx ? 0 : -1}
            aria-hidden={i !== idx}
          >
            <img
              src={b.imageUrl}
              alt={b.altText || "banner"}
              className="w-full h-full object-cover"
              draggable={false}
            />
          </a>
        ))}
        {data.banners.length > 1 && (
          <div className="absolute bottom-1.5 right-2 z-20 flex gap-1">
            {data.banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? "bg-white scale-125" : "bg-white/50"}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const GITHUB_REPO = "https://github.com/YOUR_USERNAME/nordsocks";

const ENV_VAR_KEYS: {
  key: string;
  required: boolean;
  example: string;
  descKey: TranslationKey;
}[] = [
  { key: "NORD_USER",      required: true,  example: "your@email.com",                 descKey: "install_env_desc_nord_user" },
  { key: "NORD_PASS",      required: true,  example: "yourpassword",                   descKey: "install_env_desc_nord_pass" },
  { key: "SESSION_SECRET", required: true,  example: "$(openssl rand -hex 32)",        descKey: "install_env_desc_session" },
  { key: "DATABASE_URL",   required: true,  example: "postgresql://user:pass@host/db", descKey: "install_env_desc_db_url" },
  { key: "PORT",           required: false, example: "3001",                           descKey: "install_env_desc_port" },
  { key: "WEB_PORT",       required: false, example: "80",                             descKey: "install_env_desc_web_port" },
];

function CodeBlock({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(children).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="relative group">
      <pre className="bg-zinc-950 text-emerald-400 font-mono text-sm rounded-xl p-4 pr-12 overflow-x-auto border border-zinc-800 whitespace-pre-wrap leading-relaxed">
        {children}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
        title={copied ? "Copied!" : "Copy"}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function CmdBlock({ labelKey, children }: { labelKey: TranslationKey; children: string }) {
  const { t } = useLang();
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-0.5">{t(labelKey)}</p>
      <CodeBlock>{children}</CodeBlock>
    </div>
  );
}

function FileCard({ name, href }: { name: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors text-sm font-medium"
    >
      <Download className="h-4 w-4 text-primary flex-shrink-0" />
      {name}
    </a>
  );
}

interface StepProps {
  n: number;
  icon: React.ElementType;
  title: string;
  desc: string;
  last?: boolean;
  children: React.ReactNode;
}

function Step({ n, icon: Icon, title, desc, last, children }: StepProps) {
  const { t } = useLang();
  return (
    <div className="flex gap-5">
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        {!last && <div className="flex-1 w-px bg-border min-h-[2rem]" />}
      </div>
      <div className={`min-w-0 flex-1 ${last ? "pb-0" : "pb-10"}`}>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">{t("install_step_label")} {n}</p>
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{desc}</p>
        {children}
      </div>
    </div>
  );
}

export function InstallGuide() {
  const { t } = useLang();

  const whatFeatures: { icon: React.ElementType; key: TranslationKey }[] = [
    { icon: Monitor,   key: "install_what_f1" },
    { icon: RotateCw,  key: "install_what_f2" },
    { icon: Globe,     key: "install_what_f3" },
    { icon: Languages, key: "install_what_f4" },
  ];

  const requirements: { labelKey?: TranslationKey; labelFixed?: string; noteKey: TranslationKey }[] = [
    { labelKey:   "install_req_hardware", noteKey: "install_req_hardware_note" },
    { labelFixed: "Linux VPS",            noteKey: "install_req_linux_note" },
    { labelFixed: "Docker 24+",           noteKey: "install_req_docker_note" },
    { labelFixed: "Docker Compose v2",    noteKey: "install_req_compose_note" },
    { labelFixed: "PostgreSQL 15+",       noteKey: "install_req_postgres_note" },
    { labelKey:   "install_req_nord",     noteKey: "install_req_nord_note" },
    { labelKey:   "install_req_port",     noteKey: "install_req_port_note" },
  ];

  const troubleItems: [TranslationKey, TranslationKey][] = [
    ["install_trouble_1_q", "install_trouble_1_a"],
    ["install_trouble_2_q", "install_trouble_2_a"],
    ["install_trouble_3_q", "install_trouble_3_a"],
    ["install_trouble_4_q", "install_trouble_4_a"],
  ];

  return (
    <PublicLayout>
      <div className="space-y-6">

        {/* Title */}
        <div className="rounded-2xl border border-border bg-card p-8">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            <Server className="h-3.5 w-3.5" />
            {t("install_selfhosted_badge")}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">{t("install_title")}</h1>
          <p className="text-muted-foreground leading-relaxed">{t("install_subtitle")}</p>
        </div>

        {/* Banner rotation 728×90 */}
        <BannerRotation />

        {/* What you'll get */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
          <h2 className="font-semibold text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            {t("install_what_title")}
          </h2>
          <p className="text-sm text-emerald-700/80 dark:text-emerald-400/80 mb-5">{t("install_what_desc")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {whatFeatures.map(({ icon: Icon, key }) => (
              <div key={key} className="flex items-start gap-3 bg-card rounded-xl border border-border p-3.5">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-sm leading-relaxed pt-1">{t(key)}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-card border border-border p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">{t("install_dash_preview")}</p>
            <div className="space-y-2">
              {[
                { flag: "🇺🇸", name: "US-East",      port: "11201", ip: "185.93.2.71",    status: "running" },
                { flag: "🇩🇪", name: "DE-Berlin",    port: "11202", ip: "95.179.242.10",  status: "running" },
                { flag: "🇳🇱", name: "NL-Amsterdam", port: "11203", ip: "145.14.145.20",  status: "stopped" },
              ].map((row) => (
                <div key={row.port} className="flex items-center gap-3 bg-muted/40 rounded-lg px-3 py-2 text-xs font-mono">
                  <span className="text-base">{row.flag}</span>
                  <span className="font-medium text-sm font-sans flex-1">{row.name}</span>
                  <span className="text-muted-foreground">{row.ip}:{row.port}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${row.status === "running" ? "bg-green-500/10 text-green-600" : "bg-gray-500/10 text-gray-500"}`}>
                    {row.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Requirements */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {t("install_req_title")}
          </h2>
          <ul className="space-y-2">
            {requirements.map(({ labelKey, labelFixed, noteKey }) => (
              <li key={labelFixed ?? labelKey} className="flex items-start gap-2 text-sm">
                <ChevronRight className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>
                  <span className="font-medium">{labelKey ? t(labelKey) : labelFixed}</span>
                  <span className="text-muted-foreground ml-1">({t(noteKey)})</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Steps */}
        <div className="rounded-2xl border border-border bg-card p-6">

          {/* Step 1 — Docker */}
          <Step n={1} icon={Container} title={t("install_docker_step_title")} desc={t("install_docker_step_desc")}>
            <div className="space-y-3">
              <CmdBlock labelKey="install_cmd_install_docker">{`curl -fsSL https://get.docker.com | sh`}</CmdBlock>
              <CmdBlock labelKey="install_cmd_verify">{`docker --version\ndocker compose version`}</CmdBlock>
            </div>
            <div className="mt-3 rounded-xl bg-blue-500/5 border border-blue-500/20 p-3 text-xs text-blue-700 dark:text-blue-400">
              {t("install_docker_skip")}
            </div>
          </Step>

          {/* Step 2 — PostgreSQL */}
          <Step n={2} icon={Database} title={t("install_db_step_title")} desc={t("install_db_step_desc")}>
            <div className="space-y-4">
              {/* Option A */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-1.5">{t("install_db_option_a")}</p>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{t("install_db_option_a_note")}</p>
                <CodeBlock>{`DATABASE_URL=postgresql://nordsocks:nordsocks@db:5432/nordsocks`}</CodeBlock>
              </div>
              {/* Option B */}
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-sm font-semibold mb-1.5">{t("install_db_option_b")}</p>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{t("install_db_option_b_note")}</p>
                <CodeBlock>{`DATABASE_URL=postgresql://user:password@hostname:5432/dbname`}</CodeBlock>
              </div>
            </div>
          </Step>

          {/* Step 3 — Download */}
          <Step n={3} icon={Download} title={t("install_step1_title")} desc={t("install_step1_desc")}>
            <div className="flex flex-wrap gap-3 mb-4">
              <FileCard name="docker-compose.yml" href={`${GITHUB_REPO}/blob/main/docker-compose.yml`} />
              <FileCard name=".env.example"       href={`${GITHUB_REPO}/blob/main/.env.example`} />
              <FileCard name="Dockerfile"         href={`${GITHUB_REPO}/blob/main/Dockerfile`} />
              <FileCard name="Dockerfile.web"     href={`${GITHUB_REPO}/blob/main/Dockerfile.web`} />
              <FileCard name="nginx.conf"         href={`${GITHUB_REPO}/blob/main/nginx.conf`} />
            </div>
            <p className="text-xs text-muted-foreground mb-2">{t("install_or_clone")}</p>
            <div className="space-y-3">
              <CmdBlock labelKey="install_cmd_clone">{`git clone ${GITHUB_REPO}.git nordsocks`}</CmdBlock>
              <CodeBlock>{`cd nordsocks`}</CodeBlock>
            </div>
          </Step>

          {/* Step 4 — Configure */}
          <Step n={4} icon={Settings2} title={t("install_step2_title")} desc={t("install_step2_desc")}>
            <div className="space-y-3">
              <CmdBlock labelKey="install_cmd_copy_env">{`cp .env.example .env`}</CmdBlock>
              <CmdBlock labelKey="install_cmd_edit_env">{`nano .env`}</CmdBlock>
            </div>
            <div className="mt-5 rounded-xl border border-border overflow-hidden">
              <div className="bg-muted/50 px-4 py-2.5 border-b border-border">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("install_env_vars_title")}</span>
              </div>
              <div className="divide-y divide-border">
                {ENV_VAR_KEYS.map(({ key, required, example, descKey }) => (
                  <div key={key} className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2 mb-0.5">
                      <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{key}</code>
                      {required && (
                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-wide">{t("install_env_required")}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mb-0.5 opacity-60">{example}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{t(descKey)}</p>
                  </div>
                ))}
              </div>
            </div>
          </Step>

          {/* Step 5 — Launch */}
          <Step n={5} icon={Terminal} title={t("install_step3_title")} desc={t("install_step3_desc")}>
            <div className="space-y-3">
              <CmdBlock labelKey="install_cmd_start">{`docker compose up -d --build`}</CmdBlock>
              <CmdBlock labelKey="install_cmd_logs">{`docker compose logs -f`}</CmdBlock>
              <CmdBlock labelKey="install_cmd_status">{`docker compose ps`}</CmdBlock>
            </div>
            <div className="mt-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4 text-sm text-emerald-700 dark:text-emerald-400 leading-relaxed">
              {t("install_step3_info")}
            </div>
          </Step>

          {/* Step 6 — Manage */}
          <Step n={6} icon={Play} title={t("install_step4_title")} desc={t("install_step4_desc")} last>
            <div className="space-y-3">
              <CmdBlock labelKey="install_cmd_stop">{`docker compose down`}</CmdBlock>
              <CmdBlock labelKey="install_cmd_pull">{`git pull`}</CmdBlock>
              <CmdBlock labelKey="install_cmd_rebuild">{`docker compose up -d --build`}</CmdBlock>
              <CmdBlock labelKey="install_cmd_api_logs">{`docker compose logs api -f`}</CmdBlock>
            </div>
          </Step>
        </div>

        {/* Troubleshooting */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-semibold mb-5">{t("install_trouble_title")}</h2>
          <div className="space-y-5">
            {troubleItems.map(([qKey, aKey]) => (
              <div key={qKey} className="pb-5 border-b border-border last:border-0 last:pb-0">
                <p className="font-medium text-sm mb-1.5">{t(qKey)}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(aKey)}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </PublicLayout>
  );
}
