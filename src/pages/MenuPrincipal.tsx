import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileText, PackageMinus, PackagePlus, Search, LogOut, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import NotificationBell from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";

const MenuPrincipal = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso");
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <ThemeToggle />
        <NotificationBell />
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2">
            Gestão de Estoque
          </h1>
          <p className="text-muted-foreground">
            Selecione uma opção abaixo
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-xl p-6 space-y-3 border">
          <Button
            onClick={() => navigate("/dashboard")}
            className="w-full h-16 text-lg flex items-center justify-start gap-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-md transition-all hover:shadow-lg hover:scale-[1.02]"
            size="lg"
          >
            <BarChart3 className="h-7 w-7" />
            <span>DASHBOARD</span>
          </Button>

          <Button
            onClick={() => navigate("/consultar")}
            className="w-full h-16 text-lg flex items-center justify-start gap-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-md transition-all hover:shadow-lg hover:scale-[1.02]"
            size="lg"
          >
            <Search className="h-7 w-7" />
            <span>CONSULTAR ITEM</span>
          </Button>

          <Button
            onClick={() => navigate("/retirar")}
            className="w-full h-16 text-lg flex items-center justify-start gap-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-md transition-all hover:shadow-lg hover:scale-[1.02]"
            size="lg"
          >
            <PackageMinus className="h-7 w-7" />
            <span>RETIRAR ITEM</span>
          </Button>

          <Button
            onClick={() => navigate("/devolver")}
            className="w-full h-16 text-lg flex items-center justify-start gap-4 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 shadow-md transition-all hover:shadow-lg hover:scale-[1.02]"
            size="lg"
          >
            <PackagePlus className="h-7 w-7" />
            <span>DEVOLVER ITEM</span>
          </Button>

          <Button
            onClick={() => navigate("/cadastrar")}
            className="w-full h-16 text-lg flex items-center justify-start gap-4 bg-gradient-to-r from-primary to-primary/70 hover:from-primary/90 hover:to-primary/60 shadow-md transition-all hover:shadow-lg hover:scale-[1.02]"
            size="lg"
          >
            <FileText className="h-7 w-7" />
            <span>CADASTRAR/EDITAR ITEM</span>
          </Button>
        </div>

        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full mt-6 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </div>
    </div>
  );
};

export default MenuPrincipal;
