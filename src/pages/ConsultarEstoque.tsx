import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, QrCode, MessageSquare, Send, ScanBarcode, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import QRCodeSVG from "react-qr-code";
import Barcode from "react-barcode";

interface Item {
  id_item: number;
  nome_item: string;
  categoria_item: string;
  status_item: string;
  alocacao: string;
  imagem_item: string | null;
  video_item: string | null;
  sku: string | null;
  quantidade_novo: number;
  quantidade_usado: number;
  quantidade_danificado: number;
}

const ConsultarEstoque = () => {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [itens, setItens] = useState<Item[]>([]);
  const [filteredItens, setFilteredItens] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [expandedItem, setExpandedItem] = useState<number | null>(null);

  useEffect(() => {
    loadItens();
  }, []);

  const loadItens = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('itens_em_estoque')
        .select('*')
        .order('nome_item');
      
      if (error) throw error;
      setItens(data || []);
      setFilteredItens(data || []);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar itens");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setBusca(value);
    if (!value.trim()) {
      setFilteredItens(itens);
      return;
    }

    const filtered = itens.filter(item => 
      item.nome_item.toLowerCase().includes(value.toLowerCase()) ||
      item.id_item.toString().includes(value) ||
      item.sku?.toLowerCase().includes(value.toLowerCase()) ||
      item.categoria_item.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredItens(filtered);
  };

  const handleScanResult = (code: string) => {
    handleSearch(code);
    setBusca(code);
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    setChatLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('chat-estoque', {
        body: { message: chatMessage }
      });

      if (error) throw error;

      if (data.filters) {
        let filtered = [...itens];
        
        if (data.filters.categoria) {
          filtered = filtered.filter(item => item.categoria_item === data.filters.categoria);
        }
        if (data.filters.status) {
          filtered = filtered.filter(item => item.status_item === data.filters.status);
        }
        if (data.filters.alocacao) {
          filtered = filtered.filter(item => item.alocacao === data.filters.alocacao);
        }

        setFilteredItens(filtered);
        toast.success(data.message || "Filtros aplicados!");
      } else {
        toast.info(data.message || "Nenhum filtro aplicado");
      }

      setChatMessage("");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao processar pergunta");
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 bg-background border-b p-4 z-10">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/menu")}>
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-2xl font-bold">Consultar Estoque</h1>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Buscar por SKU, nome, ID ou categoria..."
                  className="pl-10 h-12"
                  value={busca}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-12 w-12"
                onClick={() => setShowScanner(true)}
              >
                <ScanBarcode className="h-5 w-5" />
              </Button>
            </div>

            <form onSubmit={handleChatSubmit} className="relative">
              <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Pergunte sobre seu estoque (ex: itens em EVENTO)"
                className="pl-10 pr-12 h-12"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
              />
              <Button 
                type="submit" 
                size="icon" 
                variant="ghost"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                disabled={chatLoading}
              >
                <Send className="h-5 w-5" />
              </Button>
            </form>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {loading ? (
          <p className="text-center text-muted-foreground">Carregando...</p>
        ) : filteredItens.length === 0 ? (
          <p className="text-center text-muted-foreground">Nenhum item encontrado</p>
        ) : (
          <div className="space-y-4">
            {filteredItens.map((item) => (
              <div 
                key={item.id_item} 
                className="bg-card border rounded-lg overflow-hidden cursor-pointer transition-all"
                onClick={() => setExpandedItem(expandedItem === item.id_item ? null : item.id_item)}
              >
                {/* SKU, QR Code e Código de Barras - Primeira Linha */}
                {item.sku && (
                  <div className="bg-muted/50 p-3 flex items-center justify-between gap-3 flex-wrap border-b">
                    <div className="text-center">
                      <span className="text-xs text-muted-foreground">SKU</span>
                      <div className="text-xl font-bold font-mono">{item.sku}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <QRCodeSVG value={item.sku} size={40} />
                      <Barcode value={item.sku} height={30} width={1} fontSize={8} displayValue={false} />
                    </div>
                  </div>
                )}

                <div className="p-4 flex gap-4">
                  {/* Preview de Imagem */}
                  <div className="flex flex-col gap-2">
                    {item.imagem_item ? (
                      <img 
                        src={item.imagem_item} 
                        alt={item.nome_item}
                        className="w-20 h-20 object-cover rounded"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-muted rounded flex items-center justify-center">
                        <Search className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    {/* Thumbnail de Vídeo */}
                    {item.video_item && (
                      <div className="w-20 h-14 relative rounded overflow-hidden bg-muted">
                        <video
                          src={item.video_item}
                          className="w-full h-full object-cover"
                          muted
                          preload="metadata"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Play className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{item.nome_item}</h3>
                    <p className="text-sm text-muted-foreground">{item.categoria_item}</p>
                    <div className="flex gap-2 mt-2 text-sm flex-wrap">
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                        {item.status_item}
                      </span>
                      <span className="px-2 py-1 bg-blue-500/10 text-blue-600 rounded text-xs">
                        {item.alocacao}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Novo: {item.quantidade_novo} | Usado: {item.quantidade_usado} | Danificado: {item.quantidade_danificado}
                    </p>
                  </div>
                </div>

                {/* Detalhes Expandidos */}
                {expandedItem === item.id_item && item.sku && (
                  <div className="p-4 border-t bg-muted/30">
                    <div className="flex items-center justify-center gap-6">
                      <div className="text-center">
                        <span className="text-xs text-muted-foreground block mb-1">QR Code Ampliado</span>
                        <QRCodeSVG value={item.sku} size={80} />
                      </div>
                      <div className="text-center">
                        <span className="text-xs text-muted-foreground block mb-1">Código de Barras</span>
                        <Barcode value={item.sku} height={50} width={1.5} fontSize={12} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <BarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScanResult}
      />
    </div>
  );
};

export default ConsultarEstoque;
