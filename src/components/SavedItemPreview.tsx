import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Plus, Package, Trash2 } from "lucide-react";
import QRCodeSVG from "react-qr-code";
import Barcode from "react-barcode";

/** Parse imagem_item field: supports JSON array or plain URL */
function parseImageUrls(imagem_item: string | null | undefined): string[] {
  if (!imagem_item) return [];
  try {
    const parsed = JSON.parse(imagem_item);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {
    // plain URL
  }
  return [imagem_item];
}

interface SavedItemPreviewProps {
  item: {
    id_item: number;
    sku: string;
    nome_item: string;
    categoria_item: string;
    status_item: string;
    alocacao: string;
    quantidades_por_status: Record<string, number>;
    imagem_item?: string | null;
    video_item?: string | null;
  };
  onEdit: () => void;
  onAddNew: () => void;
}

export const SavedItemPreview = ({ item, onEdit, onAddNew }: SavedItemPreviewProps) => {
  const totalQuantity = Object.values(item.quantidades_por_status || {}).reduce((sum, v) => sum + (v || 0), 0);
  const [photos, setPhotos] = useState<string[]>(() => parseImageUrls(item.imagem_item));

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const statusEntries = Object.entries(item.quantidades_por_status || {}).filter(([_, v]) => v > 0);

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-card to-primary/5 shadow-lg animate-in fade-in-50 duration-500">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-primary flex items-center gap-2">
            <Package className="h-5 w-5" />
            Item Salvo com Sucesso!
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            ID: {item.id_item}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* SKU e Códigos */}
        <div className="bg-background rounded-xl p-4 border">
          <div className="text-center mb-4">
            <span className="text-xs text-muted-foreground">SKU</span>
            <div className="text-3xl font-bold tracking-wider text-primary">{item.sku}</div>
          </div>
          <div className="flex items-center justify-around gap-4 flex-wrap">
            <div className="text-center p-3 bg-card rounded-lg shadow-sm">
              <span className="text-xs text-muted-foreground block mb-2">QR Code</span>
              <QRCodeSVG value={item.sku} size={100} />
            </div>
            <div className="text-center p-3 bg-card rounded-lg shadow-sm">
              <span className="text-xs text-muted-foreground block mb-2">Código de Barras</span>
              <Barcode value={item.sku} height={50} width={1.5} fontSize={12} />
            </div>
          </div>
        </div>

        {/* Informações do Item */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-muted-foreground">Nome</span>
            <p className="font-semibold text-lg">{item.nome_item}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Categoria</span>
            <p className="font-medium">{item.categoria_item}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Status</span>
            <Badge variant="secondary">{item.status_item}</Badge>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Alocação</span>
            <Badge variant="outline">{item.alocacao}</Badge>
          </div>
        </div>

        {/* Quantidades por Status */}
        <div className="bg-muted/50 rounded-lg p-4">
          <span className="text-xs text-muted-foreground block mb-2">Quantidades por Status</span>
          <div className="grid grid-cols-2 gap-2">
            {statusEntries.map(([status, qty]) => (
              <div key={status} className="text-center p-2 bg-background rounded-lg border">
                <div className="text-lg font-bold text-primary">{qty}</div>
                <span className="text-xs text-muted-foreground">{status}</span>
              </div>
            ))}
            <div className="text-center p-2 bg-primary/10 rounded-lg border border-primary/20 col-span-2">
              <div className="text-xl font-bold text-primary">{totalQuantity}</div>
              <span className="text-xs text-muted-foreground font-medium">Total</span>
            </div>
          </div>
        </div>

        {/* Grade de Fotos 1:1 */}
        {photos.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">Fotos ({photos.length})</span>
            <div className="grid grid-cols-2 gap-3">
              {photos.map((url, index) => (
                <div key={index} className="relative rounded-lg overflow-hidden border group">
                  <div style={{ aspectRatio: '1 / 1' }} className="relative">
                    <img
                      src={url}
                      alt={`${item.nome_item} - Foto ${index + 1}`}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vídeo 16:9 */}
        {item.video_item && (
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">Vídeo</span>
            <div className="rounded-lg overflow-hidden border bg-muted">
              <div className="relative w-full" style={{ aspectRatio: '9 / 16' }}>
                <video
                  src={item.video_item}
                  className="absolute inset-0 w-full h-full object-cover"
                  controls
                />
              </div>
            </div>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex gap-3 pt-2">
          <Button onClick={onEdit} variant="outline" className="flex-1 h-12">
            <Pencil className="h-4 w-4 mr-2" />
            Editar Item
          </Button>
          <Button onClick={onAddNew} className="flex-1 h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Novo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
