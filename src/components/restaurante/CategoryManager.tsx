import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit, Trash2, Grid3X3 } from "lucide-react";
import { CategoriaRestaurante } from "@/types/restaurante";

interface CategoryManagerProps {
  open: boolean;
  onClose: () => void;
  categorias: CategoriaRestaurante[];
  onCreate: (data: Partial<CategoriaRestaurante>) => Promise<void>;
  onUpdate: (id: string, data: Partial<CategoriaRestaurante>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const defaultColors = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
];

export const CategoryManager = ({ 
  open, 
  onClose, 
  categorias, 
  onCreate, 
  onUpdate, 
  onDelete 
}: CategoryManagerProps) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    cor: '#3B82F6'
  });

  const resetForm = () => {
    setFormData({ nome: '', descricao: '', cor: '#3B82F6' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (cat: CategoriaRestaurante) => {
    setFormData({
      nome: cat.nome,
      descricao: cat.descricao || '',
      cor: cat.cor || '#3B82F6'
    });
    setEditingId(cat.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (editingId) {
        await onUpdate(editingId, formData);
      } else {
        await onCreate(formData);
      }
      resetForm();
    } catch (error) {
      console.error('Error saving category:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta categoria?')) return;
    
    try {
      await onDelete(id);
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5" />
            Gerenciar Categorias
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!showForm ? (
            <Button onClick={() => setShowForm(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
          ) : (
            <Card>
              <CardContent className="p-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="nome">Nome da Categoria *</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="descricao">Descrição</Label>
                    <Textarea
                      id="descricao"
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      rows={2}
                    />
                  </div>
                  
                  <div>
                    <Label>Cor</Label>
                    <div className="flex gap-2 mt-2">
                      {defaultColors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-8 h-8 rounded-full border-2 ${
                            formData.cor === color ? 'border-foreground' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setFormData({ ...formData, cor: color })}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={loading} className="flex-1">
                      {loading ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
          
          <div className="space-y-2">
            {categorias.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma categoria cadastrada
              </p>
            ) : (
              categorias.map((cat) => (
                <Card key={cat.id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: cat.cor || '#3B82F6' }}
                    />
                    <div className="flex-1">
                      <h4 className="font-medium">{cat.nome}</h4>
                      {cat.descricao && (
                        <p className="text-sm text-muted-foreground">{cat.descricao}</p>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(cat)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(cat.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
