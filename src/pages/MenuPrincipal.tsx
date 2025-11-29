import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileText, PackageMinus, PackagePlus, Search, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MenuPrincipal = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso");
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Gestão de Estoque
          </h1>
          <p className="text-muted-foreground">
            Selecione uma opção abaixo
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-xl p-8 space-y-4">
          <Button
            onClick={() => navigate("/consultar")}
            className="w-full h-20 text-lg flex items-center justify-start gap-4 bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            <Search className="h-8 w-8" />
            <span>CONSULTAR ITEM</span>
          </Button>

          <Button
            onClick={() => navigate("/retirar")}
            className="w-full h-20 text-lg flex items-center justify-start gap-4 bg-destructive hover:bg-destructive/90"
            size="lg"
          >
            <PackageMinus className="h-8 w-8" />
            <span>RETIRAR ITEM</span>
          </Button>

          <Button
            onClick={() => navigate("/devolver")}
            className="w-full h-20 text-lg flex items-center justify-start gap-4 bg-green-600 hover:bg-green-700"
            size="lg"
          >
            <PackagePlus className="h-8 w-8" />
            <span>DEVOLVER ITEM</span>
          </Button>

          <Button
            onClick={() => navigate("/cadastrar")}
            className="w-full h-20 text-lg flex items-center justify-start gap-4 bg-primary hover:bg-primary/90"
            size="lg"
          >
            <FileText className="h-8 w-8" />
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
