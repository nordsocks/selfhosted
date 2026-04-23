import { useGetProxies, PROXIES_QUERY_KEY, useStartProxy, useStopProxy, useRestartProxy, useDeleteProxy, useGetConnectionString, useGetCountries, useChangeCountry, useGetProxyLogs, useSetRotation, useSetSocks5Credentials, useSetAllowedIps, type Proxy } from "@/hooks/use-proxies";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Square, RotateCw, Globe, Key, Trash2, TerminalSquare, Copy, Check, Timer, Plus, Eye, EyeOff, UserCog, ShieldCheck, X } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useLang } from "@/lib/use-lang";

function getFlagEmoji(code: string) {
  return String.fromCodePoint(...code.toUpperCase().split("").map((c) => 127397 + c.charCodeAt(0)));
}

function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  const el = document.createElement("textarea");
  el.value = text;
  el.style.position = "absolute";
  el.style.left = "-9999px";
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
  return Promise.resolve();
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useLang();
  const map: Record<string, { color: string; key: "status_running" | "status_starting" | "status_stopped" | "status_error" }> = {
    running: { color: "bg-green-500/10 text-green-500 hover:bg-green-500/20", key: "status_running" },
    starting: { color: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20", key: "status_starting" },
    stopped: { color: "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20", key: "status_stopped" },
    error: { color: "bg-red-500/10 text-red-500 hover:bg-red-500/20", key: "status_error" },
  };
  const config = map[status];
  return (
    <Badge className={`${config?.color ?? "bg-gray-500/10 text-gray-500"} border-none shadow-none`}>
      {config ? t(config.key) : status}
    </Badge>
  );
}

export function Dashboard() {
  const { t } = useLang();
  const { data: proxies, isLoading } = useGetProxies();

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const startProxy = useStartProxy();
  const stopProxy = useStopProxy();
  const restartProxy = useRestartProxy();
  const deleteProxy = useDeleteProxy();

  const [activeProxy, setActiveProxy] = useState<Proxy | null>(null);
  const [showConnString, setShowConnString] = useState(false);
  const [showChangeCountry, setShowChangeCountry] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showRotation, setShowRotation] = useState(false);
  const [showChangeCredentials, setShowChangeCredentials] = useState(false);
  const [showIpWhitelist, setShowIpWhitelist] = useState(false);

  const handleAction = async (action: any, id: string, name: string) => {
    try {
      await action.mutateAsync({ id });
      toast({ title: `${t("dash_cmd_sent")} ${name}` });
      queryClient.invalidateQueries({ queryKey: PROXIES_QUERY_KEY });
    } catch (err: any) {
      toast({ title: `${t("dash_error_on")} ${name}`, description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`${t("dash_delete_confirm")} ${name}?`)) {
      handleAction(deleteProxy, id, name);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">{t("dash_title")}</h1>
        <Link href="/proxies/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            {t("nav_new_proxy")}
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : proxies?.length === 0 ? (
        <div className="text-center p-12 border border-dashed rounded-lg bg-card text-muted-foreground">
          <p>{t("dash_empty")}</p>
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>{t("dash_col_name")}</TableHead>
                <TableHead>{t("dash_col_location")}</TableHead>
                <TableHead>{t("dash_col_port")}</TableHead>
                <TableHead>{t("dash_col_ip")}</TableHead>
                <TableHead>{t("dash_col_status")}</TableHead>
                <TableHead>{t("dash_col_created")}</TableHead>
                <TableHead className="text-right">{t("dash_col_actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proxies?.map((proxy) => (
                <TableRow key={proxy.id}>
                  <TableCell className="font-medium">{proxy.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-lg" title={proxy.country}>{getFlagEmoji(proxy.country)}</span>
                      <span>{proxy.countryName}{proxy.city ? ` (${proxy.city})` : ''}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">{proxy.externalPort}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">{proxy.publicIp || "—"}</TableCell>
                  <TableCell><StatusBadge status={proxy.status} /></TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(proxy.createdAt), "MMM d, HH:mm")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {proxy.status !== "running" && proxy.status !== "starting" && (
                        <Button variant="ghost" size="icon" onClick={() => handleAction(startProxy, proxy.id, proxy.name)} disabled={startProxy.isPending} title={t("dash_action_start")}>
                          <Play className="h-4 w-4 text-green-500" />
                        </Button>
                      )}
                      {proxy.status === "running" && (
                        <Button variant="ghost" size="icon" onClick={() => handleAction(stopProxy, proxy.id, proxy.name)} disabled={stopProxy.isPending} title={t("dash_action_stop")}>
                          <Square className="h-4 w-4 text-gray-500" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleAction(restartProxy, proxy.id, proxy.name)} disabled={restartProxy.isPending} title={t("dash_action_restart")}>
                        <RotateCw className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setActiveProxy(proxy); setShowChangeCountry(true); }} title={t("dash_action_country")}>
                        <Globe className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setActiveProxy(proxy); setShowRotation(true); }}
                        title={t("rotation_action")}
                        className={proxy.rotationInterval > 0 ? "text-amber-500 hover:text-amber-600" : ""}
                      >
                        <Timer className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setActiveProxy(proxy); setShowConnString(true); }} title={t("dash_action_conn")}>
                        <Key className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setActiveProxy(proxy); setShowChangeCredentials(true); }} title="Сменить учётные данные">
                        <UserCog className="h-4 w-4 text-violet-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setActiveProxy(proxy); setShowIpWhitelist(true); }} title="IP-вайтлист" className={proxy.allowedIps && proxy.allowedIps.length > 0 ? "text-emerald-500 hover:text-emerald-600" : ""}>
                        <ShieldCheck className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setActiveProxy(proxy); setShowLogs(true); }} title={t("dash_action_logs")}>
                        <TerminalSquare className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(proxy.id, proxy.name)} disabled={deleteProxy.isPending} title={t("dash_action_delete")}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {activeProxy && (
        <>
          <ConnectionStringModal open={showConnString} onOpenChange={setShowConnString} proxyId={activeProxy.id} proxyName={activeProxy.name} />
          <ChangeCountryModal open={showChangeCountry} onOpenChange={setShowChangeCountry} proxy={activeProxy} />
          <ProxyLogsModal open={showLogs} onOpenChange={setShowLogs} proxyId={activeProxy.id} proxyName={activeProxy.name} />
          <RotationModal open={showRotation} onOpenChange={setShowRotation} proxy={activeProxy} />
          <Socks5CredentialsModal open={showChangeCredentials} onOpenChange={setShowChangeCredentials} proxy={activeProxy} />
          <IpWhitelistModal open={showIpWhitelist} onOpenChange={setShowIpWhitelist} proxy={activeProxy} />
        </>
      )}
    </div>
  );
}

