import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Plus, Package } from "lucide-react";
import QRCodeSVG from "react-qr-code";
import Barcode from "react-barcode";

interface SavedItemPreviewProps {
  item: {
    id_item: number;
    sku: string;
    nome_item: string;
    categoria_item: string;
    status_item: string;
    alocacao: string;
    quantidade_novo: number;
    quantidade_usado: number;
    quantidade_danificado: number;
    imagem_item?: string | null;
    video_item?: string | null;
  };
  onEdit: () => void;
  onAddNew: () => void;
}

export const SavedItemPreview = ({ item, onEdit, onAddNew }: SavedItemPreviewProps) => {
  const totalQuantity = item.quantidade_novo + item.quantidade_usado + item.quantidade_danificado;

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

        {/* Quantidades */}
        <div className="bg-muted/50 rounded-lg p-4">
          <span className="text-xs text-muted-foreground block mb-2">Quantidades</span>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-emerald-600">{item.quantidade_novo}</div>
              <span className="text-xs text-muted-foreground">Novo</span>
            </div>
            <div>
              <div className="text-lg font-bold text-amber-600">{item.quantidade_usado}</div>
              <span className="text-xs text-muted-foreground">Usado</span>
            </div>
            <div>
              <div className="text-lg font-bold text-red-600">{item.quantidade_danificado}</div>
              <span className="text-xs text-muted-foreground">Danificado</span>
            </div>
            <div>
              <div className="text-lg font-bold text-primary">{totalQuantity}</div>
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
          </div>
        </div>

        {/* Preview de Mídia */}
        {(item.imagem_item || item.video_item) && (
          <div className="grid grid-cols-2 gap-4">
            {item.imagem_item && (
              <div className="rounded-lg overflow-hidden border">
                <img
                  src={item.imagem_item}
                  alt={item.nome_item}
                  className="w-full h-32 object-cover"
                />
              </div>
            )}
            {item.video_item && (
              <div className="rounded-lg overflow-hidden border bg-muted flex items-center justify-center h-32">
                <video
                  src={item.video_item}
                  className="w-full h-full object-cover"
                  controls
                />
              </div>
            )}
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
