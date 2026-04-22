import { useState, useCallback, useEffect, type ReactNode } from "react";
import { LangContext, translations, type Lang, type TranslationKey, type ExtraLang } from "./lang-context";

export { type Lang, type TranslationKey, type ExtraLang } from "./lang-context";

function applyTheme(theme: { light?: Record<string, string>; dark?: Record<string, string> }) {
  const existing = document.getElementById("cms-theme-overrides");
  if (existing) existing.remove();
  const lightKeys = Object.keys(theme.light ?? {});
  const darkKeys = Object.keys(theme.dark ?? {});
  if (lightKeys.length === 0 && darkKeys.length === 0) return;
  const style = document.createElement("style");
  style.id = "cms-theme-overrides";
  let css = "";
  if (lightKeys.length > 0) {
    css += `:root {\n${lightKeys.map((k) => `  --${k}: ${theme.light![k]};`).join("\n")}\n}\n`;
  }
  if (darkKeys.length > 0) {
    css += `.dark {\n${darkKeys.map((k) => `  --${k}: ${theme.dark![k]};`).join("\n")}\n}\n`;
  }
  style.textContent = css;
  document.head.appendChild(style);
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<string>(() => {
    return localStorage.getItem("lang") || "en";
  });
  const [overrides, setOverrides] = useState<Record<string, Record<string, string>>>({});
  const [extraLangs, setExtraLangs] = useState<ExtraLang[]>([]);

  const API_BASE = import.meta.env.BASE_URL + "api";

  const loadOverrides = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/public/content-overrides`);
      if (!res.ok) return;
      const data = await res.json() as {
        overrides?: Record<string, Record<string, string>>;
        theme?: { light?: Record<string, string>; dark?: Record<string, string> };
      };
      if (data.overrides) setOverrides(data.overrides);
      if (data.theme) applyTheme(data.theme);
    } catch {
    }
  }, []);

  const loadExtraLangs = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/public/extra-langs`);
      if (!res.ok) return;
      const data = await res.json() as { langs: ExtraLang[] };
      setExtraLangs(data.langs ?? []);
    } catch {
    }
  }, []);

  useEffect(() => {
    loadOverrides();
    loadExtraLangs();
  }, [loadOverrides, loadExtraLangs]);

  const setLang = useCallback((l: string) => {
    localStorage.setItem("lang", l);
    setLangState(l);
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      const override = overrides[lang]?.[key];
      if (override !== undefined && override !== "") return override;
      if (lang in translations) {
        return (translations[lang as Lang] as Record<string, string>)[key] ?? (translations.en as Record<string, string>)[key] ?? key;
      }
      return (translations.en as Record<string, string>)[key] ?? key;
    },
    [lang, overrides],
  );

  return (
    <LangContext.Provider value={{ lang, setLang, t, overrides, refreshOverrides: loadOverrides, extraLangs, refreshExtraLangs: loadExtraLangs }}>
      {children}
    </LangContext.Provider>
  );
}
