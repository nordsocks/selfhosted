import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Server, Loader2, AlertCircle } from "lucide-react";
import { useLang } from "@/lib/use-lang";
import { PublicLayout } from "@/components/public-layout";
import { PasswordInput } from "@/components/password-input";

const registerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  acceptedTerms: z.boolean().refine((v) => v === true, {
    message: "You must accept the Terms of Use to register",
  }),
});

type RegisterValues = z.infer<typeof registerSchema>;

export function Register() {
  const { register } = useAuth();
  const { t } = useLang();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", acceptedTerms: false },
  });

  const onSubmit = (values: RegisterValues) => {
    setError(null);
    register.mutate(
      { name: values.name, email: values.email, password: values.password },
      {
        onError: (err: any) => {
          setError(t("register_failed") + (err.message ? `: ${err.message}` : ""));
        },
      }
    );
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
              <CardTitle className="text-2xl font-bold tracking-tight">{t("register_title")}</CardTitle>
              <CardDescription className="text-muted-foreground">{t("register_subtitle")}</CardDescription>
            </CardHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                  {error && (
                    <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("register_name")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("register_name_placeholder")}
                            autoComplete="name"
                            {...field}
                            onChange={(e) => { field.onChange(e); setError(null); }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("register_email")}</FormLabel>
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
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("register_password")}</FormLabel>
                        <FormControl>
                          <PasswordInput
                            autoComplete="new-password"
                            {...field}
                            onChange={(e) => { field.onChange(e); setError(null); }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="acceptedTerms"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-border p-3 bg-muted/30">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-normal cursor-pointer">
                            {t("register_terms_text")}{" "}
                            <Link
                              href="/terms"
                              className="text-primary hover:underline font-medium"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {t("register_terms_link")}
                            </Link>
                            {t("register_terms_confirm")}
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                  <Button type="submit" className="w-full" disabled={register.isPending}>
                    {register.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {t("register_btn")}
                  </Button>
                  <div className="text-sm text-center text-muted-foreground">
                    {t("register_have_account")}{" "}
                    <Link href="/login" className="text-primary hover:underline font-medium">
                      {t("register_login_link")}
                    </Link>
                  </div>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </div>
      </div>
    </PublicLayout>
  );
}
