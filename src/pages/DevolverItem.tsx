import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Package, RotateCcw, MapPin, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCustomEnums } from "@/hooks/useCustomEnums";
import { ImageZoom } from "@/components/ImageZoom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function parseImageUrl(imagem: string | null): string | null {
  if (!imagem) return null;
  try {
    const parsed = JSON.parse(imagem);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
  } catch {}
  return imagem;
}

interface DisplacedItem {
  id_item: number;
  nome_item: string;
  sku: string | null;
  alocacao: string; // default
  alocacao_atual: string; // current
  imagem_item: string | null;
  ultima_movimentacao?: string | null;
}

const DevolverItem = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [displacedItems, setDisplacedItems] = useState<DisplacedItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [destino, setDestino] = useState<string>("default"); // "default" = return to alocacao_default
  const [observacoes, setObservacoes] = useState("");
  const { alocacoes, getDefaultAlocacao } = useCustomEnums();

  useEffect(() => {
    loadDisplacedItems();
  }, []);

  const loadDisplacedItems = async () => {
    setLoading(true);
    try {
      // Get all items where alocacao_atual != alocacao (default)
      const { data: items, error } = await supabase
        .from('itens_em_estoque')
        .select('id_item, nome_item, sku, alocacao, alocacao_atual, imagem_item')
        .order('nome_item');

      if (error) throw error;

      // Filter items where current location differs from default
      const displaced = (items || []).filter(
        (item: any) => item.alocacao_atual && item.alocacao_atual !== item.alocacao
      );

      // Load last movement for each displaced item
      const itemIds = displaced.map((d: any) => d.id_item);
      let movMap: Record<number, string> = {};

      if (itemIds.length > 0) {
        const { data: movs } = await supabase
          .from('historico_movimentacoes')
          .select('id_item, data_operacao')
          .in('id_item', itemIds)
          .order('data_operacao', { ascending: false });

        if (movs) {
          for (const m of movs) {
            if (m.id_item && !movMap[m.id_item]) {
              movMap[m.id_item] = m.data_operacao;
            }
          }
        }
      }

      setDisplacedItems(
        displaced.map((item: any) => ({
          ...item,
          ultima_movimentacao: movMap[item.id_item] || null,
        }))
      );
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar itens deslocados");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === displacedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displacedItems.map(i => i.id_item)));
    }
  };

  const handleReturn = async (itemIds: number[]) => {
    if (itemIds.length === 0) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      for (const id of itemIds) {
        const item = displacedItems.find(i => i.id_item === id);
        if (!item) continue;

        const targetAlocacao = destino === "default" ? item.alocacao : destino;

        // Update alocacao_atual
        const { error: updateError } = await supabase
          .from('itens_em_estoque')
          .update({ alocacao_atual: targetAlocacao } as any)
          .eq('id_item', id);

        if (updateError) throw updateError;

        // Record movement
        const { error: histError } = await supabase
          .from('historico_movimentacoes')
          .insert([{
            id_item: id,
            user_id: user.id,
            tipo_operacao: 'DEVOLUCAO',
            alocacao_anterior: item.alocacao_atual as any,
            alocacao_nova: targetAlocacao as any,
            observacoes: observacoes || `Devolução ${destino === "default" ? "ao local padrão" : `para ${targetAlocacao}`}`,
          }]);

        if (histError) throw histError;
      }

      toast.success(`${itemIds.length} item(ns) devolvido(s) com sucesso!`);
      setSelectedIds(new Set());
      setObservacoes("");
      await loadDisplacedItems();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao devolver itens");
    } finally {
      setSubmitting(false);
    }
  };

  const allSelected = selectedIds.size === displacedItems.length && displacedItems.length > 0;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/menu")}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-bold">Devolver Item</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-muted-foreground">Carregando...</div>
          </div>
        ) : displacedItems.length === 0 ? (
          <Card className="p-8 flex flex-col items-center gap-3 text-muted-foreground">
            <Package className="h-12 w-12 opacity-40" />
            <p className="text-lg font-medium">Todos os itens estão em seus locais padrão</p>
            <p className="text-sm text-center">
              Nenhum item foi retirado ou movimentado. Use a aba "Retirar Item" para mover itens.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Header with select all */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {displacedItems.length} item(ns) fora do local padrão
              </p>
              <Button variant="outline" size="sm" onClick={selectAll}>
                {allSelected ? "Desmarcar todos" : "Selecionar todos"}
              </Button>
            </div>

            {/* Items list */}
            <div className="space-y-3">
              {displacedItems.map(item => {
                const isSelected = selectedIds.has(item.id_item);
                const thumbUrl = parseImageUrl(item.imagem_item);

                return (
                  <Card key={item.id_item} className={`p-4 transition-colors ${isSelected ? 'border-primary bg-primary/5' : ''}`}>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(item.id_item)}
                        className="mt-1"
                      />

                      {/* Image */}
                      {thumbUrl ? (
                        <ImageZoom
                          src={thumbUrl}
                          alt={item.nome_item}
                          className="w-16 h-16 object-cover rounded-lg border flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold truncate">{item.nome_item}</span>
                          {item.sku && (
                            <span className="text-xs bg-muted px-2 py-0.5 rounded">SKU {item.sku}</span>
                          )}
                        </div>

                        {/* Location info */}
                        <div className="flex items-center gap-1 mt-1 text-sm">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-destructive font-medium">{item.alocacao_atual}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-primary font-medium">{item.alocacao}</span>
                          <span className="text-xs text-muted-foreground">(padrão)</span>
                        </div>

                        {/* Last movement */}
                        {item.ultima_movimentacao && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>
                              Última mov: {format(new Date(item.ultima_movimentacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        )}

                        {/* Individual return button */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          disabled={submitting}
                          onClick={() => handleReturn([item.id_item])}
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1" />
                          Devolver ao padrão
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Batch action area */}
            {selectedIds.size > 0 && (
              <Card className="p-4 border-primary/30 bg-primary/5 space-y-4 sticky bottom-4">
                <p className="font-medium text-sm">
                  {selectedIds.size} item(ns) selecionado(s)
                </p>

                {/* Destination override */}
                <div>
                  <Label className="text-sm">Destino da devolução</Label>
                  <Select value={destino} onValueChange={setDestino}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Retornar ao local padrão de cada item</SelectItem>
                      {alocacoes.map(a => (
                        <SelectItem key={a.id} value={a.nome}>{a.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Observations */}
                <div>
                  <Label className="text-sm">Observações</Label>
                  <Textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    rows={2}
                    placeholder="Motivo da devolução, estado do item, etc."
                  />
                </div>

                <Button
                  className="w-full h-12"
                  disabled={submitting}
                  onClick={() => handleReturn(Array.from(selectedIds))}
                >
                  {submitting ? "Processando..." : `Confirmar Devolução de ${selectedIds.size} item(ns) → ${destino === "default" ? "Local Padrão" : destino}`}
                </Button>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DevolverItem;
