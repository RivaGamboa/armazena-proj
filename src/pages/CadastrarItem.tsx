import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Camera, Video, Tag, ScanBarcode, X, ImagePlus, Mic, MicOff, Star } from "lucide-react";
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

const MAX_PHOTOS = 4;

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

const CadastrarItem = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const itemId = searchParams.get("id") || searchParams.get("edit");
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showLabelGenerator, setShowLabelGenerator] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [savedItem, setSavedItem] = useState<SavedItem | null>(null);
  const { categorias, alocacoes, statusList, loading: enumsLoading } = useCustomEnums();
  
  const DEFAULT_STATUS_OPTIONS = ['ITEM NOVO', 'ITEM USADO', 'ITEM USADO COM AVARIA', 'AVARIA/DESCARTE'];
  
  const categoriaOptions = categorias.length > 0 
    ? categorias.map(c => c.nome) 
    : Constants.public.Enums.categoria_item_enum;
  const alocacaoOptions = alocacoes.length > 0 
    ? alocacoes.map(a => a.nome) 
    : Constants.public.Enums.alocacao_enum;
  const statusOptions = statusList.length > 0 
    ? statusList.map(s => s.nome) 
    : DEFAULT_STATUS_OPTIONS;

  const [formData, setFormData] = useState({
    sku: "",
    nome_item: "",
    categoria_item: "",
    descricao_item: "",
    status_item: "",
    alocacao: "",
    quantidades_por_status: {} as Record<string, number | string>,
    comprimento_cm: "" as string | number,
    largura_cm: "" as string | number,
    profundidade_cm: "" as string | number,
    peso_kg: "" as string | number,
  });
  const [imagemFiles, setImagemFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [existingVideoUrl, setExistingVideoUrl] = useState<string | null>(null);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isListeningDescricao, setIsListeningDescricao] = useState(false);
  const recognitionRef = useRef<any>(null);
  const recognitionDescricaoRef = useRef<any>(null);

  const preposicoes = new Set([
    "de", "da", "do", "das", "dos", "em", "na", "no", "nas", "nos",
    "a", "à", "ao", "às", "aos", "e", "ou", "com", "sem", "por",
    "para", "pela", "pelo", "pelas", "pelos", "um", "uma", "uns", "umas",
    "que", "se", "o", "os", "as",
  ]);

  const capitalizarTexto = (texto: string) => {
    return texto
      .toLowerCase()
      .split(" ")
      .map((palavra, index) => {
        if (index === 0 || !preposicoes.has(palavra)) {
          return palavra.charAt(0).toUpperCase() + palavra.slice(1);
        }
        return palavra;
      })
      .join(" ");
  };

  const toggleVoiceInput = (field: 'nome_item' | 'descricao_item') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Seu navegador não suporta reconhecimento de voz.");
      return;
    }

    const isNome = field === 'nome_item';
    const listening = isNome ? isListening : isListeningDescricao;
    const setListening = isNome ? setIsListening : setIsListeningDescricao;
    const refObj = isNome ? recognitionRef : recognitionDescricaoRef;

    if (listening) {
      refObj.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = false;
    refObj.current = recognition;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const texto = isNome ? capitalizarTexto(transcript) : transcript.charAt(0).toUpperCase() + transcript.slice(1);
      setFormData(prev => ({
        ...prev,
        [field]: prev[field] ? prev[field] + " " + texto : texto,
      }));
      setListening(false);
    };

    recognition.onerror = () => {
      toast.error("Erro no reconhecimento de voz. Tente novamente.");
      setListening(false);
    };

    recognition.onend = () => setListening(false);

    recognition.start();
    setListening(true);
  };

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
        const qps = (data as any).quantidades_por_status || {};
        setFormData({
          sku: data.sku || "",
          nome_item: data.nome_item,
          categoria_item: data.categoria_item,
          descricao_item: data.descricao_item || "",
          status_item: data.status_item,
          alocacao: data.alocacao,
          quantidades_por_status: qps,
          comprimento_cm: data.comprimento_cm || 0,
          largura_cm: data.largura_cm || 0,
          profundidade_cm: data.profundidade_cm || 0,
          peso_kg: data.peso_kg || 0,
        });
        setExistingImageUrls(parseImageUrls(data.imagem_item));
        setExistingVideoUrl(data.video_item);
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar item");
    }
  };

  const totalPhotos = existingImageUrls.length + imagemFiles.length;

  const handleImageCapture = () => {
    if (totalPhotos >= MAX_PHOTOS) {
      toast.warning(`Máximo de ${MAX_PHOTOS} fotos permitido.`);
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      const remaining = MAX_PHOTOS - totalPhotos;
      const toAdd = files.slice(0, remaining);
      if (files.length > remaining) {
        toast.warning(`Apenas ${remaining} foto(s) adicionada(s). Máximo de ${MAX_PHOTOS}.`);
      }
      setImagemFiles(prev => [...prev, ...toAdd]);
    };
    input.click();
  };

  const removeNewPhoto = (index: number) => {
    setImagemFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingPhoto = (index: number) => {
    setExistingImageUrls(prev => prev.filter((_, i) => i !== index));
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
        const qps = (data as any).quantidades_por_status || {};
        setFormData({
          sku: data.sku || "",
          nome_item: data.nome_item,
          categoria_item: data.categoria_item,
          descricao_item: data.descricao_item || "",
          status_item: data.status_item,
          alocacao: data.alocacao,
          quantidades_por_status: qps,
          comprimento_cm: data.comprimento_cm || 0,
          largura_cm: data.largura_cm || 0,
          profundidade_cm: data.profundidade_cm || 0,
          peso_kg: data.peso_kg || 0,
        });
        setExistingImageUrls(parseImageUrls(data.imagem_item));
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
      status_item: statusOptions[0] || "ITEM NOVO",
      alocacao: alocacaoOptions[0] || "DEPOSITO",
      quantidades_por_status: {},
      comprimento_cm: "",
      largura_cm: "",
      profundidade_cm: "",
      peso_kg: "",
    });
    setImagemFiles([]);
    setVideoFile(null);
    setExistingImageUrls([]);
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

      // Start with existing URLs that weren't removed
      const allImageUrls = [...existingImageUrls];
      let videoUrl = existingVideoUrl;

      // Upload new photos
      for (const file of imagemFiles) {
        const path = `${user.id}/${Date.now()}_${file.name}`;
        const { error } = await supabase.storage.from('item-photos').upload(path, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('item-photos').getPublicUrl(path);
        allImageUrls.push(publicUrl);
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

      // Reorder: put featured image first
      if (featuredIndex > 0 && featuredIndex < allImageUrls.length) {
        const featured = allImageUrls.splice(featuredIndex, 1)[0];
        allImageUrls.unshift(featured);
      }

      // Store as JSON array if multiple, plain URL if single, null if none
      const imagemValue = allImageUrls.length > 1
        ? JSON.stringify(allImageUrls)
        : allImageUrls[0] || null;

      const itemData = {
        nome_item: formData.nome_item,
        categoria_item: formData.categoria_item as any,
        descricao_item: formData.descricao_item,
        status_item: formData.status_item as any,
        alocacao: formData.alocacao as any,
        quantidade_novo: Number(formData.quantidade_novo) || 0,
        quantidade_usado: Number(formData.quantidade_usado) || 0,
        quantidade_danificado: Number(formData.quantidade_danificado) || 0,
        comprimento_cm: Number(formData.comprimento_cm) || 0,
        largura_cm: Number(formData.largura_cm) || 0,
        profundidade_cm: Number(formData.profundidade_cm) || 0,
        peso_kg: Number(formData.peso_kg) || 0,
        user_id: user.id,
        imagem_item: imagemValue,
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
        imagem_item: imagemValue,
        video_item: videoUrl,
      });

    } catch (error) {
      console.error(error);
      console.error("Erro detalhado ao salvar:", error);
      let errMsg = "Erro desconhecido";
      if (error instanceof Error) {
        errMsg = error.message;
      } else if (typeof error === 'object' && error !== null) {
        errMsg = (error as any).message || (error as any).details || JSON.stringify(error);
      } else {
        errMsg = String(error);
      }
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

  // All photo previews (existing + new files)
  const allPhotoPreviews = [
    ...existingImageUrls.map((url, i) => ({ type: 'existing' as const, url, index: i })),
    ...imagemFiles.map((file, i) => ({ type: 'new' as const, url: URL.createObjectURL(file), index: i })),
  ];

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
            <div className="flex gap-2">
              <Input
                id="nome"
                value={formData.nome_item}
                onChange={(e) => setFormData({ ...formData, nome_item: e.target.value })}
                required
                className="h-12 flex-1"
              />
              <Button
                type="button"
                variant={isListening ? "destructive" : "outline"}
                size="icon"
                className="h-12 w-12 shrink-0"
                onClick={() => toggleVoiceInput('nome_item')}
                title={isListening ? "Parar gravação" : "Falar nome do item"}
              >
                {isListening ? <MicOff className="h-5 w-5 animate-pulse" /> : <Mic className="h-5 w-5" />}
              </Button>
            </div>
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
            <div className="flex gap-2">
              <Textarea
                id="descricao"
                value={formData.descricao_item}
                onChange={(e) => setFormData({ ...formData, descricao_item: e.target.value })}
                rows={3}
                className="flex-1"
              />
              <Button
                type="button"
                variant={isListeningDescricao ? "destructive" : "outline"}
                size="icon"
                className="h-12 w-12 shrink-0 self-start"
                onClick={() => toggleVoiceInput('descricao_item')}
                title={isListeningDescricao ? "Parar gravação" : "Falar descrição do item"}
              >
                {isListeningDescricao ? <MicOff className="h-5 w-5 animate-pulse" /> : <Mic className="h-5 w-5" />}
              </Button>
            </div>
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
                onChange={(e) => setFormData({ ...formData, quantidade_novo: e.target.value === '' ? '' : parseInt(e.target.value) || 0 })}
                className="h-12"
              />
            </div>
            <div>
              <Label htmlFor="qtd_usado">Qtd. Usado</Label>
              <Input
                id="qtd_usado"
                type="number"
                value={formData.quantidade_usado}
                onChange={(e) => setFormData({ ...formData, quantidade_usado: e.target.value === '' ? '' : parseInt(e.target.value) || 0 })}
                className="h-12"
              />
            </div>
            <div>
              <Label htmlFor="qtd_danificado">Qtd. Danificado</Label>
              <Input
                id="qtd_danificado"
                type="number"
                value={formData.quantidade_danificado}
                onChange={(e) => setFormData({ ...formData, quantidade_danificado: e.target.value === '' ? '' : parseInt(e.target.value) || 0 })}
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
                onChange={(e) => setFormData({ ...formData, comprimento_cm: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
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
                onChange={(e) => setFormData({ ...formData, largura_cm: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
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
                onChange={(e) => setFormData({ ...formData, profundidade_cm: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
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
              onChange={(e) => setFormData({ ...formData, peso_kg: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
              className="h-12"
            />
          </div>

          {/* Fotos Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Fotos ({totalPhotos}/{MAX_PHOTOS})</Label>
              {totalPhotos < MAX_PHOTOS && (
                <Button type="button" variant="outline" size="sm" onClick={handleImageCapture}>
                  <ImagePlus className="h-4 w-4 mr-2" />
                  Adicionar Foto
                </Button>
              )}
            </div>

            {allPhotoPreviews.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {allPhotoPreviews.map((photo, i) => (
                  <div key={`${photo.type}-${photo.index}`} className={`relative rounded-lg overflow-hidden border group ${i === featuredIndex ? 'ring-2 ring-primary' : ''}`}>
                    <div style={{ aspectRatio: '1 / 1' }} className="relative">
                      <img
                        src={photo.url}
                        alt={`Foto ${i + 1}`}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => photo.type === 'existing' ? removeExistingPhoto(photo.index) : removeNewPhoto(photo.index)}
                        className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeaturedIndex(i)}
                        title="Definir como destaque"
                        className={`absolute top-2 left-2 rounded-full p-1.5 shadow-md transition-opacity ${i === featuredIndex ? 'bg-primary text-primary-foreground opacity-100' : 'bg-background/80 text-muted-foreground opacity-0 group-hover:opacity-100'}`}
                      >
                        <Star className={`h-4 w-4 ${i === featuredIndex ? 'fill-current' : ''}`} />
                      </button>
                      {photo.type === 'new' && (
                        <span className="absolute bottom-2 left-2 bg-secondary text-secondary-foreground text-xs px-2 py-0.5 rounded">
                          Nova
                        </span>
                      )}
                      {i === featuredIndex && (
                        <span className="absolute bottom-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
                          Destaque
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="w-full h-32 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer"
                onClick={handleImageCapture}
              >
                <Camera className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Clique para adicionar fotos</span>
              </div>
            )}
          </div>

          {/* Video Section */}
          <div className="space-y-3">
            {existingVideoUrl && !videoFile && (
              <div className="rounded-lg overflow-hidden border bg-muted">
                <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
                  <video src={existingVideoUrl} className="absolute inset-0 w-full h-full object-cover" controls />
                </div>
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              className="w-full h-14 flex flex-col"
              onClick={handleVideoCapture}
            >
              <Video className="h-6 w-6 mb-1" />
              <span className="text-xs">
                {videoFile ? videoFile.name.substring(0, 20) : existingVideoUrl ? "Alterar Vídeo" : "Gravar Vídeo"}
              </span>
            </Button>
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
