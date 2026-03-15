import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ItemRestaurante, CategoriaRestaurante, Localizacao, ItemStatus } from "@/types/restaurante";
import { ImageGalleryUpload } from "./ImageGalleryUpload";

interface ItemFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<ItemRestaurante>, photos?: File[]) => Promise<void>;
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
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [featuredIndex, setFeaturedIndex] = useState(0);
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
    status: 'ativo' as ItemStatus,
    largura_cm: '' as string | number,
    altura_cm: '' as string | number,
    profundidade_cm: '' as string | number
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
        status: item.status,
        largura_cm: item.largura_cm && item.largura_cm !== 0 ? item.largura_cm : '',
        altura_cm: item.altura_cm && item.altura_cm !== 0 ? item.altura_cm : '',
        profundidade_cm: item.profundidade_cm && item.profundidade_cm !== 0 ? item.profundidade_cm : ''
      });
      setGalleryImages(item.galeria_fotos || (item.foto_url ? [item.foto_url] : []));
      setFeaturedIndex(item.foto_destaque_index || 0);
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
        status: 'ativo',
        largura_cm: '',
        altura_cm: '',
        profundidade_cm: ''
      });
      setGalleryImages([]);
      setFeaturedIndex(0);
    }
    setPendingFiles([]);
  }, [item, open]);

  const handleGalleryChange = useCallback((images: string[], newFeaturedIndex: number) => {
    setGalleryImages(images);
    setFeaturedIndex(newFeaturedIndex);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const submitData = {
        ...formData,
        largura_cm: formData.largura_cm === '' ? null : Number(formData.largura_cm),
        altura_cm: formData.altura_cm === '' ? null : Number(formData.altura_cm),
        profundidade_cm: formData.profundidade_cm === '' ? null : Number(formData.profundidade_cm),
        galeria_fotos: galleryImages,
        foto_destaque_index: featuredIndex,
        foto_url: galleryImages[featuredIndex] || null
      };
      await onSubmit(submitData, pendingFiles.length > 0 ? pendingFiles : undefined);
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
          {/* Image Gallery Upload */}
          <ImageGalleryUpload
            images={galleryImages}
            featuredIndex={featuredIndex}
            onImagesChange={handleGalleryChange}
            pendingFiles={pendingFiles}
            onPendingFilesChange={setPendingFiles}
          />

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

            {/* Dimensões em centímetros */}
            <div className="md:col-span-2">
              <Label className="text-sm font-medium mb-2 block">Dimensões (cm)</Label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="largura_cm" className="text-xs text-muted-foreground">Largura</Label>
                  <Input
                    id="largura_cm"
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="cm"
                    value={formData.largura_cm}
                    onChange={(e) => setFormData({ ...formData, largura_cm: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="altura_cm" className="text-xs text-muted-foreground">Altura</Label>
                  <Input
                    id="altura_cm"
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="cm"
                    value={formData.altura_cm}
                    onChange={(e) => setFormData({ ...formData, altura_cm: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="profundidade_cm" className="text-xs text-muted-foreground">Profundidade</Label>
                  <Input
                    id="profundidade_cm"
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="cm"
                    value={formData.profundidade_cm}
                    onChange={(e) => setFormData({ ...formData, profundidade_cm: e.target.value })}
                  />
                </div>
              </div>
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
