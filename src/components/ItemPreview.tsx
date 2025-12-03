import QRCodeSVG from "react-qr-code";
import Barcode from "react-barcode";
import { Label } from "@/components/ui/label";
import { Play, Image as ImageIcon } from "lucide-react";

interface ItemPreviewProps {
  sku?: string;
  imagemUrl?: string | null;
  videoUrl?: string | null;
  compact?: boolean;
}

export const ItemPreview = ({ sku, imagemUrl, videoUrl, compact = false }: ItemPreviewProps) => {
  if (!sku && !imagemUrl && !videoUrl) return null;

  return (
    <div className={`bg-card border rounded-lg ${compact ? 'p-3' : 'p-4'} space-y-4`}>
      {/* SKU, QR Code e Código de Barras */}
      {sku && (
        <div className={`flex items-center ${compact ? 'gap-3 flex-wrap' : 'justify-around gap-4'} bg-background rounded-lg p-3`}>
          <div className="text-center">
            <Label className="text-xs text-muted-foreground mb-1 block">SKU</Label>
            <div className={`${compact ? 'text-xl' : 'text-2xl'} font-bold font-mono`}>{sku}</div>
          </div>
          <div className="text-center">
            <Label className="text-xs text-muted-foreground mb-1 block">QR Code</Label>
            <QRCodeSVG value={sku} size={compact ? 50 : 64} />
          </div>
          <div className="text-center">
            <Label className="text-xs text-muted-foreground mb-1 block">Código de Barras</Label>
            <Barcode value={sku} height={compact ? 30 : 40} width={compact ? 1 : 1.2} fontSize={compact ? 8 : 10} />
          </div>
        </div>
      )}

      {/* Preview de Imagem e Vídeo */}
      {(imagemUrl || videoUrl) && (
        <div className="flex gap-3 flex-wrap">
          {imagemUrl && (
            <div className="relative">
              <Label className="text-xs text-muted-foreground mb-1 block">Foto</Label>
              <img
                src={imagemUrl}
                alt="Preview do item"
                className={`${compact ? 'w-20 h-20' : 'w-24 h-24'} object-cover rounded-lg border`}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
          {videoUrl && (
            <div className="relative">
              <Label className="text-xs text-muted-foreground mb-1 block">Vídeo</Label>
              <div className={`${compact ? 'w-20 h-20' : 'w-24 h-24'} relative rounded-lg border overflow-hidden bg-muted`}>
                <video
                  src={videoUrl}
                  className="w-full h-full object-cover"
                  muted
                  preload="metadata"
                  onError={(e) => {
                    (e.target as HTMLVideoElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Play className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
