import { useState, useRef, useEffect } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import { useLang } from "@/lib/use-lang";
import { LANG_LABELS, type Lang } from "@/lib/lang-context";

interface LangSelectorProps {
  variant?: "default" | "nav";
}

export function LangSelector({ variant: _variant = "default" }: LangSelectorProps) {
  const { lang, setLang, extraLangs } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  const allLangs: [string, string][] = [
    ...(Object.entries(LANG_LABELS) as [string, string][]),
    ...extraLangs.map((l) => [l.code, l.label] as [string, string]),
  ];

  const currentLabel =
    (LANG_LABELS as Record<string, string>)[lang] ??
    extraLangs.find((l) => l.code === lang)?.label ??
    lang.toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted/60 transition-all duration-150 select-none"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="tracking-wide">{currentLabel}</span>
        <ChevronDown
          className="h-3 w-3 text-muted-foreground transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 z-[200] min-w-[110px] rounded-xl border border-border bg-card shadow-xl overflow-hidden"
          style={{ animation: "lang-dropdown 0.15s cubic-bezier(0.16,1,0.3,1) both" }}
          role="listbox"
        >
          <div className="py-1">
            {allLangs.map(([code, label]) => {
              const active = lang === code;
              return (
                <button
                  key={code}
                  role="option"
                  aria-selected={active}
                  onClick={() => { setLang(code); setOpen(false); }}
                  className={`w-full flex items-center justify-between gap-3 px-3.5 py-2 text-xs transition-colors duration-100 ${
                    active
                      ? "bg-primary/8 text-primary font-semibold"
                      : "text-foreground/80 hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  <span>{label}</span>
                  {active && <Check className="h-3 w-3 text-primary flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
