import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Camera, Video, Tag, ScanBarcode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import QRCodeSVG from "react-qr-code";
import Barcode from "react-barcode";
import { LabelGenerator } from "@/components/LabelGenerator";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { ItemPreview } from "@/components/ItemPreview";
import { SavedItemPreview } from "@/components/SavedItemPreview";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useCustomEnums } from "@/hooks/useCustomEnums";
import { Constants } from "@/integrations/supabase/types";

interface SavedItem {
  id_item: number;
  sku: string;
  nome_item: string;
  categoria_item: string;
  status_item: string;
  alocacao: string;
  quantidade_novo: number;
  quantidade_usado: number;
  quantidade_danificado: number;
  imagem_item?: string | null;
  video_item?: string | null;
}

const CadastrarItem = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const itemId = searchParams.get("id");
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showLabelGenerator, setShowLabelGenerator] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [savedItem, setSavedItem] = useState<SavedItem | null>(null);
  const { categorias, alocacoes, statusList, loading: enumsLoading } = useCustomEnums();
  
  const categoriaOptions = categorias.length > 0 
    ? categorias.map(c => c.nome) 
    : Constants.public.Enums.categoria_item_enum;
  const alocacaoOptions = alocacoes.length > 0 
    ? alocacoes.map(a => a.nome) 
    : Constants.public.Enums.alocacao_enum;
  const statusOptions = statusList.length > 0 
    ? statusList.map(s => s.nome) 
    : Constants.public.Enums.status_item_enum;

  const [formData, setFormData] = useState({
    sku: "",
    nome_item: "",
    categoria_item: "",
    descricao_item: "",
    status_item: "",
    alocacao: "",
    quantidade_novo: 0,
    quantidade_usado: 0,
    quantidade_danificado: 0,
    comprimento_cm: 0,
    largura_cm: 0,
    profundidade_cm: 0,
    peso_kg: 0,
  });
  const [imagemFile, setImagemFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [existingVideoUrl, setExistingVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!enumsLoading && !isEditMode && !formData.categoria_item) {
      setFormData(prev => ({
        ...prev,
        categoria_item: categoriaOptions[0] || "Ferramentas",
        alocacao: alocacaoOptions[0] || "DEPOSITO",
        status_item: statusOptions[0] || "NOVO",
      }));
    }
  }, [enumsLoading, isEditMode]);

  useEffect(() => {
    if (itemId) {
      loadItem(itemId);
      setIsEditMode(true);
      setSavedItem(null);
    }
  }, [itemId]);

  const loadItem = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("itens_em_estoque")
        .select("*")
        .eq("id_item", parseInt(id))
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          sku: data.sku || "",
          nome_item: data.nome_item,
          categoria_item: data.categoria_item,
          descricao_item: data.descricao_item || "",
          status_item: data.status_item,
          alocacao: data.alocacao,
          quantidade_novo: data.quantidade_novo,
          quantidade_usado: data.quantidade_usado,
          quantidade_danificado: data.quantidade_danificado,
          comprimento_cm: data.comprimento_cm || 0,
          largura_cm: data.largura_cm || 0,
          profundidade_cm: data.profundidade_cm || 0,
          peso_kg: data.peso_kg || 0,
        });
        setExistingImageUrl(data.imagem_item);
        setExistingVideoUrl(data.video_item);
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar item");
    }
  };

  const handleImageCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) setImagemFile(file);
    };
    input.click();
  };

  const handleVideoCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.capture = 'environment';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) setVideoFile(file);
    };
    input.click();
  };

  const handleScanResult = async (code: string) => {
    try {
      const { data, error } = await supabase
        .from("itens_em_estoque")
        .select("*")
        .eq("sku", code)
        .single();

      if (error) {
        toast.error("Item não encontrado");
        return;
      }

      if (data) {
        setFormData({
          sku: data.sku || "",
          nome_item: data.nome_item,
          categoria_item: data.categoria_item,
          descricao_item: data.descricao_item || "",
          status_item: data.status_item,
          alocacao: data.alocacao,
          quantidade_novo: data.quantidade_novo,
          quantidade_usado: data.quantidade_usado,
          quantidade_danificado: data.quantidade_danificado,
          comprimento_cm: data.comprimento_cm || 0,
          largura_cm: data.largura_cm || 0,
          profundidade_cm: data.profundidade_cm || 0,
          peso_kg: data.peso_kg || 0,
        });
        setIsEditMode(true);
        toast.success("Item carregado com sucesso!");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao buscar item");
    }
  };

  const resetForm = () => {
    setFormData({
      sku: "",
      nome_item: "",
      categoria_item: categoriaOptions[0] || "Ferramentas",
      descricao_item: "",
      status_item: statusOptions[0] || "NOVO",
      alocacao: alocacaoOptions[0] || "DEPOSITO",
      quantidade_novo: 0,
      quantidade_usado: 0,
      quantidade_danificado: 0,
      comprimento_cm: 0,
      largura_cm: 0,
      profundidade_cm: 0,
      peso_kg: 0,
    });
    setImagemFile(null);
    setVideoFile(null);
    setExistingImageUrl(null);
    setExistingVideoUrl(null);
    setIsEditMode(false);
    setSavedItem(null);
    setSearchParams({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      let imagemUrl = existingImageUrl;
      let videoUrl = existingVideoUrl;

      if (imagemFile) {
        const imagemPath = `${user.id}/${Date.now()}_${imagemFile.name}`;
        const { error: imagemError } = await supabase.storage
          .from('item-photos')
          .upload(imagemPath, imagemFile);
        
        if (imagemError) throw imagemError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('item-photos')
          .getPublicUrl(imagemPath);
        
        imagemUrl = publicUrl;
      }

      if (videoFile) {
        const videoPath = `${user.id}/${Date.now()}_${videoFile.name}`;
        const { error: videoError } = await supabase.storage
          .from('item-photos')
          .upload(videoPath, videoFile);
        
        if (videoError) throw videoError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('item-photos')
          .getPublicUrl(videoPath);
        
        videoUrl = publicUrl;
      }

      const itemData = {
        nome_item: formData.nome_item,
        categoria_item: formData.categoria_item as any,
        descricao_item: formData.descricao_item,
        status_item: formData.status_item as any,
        alocacao: formData.alocacao as any,
        quantidade_novo: formData.quantidade_novo,
        quantidade_usado: formData.quantidade_usado,
        quantidade_danificado: formData.quantidade_danificado,
        comprimento_cm: formData.comprimento_cm,
        largura_cm: formData.largura_cm,
        profundidade_cm: formData.profundidade_cm,
        peso_kg: formData.peso_kg,
        user_id: user.id,
        ...(imagemUrl && { imagem_item: imagemUrl }),
        ...(videoUrl && { video_item: videoUrl }),
      };

      let savedItemData: SavedItem;

      if (isEditMode && itemId) {
        const { data, error } = await supabase
          .from('itens_em_estoque')
          .update(itemData)
          .eq('id_item', parseInt(itemId))
          .select()
          .single();

        if (error) throw error;
        savedItemData = data;
        toast.success("Item atualizado com sucesso!");
      } else {
        const { data, error } = await supabase
          .from('itens_em_estoque')
          .insert([itemData])
          .select()
          .single();

        if (error) throw error;
        savedItemData = data;
        toast.success("Item cadastrado com sucesso!");
      }

      setSavedItem({
        id_item: savedItemData.id_item,
        sku: savedItemData.sku || "",
        nome_item: savedItemData.nome_item,
        categoria_item: savedItemData.categoria_item,
        status_item: savedItemData.status_item,
        alocacao: savedItemData.alocacao,
        quantidade_novo: savedItemData.quantidade_novo,
        quantidade_usado: savedItemData.quantidade_usado,
        quantidade_danificado: savedItemData.quantidade_danificado,
        imagem_item: imagemUrl,
        video_item: videoUrl,
      });

    } catch (error) {
      console.error(error);
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Erro detalhado ao salvar:", error);
      toast.error(`Erro ao salvar item: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSaved = () => {
    if (savedItem) {
      setSearchParams({ id: savedItem.id_item.toString() });
      setFormData(prev => ({ ...prev, sku: savedItem.sku }));
      setIsEditMode(true);
      setSavedItem(null);
    }
  };

  if (enumsLoading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  // Show saved item preview after successful save
  if (savedItem) {
    return (
      <div className="min-h-screen bg-background p-4 pb-20">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate("/menu")}>
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-2xl font-bold flex-1 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Item Salvo
            </h1>
            <ThemeToggle />
          </div>

          <SavedItemPreview
            item={savedItem}
            onEdit={handleEditSaved}
            onAddNew={resetForm}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/menu")}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-bold flex-1 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {isEditMode ? "Editar Item" : "Cadastrar Item"}
          </h1>
          <ThemeToggle />
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowScanner(true)}
            title="Escanear item existente"
          >
            <ScanBarcode className="h-5 w-5" />
          </Button>
        </div>

        {formData.sku && (
          <div className="bg-gradient-to-br from-card to-primary/5 p-6 rounded-xl mb-6 border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Label className="text-xs text-muted-foreground">SKU</Label>
                <div className="text-3xl font-bold text-primary">{formData.sku}</div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowLabelGenerator(true)}
                className="shadow-sm"
              >
                <Tag className="h-4 w-4 mr-2" />
                Gerar Etiqueta
              </Button>
            </div>
            <div className="flex items-center justify-around gap-4 p-4 bg-background rounded-lg border">
              <div className="text-center">
                <Label className="text-xs text-muted-foreground mb-2 block">QR Code</Label>
                <QRCodeSVG value={formData.sku} size={80} />
              </div>
              <div className="text-center">
                <Label className="text-xs text-muted-foreground mb-2 block">Código de Barras</Label>
                <Barcode value={formData.sku} height={40} width={1.2} fontSize={10} />
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="nome">Nome do Item *</Label>
            <Input
              id="nome"
              value={formData.nome_item}
              onChange={(e) => setFormData({ ...formData, nome_item: e.target.value })}
              required
              className="h-12"
            />
          </div>

          <div>
            <Label htmlFor="categoria">Categoria *</Label>
            <Select 
              value={formData.categoria_item}
              onValueChange={(value) => setFormData({ ...formData, categoria_item: value })}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categoriaOptions.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao_item}
              onChange={(e) => setFormData({ ...formData, descricao_item: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status *</Label>
              <Select 
                value={formData.status_item}
                onValueChange={(value) => setFormData({ ...formData, status_item: value })}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Selecione um status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="alocacao">Alocação *</Label>
              <Select 
                value={formData.alocacao}
                onValueChange={(value) => setFormData({ ...formData, alocacao: value })}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Selecione uma alocação" />
                </SelectTrigger>
                <SelectContent>
                  {alocacaoOptions.map((aloc) => (
                    <SelectItem key={aloc} value={aloc}>{aloc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="qtd_novo">Qtd. Novo</Label>
              <Input
                id="qtd_novo"
                type="number"
                value={formData.quantidade_novo}
                onChange={(e) => setFormData({ ...formData, quantidade_novo: parseInt(e.target.value) || 0 })}
                className="h-12"
              />
            </div>
            <div>
              <Label htmlFor="qtd_usado">Qtd. Usado</Label>
              <Input
                id="qtd_usado"
                type="number"
                value={formData.quantidade_usado}
                onChange={(e) => setFormData({ ...formData, quantidade_usado: parseInt(e.target.value) || 0 })}
                className="h-12"
              />
            </div>
            <div>
              <Label htmlFor="qtd_danificado">Qtd. Danificado</Label>
              <Input
                id="qtd_danificado"
                type="number"
                value={formData.quantidade_danificado}
                onChange={(e) => setFormData({ ...formData, quantidade_danificado: parseInt(e.target.value) || 0 })}
                className="h-12"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="altura">Altura (cm)</Label>
              <Input
                id="altura"
                type="number"
                step="0.01"
                value={formData.comprimento_cm}
                onChange={(e) => setFormData({ ...formData, comprimento_cm: parseFloat(e.target.value) || 0 })}
                className="h-12"
              />
            </div>
            <div>
              <Label htmlFor="largura">Largura (cm)</Label>
              <Input
                id="largura"
                type="number"
                step="0.01"
                value={formData.largura_cm}
                onChange={(e) => setFormData({ ...formData, largura_cm: parseFloat(e.target.value) || 0 })}
                className="h-12"
              />
            </div>
            <div>
              <Label htmlFor="profundidade">Profundidade (cm)</Label>
              <Input
                id="profundidade"
                type="number"
                step="0.01"
                value={formData.profundidade_cm}
                onChange={(e) => setFormData({ ...formData, profundidade_cm: parseFloat(e.target.value) || 0 })}
                className="h-12"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="peso">Peso (kg)</Label>
            <Input
              id="peso"
              type="number"
              step="0.01"
              value={formData.peso_kg}
              onChange={(e) => setFormData({ ...formData, peso_kg: parseFloat(e.target.value) || 0 })}
              className="h-12"
            />
          </div>

          <div className="space-y-4">
            {(existingImageUrl || existingVideoUrl) && !imagemFile && !videoFile && (
              <ItemPreview 
                imagemUrl={existingImageUrl} 
                videoUrl={existingVideoUrl}
                compact
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <Button
                type="button"
                variant="outline"
                className="h-16 flex flex-col"
                onClick={handleImageCapture}
              >
                <Camera className="h-6 w-6 mb-1" />
                <span className="text-xs">
                  {imagemFile ? imagemFile.name.substring(0, 15) : existingImageUrl ? "Alterar Foto" : "Tirar Foto"}
                </span>
              </Button>

              <Button
                type="button"
                variant="outline"
                className="h-16 flex flex-col"
                onClick={handleVideoCapture}
              >
                <Video className="h-6 w-6 mb-1" />
                <span className="text-xs">
                  {videoFile ? videoFile.name.substring(0, 15) : existingVideoUrl ? "Alterar Vídeo" : "Gravar Vídeo"}
                </span>
              </Button>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-14 text-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg" 
            disabled={loading}
          >
            {loading ? "Salvando..." : isEditMode ? "Atualizar Item" : "Salvar Item"}
          </Button>
        </form>

        {formData.sku && (
          <LabelGenerator
            sku={formData.sku}
            itemName={formData.nome_item}
            isOpen={showLabelGenerator}
            onClose={() => setShowLabelGenerator(false)}
          />
        )}

        <BarcodeScanner
          isOpen={showScanner}
          onClose={() => setShowScanner(false)}
          onScan={handleScanResult}
        />
      </div>
    </div>
  );
};

export default CadastrarItem;
