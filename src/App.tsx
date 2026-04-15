import { lazy, Suspense } from "react";
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "./components/layout/AppLayout";
import AlarmOverlay from "./components/alarm/AlarmOverlay";
import AlarmChecker from "./components/alarm/AlarmChecker";
import KeyboardShortcutsHelp from "./components/layout/KeyboardShortcutsHelp";
import OnboardingModal from "./components/onboarding/OnboardingModal";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useTauriEvents } from "./hooks/useTauriEvents";
import { useLanguageSync } from "./hooks/useLanguageSync";

// Eagerly loaded (P0 — always visible)
import Index from "./pages/Index";
import Alarms from "./pages/Alarms";

// Lazy loaded (P1-P2 — visited less frequently)
const Settings = lazy(() => import("./pages/Settings"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Sleep = lazy(() => import("./pages/Sleep"));
const Personalization = lazy(() => import("./pages/Personalization"));
const ErrorLog = lazy(() => import("./pages/ErrorLog"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const LazyFallback = () => (
  <div className="flex h-40 items-center justify-center">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

const AppInner = () => {
  useKeyboardShortcuts();
  useTauriEvents();
  useLanguageSync();
  return (
    <>
      <Toaster />
      <Sonner />
      <AlarmOverlay />
      <AlarmChecker />
      <KeyboardShortcutsHelp />
      <OnboardingModal />
      <BrowserRouter>
        <Suspense fallback={<LazyFallback />}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/alarms" element={<Alarms />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/sleep" element={<Sleep />} />
              <Route path="/personalization" element={<Personalization />} />
              <Route path="/errors" element={<ErrorLog />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <GlobalErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppInner />
      </TooltipProvider>
    </QueryClientProvider>
  </GlobalErrorBoundary>
);

export default App;