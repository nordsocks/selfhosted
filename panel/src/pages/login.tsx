import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useAuthStore } from "@/hooks/use-auth";
import { Server, Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { useLang } from "@/lib/use-lang";
import { PublicLayout } from "@/components/public-layout";
import { PasswordInput } from "@/components/password-input";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const twoFaSchema = z.object({
  code: z.string().length(6, "Must be 6 digits"),
});

type LoginValues = z.infer<typeof loginSchema>;
type TwoFaValues = z.infer<typeof twoFaSchema>;

const API_BASE = import.meta.env.BASE_URL + "api";

export function Login() {
  const { setToken } = useAuthStore();
  const { t } = useLang();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();

  const [error, setError] = useState<string | null>(null);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [isPending2fa, setIsPending2fa] = useState(false);
  const [twoFaError, setTwoFaError] = useState<string | null>(null);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const twoFaForm = useForm<TwoFaValues>({
    resolver: zodResolver(twoFaSchema),
    defaultValues: { code: "" },
  });

  const onSubmit = async (values: LoginValues) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(t("login_invalid"));
        return;
      }

      if (data.requiresTwoFa) {
        setTempToken(data.tempToken);
        return;
      }

      localStorage.setItem("auth_token", data.token);
      setToken(data.token);
      qc.setQueryData(["me"], data.user);
      setLocation("/dashboard");
    } catch {
      setError(t("login_invalid"));
    }
  };

  const onVerify2FA = async (values: TwoFaValues) => {
    setTwoFaError(null);
    setIsPending2fa(true);
    try {
      const res = await fetch(`${API_BASE}/auth/2fa/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempToken, code: values.code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setTwoFaError(data.error || data.message || "Invalid code. Please try again.");
        return;
      }

      localStorage.setItem("auth_token", data.token);
      setToken(data.token);
      qc.setQueryData(["me"], data.user);
      setLocation("/dashboard");
    } catch {
      setTwoFaError("Something went wrong. Please try again.");
    } finally {
      setIsPending2fa(false);
    }
  };

  return (
    <PublicLayout>
      <div className="flex items-center justify-center py-12">
        <div className="w-full max-w-md">
          <Card className="border-border shadow-lg">
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-4">
                <Server className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight">
                {tempToken ? "Two-Factor Authentication" : t("login_title")}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {tempToken ? "Enter the 6-digit code from your authenticator app" : t("login_subtitle")}
              </CardDescription>
            </CardHeader>

            {tempToken ? (
              <Form {...twoFaForm}>
                <form onSubmit={twoFaForm.handleSubmit(onVerify2FA)}>
                  <CardContent className="space-y-4">
                    <div className="flex justify-center">
                      <ShieldCheck className="h-12 w-12 text-primary/60" />
                    </div>
                    {twoFaError && (
                      <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>{twoFaError}</span>
                      </div>
                    )}
                    <FormField control={twoFaForm.control} name="code" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="sr-only">Code</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            placeholder="000000"
                            className="text-center text-2xl font-mono tracking-widest h-14"
                            maxLength={6}
                            autoFocus
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </CardContent>
                  <CardFooter className="flex flex-col space-y-3">
                    <Button type="submit" className="w-full" disabled={isPending2fa}>
                      {isPending2fa && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Verify
                    </Button>
                    <button
                      type="button"
                      onClick={() => { setTempToken(null); setTwoFaError(null); twoFaForm.reset(); }}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      ← Back to login
                    </button>
                  </CardFooter>
                </form>
              </Form>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <CardContent className="space-y-4">
                    {error && (
                      <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("login_email")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="admin@example.com"
                            type="email"
                            autoComplete="email"
                            {...field}
                            onChange={(e) => { field.onChange(e); setError(null); }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("login_password")}</FormLabel>
                        <FormControl>
                          <PasswordInput
                            autoComplete="current-password"
                            {...field}
                            onChange={(e) => { field.onChange(e); setError(null); }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </CardContent>
                  <CardFooter className="flex flex-col space-y-4">
                    <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      {t("login_btn")}
                    </Button>
                    <div className="text-sm text-center text-muted-foreground">
                      {t("login_no_account")}{" "}
                      <Link href="/register" className="text-primary hover:underline font-medium">
                        {t("login_register_link")}
                      </Link>
                    </div>
                  </CardFooter>
                </form>
              </Form>
            )}
          </Card>
        </div>
      </div>
    </PublicLayout>
  );
}
