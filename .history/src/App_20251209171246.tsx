// App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Journal from "./pages/Journal";
import Playbook from "./pages/Playbook";
import Analytics from "./pages/Analytics";
import GoalsHabits from "./pages/GoalsHabits";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// ⬇️ NEW: import the ticker
import MarketTicker from "./components/MarketTicker";

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
          {/* ⬇️ Ticker is now global, shown on all routes */}
          <MarketTicker />

          {/* ⬇️ Push all page content below the fixed ticker (h-9 / h-10) */}
          <div className="pt-9 sm:pt-10">
            <Routes>
              {/* Public routes - No Layout (but now WITH Market Ticker) */}
              <Route path="/auth" element={<Auth />} />

              {/* Protected routes - With Layout (and global Market Ticker) */}
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
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;