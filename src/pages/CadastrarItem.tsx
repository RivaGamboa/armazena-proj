import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Camera, Video, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import QRCodeSVG from "react-qr-code";
import Barcode from "react-barcode";
import { LabelGenerator } from "@/components/LabelGenerator";

const CadastrarItem = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const itemId = searchParams.get("id");
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showLabelGenerator, setShowLabelGenerator] = useState(false);
  const [formData, setFormData] = useState({
    sku: "",
    nome_item: "",
    categoria_item: "Ferramentas",
    descricao_item: "",
    status_item: "NOVO",
    alocacao: "DEPOSITO",
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

  useEffect(() => {
    if (itemId) {
      loadItem(itemId);
      setIsEditMode(true);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      let imagemUrl = null;
      let videoUrl = null;

      // Upload de imagem
      if (imagemFile) {
        const imagemPath = `${user.id}/${Date.now()}_${imagemFile.name}`;
        const { error: imagemError } = await supabase.storage
          .from('estoque-media')
          .upload(imagemPath, imagemFile);
        
        if (imagemError) throw imagemError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('estoque-media')
          .getPublicUrl(imagemPath);
        
        imagemUrl = publicUrl;
      }

      // Upload de vídeo
      if (videoFile) {
        const videoPath = `${user.id}/${Date.now()}_${videoFile.name}`;
        const { error: videoError } = await supabase.storage
          .from('estoque-media')
          .upload(videoPath, videoFile);
        
        if (videoError) throw videoError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('estoque-media')
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

      if (isEditMode && itemId) {
        const { error } = await supabase
          .from('itens_em_estoque')
          .update(itemData)
          .eq('id_item', parseInt(itemId));

        if (error) throw error;
        toast.success("Item atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from('itens_em_estoque')
          .insert([itemData]);

        if (error) throw error;
        toast.success("Item cadastrado com sucesso!");
      }

      navigate("/menu");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao cadastrar item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/menu")}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-bold">
            {isEditMode ? "Editar Item" : "Cadastrar/Editar Item"}
          </h1>
        </div>

        {formData.sku && (
          <div className="bg-card p-6 rounded-lg mb-6 border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Label className="text-xs text-muted-foreground">SKU</Label>
                <div className="text-3xl font-bold">{formData.sku}</div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowLabelGenerator(true)}
              >
                <Tag className="h-4 w-4 mr-2" />
                Gerar Etiqueta
              </Button>
            </div>
            <div className="flex items-center justify-around gap-4 p-4 bg-background rounded-lg">
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
            />
          </div>

          <div>
            <Label htmlFor="categoria">Categoria *</Label>
            <Select 
              value={formData.categoria_item}
              onValueChange={(value) => setFormData({ ...formData, categoria_item: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Ferramentas">Ferramentas</SelectItem>
                <SelectItem value="Materiais">Materiais</SelectItem>
                <SelectItem value="Equipamentos">Equipamentos</SelectItem>
                <SelectItem value="Consumíveis">Consumíveis</SelectItem>
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOVO">NOVO</SelectItem>
                  <SelectItem value="USADO">USADO</SelectItem>
                  <SelectItem value="DANIFICADO">DANIFICADO</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="alocacao">Alocação *</Label>
              <Select 
                value={formData.alocacao}
                onValueChange={(value) => setFormData({ ...formData, alocacao: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEPOSITO">DEPÓSITO</SelectItem>
                  <SelectItem value="EVENTO">EVENTO</SelectItem>
                  <SelectItem value="FUNCIONARIO">FUNCIONÁRIO</SelectItem>
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
              />
            </div>
            <div>
              <Label htmlFor="qtd_usado">Qtd. Usado</Label>
              <Input
                id="qtd_usado"
                type="number"
                value={formData.quantidade_usado}
                onChange={(e) => setFormData({ ...formData, quantidade_usado: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label htmlFor="qtd_danificado">Qtd. Danificado</Label>
              <Input
                id="qtd_danificado"
                type="number"
                value={formData.quantidade_danificado}
                onChange={(e) => setFormData({ ...formData, quantidade_danificado: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="comprimento">Comprimento (cm)</Label>
              <Input
                id="comprimento"
                type="number"
                step="0.01"
                value={formData.comprimento_cm}
                onChange={(e) => setFormData({ ...formData, comprimento_cm: parseFloat(e.target.value) || 0 })}
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
            />
          </div>

          <div className="space-y-4">
            <Button
              type="button"
              variant="outline"
              className="w-full h-16"
              onClick={handleImageCapture}
            >
              <Camera className="h-6 w-6 mr-2" />
              {imagemFile ? `Foto: ${imagemFile.name}` : "Tirar Foto"}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full h-16"
              onClick={handleVideoCapture}
            >
              <Video className="h-6 w-6 mr-2" />
              {videoFile ? `Vídeo: ${videoFile.name}` : "Gravar Vídeo"}
            </Button>
          </div>

          <Button type="submit" className="w-full h-14 text-lg" disabled={loading}>
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
      </div>
    </div>
  );
};

export default CadastrarItem;
