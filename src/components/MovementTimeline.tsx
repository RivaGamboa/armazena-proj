import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowRightLeft, 
  Package, 
  Undo2, 
  AlertTriangle, 
  Clock,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Movement {
  id: number;
  tipo_operacao: string;
  data_operacao: string;
  quantidade_alterada: number | null;
  status_anterior: string | null;
  status_novo: string | null;
  alocacao_anterior: string | null;
  alocacao_nova: string | null;
  observacoes: string | null;
}

interface MovementTimelineProps {
  itemId: number;
}

export const MovementTimeline = ({ itemId }: MovementTimelineProps) => {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadMovements();
  }, [itemId]);

  const loadMovements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('historico_movimentacoes')
        .select('*')
        .eq('id_item', itemId)
        .order('data_operacao', { ascending: false });

      if (error) throw error;
      setMovements(data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOperationIcon = (tipo: string) => {
    switch (tipo) {
      case 'RETIRADA':
        return <ArrowRightLeft className="h-4 w-4" />;
      case 'DEVOLUCAO':
        return <Undo2 className="h-4 w-4" />;
      case 'CADASTRO':
        return <Package className="h-4 w-4" />;
      case 'ATUALIZACAO':
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getOperationColor = (tipo: string) => {
    switch (tipo) {
      case 'RETIRADA':
        return 'bg-amber-500/20 text-amber-600 border-amber-500/30';
      case 'DEVOLUCAO':
        return 'bg-green-500/20 text-green-600 border-green-500/30';
      case 'CADASTRO':
        return 'bg-blue-500/20 text-blue-600 border-blue-500/30';
      case 'ATUALIZACAO':
        return 'bg-purple-500/20 text-purple-600 border-purple-500/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getOperationLabel = (tipo: string) => {
    switch (tipo) {
      case 'RETIRADA':
        return 'Retirada';
      case 'DEVOLUCAO':
        return 'Devolução';
      case 'CADASTRO':
        return 'Cadastro';
      case 'ATUALIZACAO':
        return 'Atualização';
      default:
        return tipo;
    }
  };

  const displayedMovements = expanded ? movements : movements.slice(0, 3);

  if (loading) {
    return (
      <div className="py-4 text-center text-muted-foreground text-sm">
        Carregando histórico...
      </div>
    );
  }

  if (movements.length === 0) {
    return (
      <div className="py-4 text-center text-muted-foreground text-sm">
        Nenhuma movimentação registrada
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Histórico de Movimentações
        </h4>
        <span className="text-xs text-muted-foreground">
          {movements.length} {movements.length === 1 ? 'registro' : 'registros'}
        </span>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Linha vertical da timeline */}
        <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-border" />

        <div className="space-y-3">
          {displayedMovements.map((movement, index) => (
            <div 
              key={movement.id} 
              className="relative flex gap-3 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Ícone do nó */}
              <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 ${getOperationColor(movement.tipo_operacao)}`}>
                {getOperationIcon(movement.tipo_operacao)}
              </div>

              {/* Conteúdo */}
              <div className="flex-1 bg-card border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getOperationColor(movement.tipo_operacao)}`}>
                      {getOperationLabel(movement.tipo_operacao)}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(movement.data_operacao), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>

                <div className="mt-2 space-y-1 text-xs">
                  {/* Mudança de alocação */}
                  {(movement.alocacao_anterior || movement.alocacao_nova) && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <span>Alocação:</span>
                      {movement.alocacao_anterior && (
                        <span className="px-1.5 py-0.5 bg-muted rounded">{movement.alocacao_anterior}</span>
                      )}
                      {movement.alocacao_anterior && movement.alocacao_nova && (
                        <ArrowRightLeft className="h-3 w-3" />
                      )}
                      {movement.alocacao_nova && (
                        <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded font-medium">{movement.alocacao_nova}</span>
                      )}
                    </div>
                  )}

                  {/* Mudança de status */}
                  {(movement.status_anterior || movement.status_novo) && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <span>Status:</span>
                      {movement.status_anterior && (
                        <span className="px-1.5 py-0.5 bg-muted rounded">{movement.status_anterior}</span>
                      )}
                      {movement.status_anterior && movement.status_novo && (
                        <ArrowRightLeft className="h-3 w-3" />
                      )}
                      {movement.status_novo && (
                        <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-600 rounded font-medium">{movement.status_novo}</span>
                      )}
                    </div>
                  )}

                  {/* Quantidade */}
                  {movement.quantidade_alterada !== null && (
                    <div className="text-muted-foreground">
                      <span>Quantidade: </span>
                      <span className={`font-medium ${movement.quantidade_alterada > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {movement.quantidade_alterada > 0 ? '+' : ''}{movement.quantidade_alterada}
                      </span>
                    </div>
                  )}

                  {/* Observações */}
                  {movement.observacoes && (
                    <p className="text-muted-foreground italic mt-1 pt-1 border-t border-dashed">
                      "{movement.observacoes}"
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Botão para expandir/colapsar */}
      {movements.length > 3 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="flex items-center justify-center gap-1 w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Mostrar menos
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Ver mais {movements.length - 3} registros
            </>
          )}
        </button>
      )}
    </div>
  );
};
