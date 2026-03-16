import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSpreadsheet, FileText, Mail, MessageCircle, Download, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface ReportGeneratorProps {
  stats: {
    total: number;
    porCategoria: { name: string; value: number }[];
    porStatus: { name: string; value: number }[];
    porAlocacao: { name: string; value: number }[];
  };
}

export const ReportGenerator = ({ stats }: ReportGeneratorProps) => {
  const [loading, setLoading] = useState(false);
  const [selectedFields, setSelectedFields] = useState({
    nome: true,
    sku: true,
    categoria: true,
    status: true,
    alocacao: true,
    quantidade: true,
    dimensoes: false,
    peso: false,
    datas: false,
  });
  const [filterBy, setFilterBy] = useState<string>("all");

  const toggleField = (field: keyof typeof selectedFields) => {
    setSelectedFields((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const fetchItems = async () => {
    let query = supabase.from("itens_em_estoque").select("*");

    if (filterBy !== "all") {
      if (filterBy.startsWith("cat_")) {
        const catValue = filterBy.replace("cat_", "") as "Ferramentas" | "Materiais" | "Equipamentos" | "Consumíveis";
        query = query.eq("categoria_item", catValue);
      } else if (filterBy.startsWith("status_")) {
        const statusValue = filterBy.replace("status_", "") as "NOVO" | "USADO" | "DANIFICADO" | "EM_MANUTENCAO";
        query = query.eq("status_item", statusValue);
      } else if (filterBy.startsWith("aloc_")) {
        const alocValue = filterBy.replace("aloc_", "") as "DEPOSITO" | "EVENTO" | "FUNCIONARIO";
        query = query.eq("alocacao", alocValue);
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  };

  const formatItemsForExport = (items: any[]) => {
    return items.map((item) => {
      const row: any = {};
      if (selectedFields.nome) row["Nome"] = item.nome_item;
      if (selectedFields.sku) row["SKU"] = item.sku;
      if (selectedFields.categoria) row["Categoria"] = item.categoria_item;
      if (selectedFields.status) {
        // Derive real status from quantities instead of using default status_item field
        const statusParts: string[] = [];
        if (item.quantidade_novo > 0) statusParts.push(`NOVO(${item.quantidade_novo})`);
        if (item.quantidade_usado > 0) statusParts.push(`USADO(${item.quantidade_usado})`);
        if (item.quantidade_danificado > 0) statusParts.push(`DANIFICADO(${item.quantidade_danificado})`);
        if (item.quantidade_em_manutencao > 0) statusParts.push(`EM MANUTENÇÃO(${item.quantidade_em_manutencao})`);
        row["Status"] = statusParts.length > 0 ? statusParts.join(" / ") : "Sem estoque";
      }
      if (selectedFields.alocacao) row["Alocação"] = item.alocacao;
      if (selectedFields.quantidade) {
        row["Qtd. Novo"] = item.quantidade_novo;
        row["Qtd. Usado"] = item.quantidade_usado;
        row["Qtd. Danificado"] = item.quantidade_danificado;
        row["Qtd. Total"] = item.quantidade_total;
      }
      if (selectedFields.dimensoes) {
        row["Comprimento (cm)"] = item.comprimento_cm;
        row["Largura (cm)"] = item.largura_cm;
        row["Profundidade (cm)"] = item.profundidade_cm;
      }
      if (selectedFields.peso) row["Peso (kg)"] = item.peso_kg;
      if (selectedFields.datas) {
        row["Data Cadastro"] = new Date(item.data_cadastro).toLocaleDateString("pt-BR");
        row["Última Atualização"] = new Date(item.ultima_atualizacao).toLocaleDateString("pt-BR");
      }
      return row;
    });
  };

  const exportToCSV = async () => {
    setLoading(true);
    try {
      const items = await fetchItems();
      const data = formatItemsForExport(items);
      
      const ws = XLSX.utils.json_to_sheet(data);
      const csv = XLSX.utils.sheet_to_csv(ws);
      
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `relatorio_estoque_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success("Relatório CSV exportado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao exportar relatório");
    } finally {
      setLoading(false);
    }
  };

  const exportToXLS = async () => {
    setLoading(true);
    try {
      const items = await fetchItems();
      const data = formatItemsForExport(items);
      
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Estoque");
      
      // Add summary sheet
      const summaryData = [
        { "Estatística": "Total de Itens", "Valor": stats.total },
        ...stats.porCategoria.map((c) => ({ "Estatística": `Categoria: ${c.name}`, "Valor": c.value })),
        ...stats.porStatus.map((s) => ({ "Estatística": `Status: ${s.name}`, "Valor": s.value })),
        ...stats.porAlocacao.map((a) => ({ "Estatística": `Alocação: ${a.name}`, "Valor": a.value })),
      ];
      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, "Resumo");
      
      XLSX.writeFile(wb, `relatorio_estoque_${new Date().toISOString().split("T")[0]}.xlsx`);
      
      toast.success("Relatório Excel exportado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao exportar relatório");
    } finally {
      setLoading(false);
    }
  };

  const shareViaEmail = async () => {
    setLoading(true);
    try {
      const items = await fetchItems();
      const data = formatItemsForExport(items);
      
      const summary = `
Relatório de Estoque - ${new Date().toLocaleDateString("pt-BR")}

Total de Itens: ${stats.total}

Por Categoria:
${stats.porCategoria.map((c) => `  - ${c.name}: ${c.value}`).join("\n")}

Por Status:
${stats.porStatus.map((s) => `  - ${s.name}: ${s.value}`).join("\n")}

Por Alocação:
${stats.porAlocacao.map((a) => `  - ${a.name}: ${a.value}`).join("\n")}

Detalhes dos Itens:
${data.slice(0, 10).map((item) => Object.entries(item).map(([k, v]) => `${k}: ${v}`).join(", ")).join("\n")}
${data.length > 10 ? `\n... e mais ${data.length - 10} itens` : ""}
      `.trim();
      
      const mailtoLink = `mailto:?subject=${encodeURIComponent("Relatório de Estoque")}&body=${encodeURIComponent(summary)}`;
      window.open(mailtoLink, "_blank");
      
      toast.success("Cliente de email aberto!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao compartilhar por email");
    } finally {
      setLoading(false);
    }
  };

  const shareViaWhatsApp = async () => {
    setLoading(true);
    try {
      const summary = `
*Relatório de Estoque* - ${new Date().toLocaleDateString("pt-BR")}

📦 *Total de Itens:* ${stats.total}

📊 *Por Categoria:*
${stats.porCategoria.map((c) => `• ${c.name}: ${c.value}`).join("\n")}

🏷️ *Por Status:*
${stats.porStatus.map((s) => `• ${s.name}: ${s.value}`).join("\n")}

📍 *Por Alocação:*
${stats.porAlocacao.map((a) => `• ${a.name}: ${a.value}`).join("\n")}
      `.trim();
      
      const whatsappLink = `https://wa.me/?text=${encodeURIComponent(summary)}`;
      window.open(whatsappLink, "_blank");
      
      toast.success("WhatsApp aberto!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao compartilhar via WhatsApp");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Gerador de Relatórios
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Field Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Campos para exportar:</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { key: "nome", label: "Nome" },
              { key: "sku", label: "SKU" },
              { key: "categoria", label: "Categoria" },
              { key: "status", label: "Status" },
              { key: "alocacao", label: "Alocação" },
              { key: "quantidade", label: "Quantidades" },
              { key: "dimensoes", label: "Dimensões" },
              { key: "peso", label: "Peso" },
              { key: "datas", label: "Datas" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center space-x-2">
                <Checkbox
                  id={key}
                  checked={selectedFields[key as keyof typeof selectedFields]}
                  onCheckedChange={() => toggleField(key as keyof typeof selectedFields)}
                />
                <Label htmlFor={key} className="text-sm cursor-pointer">
                  {label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Filter Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Filtrar por:</Label>
          <Select value={filterBy} onValueChange={setFilterBy}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Todos os itens" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os itens</SelectItem>
              {stats.porCategoria.map((c) => (
                <SelectItem key={`cat_${c.name}`} value={`cat_${c.name}`}>
                  Categoria: {c.name}
                </SelectItem>
              ))}
              {stats.porStatus.map((s) => (
                <SelectItem key={`status_${s.name}`} value={`status_${s.name}`}>
                  Status: {s.name}
                </SelectItem>
              ))}
              {stats.porAlocacao.map((a) => (
                <SelectItem key={`aloc_${a.name}`} value={`aloc_${a.name}`}>
                  Alocação: {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Export Buttons */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Exportar:</Label>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Button
              variant="outline"
              onClick={exportToCSV}
              disabled={loading}
              className="flex items-center gap-2 h-12"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar</span> CSV
            </Button>
            <Button
              variant="outline"
              onClick={exportToXLS}
              disabled={loading}
              className="flex items-center gap-2 h-12"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar</span> Excel
            </Button>
            <Button
              variant="outline"
              onClick={shareViaEmail}
              disabled={loading}
              className="flex items-center gap-2 h-12"
            >
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Enviar por</span> Email
            </Button>
            <Button
              variant="outline"
              onClick={shareViaWhatsApp}
              disabled={loading}
              className="flex items-center gap-2 h-12 text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
