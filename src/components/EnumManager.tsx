import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { CustomEnumItem } from "@/hooks/useCustomEnums";

interface EnumManagerProps {
  title: string;
  tableName: "categorias_item" | "alocacoes" | "status_item";
  items: CustomEnumItem[];
  itemCounts: { [key: string]: number };
  onRefresh: () => void;
  showColor?: boolean;
}

export const EnumManager = ({ 
  title, 
  tableName, 
  items, 
  itemCounts,
  onRefresh,
  showColor = false 
}: EnumManagerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CustomEnumItem | null>(null);
  const [formData, setFormData] = useState({ nome: "", descricao: "", cor: "" });
  const [saving, setSaving] = useState(false);

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ nome: "", descricao: "", cor: "" });
    setIsOpen(true);
  };

  const handleEdit = (item: CustomEnumItem) => {
    setEditingItem(item);
    setFormData({ 
      nome: item.nome, 
      descricao: item.descricao || "", 
      cor: item.cor || "" 
    });
    setIsOpen(true);
  };

  const handleDelete = async (item: CustomEnumItem) => {
    const count = itemCounts[item.nome] || 0;
    if (count > 0) {
      toast.error(`Não é possível excluir "${item.nome}" pois há ${count} item(s) usando este valor.`);
      return;
    }

    if (!confirm(`Deseja realmente excluir "${item.nome}"?`)) return;

    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq("id", item.id);

      if (error) throw error;
      toast.success("Item excluído com sucesso!");
      onRefresh();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao excluir item");
    }
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      if (editingItem) {
        const { error } = await supabase
          .from(tableName)
          .update({ 
            nome: formData.nome.trim(),
            descricao: formData.descricao.trim() || null,
            ...(showColor && { cor: formData.cor.trim() || null })
          })
          .eq("id", editingItem.id);

        if (error) throw error;
        toast.success("Item atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from(tableName)
          .insert([{ 
            nome: formData.nome.trim(),
            descricao: formData.descricao.trim() || null,
            user_id: user.id,
            ...(showColor && { cor: formData.cor.trim() || null })
          }]);

        if (error) throw error;
        toast.success("Item adicionado com sucesso!");
      }

      setIsOpen(false);
      onRefresh();
    } catch (error: any) {
      console.error(error);
      if (error.code === "23505") {
        toast.error("Já existe um item com este nome");
      } else {
        toast.error("Erro ao salvar item");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? `Editar ${title}` : `Novo ${title}`}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Nome do item"
                />
              </div>
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição opcional"
                />
              </div>
              {showColor && (
                <div>
                  <Label htmlFor="cor">Cor (hex)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="cor"
                      value={formData.cor}
                      onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                      placeholder="#FF0000"
                    />
                    {formData.cor && (
                      <div 
                        className="w-10 h-10 rounded border"
                        style={{ backgroundColor: formData.cor }}
                      />
                    )}
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} disabled={saving} className="flex-1">
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          Clique para editar ou adicione novos valores
        </p>
        <div className="space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum item cadastrado
            </p>
          ) : (
            items.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center justify-between p-2 bg-muted rounded-md group"
              >
                <div className="flex items-center gap-2">
                  {showColor && item.cor && (
                    <div 
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: item.cor }}
                    />
                  )}
                  <span className="text-sm font-medium">{item.nome}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {itemCounts[item.nome] || 0} itens
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-6 w-6"
                      onClick={() => handleEdit(item)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-6 w-6 text-destructive"
                      onClick={() => handleDelete(item)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
