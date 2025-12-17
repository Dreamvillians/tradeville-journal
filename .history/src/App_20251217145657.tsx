// App.tsx
import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import MarketTicker from "./components/MarketTicker";

// Lazy‑loaded pages & layout
const Layout = lazy(() => import("./components/Layout"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Journal = lazy(() => import("./pages/Journal"));
const Playbook = lazy(() => import("./pages/Playbook"));
const Analytics = lazy(() => import("./pages/Analytics"));
const GoalsHabits = lazy(() => import("./pages/GoalsHabits"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Protected Layout wrapper component
const ProtectedLayout = () => (
  <ProtectedRoute>
    <Layout>
      <Outlet />
    </Layout>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          {/* Global ticker (only one instance will render even if used elsewhere) */}
          <MarketTicker />

          {/* Push page content below the fixed ticker (h-9 / h-10) */}
          <div className="pt-9 sm:pt-10">
            <Suspense
              fallback={
                <div className="flex h-[calc(100vh-2.5rem)] items-center justify-center text-xs sm:text-sm text-muted-foreground">
                  Loading…
                </div>
              }
            >
              <Routes>
                {/* Public route - no Layout (but WITH Market Ticker) */}
                <Route path="/auth" element={<Auth />} />

                {/* Protected routes - with Layout */}
                <Route element={<ProtectedLayout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/journal" element={<Journal />} />
                  <Route path="/playbook" element={<Playbook />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/goals-habits" element={<GoalsHabits />} />
                </Route>

                {/* Catch-all 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;