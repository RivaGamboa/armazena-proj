import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
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
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={handleAdd} className="shadow-sm">
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
                  className="h-12"
                />
              </div>
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição opcional"
                  className="h-12"
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
                      placeholder="#22c55e"
                      className="h-12"
                    />
                    {formData.cor && (
                      <div 
                        className="w-12 h-12 rounded-lg border shadow-inner"
                        style={{ backgroundColor: formData.cor }}
                      />
                    )}
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} disabled={saving} className="flex-1 h-12">
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
                <Button variant="outline" onClick={() => setIsOpen(false)} className="h-12">
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum item cadastrado</p>
              <p className="text-xs">Clique em "Adicionar" para criar</p>
            </div>
          ) : (
            items.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg group hover:bg-muted transition-colors border border-transparent hover:border-border"
              >
                <div className="flex items-center gap-3">
                  {showColor && (
                    <div 
                      className="w-5 h-5 rounded-full border shadow-sm"
                      style={{ backgroundColor: item.cor || '#888' }}
                    />
                  )}
                  <div>
                    <span className="font-medium">{item.nome}</span>
                    {item.descricao && (
                      <p className="text-xs text-muted-foreground">{item.descricao}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded-full">
                    {itemCounts[item.nome] || 0} itens
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8"
                      onClick={() => handleEdit(item)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(item)}
                    >
                      <Trash2 className="h-4 w-4" />
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