function CopyField({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(() => {
    copyToClipboard(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [value]);

  const display = secret && !visible ? "•".repeat(Math.min(value.length, 16)) : value;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide">{label}</p>
        <p className="font-mono text-sm text-foreground truncate select-all">{display}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {secret && (
          <button
            type="button"
            onClick={() => setVisible(v => !v)}
            className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        )}
        <button
          type="button"
          onClick={onCopy}
          className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

function ConnectionStringModal({ open, onOpenChange, proxyId, proxyName }: { open: boolean; onOpenChange: (o: boolean) => void; proxyId: string; proxyName: string }) {
  const { t } = useLang();
  const { data, isLoading } = useGetConnectionString(proxyId, { enabled: open });
  const [copiedFull, setCopiedFull] = useState(false);

  const onCopyFull = useCallback(() => {
    if (data) {
      copyToClipboard(data.proxyString).then(() => {
        setCopiedFull(true);
        setTimeout(() => setCopiedFull(false), 2000);
      });
    }
  }, [data]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl w-full" style={{ animation: "dialog-mac 0.22s cubic-bezier(0.34,1.56,0.64,1) both" }}>
        <DialogHeader className="pb-1">
          <DialogTitle className="text-base">{t("conn_title")} — {proxyName}</DialogTitle>
          <DialogDescription className="text-red-500 font-medium text-xs">{t("conn_warning")}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : data ? (
          <div className="space-y-3 pt-1">
            <div className="relative group">
              <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
                <p className="text-[11px] font-medium text-muted-foreground mb-1 uppercase tracking-wide">{t("conn_copy")}</p>
                <p className="font-mono text-xs text-foreground break-all leading-relaxed select-all">{data.proxyString}</p>
              </div>
              <button
                type="button"
                onClick={onCopyFull}
                className="absolute top-2.5 right-2.5 h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              >
                {copiedFull ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <CopyField label={t("conn_ip")} value={data.ip} />
              <CopyField label={t("conn_port")} value={String(data.port)} />
            </div>
            {data.authMode === "credentials" && data.socks5User && data.socks5Pass ? (
              <div className="grid grid-cols-2 gap-2">
                <CopyField label={t("conn_user")} value={data.socks5User} />
                <CopyField label={t("conn_pass")} value={data.socks5Pass} secret />
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5 text-sm text-emerald-600">
                Авторизация не требуется — доступ по IP-адресу
              </div>
            )}
          </div>
        ) : (
          <div className="text-destructive text-sm p-4 bg-destructive/10 rounded-md border border-destructive/20">{t("conn_fail")}</div>
        )}
      </DialogContent>
    </Dialog>
  );
}



function ChangeCountryModal({ open, onOpenChange, proxy }: { open: boolean; onOpenChange: (o: boolean) => void; proxy: Proxy }) {
  const { t } = useLang();
  const { data: countries } = useGetCountries({ enabled: open });
  const [selectedCountry, setSelectedCountry] = useState<string>(proxy.country);
  const [city, setCity] = useState(proxy.city || "");
  const changeCountry = useChangeCountry();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const onSubmit = async () => {
    try {
      await changeCountry.mutateAsync({ id: proxy.id, data: { country: selectedCountry, city: city || undefined } });
      toast({ title: t("country_success") });
      queryClient.invalidateQueries({ queryKey: PROXIES_QUERY_KEY });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: t("country_fail"), description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ animation: "dialog-mac 0.22s cubic-bezier(0.34,1.56,0.64,1) both" }}>
        <DialogHeader>
          <DialogTitle>{t("country_title")} — {proxy.name}</DialogTitle>
          <DialogDescription>{t("country_desc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("country_label")}</label>
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger>
                <SelectValue placeholder={t("country_label")} />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {countries?.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {getFlagEmoji(c.code)} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("country_city_label")}</label>
            <Input value={city} onChange={e => setCity(e.target.value)} placeholder={t("country_city_placeholder")} />
            <p className="text-xs text-muted-foreground">{t("country_city_hint")}</p>
          </div>
        </div>
        <Button onClick={onSubmit} disabled={changeCountry.isPending} className="w-full">
          {changeCountry.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {t("country_btn")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function ProxyLogsModal({ open, onOpenChange, proxyId, proxyName }: { open: boolean; onOpenChange: (o: boolean) => void; proxyId: string; proxyName: string }) {
  const { t } = useLang();
  const { data, isLoading } = useGetProxyLogs(proxyId, { enabled: open });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col" style={{ animation: "dialog-mac 0.22s cubic-bezier(0.34,1.56,0.64,1) both" }}>
        <DialogHeader>
          <DialogTitle>{t("logs_title")} — {proxyName}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 bg-black text-green-500 font-mono text-xs p-4 rounded-md overflow-y-auto mt-4 border border-border">
          {isLoading ? (
            <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin text-white" /></div>
          ) : data ? (
            <pre className="whitespace-pre-wrap">{data.logs || t("logs_empty")}</pre>
          ) : (
            <div className="text-red-500">{t("logs_fail")}</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RotationModal({ open, onOpenChange, proxy }: { open: boolean; onOpenChange: (o: boolean) => void; proxy: Proxy }) {
  const { t } = useLang();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedInterval, setSelectedInterval] = useState(String(proxy.rotationInterval ?? 0));
  const [saving, setSaving] = useState(false);

  const INTERVALS: { value: string; key: "rotation_off" | "rotation_5m" | "rotation_10m" | "rotation_30m" | "rotation_1h" | "rotation_2h" | "rotation_4h" | "rotation_8h" | "rotation_24h" }[] = [
    { value: "0",    key: "rotation_off" },
    { value: "5",    key: "rotation_5m" },
    { value: "10",   key: "rotation_10m" },
    { value: "30",   key: "rotation_30m" },
    { value: "60",   key: "rotation_1h" },
    { value: "120",  key: "rotation_2h" },
    { value: "240",  key: "rotation_4h" },
    { value: "480",  key: "rotation_8h" },
    { value: "1440", key: "rotation_24h" },
  ];

  const onSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/proxies/${proxy.id}/rotation`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ rotationInterval: parseInt(selectedInterval, 10) }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: t("rotation_success") });
      queryClient.invalidateQueries({ queryKey: PROXIES_QUERY_KEY });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: t("rotation_fail"), description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ animation: "dialog-mac 0.22s cubic-bezier(0.34,1.56,0.64,1) both" }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-amber-500" />
            {t("rotation_title")} — {proxy.name}
          </DialogTitle>
          <DialogDescription>{t("rotation_desc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-4">
          {proxy.rotationInterval > 0 && proxy.rotationNextAt && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <Timer className="h-4 w-4 flex-shrink-0" />
              <span>{t("rotation_next_at")} <strong>{format(new Date(proxy.rotationNextAt), "MMM d, HH:mm")}</strong></span>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {INTERVALS.map(({ value, key }) => (
              <button
                key={value}
                onClick={() => setSelectedInterval(value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors
                  ${selectedInterval === value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-foreground hover:bg-muted"
                  }`}
              >
                {t(key)}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={onSave} disabled={saving} className="w-full">
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {t("rotation_save")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function Socks5CredentialsModal({ open, onOpenChange, proxy }: { open: boolean; onOpenChange: (o: boolean) => void; proxy: Proxy }) {
  const setSocks5Credentials = useSetSocks5Credentials();
  const { toast } = useToast();
  const [socks5User, setSocks5User] = useState("");
  const [socks5Pass, setSocks5Pass] = useState("");
  const [showPass, setShowPass] = useState(false);

  const onSave = async () => {
    if (!socks5User.trim() || !socks5Pass.trim()) return;
    try {
      await setSocks5Credentials.mutateAsync({ id: proxy.id, socks5User: socks5User.trim(), socks5Pass: socks5Pass.trim() });
      toast({ title: "Логин/пароль прокси обновлён, прокси перезапускается" });
      setSocks5User(""); setSocks5Pass("");
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    }
  };

  const onRemove = async () => {
    try {
      await setSocks5Credentials.mutateAsync({ id: proxy.id, socks5User: null, socks5Pass: null });
      toast({ title: "Авторизация отключена — прокси без логина/пароля" });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" style={{ animation: "dialog-mac 0.22s cubic-bezier(0.34,1.56,0.64,1) both" }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-violet-500" />
            Логин/пароль прокси — {proxy.name}
          </DialogTitle>
          <DialogDescription>
            Логин и пароль для подключения к SOCKS5 прокси. Не путайте с NordVPN учётными данными.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Логин</label>
            <Input value={socks5User} onChange={e => setSocks5User(e.target.value)} placeholder="Произвольный логин" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Пароль</label>
            <div className="relative">
              <Input
                type={showPass ? "text" : "password"}
                value={socks5Pass}
                onChange={e => setSocks5Pass(e.target.value)}
                placeholder="Произвольный пароль"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {proxy.hasSocks5Creds && (
            <Button variant="outline" onClick={onRemove} disabled={setSocks5Credentials.isPending} className="flex-1">
              Убрать авторизацию
            </Button>
          )}
          <Button onClick={onSave} disabled={setSocks5Credentials.isPending || !socks5User.trim() || !socks5Pass.trim()} className="flex-1">
            {setSocks5Credentials.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Сохранить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function IpWhitelistModal({ open, onOpenChange, proxy }: { open: boolean; onOpenChange: (o: boolean) => void; proxy: Proxy }) {
  const setAllowedIps = useSetAllowedIps();
  const { toast } = useToast();
  const [ips, setIps] = useState<string[]>([]);
  const [newIp, setNewIp] = useState("");

  useEffect(() => {
    if (open) setIps(proxy.allowedIps ?? []);
  }, [open, proxy.allowedIps]);

  const addIp = () => {
    const trimmed = newIp.trim();
    if (trimmed && !ips.includes(trimmed)) {
      setIps(prev => [...prev, trimmed]);
    }
    setNewIp("");
  };

  const removeIp = (ip: string) => setIps(prev => prev.filter(i => i !== ip));

  const onSave = async () => {
    try {
      await setAllowedIps.mutateAsync({ id: proxy.id, allowedIps: ips.length > 0 ? ips : null });
      toast({ title: ips.length > 0 ? `IP-вайтлист обновлён (${ips.length} IP)` : "IP-вайтлист отключён — прокси открыт" });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    }
  };

  const isValidIp = (v: string) => /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(v.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" style={{ animation: "dialog-mac 0.22s cubic-bezier(0.34,1.56,0.64,1) both" }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            IP-вайтлист — {proxy.name}
          </DialogTitle>
          <DialogDescription>
            Прокси будет доступен без логина/пароля, но только с указанных IP-адресов. Оставьте список пустым — прокси будет открыт.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex gap-2">
            <Input
              value={newIp}
              onChange={e => setNewIp(e.target.value)}
              placeholder="192.168.1.100 или 10.0.0.0/24"
              onKeyDown={e => e.key === "Enter" && addIp()}
            />
            <Button variant="secondary" onClick={addIp} disabled={!isValidIp(newIp)}>
              Добавить
            </Button>
          </div>
          {ips.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-3 border border-dashed rounded-lg">
              Список пуст — прокси открыт для всех
            </p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {ips.map(ip => (
                <div key={ip} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 border border-border">
                  <span className="font-mono text-sm">{ip}</span>
                  <button type="button" onClick={() => removeIp(ip)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <Button onClick={onSave} disabled={setAllowedIps.isPending} className="w-full">
          {setAllowedIps.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Сохранить
        </Button>
      </DialogContent>
    </Dialog>
  );
}
