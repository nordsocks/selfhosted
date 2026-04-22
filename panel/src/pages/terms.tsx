import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useLang } from "@/lib/use-lang";
import { PublicLayout } from "@/components/public-layout";

export function Terms() {
  const { t } = useLang();

  return (
    <PublicLayout>
      <div className="space-y-6">
        <Card className="border-border shadow-sm">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-2xl">{t("terms_title")}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{t("terms_updated")}</p>
          </CardHeader>

          <CardContent className="prose prose-sm dark:prose-invert max-w-none py-6 space-y-6">

            <section>
              <h2 className="text-lg font-semibold mb-2">{t("terms_s1_title")}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {t("terms_s1_body")} <strong>{t("terms_s1_not")}</strong> {t("terms_s1_body2")}
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">{t("terms_s2_title")}</h2>
              <p className="text-muted-foreground leading-relaxed">{t("terms_s2_body")}</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
                <li>{t("terms_s2_l1")}</li>
                <li>{t("terms_s2_l2")}</li>
                <li>{t("terms_s2_l3")} <strong>{t("terms_s2_l3b")}</strong> {t("terms_s2_l3c")}</li>
                <li>{t("terms_s2_l4")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">{t("terms_s3_title")}</h2>
              <p className="text-muted-foreground leading-relaxed">{t("terms_s3_body")}</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
                <li>{t("terms_s3_l1")}</li>
                <li>{t("terms_s3_l2")}</li>
                <li>{t("terms_s3_l3")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">{t("terms_s4_title")}</h2>
              <p className="text-muted-foreground leading-relaxed">{t("terms_s4_body")}</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
                <li>{t("terms_s4_l1")}</li>
                <li>{t("terms_s4_l2")}</li>
                <li>{t("terms_s4_l3")}</li>
                <li>{t("terms_s4_l4")}</li>
                <li>{t("terms_s4_l5")}</li>
                <li>{t("terms_s4_l6")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">{t("terms_s5_title")}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {t("terms_s5_body")} <strong>{t("terms_s5_bold")}</strong> {t("terms_s5_body2")}
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">{t("terms_s6_title")}</h2>
              <p className="text-muted-foreground leading-relaxed">{t("terms_s6_body")}</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
                <li>{t("terms_s6_l1")}</li>
                <li>{t("terms_s6_l2")}</li>
                <li>{t("terms_s6_l3")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">{t("terms_s7_title")}</h2>
              <p className="text-muted-foreground leading-relaxed">{t("terms_s7_body")}</p>
            </section>

          </CardContent>
        </Card>

        <div className="flex justify-start">
          <Button variant="outline" asChild>
            <Link href="/register">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("terms_back")}
            </Link>
          </Button>
        </div>
      </div>
    </PublicLayout>
  );
}
