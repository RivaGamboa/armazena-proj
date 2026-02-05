import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Package, 
  Plus, 
  Grid3X3, 
  ArrowUpDown, 
  LogOut,
  Search,
  RefreshCw,
  ChefHat
} from "lucide-react";
import { StatsCards } from "@/components/restaurante/StatsCards";
import { ItemCard } from "@/components/restaurante/ItemCard";
import { ItemForm } from "@/components/restaurante/ItemForm";
import { MovementForm } from "@/components/restaurante/MovementForm";
import { MovementHistory } from "@/components/restaurante/MovementHistory";
import { CategoryManager } from "@/components/restaurante/CategoryManager";
import { useRestauranteData } from "@/hooks/useRestauranteData";
import { ItemRestaurante } from "@/types/restaurante";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";

const RestauranteApp = () => {
  const navigate = useNavigate();
  const {
    categorias,
    itens,
    movimentacoes,
    stats,
    loading,
    refresh,
    createCategoria,
    updateCategoria,
    deleteCategoria,
    createItem,
    updateItem,
    deleteItem,
    createMovimentacao,
    uploadItemPhoto,
    uploadMultiplePhotos
  } = useRestauranteData();

  const [searchTerm, setSearchTerm] = useState("");
  const [showItemForm, setShowItemForm] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemRestaurante | null>(null);
  const [movingItem, setMovingItem] = useState<ItemRestaurante | null>(null);

  const filteredItens = itens.filter(item =>
    item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.categoria?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.localizacao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.fornecedor?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
    toast.success("Logout realizado com sucesso!");
  };

  const handleEditItem = (item: ItemRestaurante) => {
    setEditingItem(item);
    setShowItemForm(true);
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Deseja realmente excluir este item?")) return;
    try {
      await deleteItem(id);
    } catch (error) {
      toast.error("Erro ao excluir item");
    }
  };

  const handleMovementItem = (item: ItemRestaurante) => {
    setMovingItem(item);
    setShowMovementForm(true);
  };

  const handleSubmitItem = async (data: any, photos?: File[]) => {
    try {
      let galeria_fotos = data.galeria_fotos || [];
      
      if (photos && photos.length > 0) {
        const uploadedUrls = await uploadMultiplePhotos(photos, data.nome);
        galeria_fotos = [...galeria_fotos, ...uploadedUrls];
      }
      
      // Update featured photo URL based on the new gallery
      const fotoDestaqueIndex = data.foto_destaque_index ?? 0;
      const foto_url = galeria_fotos[fotoDestaqueIndex] || galeria_fotos[0] || null;
      
      const itemData = { 
        ...data, 
        galeria_fotos,
        foto_url,
        foto_destaque_index: fotoDestaqueIndex
      };
      
      if (editingItem) {
        await updateItem(editingItem.id, itemData);
      } else {
        await createItem(itemData);
      }
      
      setEditingItem(null);
    } catch (error) {
      toast.error("Erro ao salvar item");
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <ChefHat className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">RestauraStock</h1>
                <p className="text-xs text-muted-foreground">Sistema de Inventário</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="ghost" size="icon" onClick={refresh} title="Atualizar">
                <RefreshCw className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <StatsCards stats={stats} />

        {/* Quick Actions */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button 
                onClick={() => { setEditingItem(null); setShowItemForm(true); }}
                className="h-auto py-4 flex flex-col gap-2"
              >
                <Plus className="h-6 w-6" />
                <span>Novo Item</span>
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => setShowCategoryManager(true)}
                className="h-auto py-4 flex flex-col gap-2"
              >
                <Grid3X3 className="h-6 w-6" />
                <span>Categorias</span>
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => {
                  if (itens.length > 0) {
                    setMovingItem(itens[0]);
                    setShowMovementForm(true);
                  } else {
                    toast.info("Cadastre um item primeiro");
                  }
                }}
                className="h-auto py-4 flex flex-col gap-2"
              >
                <ArrowUpDown className="h-6 w-6" />
                <span>Movimentar</span>
              </Button>
              
              <Button 
                variant="outline"
                onClick={refresh}
                className="h-auto py-4 flex flex-col gap-2"
              >
                <RefreshCw className="h-6 w-6" />
                <span>Atualizar</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, categoria, localização ou fornecedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12"
          />
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Package className="h-5 w-5" />
                Itens ({filteredItens.length})
              </h2>
            </div>
            
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                Carregando...
              </div>
            ) : filteredItens.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm ? "Nenhum item encontrado" : "Nenhum item cadastrado"}
                  </p>
                  <Button 
                    className="mt-4"
                    onClick={() => { setEditingItem(null); setShowItemForm(true); }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Cadastrar Primeiro Item
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredItens.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onEdit={handleEditItem}
                    onDelete={handleDeleteItem}
                    onMovement={handleMovementItem}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Movement History */}
          <div>
            <MovementHistory movimentacoes={movimentacoes} />
          </div>
        </div>
      </main>

      {/* Dialogs */}
      <ItemForm
        open={showItemForm}
        onClose={() => { setShowItemForm(false); setEditingItem(null); }}
        onSubmit={handleSubmitItem}
        item={editingItem}
        categorias={categorias}
      />

      <MovementForm
        open={showMovementForm}
        onClose={() => { setShowMovementForm(false); setMovingItem(null); }}
        onSubmit={createMovimentacao}
        item={movingItem}
      />

      <CategoryManager
        open={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
        categorias={categorias}
        onCreate={createCategoria}
        onUpdate={updateCategoria}
        onDelete={deleteCategoria}
      />
    </div>
  );
};

export default RestauranteApp;
