import { useState, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Heart } from "lucide-react";
import { Layout } from "@/components/layout";
import { useLang } from "@/lib/use-lang";

const NETWORKS = [
  {
    id: "erc20",
    label: "USDC · ERC-20",
    chain: "Ethereum",
    symbol: "USDC",
    color: "#2775CA",
    address: "0xD7b2ADF52803081f00a6a980901E56cc14ae3b58",
  },
  {
    id: "spl",
    label: "USDC · Solana",
    chain: "Solana (SPL)",
    symbol: "USDC",
    color: "#9945FF",
    address: "G4Rez9D7J7ksXysYKBs1Et5z1neBLEP3ZExnFop5nP6t",
  },
  {
    id: "bep20",
    label: "USDC · BEP-20",
    chain: "BNB Smart Chain",
    symbol: "USDC",
    color: "#F0B90B",
    address: "0x04467B0407Cc0451C9A5d41Cac0d8bbc2A9c5F9e",
  },
] as const;

const AMOUNTS = ["1", "3", "5", "10", "25"];

function CopyAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(address);
      } else {
        const el = document.createElement("textarea");
        el.value = address;
        el.style.cssText = "position:absolute;opacity:0;width:1px;height:1px;";
        document.body.appendChild(el);
        el.focus();
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [address]);

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-3">
      <p className="flex-1 font-mono text-xs sm:text-sm text-foreground break-all select-all leading-relaxed">
        {address}
      </p>
      <button
        onClick={copy}
        className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Copy address"
      >
        {copied
          ? <Check className="h-4 w-4 text-emerald-500" />
          : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function Support() {
  const { t } = useLang();
  const [selectedId, setSelectedId] = useState<string>(NETWORKS[0].id);
  const [selectedAmount, setSelectedAmount] = useState<string | null>(null);

  const network = NETWORKS.find(n => n.id === selectedId) ?? NETWORKS[0];

  return (
    <Layout>
      <div className="max-w-lg mx-auto space-y-8 py-4">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-rose-500/10 mx-auto">
            <Heart className="h-7 w-7 text-rose-500" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("support_title")}</h1>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
            {t("support_desc")}
          </p>
        </div>

        {/* Network selector */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("support_select_network")}</p>
          <div className="grid grid-cols-3 gap-2">
            {NETWORKS.map(n => (
              <button
                key={n.id}
                onClick={() => setSelectedId(n.id)}
                className={`
                  flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-all
                  ${selectedId === n.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-card hover:border-primary/50 hover:bg-muted/40"}
                `}
              >
                <span className="text-[11px] font-bold leading-tight">{n.symbol}</span>
                <span className="text-[10px] text-muted-foreground leading-tight">{n.chain}</span>
              </button>
            ))}
          </div>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <QRCodeSVG
              value={network.address}
              size={200}
              bgColor="#ffffff"
              fgColor="#0f172a"
              level="M"
              includeMargin={false}
            />
          </div>
          <div className="text-center space-y-0.5">
            <p className="text-sm font-semibold">{network.label}</p>
            <p className="text-xs text-muted-foreground">{network.chain}</p>
          </div>
        </div>

        {/* Address */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("support_address")}</p>
          <CopyAddress address={network.address} />
        </div>

        {/* Suggested amounts */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("support_amount_hint")}</p>
          <div className="flex flex-wrap gap-2">
            {AMOUNTS.map(amt => (
              <button
                key={amt}
                onClick={() => setSelectedAmount(selectedAmount === amt ? null : amt)}
                className={`
                  rounded-full border px-4 py-1.5 text-sm font-medium transition-all
                  ${selectedAmount === amt
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:border-primary/50 hover:bg-muted/40 text-foreground"}
                `}
              >
                ${amt}
              </button>
            ))}
            <button
              onClick={() => setSelectedAmount(selectedAmount === "custom" ? null : "custom")}
              className={`
                rounded-full border px-4 py-1.5 text-sm font-medium transition-all
                ${selectedAmount === "custom"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:border-primary/50 hover:bg-muted/40 text-foreground"}
              `}
            >
              {t("support_custom")}
            </button>
          </div>
          {selectedAmount && selectedAmount !== "custom" && (
            <p className="text-xs text-muted-foreground">
              {t("support_send_hint").replace("{amount}", `$${selectedAmount} USDC`)}
            </p>
          )}
          {selectedAmount === "custom" && (
            <p className="text-xs text-muted-foreground">{t("support_custom_hint")}</p>
          )}
        </div>

        {/* Thank you note */}
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-4 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("support_thanks")}
          </p>
        </div>

      </div>
    </Layout>
  );
}
