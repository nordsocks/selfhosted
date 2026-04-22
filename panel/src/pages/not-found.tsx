import { Link } from "wouter";
import { AlertCircle } from "lucide-react";
import { PublicLayout } from "@/components/public-layout";

export default function NotFound() {
  return (
    <PublicLayout>
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-4xl font-bold tracking-tight">404</h1>
        <p className="text-muted-foreground text-lg">Page not found.</p>
        <Link href="/" className="text-primary hover:underline text-sm font-medium mt-2">
          ← Back to home
        </Link>
      </div>
    </PublicLayout>
  );
}
