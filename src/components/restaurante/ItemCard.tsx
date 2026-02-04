import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, MapPin, AlertTriangle, Edit, Trash2, ArrowUpDown } from "lucide-react";
import { ItemRestaurante } from "@/types/restaurante";

interface ItemCardProps {
  item: ItemRestaurante;
  onEdit: (item: ItemRestaurante) => void;
  onDelete: (id: string) => void;
  onMovement: (item: ItemRestaurante) => void;
}

export const ItemCard = ({ item, onEdit, onDelete, onMovement }: ItemCardProps) => {
  const isLowStock = item.quantidade <= item.quantidade_minima;
  
  const statusColors = {
    ativo: 'bg-green-100 text-green-800',
    manutencao: 'bg-orange-100 text-orange-800',
    descartado: 'bg-red-100 text-red-800'
  };

  const statusLabels = {
    ativo: 'Ativo',
    manutencao: 'Manutenção',
    descartado: 'Descartado'
  };

  return (
    <Card className={`hover:shadow-lg transition-all ${isLowStock ? 'border-amber-400 border-2' : ''}`}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {item.foto_url ? (
            <img 
              src={item.foto_url} 
              alt={item.nome}
              className="w-20 h-20 object-cover rounded-lg"
            />
          ) : (
            <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-lg truncate">{item.nome}</h3>
              <Badge className={statusColors[item.status]}>
                {statusLabels[item.status]}
              </Badge>
            </div>
            
            {item.categoria && (
              <p className="text-sm text-muted-foreground">{item.categoria.nome}</p>
            )}
            
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{item.localizacao}</span>
              </div>
              
              <div className={`flex items-center gap-1 ${isLowStock ? 'text-amber-600 font-medium' : ''}`}>
                {isLowStock && <AlertTriangle className="h-4 w-4" />}
                <span className="text-sm">
                  Qtd: {item.quantidade} {isLowStock && `(mín: ${item.quantidade_minima})`}
                </span>
              </div>
            </div>
            
            {item.custo && (
              <p className="text-sm text-green-600 font-medium mt-1">
                R$ {Number(item.custo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1"
          onClick={() => onMovement(item)}
        >
          <ArrowUpDown className="h-4 w-4 mr-1" />
          Movimentar
        </Button>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => onEdit(item)}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon"
          className="text-destructive hover:text-destructive"
          onClick={() => onDelete(item.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};
