import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Search, ScanBarcode, Mic, MicOff, PackageSearch, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { ItemPreview } from "@/components/ItemPreview";
import { useCustomEnums } from "@/hooks/useCustomEnums";

interface SelectedItemQty {
  id_item: number;
  quantidades: Record<string, number>; // status_name -> qty to withdraw
}

const RetirarItem = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [itens, setItens] = useState<any[]>([]);
  const [filteredItens, setFilteredItens] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState<Map<number, SelectedItemQty>>(new Map());
  const [destino, setDestino] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { alocacoes, statusList } = useCustomEnums();

  const toggleVoiceSearch = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { toast.error("Seu navegador não suporta reconhecimento de voz"); return; }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.onresult = (event: any) => { setSearchTerm(event.results[0][0].transcript); setIsListening(false); };
    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === 'not-allowed') {
        toast.error("Permissão do microfone negada. Verifique as configurações do navegador.");
      } else if (event.error === 'no-speech') {
        toast.info("Nenhuma fala detectada. Tente novamente.");
      } else {
        toast.error(`Erro no reconhecimento de voz: ${event.error}`);
      }
    };
    recognition.onend = () => { setIsListening(false); };
    recognition.start();
    setIsListening(true);
  };

  const destinoOptions = alocacoes.filter(a => a.nome !== "DEPOSITO");

  useEffect(() => {
    if (destinoOptions.length > 0 && !destino) {
      setDestino(destinoOptions[0].nome);
    }
  }, [destinoOptions]);

  useEffect(() => {
    loadItens();
  }, []);

  const loadItens = async () => {
    const { data } = await supabase
      .from('itens_em_estoque')
      .select('*')
      .eq('alocacao', 'DEPOSITO')
      .order('nome_item');
    setItens(data || []);
  };

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredItens([]);
      return;
    }
    const term = searchTerm.toLowerCase().trim();
    const filtered = itens.filter(item =>
      item.nome_item.toLowerCase().includes(term) ||
      item.sku?.toLowerCase().includes(term) ||
      item.id_item.toString().includes(term)
    );
    setFilteredItens(filtered);
  }, [searchTerm, itens]);

  const getStatusQuantities = (item: any): Record<string, number> => {
    const qtds: Record<string, number> = {};
    // From quantidades_por_status JSONB
    if (item.quantidades_por_status && typeof item.quantidades_por_status === 'object') {
      const parsed = item.quantidades_por_status as Record<string, number>;
      for (const [key, val] of Object.entries(parsed)) {
        if (typeof val === 'number' && val > 0) {
          qtds[key] = val;
        }
      }
    }
    // Fallback to legacy columns if JSONB is empty
    if (Object.keys(qtds).length === 0) {
      if (item.quantidade_novo > 0) qtds["NOVO"] = item.quantidade_novo;
      if (item.quantidade_usado > 0) qtds["USADO"] = item.quantidade_usado;
      if (item.quantidade_danificado > 0) qtds["DANIFICADO"] = item.quantidade_danificado;
      if (item.quantidade_em_manutencao > 0) qtds["EM_MANUTENCAO"] = item.quantidade_em_manutencao;
    }
    return qtds;
  };

  const toggleItemSelection = (item: any) => {
    const newMap = new Map(selectedItems);
    if (newMap.has(item.id_item)) {
      newMap.delete(item.id_item);
    } else {
      newMap.set(item.id_item, { id_item: item.id_item, quantidades: {} });
    }
    setSelectedItems(newMap);
  };

  const updateItemStatusQty = (idItem: number, status: string, qty: number) => {
    const newMap = new Map(selectedItems);
    const entry = newMap.get(idItem);
    if (!entry) return;
    entry.quantidades = { ...entry.quantidades, [status]: qty };
    newMap.set(idItem, entry);
    setSelectedItems(newMap);
  };

  const handleScanResult = (code: string) => {
    setSearchTerm(code);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.size === 0) {
      toast.error("Selecione ao menos um item");
      return;
    }

    // Validate quantities
    for (const [idItem, sel] of selectedItems) {
      const item = itens.find(i => i.id_item === idItem);
      const totalQty = Object.values(sel.quantidades).reduce((s, v) => s + v, 0);
      if (totalQty === 0) {
        toast.error(`Informe a quantidade para "${item?.nome_item}"`);
        return;
      }
      // Validate against available
      const available = getStatusQuantities(item);
      for (const [status, qty] of Object.entries(sel.quantidades)) {
        if (qty > (available[status] || 0)) {
          toast.error(`Quantidade de "${status}" excede o disponível para "${item?.nome_item}"`);
          return;
        }
      }
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      for (const [idItem, sel] of selectedItems) {
        const item = itens.find(i => i.id_item === idItem);
        const totalQty = Object.values(sel.quantidades).reduce((s, v) => s + v, 0);

        const { error: updateError } = await supabase
          .from('itens_em_estoque')
          .update({ alocacao: destino as any })
          .eq('id_item', idItem);

        if (updateError) throw updateError;

        const { error: histError } = await supabase
          .from('historico_movimentacoes')
          .insert([{
            id_item: idItem,
            user_id: user.id,
            tipo_operacao: 'RETIRADA',
            quantidade_alterada: totalQty,
            alocacao_anterior: item?.alocacao as any,
            alocacao_nova: destino as any,
            observacoes: `${observacoes} | Qtd por status: ${JSON.stringify(sel.quantidades)}`,
          }]);

        if (histError) throw histError;
      }

      toast.success("Itens retirados com sucesso!");
      navigate("/menu");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao retirar itens");
    } finally {
      setLoading(false);
    }
  };

  const hasSearch = searchTerm.trim().length > 0;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/menu")}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-bold">Retirar Item (Saída)</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Search */}
          <div>
            <Label>Buscar Item</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Digite SKU, nome ou ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                type="button"
                size="icon"
                variant={isListening ? "destructive" : "outline"}
                onClick={toggleVoiceSearch}
                className={isListening ? "animate-pulse" : ""}
              >
                {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => setShowScanner(true)}
              >
                <ScanBarcode className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Item List Results */}
          {hasSearch && filteredItens.length === 0 && (
            <Card className="p-6 flex flex-col items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-8 w-8" />
              <p className="text-center font-medium">Nenhum item encontrado para "{searchTerm}"</p>
              <p className="text-sm text-center">Verifique a grafia ou tente outro termo.</p>
            </Card>
          )}

          {hasSearch && filteredItens.length > 0 && (
            <div className="space-y-3">
              <Label>Itens encontrados ({filteredItens.length})</Label>
              {filteredItens.map(item => {
                const isSelected = selectedItems.has(item.id_item);
                const statusQtds = getStatusQuantities(item);
                const totalDisp = Object.values(statusQtds).reduce((s, v) => s + v, 0);
                const selEntry = selectedItems.get(item.id_item);

                return (
                  <Card key={item.id_item} className={`p-4 transition-colors ${isSelected ? 'border-primary bg-primary/5' : ''}`}>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleItemSelection(item)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold truncate">{item.nome_item}</span>
                          {item.sku && (
                            <span className="text-xs bg-muted px-2 py-0.5 rounded">SKU {item.sku}</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Total disponível: {totalDisp} un.
                        </p>

                        {/* Preview */}
                        {isSelected && (item.imagem_item || item.video_item) && (
                          <div className="mt-2">
                            <ItemPreview
                              sku={item.sku}
                              imagemUrl={item.imagem_item}
                              videoUrl={item.video_item}
                              compact
                            />
                          </div>
                        )}

                        {/* Status quantity selectors */}
                        {isSelected && (
                          <div className="mt-3 space-y-2">
                            <p className="text-sm font-medium">Quantidade por status:</p>
                            {Object.keys(statusQtds).length === 0 ? (
                              <p className="text-sm text-muted-foreground">Sem quantidades disponíveis</p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {Object.entries(statusQtds).map(([status, available]) => (
                                  <div key={status} className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
                                    <Label className="text-xs flex-1 truncate" title={status}>
                                      {status} <span className="text-muted-foreground">(disp: {available})</span>
                                    </Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      max={available}
                                      value={selEntry?.quantidades[status] || 0}
                                      onChange={(e) => updateItemStatusQty(item.id_item, status, Math.min(parseInt(e.target.value) || 0, available))}
                                      className="w-20 h-8 text-center"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {!hasSearch && (
            <Card className="p-6 flex flex-col items-center gap-2 text-muted-foreground">
              <PackageSearch className="h-8 w-8" />
              <p className="text-center">Digite um termo para buscar itens no depósito</p>
            </Card>
          )}

          {/* Destino */}
          <div>
            <Label htmlFor="destino">Destino *</Label>
            <Select value={destino} onValueChange={setDestino}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o destino" />
              </SelectTrigger>
              <SelectContent>
                {destinoOptions.map((aloc) => (
                  <SelectItem key={aloc.id} value={aloc.nome}>{aloc.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Observações */}
          <div>
            <Label htmlFor="obs">Observações</Label>
            <Textarea
              id="obs"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full h-14 text-lg" disabled={loading || selectedItems.size === 0}>
            {loading ? "Processando..." : `Confirmar Retirada (${selectedItems.size} item${selectedItems.size !== 1 ? 's' : ''})`}
          </Button>
        </form>

        <BarcodeScanner
          isOpen={showScanner}
          onClose={() => setShowScanner(false)}
          onScan={handleScanResult}
        />
      </div>
    </div>
  );
};

export default RetirarItem;
