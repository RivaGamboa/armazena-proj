import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowUp, ArrowDown, RefreshCw, AlertCircle, Settings } from "lucide-react";
import { ItemRestaurante, MovimentoTipo } from "@/types/restaurante";

interface MovementFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { item_id: string; tipo: MovimentoTipo; quantidade: number; observacao?: string }) => Promise<void>;
  item: ItemRestaurante | null;
}

const movementTypes: { value: MovimentoTipo; label: string; icon: typeof ArrowUp; color: string }[] = [
  { value: 'entrada', label: 'Entrada', icon: ArrowUp, color: 'text-green-600' },
  { value: 'saida', label: 'Saída', icon: ArrowDown, color: 'text-red-600' },
  { value: 'transferencia', label: 'Transferência', icon: RefreshCw, color: 'text-blue-600' },
  { value: 'perda', label: 'Perda', icon: AlertCircle, color: 'text-orange-600' },
  { value: 'ajuste', label: 'Ajuste', icon: Settings, color: 'text-purple-600' }
];

export const MovementForm = ({ open, onClose, onSubmit, item }: MovementFormProps) => {
  const [loading, setLoading] = useState(false);
  const [tipo, setTipo] = useState<MovimentoTipo>('saida');
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    
    setLoading(true);
    try {
      await onSubmit({
        item_id: item.id,
        tipo,
        quantidade,
        observacao: observacao || undefined
      });
      onClose();
      setTipo('saida');
      setQuantidade(1);
      setObservacao('');
    } catch (error) {
      console.error('Error creating movement:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Movimentação</DialogTitle>
          <DialogDescription>
            Item: <strong>{item.nome}</strong> | Quantidade atual: <strong>{item.quantidade}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Tipo de Movimentação</Label>
            <div className="grid grid-cols-5 gap-2 mt-2">
              {movementTypes.map((mt) => (
                <Button
                  key={mt.value}
                  type="button"
                  variant={tipo === mt.value ? 'default' : 'outline'}
                  className="flex flex-col h-auto py-3"
                  onClick={() => setTipo(mt.value)}
                >
                  <mt.icon className={`h-5 w-5 ${tipo === mt.value ? '' : mt.color}`} />
                  <span className="text-xs mt-1">{mt.label}</span>
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="quantidade">
              {tipo === 'ajuste' ? 'Nova Quantidade' : 'Quantidade'}
            </Label>
            <Input
              id="quantidade"
              type="number"
              min={tipo === 'ajuste' ? 0 : 1}
              value={quantidade}
              onChange={(e) => setQuantidade(parseInt(e.target.value) || 0)}
              required
            />
            {tipo === 'saida' && quantidade > item.quantidade && (
              <p className="text-sm text-destructive mt-1">
                Atenção: Quantidade maior que o estoque disponível
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="observacao">Observação</Label>
            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Motivo da movimentação..."
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Registrando...' : 'Confirmar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
