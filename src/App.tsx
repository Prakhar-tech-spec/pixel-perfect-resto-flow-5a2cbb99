import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import Index from "./pages/Index";
import InventoryPage from "./pages/InventoryPage";
import StaffPage from "./pages/StaffPage";
import AttendanceTrackerPage from "./pages/AttendanceTrackerPage";
import SalesPage from "./pages/SalesPage";
import NotesPage from "./pages/NotesPage";
import NotFound from "./pages/NotFound";
import SettingsPage from './pages/SettingsPage';
import PinAuth from './components/PinAuth';

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Index />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/staff" element={<StaffPage />} />
        <Route path="/attendance" element={<AttendanceTrackerPage />} />
        <Route path="/sales" element={<SalesPage />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Reset authentication when the app is closed and reopened
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsAuthenticated(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          {!isAuthenticated && <PinAuth onAuthSuccess={handleAuthSuccess} />}
          {isAuthenticated && <AnimatedRoutes />}
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
