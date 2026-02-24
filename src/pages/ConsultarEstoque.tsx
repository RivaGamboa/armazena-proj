import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Search, QrCode, ScanBarcode, Play, CheckSquare, ExternalLink, Mic, MicOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { AdvancedFilters, AdvancedFiltersState, initialFilters } from "@/components/AdvancedFilters";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MovementTimeline } from "@/components/MovementTimeline";
import { BatchActionsBar } from "@/components/BatchActionsBar";
import QRCodeSVG from "react-qr-code";
import Barcode from "react-barcode";
import { Constants } from "@/integrations/supabase/types";

/** Parse imagem_item field: supports JSON array or plain URL */
function parseImageUrls(imagem_item: string | null | undefined): string[] {
  if (!imagem_item) return [];
  try {
    const parsed = JSON.parse(imagem_item);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {
    // plain URL
  }
  return [imagem_item];
}

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
  quantidade_total: number | null;
  quantidades_por_status: Record<string, number> | null;
  comprimento_cm: number | null;
  largura_cm: number | null;
  profundidade_cm: number | null;
  peso_kg: number | null;
  data_cadastro: string;
}

const ConsultarEstoque = () => {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [itens, setItens] = useState<Item[]>([]);
  const [filteredItens, setFilteredItens] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFiltersState>(initialFilters);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const categorias = Constants.public.Enums.categoria_item_enum;
  const statusList = Constants.public.Enums.status_item_enum;
  const alocacoes = Constants.public.Enums.alocacao_enum;

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
    applyAllFilters(value, advancedFilters);
  };

  const applyAllFilters = (searchValue: string, filters: AdvancedFiltersState) => {
    let filtered = [...itens];

    // Text search
    if (searchValue.trim()) {
      const search = searchValue.toLowerCase();
      filtered = filtered.filter(item => 
        item.nome_item.toLowerCase().includes(search) ||
        item.id_item.toString().includes(search) ||
        item.sku?.toLowerCase().includes(search) ||
        item.categoria_item.toLowerCase().includes(search)
      );
    }

    // Categoria
    if (filters.categoria && filters.categoria !== "all") {
      filtered = filtered.filter(item => item.categoria_item === filters.categoria);
    }

    // Status
    if (filters.status && filters.status !== "all") {
      filtered = filtered.filter(item => item.status_item === filters.status);
    }

    // Alocação
    if (filters.alocacao && filters.alocacao !== "all") {
      filtered = filtered.filter(item => item.alocacao === filters.alocacao);
    }

    // Data de cadastro
    if (filters.dataInicio) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.data_cadastro);
        return itemDate >= filters.dataInicio!;
      });
    }
    if (filters.dataFim) {
      const endDate = new Date(filters.dataFim);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.data_cadastro);
        return itemDate <= endDate;
      });
    }

    // Quantidade total
    if (filters.quantidadeMin) {
      const min = parseInt(filters.quantidadeMin);
      filtered = filtered.filter(item => {
        const total = item.quantidades_por_status
          ? Object.values(item.quantidades_por_status).reduce((s, v) => s + (v || 0), 0)
          : item.quantidade_total ?? (item.quantidade_novo + item.quantidade_usado + item.quantidade_danificado);
        return total >= min;
      });
    }
    if (filters.quantidadeMax) {
      const max = parseInt(filters.quantidadeMax);
      filtered = filtered.filter(item => {
        const total = item.quantidades_por_status
          ? Object.values(item.quantidades_por_status).reduce((s, v) => s + (v || 0), 0)
          : item.quantidade_total ?? (item.quantidade_novo + item.quantidade_usado + item.quantidade_danificado);
        return total <= max;
      });
    }

    // Dimensões - Comprimento
    if (filters.comprimentoMin) {
      const min = parseFloat(filters.comprimentoMin);
      filtered = filtered.filter(item => item.comprimento_cm !== null && item.comprimento_cm >= min);
    }
    if (filters.comprimentoMax) {
      const max = parseFloat(filters.comprimentoMax);
      filtered = filtered.filter(item => item.comprimento_cm !== null && item.comprimento_cm <= max);
    }

    // Dimensões - Largura
    if (filters.larguraMin) {
      const min = parseFloat(filters.larguraMin);
      filtered = filtered.filter(item => item.largura_cm !== null && item.largura_cm >= min);
    }
    if (filters.larguraMax) {
      const max = parseFloat(filters.larguraMax);
      filtered = filtered.filter(item => item.largura_cm !== null && item.largura_cm <= max);
    }

    // Dimensões - Profundidade
    if (filters.profundidadeMin) {
      const min = parseFloat(filters.profundidadeMin);
      filtered = filtered.filter(item => item.profundidade_cm !== null && item.profundidade_cm >= min);
    }
    if (filters.profundidadeMax) {
      const max = parseFloat(filters.profundidadeMax);
      filtered = filtered.filter(item => item.profundidade_cm !== null && item.profundidade_cm <= max);
    }

    // Peso
    if (filters.pesoMin) {
      const min = parseFloat(filters.pesoMin);
      filtered = filtered.filter(item => item.peso_kg !== null && item.peso_kg >= min);
    }
    if (filters.pesoMax) {
      const max = parseFloat(filters.pesoMax);
      filtered = filtered.filter(item => item.peso_kg !== null && item.peso_kg <= max);
    }

    setFilteredItens(filtered);
  };

  const handleApplyAdvancedFilters = () => {
    applyAllFilters(busca, advancedFilters);
    toast.success(`${filteredItens.length} itens encontrados`);
  };

  const handleClearAdvancedFilters = () => {
    setAdvancedFilters(initialFilters);
    applyAllFilters(busca, initialFilters);
    toast.info("Filtros limpos");
  };

  const handleScanResult = (code: string) => {
    handleSearch(code);
    setBusca(code);
  };

  const toggleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Seu navegador não suporta reconhecimento de voz.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setBusca(transcript);
      handleSearch(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      toast.error("Erro no reconhecimento de voz. Tente novamente.");
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognition.start();
    setIsListening(true);
  };

  const toggleItemSelection = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id) 
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(filteredItens.map(item => item.id_item));
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
    setSelectionMode(false);
  };

  const handleBatchActionComplete = () => {
    setSelectedIds([]);
    setSelectionMode(false);
    loadItens();
  };

  return (
    <div className={`min-h-screen bg-background ${selectedIds.length > 0 ? 'pb-40' : 'pb-20'}`}>
      <div className="sticky top-0 bg-background border-b p-3 sm:p-4 z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/menu")} className="touch-target">
              <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold flex-1">Consultar Estoque</h1>
            <Button
              variant={selectionMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSelectionMode(!selectionMode);
                if (selectionMode) setSelectedIds([]);
              }}
              className="gap-1.5"
            >
              <CheckSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Selecionar</span>
            </Button>
            <ThemeToggle />
          </div>

          <div className="space-y-2 sm:space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                <Input
                  placeholder="Buscar por SKU, nome, ID ou categoria..."
                  className="pl-9 sm:pl-10 h-10 sm:h-12 text-sm sm:text-base"
                  value={busca}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              <Button
                type="button"
                size="icon"
                variant={isListening ? "destructive" : "outline"}
                className="h-10 w-10 sm:h-12 sm:w-12 touch-target"
                onClick={toggleVoiceSearch}
                title={isListening ? "Parar gravação" : "Buscar por voz"}
              >
                {isListening ? <MicOff className="h-4 w-4 sm:h-5 sm:w-5 animate-pulse" /> : <Mic className="h-4 w-4 sm:h-5 sm:w-5" />}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-10 w-10 sm:h-12 sm:w-12 touch-target"
                onClick={() => setShowScanner(true)}
              >
                <ScanBarcode className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>

            <AdvancedFilters
              filters={advancedFilters}
              onFiltersChange={setAdvancedFilters}
              onApply={handleApplyAdvancedFilters}
              onClear={handleClearAdvancedFilters}
              categorias={[...categorias]}
              statusList={[...statusList]}
              alocacoes={[...alocacoes]}
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-3 sm:p-4">
        <div className="mb-3 text-sm text-muted-foreground">
          {filteredItens.length} {filteredItens.length === 1 ? "item encontrado" : "itens encontrados"}
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-8">Carregando...</p>
        ) : filteredItens.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum item encontrado</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {filteredItens.map((item) => {
              const isSelected = selectedIds.includes(item.id_item);
              return (
              <div 
                key={item.id_item} 
                className={`bg-card border rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-primary border-primary' : ''}`}
                onClick={() => {
                  if (selectionMode) {
                    setSelectedIds(prev => 
                      prev.includes(item.id_item) 
                        ? prev.filter(i => i !== item.id_item) 
                        : [...prev, item.id_item]
                    );
                  } else {
                    setExpandedItem(expandedItem === item.id_item ? null : item.id_item);
                  }
                }}
              >
                {/* SKU, QR Code e Código de Barras */}
                {item.sku && (
                  <div className="bg-muted/50 p-2 sm:p-3 flex items-center justify-between gap-2 flex-wrap border-b">
                    <div className="flex items-center gap-2">
                      {selectionMode && (
                        <Checkbox 
                          checked={isSelected}
                          onClick={(e) => toggleItemSelection(item.id_item, e)}
                          className="h-5 w-5"
                        />
                      )}
                      <div className="text-center">
                        <span className="text-xs text-muted-foreground">SKU</span>
                        <div className="text-base sm:text-xl font-bold font-mono">{item.sku}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                      <QRCodeSVG value={item.sku} size={32} className="sm:w-10 sm:h-10" />
                      <div className="hidden sm:block">
                        <Barcode value={item.sku} height={25} width={1} fontSize={8} displayValue={false} />
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-3 sm:p-4 flex gap-3 sm:gap-4">
                  {/* Checkbox para seleção (quando não tem SKU) */}
                  {selectionMode && !item.sku && (
                    <Checkbox 
                      checked={isSelected}
                      onClick={(e) => toggleItemSelection(item.id_item, e)}
                      className="h-5 w-5 mt-1"
                    />
                  )}
                  {/* Preview de Imagem */}
                  <div className="flex flex-col gap-2">
                  {(() => {
                      const imgs = parseImageUrls(item.imagem_item);
                      return imgs.length > 0 ? (
                      <img 
                        src={imgs[0]} 
                        alt={item.nome_item}
                        className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted rounded flex items-center justify-center">
                        <Search className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                      </div>
                    );
                    })()}
                    {item.video_item && (
                      <div className="w-16 h-10 sm:w-20 sm:h-14 relative rounded overflow-hidden bg-muted">
                        <video
                          src={item.video_item}
                          className="w-full h-full object-cover"
                          muted
                          preload="metadata"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Play className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm sm:text-lg truncate">{item.nome_item}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">{item.categoria_item}</p>
                    <div className="flex gap-1 sm:gap-2 mt-1 sm:mt-2 text-xs flex-wrap">
                      <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-primary/10 text-primary rounded">
                        {item.status_item}
                      </span>
                      <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-500/10 text-blue-600 rounded">
                        {item.alocacao}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 sm:mt-2">
                      N: {item.quantidade_novo} | U: {item.quantidade_usado} | D: {item.quantidade_danificado}
                    </p>
                  </div>
                </div>

                {/* Detalhes Expandidos */}
                {expandedItem === item.id_item && (
                  <div className="p-3 sm:p-4 border-t bg-muted/30 space-y-4">
                    {item.sku && (
                      <div className="flex items-center justify-center gap-4 sm:gap-6">
                        <div className="text-center">
                          <span className="text-xs text-muted-foreground block mb-1">QR Code</span>
                          <QRCodeSVG value={item.sku} size={60} className="sm:w-20 sm:h-20" />
                        </div>
                        <div className="text-center">
                          <span className="text-xs text-muted-foreground block mb-1">Código de Barras</span>
                          <Barcode value={item.sku} height={40} width={1.2} fontSize={10} />
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                      {(item.comprimento_cm || item.largura_cm || item.profundidade_cm) && (
                        <div>
                          <span className="text-muted-foreground">Dimensões:</span>
                          <div className="font-medium">
                            {item.comprimento_cm || "-"} × {item.largura_cm || "-"} × {item.profundidade_cm || "-"} cm
                          </div>
                        </div>
                      )}
                      {item.peso_kg && (
                        <div>
                          <span className="text-muted-foreground">Peso:</span>
                          <div className="font-medium">{item.peso_kg} kg</div>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Cadastro:</span>
                        <div className="font-medium">
                          {new Date(item.data_cadastro).toLocaleDateString("pt-BR")}
                        </div>
                      </div>
                    </div>

                    {/* Timeline de Movimentações - Preview */}
                    <div className="pt-3 border-t">
                      <MovementTimeline itemId={item.id_item} />
                    </div>

                    {/* Ver Detalhes Completos */}
                    <Button
                      variant="outline"
                      className="w-full gap-2 mt-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/item/${item.id_item}`);
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Ver Detalhes Completos
                    </Button>
                  </div>
                )}
              </div>
            )})}
          </div>
        )}
      </div>

      {/* Batch Actions Bar */}
      <BatchActionsBar
        selectedIds={selectedIds}
        totalItems={filteredItens.length}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onActionComplete={handleBatchActionComplete}
      />

      <BarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScanResult}
      />
    </div>
  );
};

export default ConsultarEstoque;
