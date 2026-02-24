import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Search, ScanBarcode, Mic, MicOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { ItemPreview } from "@/components/ItemPreview";
import { useCustomEnums } from "@/hooks/useCustomEnums";
import { useRef } from "react";

const RetirarItem = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [itens, setItens] = useState<any[]>([]);
  const [filteredItens, setFilteredItens] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState("");
  const [quantidade, setQuantidade] = useState(0);
  const [destino, setDestino] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { alocacoes } = useCustomEnums();

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
    recognition.onerror = () => { setIsListening(false); };
    recognition.onend = () => { setIsListening(false); };
    recognition.start();
    setIsListening(true);
  };

  // Filtrar alocações que não são DEPOSITO (destinos válidos para retirada)
  const destinoOptions = alocacoes.filter(a => a.nome !== "DEPOSITO");

  const selectedItemData = itens.find(i => i.id_item.toString() === selectedItem);

  // Definir destino padrão quando opções carregarem
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
    const items = data || [];
    setItens(items);
    setFilteredItens(items);
  };

  useEffect(() => {
    if (!searchTerm) {
      setFilteredItens(itens);
      return;
    }
    
    const filtered = itens.filter(item =>
      item.nome_item.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id_item.toString().includes(searchTerm)
    );
    setFilteredItens(filtered);
  }, [searchTerm, itens]);

  const handleScanResult = (code: string) => {
    setSearchTerm(code);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) {
      toast.error("Selecione um item");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const item = itens.find(i => i.id_item.toString() === selectedItem);
      
      // Atualizar alocação e registrar histórico
      const { error: updateError } = await supabase
        .from('itens_em_estoque')
        .update({ alocacao: destino as any })
        .eq('id_item', parseInt(selectedItem));

      if (updateError) throw updateError;

      const { error: histError } = await supabase
        .from('historico_movimentacoes')
        .insert([{
          id_item: item.id_item,
          user_id: user.id,
          tipo_operacao: 'RETIRADA',
          quantidade_alterada: quantidade,
          alocacao_anterior: item.alocacao as any,
          alocacao_nova: destino as any,
          observacoes,
        }]);

      if (histError) throw histError;

      toast.success("Item retirado com sucesso!");
      navigate("/menu");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao retirar item");
    } finally {
      setLoading(false);
    }
  };

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
                variant="outline"
                onClick={() => setShowScanner(true)}
              >
                <ScanBarcode className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="item">Item *</Label>
            <Select value={selectedItem} onValueChange={setSelectedItem}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um item" />
              </SelectTrigger>
              <SelectContent>
                {filteredItens.map(item => (
                  <SelectItem key={item.id_item} value={item.id_item.toString()}>
                    SKU {item.sku} - {item.nome_item} (Disp: {item.quantidade_novo + item.quantidade_usado})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview do Item Selecionado */}
          {selectedItemData && (
            <ItemPreview
              sku={selectedItemData.sku}
              imagemUrl={selectedItemData.imagem_item}
              videoUrl={selectedItemData.video_item}
              compact
            />
          )}

          <div>
            <Label htmlFor="quantidade">Quantidade</Label>
            <Input
              id="quantidade"
              type="number"
              value={quantidade}
              onChange={(e) => setQuantidade(parseInt(e.target.value) || 0)}
            />
          </div>

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

          <div>
            <Label htmlFor="obs">Observações</Label>
            <Textarea
              id="obs"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full h-14 text-lg" disabled={loading}>
            {loading ? "Processando..." : "Confirmar Retirada"}
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
