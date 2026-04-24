import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setupApi } from "@/lib/api";
import { LangProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import NotFound from "@/pages/not-found";
import { Login } from "@/pages/login";
import { Register } from "@/pages/register";
import { Terms } from "@/pages/terms";
import { Home } from "@/pages/home";
import { Dashboard } from "@/pages/dashboard";
import { CreateProxy } from "@/pages/create-proxy";
import { Account } from "@/pages/account";
import { InstallGuide } from "@/pages/install-guide";
import { Support } from "@/pages/support";
import { ProtectedRoute } from "@/components/protected-route";
import { Layout } from "@/components/layout";

setupApi();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    }
  }
});

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/terms" component={Terms} />
      <Route path="/install" component={InstallGuide} />
      <Route path="/support" component={Support} />

      <Route path="/" component={Home} />

      <Route path="/dashboard">
        {() => (
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/proxies/new">
        {() => (
          <ProtectedRoute>
            <Layout>
              <CreateProxy />
            </Layout>
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/account">
        {() => (
          <ProtectedRoute>
            <Layout>
              <Account />
            </Layout>
          </ProtectedRoute>
        )}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
    <LangProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </LangProvider>
    </ThemeProvider>
  );
}

export default App;
