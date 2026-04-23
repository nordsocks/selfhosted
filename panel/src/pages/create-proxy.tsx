import { useState, useRef, useEffect, useCallback, type CSSProperties } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateProxy, useGetCountries, useGetProxies } from "@/hooks/use-proxies";
import { Loader2, AlertTriangle, Info, ChevronDown, Search, Check, ExternalLink, KeyRound, RefreshCw, CheckCircle2, Server } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLang } from "@/lib/use-lang";

const MAX_ACTIVE_PROXIES = 10;

const createProxySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
  nordUser: z.string().min(1, "NordVPN Service Username is required"),
  nordPass: z.string().min(1, "NordVPN Service Password is required"),
  country: z.string().min(1, "Country is required"),
  city: z.string().optional(),
});

type CreateProxyValues = z.infer<typeof createProxySchema>;

function getFlagEmoji(countryCode: string) {
  if (!countryCode) return "";
  const codePoints = countryCode.toUpperCase().split("").map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

interface CountryOption {
  code: string;
  name: string;
}

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  countries: CountryOption[];
  loading?: boolean;
  placeholder?: string;
  loadingText?: string;
  disabled?: boolean;
}

function CountrySelect({ value, onChange, countries, loading, placeholder, loadingText, disabled }: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = countries.find((c) => c.code === value);

  const filtered = search.trim()
    ? countries.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.code.toLowerCase().includes(search.toLowerCase()),
      )
    : countries;

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropdownHeight = Math.min(320, spaceBelow > 200 ? spaceBelow - 8 : spaceAbove - 8);
    const openUpward = spaceBelow < 220 && spaceAbove > spaceBelow;

    setDropdownStyle({
      position: "fixed",
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
      ...(openUpward
        ? { bottom: viewportHeight - rect.top + 6, maxHeight: Math.min(320, spaceAbove - 8) }
        : { top: rect.bottom + 6, maxHeight: dropdownHeight }),
    });
  }, []);

  const handleOpen = useCallback(() => {
    if (disabled || loading) return;
    if (open) {
      setOpen(false);
      setSearch("");
      return;
    }
    updatePosition();
    setOpen(true);
    setSearch("");
    setTimeout(() => searchRef.current?.focus(), 10);
  }, [disabled, loading, open, updatePosition]);

  const handleSelect = useCallback(
    (code: string) => {
      onChange(code);
      setOpen(false);
      setSearch("");
    },
    [onChange],
  );

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
        setSearch("");
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); setSearch(""); }
    }
    function handleScrollOrResize() { updatePosition(); }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (open && listRef.current && value) {
      const item = listRef.current.querySelector(`[data-code="${value}"]`);
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [open, value]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        disabled={disabled || loading}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 h-10 rounded-md border text-sm transition-colors bg-background
          ${open ? "border-ring ring-1 ring-ring" : "border-input"}
          ${disabled || loading ? "opacity-50 cursor-not-allowed" : "hover:border-ring/60 cursor-pointer"}
        `}
      >
        <span className={`flex items-center gap-2 min-w-0 ${!selected ? "text-muted-foreground" : ""}`}>
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground flex-shrink-0" />
              <span className="truncate">{loadingText ?? "Loading…"}</span>
            </>
          ) : selected ? (
            <>
              <span className="text-base leading-none flex-shrink-0">{getFlagEmoji(selected.code)}</span>
              <span className="truncate">{selected.name}</span>
            </>
          ) : (
            <span className="truncate">{placeholder ?? "Select country…"}</span>
          )}
        </span>
        <ChevronDown
          className="h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className="rounded-xl border border-border bg-card shadow-xl overflow-hidden"
          style={{ ...dropdownStyle, animation: "lang-dropdown 0.15s cubic-bezier(0.16,1,0.3,1) both", display: "flex", flexDirection: "column" }}
        >
          <div className="p-2 border-b border-border flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country…"
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md bg-muted/50 border border-transparent focus:border-ring focus:outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div ref={listRef} className="overflow-y-auto overscroll-contain py-1 flex-1">
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">No countries found</p>
            ) : (
              filtered.map((c) => {
                const active = c.code === value;
                return (
                  <button
                    key={c.code}
                    data-code={c.code}
                    type="button"
                    onClick={() => handleSelect(c.code)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left
                      ${active ? "bg-primary/8 text-primary font-medium" : "hover:bg-muted/60 text-foreground"}
                    `}
                  >
                    <span className="text-base leading-none w-5 flex-shrink-0">{getFlagEmoji(c.code)}</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    {active && <Check className="h-3.5 w-3.5 flex-shrink-0 text-primary" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function CreateProxy() {
  const { t } = useLang();
  const { data: countries, isLoading: loadingCountries } = useGetCountries();
  const { data: proxies } = useGetProxies();
  const createProxy = useCreateProxy();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const activeCount = (proxies ?? []).filter(
    (p: { status: string }) => p.status !== "stopped" && p.status !== "error",
  ).length;
  const atLimit = activeCount >= MAX_ACTIVE_PROXIES;

  const form = useForm<CreateProxyValues>({
    resolver: zodResolver(createProxySchema),
    defaultValues: { name: "", nordUser: "", nordPass: "", country: "", city: "" },
  });

  const onSubmit = async (values: CreateProxyValues) => {
    try {
      await createProxy.mutateAsync({
        name: values.name,
        nordUser: values.nordUser,
        nordPass: values.nordPass,
        country: values.country,
        city: values.city || undefined,
      });
      toast({ title: t("create_success_title"), description: t("create_success_desc") });
      setLocation("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      toast({ title: t("create_fail"), description: msg, variant: "destructive" });
    }
  };

  const countryList: CountryOption[] = (countries ?? []).map((c: { code: string; name: string }) => ({
    code: c.code,
    name: c.name,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("create_title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("create_card_desc")}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          <Server className="h-3.5 w-3.5" />
          <span>{activeCount} / {MAX_ACTIVE_PROXIES} {t("create_info_title").toLowerCase()}</span>
        </div>
      </div>

      {atLimit && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("create_limit_title")}</AlertTitle>
          <AlertDescription>
            {t("create_limit_body")} <strong>10 {t("create_limit_body2")}</strong> {t("create_limit_body3")} <strong>{activeCount}</strong> {t("create_limit_body4")}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ── Main form ── */}
        <div className="lg:col-span-2 space-y-5">
          <Alert variant="default" className="bg-amber-500/10 text-amber-700 border-amber-500/30">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="font-semibold text-amber-700">{t("create_alert_creds_title")}</AlertTitle>
            <AlertDescription className="text-amber-700/90">
              {t("create_alert_creds_body")} <strong>{t("create_alert_creds_bold")}</strong> {t("create_alert_creds_body2")}
            </AlertDescription>
          </Alert>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-muted/20">
                  <h2 className="text-sm font-semibold">{t("create_card_title")}</h2>
                </div>

                <div className="p-5 space-y-5">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("create_name_label")}</FormLabel>
                        <Input placeholder={t("create_name_placeholder")} {...field} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="nordUser"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("create_nord_user")}</FormLabel>
                          <Input placeholder={t("create_nord_user_ph")} {...field} />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="nordPass"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("create_nord_pass")}</FormLabel>
                          <Input type="password" placeholder={t("create_nord_pass_ph")} {...field} />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Controller
                      control={form.control}
                      name="country"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{t("create_country")}</label>
                          <CountrySelect
                            value={field.value}
                            onChange={field.onChange}
                            countries={countryList}
                            loading={loadingCountries}
                            placeholder={t("create_country_ph")}
                            loadingText={t("create_country_loading")}
                            disabled={atLimit}
                          />
                          {fieldState.error && (
                            <p className="text-sm font-medium text-destructive">{fieldState.error.message}</p>
                          )}
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("create_city")}</FormLabel>
                          <Input placeholder={t("create_city_ph")} {...field} />
                          <FormDescription>{t("create_city_hint")}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="px-5 py-4 border-t border-border bg-muted/10 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setLocation("/")}>
                    {t("create_cancel")}
                  </Button>
                  <Button type="submit" disabled={createProxy.isPending || loadingCountries || atLimit}>
                    {createProxy.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {t("create_btn")}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </div>

        {/* ── Sidebar help ── */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3.5 border-b border-border bg-muted/20 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">{t("create_alert_creds_title")}</h3>
            </div>
            <div className="p-4 space-y-3.5">
              {[
                { n: "1", text: t("create_sidebar_step1") },
                { n: "2", text: t("create_sidebar_step2") },
                { n: "3", text: t("create_sidebar_step3") },
              ].map(({ n, text }) => (
                <div key={n} className="flex gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center mt-0.5">
                    {n}
                  </span>
                  <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
                </div>
              ))}
              <a
                href="https://my.nordaccount.com/dashboard/nordvpn/manual-configuration/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline mt-1"
              >
                <ExternalLink className="h-3 w-3" />
                {t("create_alert_creds_link")}
              </a>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3.5 border-b border-border bg-muted/20 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">{t("create_rotation_title")}</h3>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wide bg-primary/10 text-primary rounded-full px-2 py-0.5">
                {activeCount} / {MAX_ACTIVE_PROXIES}
              </span>
            </div>
            <div className="p-4 space-y-3.5">
              <p className="text-sm text-muted-foreground leading-relaxed">{t("create_rotation_body")}</p>
              <div className="rounded-lg bg-green-500/8 border border-green-500/25 p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                  <span className="text-xs font-semibold text-green-700 dark:text-green-400">{t("create_rotation_coming")}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pl-5">{t("create_rotation_auto")}</p>
              </div>
            </div>
          </div>

          <Alert variant="default" className="bg-blue-500/10 text-blue-700 border-blue-500/30">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700/90 text-xs leading-relaxed">
              {t("create_tip_city")}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}
