import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera } from "lucide-react";
import { ItemRestaurante, CategoriaRestaurante, Localizacao, ItemStatus } from "@/types/restaurante";

interface ItemFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<ItemRestaurante>, photo?: File) => Promise<void>;
  item?: ItemRestaurante | null;
  categorias: CategoriaRestaurante[];
}

const localizacoes: Localizacao[] = ['Cozinha', 'Salao', 'Bar', 'Deposito', 'Area Externa', 'Escritorio'];
const statusOptions: { value: ItemStatus; label: string }[] = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'manutencao', label: 'Em Manutenção' },
  { value: 'descartado', label: 'Descartado' }
];

export const ItemForm = ({ open, onClose, onSubmit, item, categorias }: ItemFormProps) => {
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    categoria_id: '',
    quantidade: 0,
    quantidade_minima: 5,
    localizacao: 'Deposito' as Localizacao,
    fornecedor: '',
    custo: 0,
    data_aquisicao: new Date().toISOString().split('T')[0],
    codigo_barras: '',
    status: 'ativo' as ItemStatus
  });

  useEffect(() => {
    if (item) {
      setFormData({
        nome: item.nome,
        descricao: item.descricao || '',
        categoria_id: item.categoria_id || '',
        quantidade: item.quantidade,
        quantidade_minima: item.quantidade_minima,
        localizacao: item.localizacao,
        fornecedor: item.fornecedor || '',
        custo: item.custo || 0,
        data_aquisicao: item.data_aquisicao || new Date().toISOString().split('T')[0],
        codigo_barras: item.codigo_barras || '',
        status: item.status
      });
      setPhotoPreview(item.foto_url);
    } else {
      setFormData({
        nome: '',
        descricao: '',
        categoria_id: '',
        quantidade: 0,
        quantidade_minima: 5,
        localizacao: 'Deposito',
        fornecedor: '',
        custo: 0,
        data_aquisicao: new Date().toISOString().split('T')[0],
        codigo_barras: '',
        status: 'ativo'
      });
      setPhotoPreview(null);
    }
    setPhoto(null);
  }, [item, open]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onSubmit(formData, photo || undefined);
      onClose();
    } catch (error) {
      console.error('Error saving item:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? 'Editar Item' : 'Novo Item'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo Upload */}
          <div className="flex justify-center">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              {photoPreview ? (
                <img 
                  src={photoPreview} 
                  alt="Preview" 
                  className="w-32 h-32 object-cover rounded-lg border-2 border-dashed border-muted-foreground hover:border-primary transition-colors"
                />
              ) : (
                <div className="w-32 h-32 rounded-lg border-2 border-dashed border-muted-foreground hover:border-primary transition-colors flex flex-col items-center justify-center">
                  <Camera className="h-8 w-8 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground mt-1">Adicionar foto</span>
                </div>
              )}
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="nome">Nome do Item *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="categoria">Categoria</Label>
              <Select
                value={formData.categoria_id}
                onValueChange={(value) => setFormData({ ...formData, categoria_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="localizacao">Localização</Label>
              <Select
                value={formData.localizacao}
                onValueChange={(value) => setFormData({ ...formData, localizacao: value as Localizacao })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {localizacoes.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="quantidade">Quantidade</Label>
              <Input
                id="quantidade"
                type="number"
                min="0"
                value={formData.quantidade}
                onChange={(e) => setFormData({ ...formData, quantidade: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label htmlFor="quantidade_minima">Quantidade Mínima</Label>
              <Input
                id="quantidade_minima"
                type="number"
                min="0"
                value={formData.quantidade_minima}
                onChange={(e) => setFormData({ ...formData, quantidade_minima: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label htmlFor="custo">Custo Unitário (R$)</Label>
              <Input
                id="custo"
                type="number"
                min="0"
                step="0.01"
                value={formData.custo}
                onChange={(e) => setFormData({ ...formData, custo: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label htmlFor="fornecedor">Fornecedor</Label>
              <Input
                id="fornecedor"
                value={formData.fornecedor}
                onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="data_aquisicao">Data de Aquisição</Label>
              <Input
                id="data_aquisicao"
                type="date"
                value={formData.data_aquisicao}
                onChange={(e) => setFormData({ ...formData, data_aquisicao: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="codigo_barras">Código de Barras</Label>
              <Input
                id="codigo_barras"
                value={formData.codigo_barras}
                onChange={(e) => setFormData({ ...formData, codigo_barras: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as ItemStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Salvando...' : item ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
