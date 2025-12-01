import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";
import Webcam from "react-webcam";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, X } from "lucide-react";
import { toast } from "sonner";

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

export const BarcodeScanner = ({ isOpen, onClose, onScan }: BarcodeScannerProps) => {
  const webcamRef = useRef<Webcam>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setScanning(false);
      return;
    }

    const codeReader = new BrowserMultiFormatReader();
    let scanning = true;

    const scan = async () => {
      if (!webcamRef.current?.video || !scanning) return;

      try {
        const result = await codeReader.decodeFromVideoElement(webcamRef.current.video);
        if (result && scanning) {
          onScan(result.getText());
          toast.success(`Código detectado: ${result.getText()}`);
          onClose();
        }
      } catch (err) {
        // Continua tentando escanear
      }

      if (scanning) {
        requestAnimationFrame(scan);
      }
    };

    setScanning(true);
    scan();

    return () => {
      scanning = false;
      codeReader.reset();
    };
  }, [isOpen, onScan, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Escanear Código
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={{
                facingMode: "environment"
              }}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 border-2 border-primary/50 m-8 rounded-lg pointer-events-none" />
          </div>
          
          <p className="text-sm text-muted-foreground text-center">
            Posicione o código QR ou código de barras dentro da área destacada
          </p>
          
          <Button onClick={onClose} variant="outline" className="w-full">
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
