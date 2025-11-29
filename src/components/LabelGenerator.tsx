import { useRef, useState } from "react";
import QRCodeSVG from "react-qr-code";
import Barcode from "react-barcode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Printer, Download } from "lucide-react";
import html2canvas from "html2canvas";

interface LabelGeneratorProps {
  sku: string;
  itemName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const LabelGenerator = ({ sku, itemName, isOpen, onClose }: LabelGeneratorProps) => {
  const labelRef = useRef<HTMLDivElement>(null);
  const [labelWidth, setLabelWidth] = useState(40);
  const [labelHeight, setLabelHeight] = useState(10);
  const [showSku, setShowSku] = useState(true);
  const [showQr, setShowQr] = useState(true);
  const [showBarcode, setShowBarcode] = useState(true);
  const [showName, setShowName] = useState(false);

  const handleDownload = async () => {
    if (!labelRef.current) return;

    try {
      const canvas = await html2canvas(labelRef.current, {
        backgroundColor: "#ffffff",
        scale: 3,
      });

      const link = document.createElement("a");
      link.download = `etiqueta-${sku}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error("Erro ao gerar etiqueta:", error);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow || !labelRef.current) return;

    const labelHtml = labelRef.current.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Etiqueta ${sku}</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            .label-container {
              background: white;
              border: 1px solid #ddd;
              padding: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
            }
            @media print {
              body {
                padding: 0;
              }
              .label-container {
                border: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="label-container" style="width: ${labelWidth}mm; height: ${labelHeight}mm;">
            ${labelHtml}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Gerar Etiqueta - SKU {sku}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="width">Largura (mm)</Label>
              <Input
                id="width"
                type="number"
                value={labelWidth}
                onChange={(e) => setLabelWidth(Number(e.target.value))}
                min="10"
                max="100"
              />
            </div>
            <div>
              <Label htmlFor="height">Altura (mm)</Label>
              <Input
                id="height"
                type="number"
                value={labelHeight}
                onChange={(e) => setLabelHeight(Number(e.target.value))}
                min="5"
                max="50"
              />
            </div>
          </div>

          <div>
            <Label className="mb-3 block">Elementos da Etiqueta</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showSku"
                  checked={showSku}
                  onCheckedChange={(checked) => setShowSku(checked as boolean)}
                />
                <Label htmlFor="showSku" className="cursor-pointer">
                  Mostrar SKU
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showName"
                  checked={showName}
                  onCheckedChange={(checked) => setShowName(checked as boolean)}
                />
                <Label htmlFor="showName" className="cursor-pointer">
                  Mostrar Nome
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showQr"
                  checked={showQr}
                  onCheckedChange={(checked) => setShowQr(checked as boolean)}
                />
                <Label htmlFor="showQr" className="cursor-pointer">
                  Mostrar QR Code
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showBarcode"
                  checked={showBarcode}
                  onCheckedChange={(checked) => setShowBarcode(checked as boolean)}
                />
                <Label htmlFor="showBarcode" className="cursor-pointer">
                  Mostrar Código de Barras
                </Label>
              </div>
            </div>
          </div>

          <div className="border-2 border-dashed rounded-lg p-6 bg-muted/50">
            <h3 className="text-sm font-medium mb-4 text-center">Pré-visualização</h3>
            <div className="flex justify-center">
              <div 
                ref={labelRef}
                className="bg-white border-2 border-border p-2 flex items-center justify-center gap-2"
                style={{
                  width: `${labelWidth}mm`,
                  height: `${labelHeight}mm`,
                  minWidth: `${labelWidth}mm`,
                  minHeight: `${labelHeight}mm`,
                }}
              >
                {showSku && (
                  <div className="flex flex-col items-center justify-center">
                    <div className="text-lg font-bold whitespace-nowrap">{sku}</div>
                    {showName && (
                      <div className="text-xs truncate max-w-[60px]">{itemName}</div>
                    )}
                  </div>
                )}
                {showQr && (
                  <div className="flex items-center justify-center">
                    <QRCodeSVG 
                      value={sku} 
                      size={Math.min(labelHeight * 2.5, 80)} 
                    />
                  </div>
                )}
                {showBarcode && (
                  <div className="flex items-center justify-center">
                    <Barcode 
                      value={sku} 
                      height={Math.min(labelHeight * 2, 40)}
                      width={1.2}
                      fontSize={8}
                      displayValue={false}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleDownload} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Baixar Etiqueta
            </Button>
            <Button onClick={handlePrint} variant="outline" className="flex-1">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
