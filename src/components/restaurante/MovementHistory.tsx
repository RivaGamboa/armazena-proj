import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUp, ArrowDown, RefreshCw, AlertCircle, Settings, History } from "lucide-react";
import { MovimentacaoRestaurante, MovimentoTipo } from "@/types/restaurante";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MovementHistoryProps {
  movimentacoes: MovimentacaoRestaurante[];
  maxHeight?: string;
}

const movementConfig: Record<MovimentoTipo, { icon: typeof ArrowUp; color: string; bgColor: string; label: string }> = {
  entrada: { icon: ArrowUp, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Entrada' },
  saida: { icon: ArrowDown, color: 'text-red-600', bgColor: 'bg-red-100', label: 'Saída' },
  transferencia: { icon: RefreshCw, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Transferência' },
  perda: { icon: AlertCircle, color: 'text-orange-600', bgColor: 'bg-orange-100', label: 'Perda' },
  ajuste: { icon: Settings, color: 'text-purple-600', bgColor: 'bg-purple-100', label: 'Ajuste' }
};

export const MovementHistory = ({ movimentacoes, maxHeight = "400px" }: MovementHistoryProps) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5" />
          Movimentações Recentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea style={{ height: maxHeight }}>
          {movimentacoes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma movimentação registrada
            </p>
          ) : (
            <div className="space-y-3">
              {movimentacoes.map((mov) => {
                const config = movementConfig[mov.tipo];
                const Icon = config.icon;
                
                return (
                  <div key={mov.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className={`p-2 rounded-full ${config.bgColor}`}>
                      <Icon className={`h-4 w-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">
                          {mov.item?.nome || 'Item removido'}
                        </span>
                        <Badge variant="outline" className={config.color}>
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Quantidade: {mov.quantidade}
                      </p>
                      {mov.observacao && (
                        <p className="text-sm text-muted-foreground italic mt-1">
                          "{mov.observacao}"
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(mov.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
