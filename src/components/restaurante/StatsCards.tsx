import { Card, CardContent } from "@/components/ui/card";
import { Package, AlertTriangle, Wrench, DollarSign, Grid3X3, TrendingUp } from "lucide-react";
import { DashboardStats } from "@/types/restaurante";

interface StatsCardsProps {
  stats: DashboardStats;
}

export const StatsCards = ({ stats }: StatsCardsProps) => {
  const cards = [
    {
      title: "Total de Itens",
      value: stats.totalItens.toLocaleString('pt-BR'),
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      title: "Estoque Baixo",
      value: stats.estoqueBaixo.toString(),
      icon: AlertTriangle,
      color: "text-amber-600",
      bgColor: "bg-amber-100"
    },
    {
      title: "Em Manutenção",
      value: stats.emManutencao.toString(),
      icon: Wrench,
      color: "text-orange-600",
      bgColor: "bg-orange-100"
    },
    {
      title: "Valor Total",
      value: `R$ ${stats.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      title: "Categorias",
      value: stats.totalCategorias.toString(),
      icon: Grid3X3,
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    },
    {
      title: "Movimentações Hoje",
      value: stats.movimentacoesHoje.toString(),
      icon: TrendingUp,
      color: "text-cyan-600",
      bgColor: "bg-cyan-100"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card, index) => (
        <Card key={index} className="hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{card.title}</p>
                <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
