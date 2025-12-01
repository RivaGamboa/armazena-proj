import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import MenuPrincipal from "./pages/MenuPrincipal";
import CadastrarItem from "./pages/CadastrarItem";
import ConsultarEstoque from "./pages/ConsultarEstoque";
import RetirarItem from "./pages/RetirarItem";
import DevolverItem from "./pages/DevolverItem";
import Dashboard from "./pages/Dashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<Index />} />
          <Route path="/menu" element={<MenuPrincipal />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/cadastrar" element={<CadastrarItem />} />
          <Route path="/consultar" element={<ConsultarEstoque />} />
          <Route path="/retirar" element={<RetirarItem />} />
          <Route path="/devolver" element={<DevolverItem />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
