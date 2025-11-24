import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const RetirarItem = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [itens, setItens] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [quantidade, setQuantidade] = useState(0);
  const [destino, setDestino] = useState("EVENTO");
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    loadItens();
  }, []);

  const loadItens = async () => {
    const { data } = await supabase
      .from('itens_em_estoque')
      .select('*')
      .order('nome_item');
    setItens(data || []);
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
          user_id: user.id,
          tipo_operacao: 'SAIDA',
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
            <Label htmlFor="item">Item *</Label>
            <Select value={selectedItem} onValueChange={setSelectedItem}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um item" />
              </SelectTrigger>
              <SelectContent>
                {itens.map(item => (
                  <SelectItem key={item.id_item} value={item.id_item.toString()}>
                    {item.nome_item} ({item.alocacao})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EVENTO">EVENTO</SelectItem>
                <SelectItem value="FUNCIONARIO">FUNCIONÁRIO</SelectItem>
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
      </div>
    </div>
  );
};

export default RetirarItem;
