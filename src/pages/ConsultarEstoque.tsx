import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, QrCode, MessageSquare, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Item {
  id_item: number;
  nome_item: string;
  categoria_item: string;
  status_item: string;
  alocacao: string;
  imagem_item: string | null;
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
      item.id_item.toString().includes(value)
    );
    setFilteredItens(filtered);
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
            <div className="relative">
              <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Escanear QR Code ou buscar..."
                className="pl-10 h-12"
                value={busca}
                onChange={(e) => handleSearch(e.target.value)}
              />
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
                className="bg-card border rounded-lg p-4 flex gap-4"
              >
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
                
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{item.nome_item}</h3>
                  <p className="text-sm text-muted-foreground">{item.categoria_item}</p>
                  <div className="flex gap-4 mt-2 text-sm">
                    <span className="px-2 py-1 bg-primary/10 text-primary rounded">
                      {item.status_item}
                    </span>
                    <span className="px-2 py-1 bg-blue-500/10 text-blue-600 rounded">
                      {item.alocacao}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Novo: {item.quantidade_novo} | Usado: {item.quantidade_usado} | Danificado: {item.quantidade_danificado}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsultarEstoque;
