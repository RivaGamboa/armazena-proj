import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  X, 
  Trash2, 
  MapPin, 
  Tag,
  CheckSquare,
  Square,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Constants } from "@/integrations/supabase/types";

interface BatchActionsBarProps {
  selectedIds: number[];
  totalItems: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onActionComplete: () => void;
}

export const BatchActionsBar = ({
  selectedIds,
  totalItems,
  onSelectAll,
  onClearSelection,
  onActionComplete,
}: BatchActionsBarProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchStatus, setBatchStatus] = useState<string>("");
  const [batchAlocacao, setBatchAlocacao] = useState<string>("");

  const statusList = Constants.public.Enums.status_item_enum;
  const alocacoes = Constants.public.Enums.alocacao_enum;

  const allSelected = selectedIds.length === totalItems && totalItems > 0;

  const handleBatchStatusChange = async () => {
    if (!batchStatus) return;
    
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('itens_em_estoque')
        .update({ status_item: batchStatus as any })
        .in('id_item', selectedIds);

      if (error) throw error;
      
      toast.success(`Status atualizado para ${selectedIds.length} itens`);
      setBatchStatus("");
      onActionComplete();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar status");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchAlocacaoChange = async () => {
    if (!batchAlocacao) return;
    
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Update items
      const { error: updateError } = await supabase
        .from('itens_em_estoque')
        .update({ alocacao: batchAlocacao as any })
        .in('id_item', selectedIds);

      if (updateError) throw updateError;

      // Record movement history for each item
      const movementRecords = selectedIds.map(id => ({
        id_item: id,
        user_id: user.id,
        tipo_operacao: batchAlocacao === 'DEPOSITO' ? 'DEVOLUCAO' : 'RETIRADA',
        alocacao_nova: batchAlocacao as "DEPOSITO" | "EVENTO" | "FUNCIONARIO",
        observacoes: 'Alteração em lote'
      }));

      const { error: historyError } = await supabase
        .from('historico_movimentacoes')
        .insert(movementRecords);

      if (historyError) console.error('Erro ao registrar histórico:', historyError);
      
      toast.success(`Alocação atualizada para ${selectedIds.length} itens`);
      setBatchAlocacao("");
      onActionComplete();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar alocação");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchDelete = async () => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('itens_em_estoque')
        .delete()
        .in('id_item', selectedIds);

      if (error) throw error;
      
      toast.success(`${selectedIds.length} itens excluídos`);
      setShowDeleteDialog(false);
      onActionComplete();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao excluir itens");
    } finally {
      setIsProcessing(false);
    }
  };

  if (selectedIds.length === 0) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg z-50 animate-fade-in">
        <div className="max-w-4xl mx-auto p-3 sm:p-4">
          {/* Header with selection info */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={allSelected ? onClearSelection : onSelectAll}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {allSelected ? (
                  <CheckSquare className="h-4 w-4 text-primary" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                {allSelected ? "Desmarcar todos" : "Selecionar todos"}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {selectedIds.length} {selectedIds.length === 1 ? 'item selecionado' : 'itens selecionados'}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onClearSelection}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status change */}
            <div className="flex items-center gap-1.5">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <Select value={batchStatus} onValueChange={setBatchStatus}>
                <SelectTrigger className="h-9 w-32 sm:w-40 text-xs sm:text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusList.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleBatchStatusChange}
                disabled={!batchStatus || isProcessing}
                className="h-9"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
              </Button>
            </div>

            {/* Alocação change */}
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <Select value={batchAlocacao} onValueChange={setBatchAlocacao}>
                <SelectTrigger className="h-9 w-32 sm:w-40 text-xs sm:text-sm">
                  <SelectValue placeholder="Alocação" />
                </SelectTrigger>
                <SelectContent>
                  {alocacoes.map((alocacao) => (
                    <SelectItem key={alocacao} value={alocacao}>
                      {alocacao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleBatchAlocacaoChange}
                disabled={!batchAlocacao || isProcessing}
                className="h-9"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
              </Button>
            </div>

            {/* Delete */}
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isProcessing}
              className="h-9 ml-auto"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Excluir
            </Button>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão em lote</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir <strong>{selectedIds.length}</strong> {selectedIds.length === 1 ? 'item' : 'itens'}. 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Excluir {selectedIds.length} {selectedIds.length === 1 ? 'item' : 'itens'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
