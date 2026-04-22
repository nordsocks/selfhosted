import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useAccountProfile,
  useChangeEmail,
  useChangePassword,
  useSetup2FA,
  useEnable2FA,
  useDisable2FA,
} from "@/hooks/use-account";
import { useToast } from "@/hooks/use-toast";
import { PasswordInput } from "@/components/password-input";
import {
  Loader2,
  User,
  Lock,
  ShieldCheck,
  ShieldOff,
  Copy,
} from "lucide-react";
import { useLang } from "@/lib/use-lang";

type Tab = "profile" | "security";

const changeEmailSchema = z.object({
  newEmail: z.string().email("Invalid email"),
  currentPassword: z.string().min(1, "Required"),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Required"),
  newPassword: z.string().min(6, "At least 6 characters"),
  confirmPassword: z.string().min(1, "Required"),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors w-full text-left
        ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-muted/20">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function ProfileTab() {
  const { t } = useLang();
  const { data: profile, isLoading } = useAccountProfile();
  const changeEmail = useChangeEmail();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof changeEmailSchema>>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: { newEmail: "", currentPassword: "" },
  });

  const onSubmit = async (values: z.infer<typeof changeEmailSchema>) => {
    try {
      await changeEmail.mutateAsync(values);
      toast({ title: t("acc_email_updated"), description: t("acc_email_updated_desc") });
      form.reset();
    } catch (err: unknown) {
      toast({ title: t("acc_failed"), description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-5">
      <SectionCard title={t("acc_info_title")}>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground mb-1">{t("acc_info_name")}</p>
            <p className="font-medium">{profile?.name}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">{t("acc_info_email_label")}</p>
            <p className="font-medium">{profile?.email}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">{t("acc_info_role")}</p>
            <span className="inline-flex px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium uppercase tracking-wide">
              {profile?.role}
            </span>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">{t("acc_info_since")}</p>
            <p className="font-medium">{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—"}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title={t("acc_change_email_title")}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="newEmail" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("acc_new_email")}</FormLabel>
                <FormControl><Input type="email" placeholder="new@example.com" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="currentPassword" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("acc_current_password")}</FormLabel>
                <FormControl><PasswordInput placeholder="Confirm with your password" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex justify-end">
              <Button type="submit" disabled={changeEmail.isPending}>
                {changeEmail.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {t("acc_update_email")}
              </Button>
            </div>
          </form>
        </Form>
      </SectionCard>
    </div>
  );
}

function SecurityTab() {
  const { t } = useLang();
  const { data: profile } = useAccountProfile();
  const changePassword = useChangePassword();
  const setup2FA = useSetup2FA();
  const enable2FA = useEnable2FA();
  const disable2FA = useDisable2FA();
  const { toast } = useToast();

  const [qrData, setQrData] = useState<{ secret: string; qrDataUrl: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [copied, setCopied] = useState(false);

  const pwForm = useForm<z.infer<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onChangePassword = async (values: z.infer<typeof changePasswordSchema>) => {
    try {
      await changePassword.mutateAsync({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      toast({ title: t("acc_password_updated") });
      pwForm.reset();
    } catch (err: unknown) {
      toast({ title: t("acc_failed"), description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    }
  };

  const handleSetup2FA = async () => {
    try {
      const data = await setup2FA.mutateAsync();
      setQrData({ secret: data.secret, qrDataUrl: data.qrDataUrl });
      setVerifyCode("");
    } catch (err: unknown) {
      toast({ title: t("acc_failed"), description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    }
  };

  const handleEnable2FA = async () => {
    try {
      await enable2FA.mutateAsync({ code: verifyCode });
      toast({ title: t("acc_2fa_enabled_toast"), description: t("acc_2fa_enabled_toast_desc") });
      setQrData(null);
      setVerifyCode("");
    } catch (err: unknown) {
      toast({ title: t("acc_2fa_invalid_code"), description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    }
  };

  const handleDisable2FA = async () => {
    try {
      await disable2FA.mutateAsync({ currentPassword: disablePassword });
      toast({ title: t("acc_2fa_disabled_toast") });
      setDisablePassword("");
    } catch (err: unknown) {
      toast({ title: t("acc_failed"), description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    }
  };

  const copySecret = () => {
    if (qrData) {
      navigator.clipboard.writeText(qrData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-5">
      <SectionCard title={t("acc_change_password_title")}>
        <Form {...pwForm}>
          <form onSubmit={pwForm.handleSubmit(onChangePassword)} className="space-y-4">
            <FormField control={pwForm.control} name="currentPassword" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("acc_current_password")}</FormLabel>
                <FormControl><PasswordInput {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={pwForm.control} name="newPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("acc_new_password")}</FormLabel>
                  <FormControl><PasswordInput autoComplete="new-password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={pwForm.control} name="confirmPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("acc_confirm_password")}</FormLabel>
                  <FormControl><PasswordInput autoComplete="new-password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={changePassword.isPending}>
                {changePassword.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {t("acc_change_password_btn")}
              </Button>
            </div>
          </form>
        </Form>
      </SectionCard>

      <SectionCard title={t("acc_2fa_title")}>
        {profile?.twoFaEnabled ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <ShieldCheck className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-700">{t("acc_2fa_on_status")}</p>
                <p className="text-xs text-green-600/80">{t("acc_2fa_on_desc")}</p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("acc_2fa_disable_confirm")}</label>
              <PasswordInput
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder={t("acc_2fa_disable_ph")}
              />
            </div>
            <Button variant="destructive" onClick={handleDisable2FA} disabled={disable2FA.isPending || !disablePassword}>
              {disable2FA.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <ShieldOff className="h-4 w-4 mr-2" />
              {t("acc_2fa_disable_btn")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <ShieldOff className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-700">{t("acc_2fa_off_status")}</p>
                <p className="text-xs text-amber-600/80">{t("acc_2fa_off_desc")}</p>
              </div>
            </div>
            {!qrData ? (
              <Button onClick={handleSetup2FA} disabled={setup2FA.isPending}>
                {setup2FA.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                <ShieldCheck className="h-4 w-4 mr-2" />
                {t("acc_2fa_setup_btn")}
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border border-border bg-muted/20">
                  <img src={qrData.qrDataUrl} alt="QR Code" className="w-32 h-32 rounded-lg border border-border bg-white p-1" />
                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <p className="text-sm font-medium">{t("acc_2fa_scan_label")}</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs font-mono bg-background px-2 py-1.5 rounded border border-border break-all">{qrData.secret}</code>
                      <Button variant="outline" size="icon" onClick={copySecret} className="flex-shrink-0">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {copied && <p className="text-xs text-green-600">{t("acc_2fa_copied")}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("acc_2fa_verify_label")}</label>
                  <Input
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                    className="font-mono tracking-widest text-center text-lg w-36"
                  />
                </div>
                <Button onClick={handleEnable2FA} disabled={enable2FA.isPending || verifyCode.length !== 6}>
                  {enable2FA.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  {t("acc_2fa_enable_btn")}
                </Button>
              </div>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

export function Account() {
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>("profile");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
      <div className="lg:col-span-1">
        <div className="rounded-xl border border-border bg-card p-3 space-y-1">
          <div className="px-3 py-2 mb-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{t("acc_title")}</p>
          </div>
          <TabButton active={tab === "profile"} onClick={() => setTab("profile")}>
            <User className="h-4 w-4" /> {t("acc_tab_profile")}
          </TabButton>
          <TabButton active={tab === "security"} onClick={() => setTab("security")}>
            <Lock className="h-4 w-4" /> {t("acc_tab_security")}
          </TabButton>
        </div>
      </div>

      <div className="lg:col-span-3">
        {tab === "profile" && <ProfileTab />}
        {tab === "security" && <SecurityTab />}
      </div>
    </div>
  );
}
