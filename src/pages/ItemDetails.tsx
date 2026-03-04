import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ArrowLeft,
  Edit,
  Trash2,
  MapPin,
  Package,
  History,
  Info,
  Ruler,
  Scale,
  Calendar,
  ArrowRightLeft,
  Loader2,
  Play,
  ExternalLink
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ImageZoom } from "@/components/ImageZoom";
import { MovementTimeline } from "@/components/MovementTimeline";
import QRCodeSVG from "react-qr-code";
import Barcode from "react-barcode";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  descricao_item: string | null;
  categoria_item: string;
  status_item: string;
  alocacao: string;
  imagem_item: string | null;
  video_item: string | null;
  sku: string | null;
  quantidade_novo: number;
  quantidade_usado: number;
  quantidade_danificado: number;
  quantidade_em_manutencao: number;
  quantidade_total: number | null;
  comprimento_cm: number | null;
  largura_cm: number | null;
  profundidade_cm: number | null;
  peso_kg: number | null;
  data_cadastro: string;
  ultima_atualizacao: string;
}

const ItemDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      loadItem();
    }
  }, [id]);

  const loadItem = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('itens_em_estoque')
        .select('*')
        .eq('id_item', parseInt(id!))
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error("Item não encontrado");
        navigate("/consultar");
        return;
      }
      setItem(data);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar item");
      navigate("/consultar");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('itens_em_estoque')
        .delete()
        .eq('id_item', item.id_item);

      if (error) throw error;
      
      toast.success("Item excluído com sucesso");
      navigate("/consultar");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao excluir item");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NOVO':
        return 'bg-green-500/20 text-green-600 border-green-500/30';
      case 'USADO':
        return 'bg-blue-500/20 text-blue-600 border-blue-500/30';
      case 'DANIFICADO':
        return 'bg-red-500/20 text-red-600 border-red-500/30';
      case 'EM_MANUTENCAO':
        return 'bg-amber-500/20 text-amber-600 border-amber-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getAlocacaoColor = (alocacao: string) => {
    switch (alocacao) {
      case 'DEPOSITO':
        return 'bg-purple-500/20 text-purple-600 border-purple-500/30';
      case 'EVENTO':
        return 'bg-orange-500/20 text-orange-600 border-orange-500/30';
      case 'FUNCIONARIO':
        return 'bg-cyan-500/20 text-cyan-600 border-cyan-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const totalQuantidade = item 
    ? (item.quantidade_total ?? (item.quantidade_novo + item.quantidade_usado + item.quantidade_danificado + item.quantidade_em_manutencao))
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!item) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b p-3 sm:p-4 z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/consultar")} className="touch-target">
              <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold truncate">{item.nome_item}</h1>
              {item.sku && (
                <p className="text-sm text-muted-foreground font-mono">SKU: {item.sku}</p>
              )}
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-3 sm:p-4 space-y-4">
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => navigate(`/cadastrar?edit=${item.id_item}`)}
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
            Editar Item
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/retirar?item=${item.id_item}`)}
            className="gap-2"
            disabled={item.alocacao !== 'DEPOSITO'}
          >
            <ArrowRightLeft className="h-4 w-4" />
            Retirar
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/devolver?item=${item.id_item}`)}
            className="gap-2"
            disabled={item.alocacao === 'DEPOSITO'}
          >
            <Package className="h-4 w-4" />
            Devolver
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            className="gap-2 ml-auto"
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </Button>
        </div>

        {/* SKU, QR Code e Barcode */}
        {item.sku && (
          <Card className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-4 sm:gap-6">
              {/* Imagem Destaque - 50% do espaço */}
              {(() => {
                const imgs = parseImageUrls(item.imagem_item);
                return imgs.length > 0 ? (
                  <div className="w-full sm:w-1/2 flex flex-col items-center">
                    <span className="text-xs text-muted-foreground block mb-2">Destaque</span>
                    <div className="relative w-full rounded-lg overflow-hidden border bg-muted" style={{ aspectRatio: '1/1' }}>
                      <img
                        src={imgs[0]}
                        alt={item.nome_item}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </div>
                  </div>
                ) : null;
              })()}

              {/* SKU + QR + Barcode - 50% restante */}
              <div className="w-full sm:w-1/2 flex flex-col items-center justify-between gap-3">
                <div className="text-center">
                  <span className="text-xs text-muted-foreground block mb-1">SKU</span>
                  <div className="text-2xl sm:text-3xl font-bold font-mono">{item.sku}</div>
                </div>
                <div className="text-center">
                  <span className="text-xs text-muted-foreground block mb-1">QR Code</span>
                  <QRCodeSVG value={item.sku} size={80} />
                </div>
                <div className="text-center overflow-hidden">
                  <span className="text-xs text-muted-foreground block mb-1">Código de Barras</span>
                  <Barcode value={item.sku} height={45} width={1.2} fontSize={10} />
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info" className="gap-1.5 text-xs sm:text-sm">
              <Info className="h-4 w-4" />
              <span className="hidden sm:inline">Informações</span>
            </TabsTrigger>
            <TabsTrigger value="media" className="gap-1.5 text-xs sm:text-sm">
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">Mídia</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5 text-xs sm:text-sm">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Histórico</span>
            </TabsTrigger>
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info" className="space-y-4 mt-4">
            {/* Status & Allocation */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Status e Alocação
              </h3>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={getStatusColor(item.status_item)}>
                  {item.status_item.replace('_', ' ')}
                </Badge>
                <Badge variant="outline" className={getAlocacaoColor(item.alocacao)}>
                  {item.alocacao}
                </Badge>
                <Badge variant="outline" className="bg-muted">
                  {item.categoria_item}
                </Badge>
              </div>
            </Card>

            {/* Quantities */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Quantidades
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="text-center p-3 bg-green-500/10 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{item.quantidade_novo}</div>
                  <div className="text-xs text-muted-foreground">Novo</div>
                </div>
                <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{item.quantidade_usado}</div>
                  <div className="text-xs text-muted-foreground">Usado</div>
                </div>
                <div className="text-center p-3 bg-red-500/10 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{item.quantidade_danificado}</div>
                  <div className="text-xs text-muted-foreground">Danificado</div>
                </div>
                <div className="text-center p-3 bg-amber-500/10 rounded-lg">
                  <div className="text-2xl font-bold text-amber-600">{item.quantidade_em_manutencao}</div>
                  <div className="text-xs text-muted-foreground">Manutenção</div>
                </div>
                <div className="text-center p-3 bg-primary/10 rounded-lg col-span-2 sm:col-span-1">
                  <div className="text-2xl font-bold text-primary">{totalQuantidade}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
              </div>
            </Card>

            {/* Description */}
            {item.descricao_item && (
              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-2">Descrição</h3>
                <p className="text-sm text-muted-foreground">{item.descricao_item}</p>
              </Card>
            )}

            {/* Dimensions & Weight */}
            {(item.comprimento_cm || item.largura_cm || item.profundidade_cm || item.peso_kg) && (
              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-primary" />
                  Dimensões e Peso
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {item.comprimento_cm && (
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-lg font-semibold">{item.comprimento_cm} cm</div>
                      <div className="text-xs text-muted-foreground">Comprimento</div>
                    </div>
                  )}
                  {item.largura_cm && (
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-lg font-semibold">{item.largura_cm} cm</div>
                      <div className="text-xs text-muted-foreground">Largura</div>
                    </div>
                  )}
                  {item.profundidade_cm && (
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-lg font-semibold">{item.profundidade_cm} cm</div>
                      <div className="text-xs text-muted-foreground">Profundidade</div>
                    </div>
                  )}
                  {item.peso_kg && (
                    <div className="text-center p-3 bg-muted/50 rounded-lg flex flex-col items-center">
                      <Scale className="h-4 w-4 mb-1 text-muted-foreground" />
                      <div className="text-lg font-semibold">{item.peso_kg} kg</div>
                      <div className="text-xs text-muted-foreground">Peso</div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Dates */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Datas
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Data de Cadastro</div>
                  <div className="font-medium">
                    {format(new Date(item.data_cadastro), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                  </div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Última Atualização</div>
                  <div className="font-medium">
                    {format(new Date(item.ultima_atualizacao), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Media Tab */}
          <TabsContent value="media" className="mt-4">
            <Card className="p-4">
              <div className="space-y-6">
                {/* Images */}
                 <div>
                   <h3 className="text-sm font-semibold mb-3">Imagens</h3>
                   {(() => {
                     const imgs = parseImageUrls(item.imagem_item);
                     return imgs.length > 0 ? (
                       <div className="grid grid-cols-2 gap-3">
                         {imgs.map((url, i) => (
                           <div key={i} className="relative rounded-lg overflow-hidden bg-muted" style={{ aspectRatio: '1/1' }}>
                             <img
                               src={url}
                               alt={`${item.nome_item} - Foto ${i + 1}`}
                               className="absolute inset-0 w-full h-full object-cover"
                             />
                           </div>
                         ))}
                       </div>
                     ) : (
                       <div className="flex items-center justify-center h-48 bg-muted rounded-lg">
                         <p className="text-muted-foreground text-sm">Nenhuma imagem cadastrada</p>
                       </div>
                     );
                   })()}
                 </div>

                {/* Video */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Vídeo</h3>
                  {item.video_item ? (
                    <div className="relative rounded-lg overflow-hidden bg-muted">
                      <video
                        src={item.video_item}
                        controls
                        className="w-full max-h-96"
                      >
                        Seu navegador não suporta vídeos.
                      </video>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32 bg-muted rounded-lg">
                      <p className="text-muted-foreground text-sm">Nenhum vídeo cadastrado</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-4">
            <Card className="p-4">
              <MovementTimeline itemId={item.id_item} />
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir o item <strong>"{item.nome_item}"</strong>. 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ItemDetails;
