import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Package, TrendingUp, AlertCircle, MapPin, Settings, FileBarChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useCustomEnums } from "@/hooks/useCustomEnums";
import { EnumManager } from "@/components/EnumManager";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ReportGenerator } from "@/components/ReportGenerator";
const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const { categorias, alocacoes, statusList, refetch } = useCustomEnums();
  const [stats, setStats] = useState({
    total: 0,
    totalCategorias: 0,
    porCategoria: [] as any[],
    porStatus: [] as any[],
    porAlocacao: [] as any[],
  });
  const [itemCounts, setItemCounts] = useState<{
    categorias: { [key: string]: number };
    alocacoes: { [key: string]: number };
    status: { [key: string]: number };
  }>({
    categorias: {},
    alocacoes: {},
    status: {},
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [{ data: itens, error }, { count: totalCategorias }] = await Promise.all([
        supabase.from('itens_em_estoque').select('*'),
        supabase.from('categorias_item').select('*', { count: 'exact', head: true }).eq('ativo', true),
      ]);

      if (error) throw error;

      if (!itens) return;

      const total = itens.length;

      const categoriasCount = itens.reduce((acc: any, item: any) => {
        const cat = item.categoria_item;
        if (!acc[cat]) acc[cat] = 0;
        acc[cat] += 1;
        return acc;
      }, {});

      const porCategoria = Object.entries(categoriasCount).map(([name, value]) => ({
        name,
        value,
      }));

      const statuses = itens.reduce((acc: any, item: any) => {
        const status = item.status_item;
        if (!acc[status]) acc[status] = 0;
        acc[status] += 1;
        return acc;
      }, {});

      const porStatus = Object.entries(statuses).map(([name, value]) => ({
        name,
        value,
      }));

      const alocacoesCount = itens.reduce((acc: any, item: any) => {
        const aloc = item.alocacao;
        if (!acc[aloc]) acc[aloc] = 0;
        acc[aloc] += 1;
        return acc;
      }, {});

      const porAlocacao = Object.entries(alocacoesCount).map(([name, value]) => ({
        name,
        value,
      }));

      setStats({
        total,
        totalCategorias: totalCategorias || 0,
        porCategoria,
        porStatus,
        porAlocacao,
      });

      setItemCounts({
        categorias: categoriasCount,
        alocacoes: alocacoesCount,
        status: statuses,
      });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar estatísticas");
    } finally {
      setLoading(false);
    }
  };

  // Vibrant color palette for charts
  const CHART_COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    'hsl(var(--chart-6))',
  ];

  const BAR_COLORS = [
    '#22c55e', // green
    '#3b82f6', // blue
    '#f59e0b', // amber
    '#8b5cf6', // purple
  ];

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6 pb-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/menu")} className="touch-target">
            <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold flex-1 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent truncate">
            Dashboard de Estoque
          </h1>
          <ThemeToggle />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-muted-foreground">Carregando...</div>
          </div>
        ) : (
          <Tabs defaultValue="estatisticas" className="space-y-4 sm:space-y-6">
            <TabsList className="grid w-full grid-cols-3 h-10 sm:h-12 p-1 bg-muted/50 rounded-xl">
              <TabsTrigger value="estatisticas" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                Estatísticas
              </TabsTrigger>
              <TabsTrigger value="relatorios" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                <FileBarChart className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Relatórios</span>
                <span className="sm:hidden">Relat.</span>
              </TabsTrigger>
              <TabsTrigger value="configuracoes" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Configurações</span>
                <span className="sm:hidden">Config.</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="estatisticas" className="space-y-4 sm:space-y-6 animate-fade-in">
              {/* Cards de resumo */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                    <CardTitle className="text-xs sm:text-sm font-medium">Total de Itens</CardTitle>
                    <Package className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                    <div className="text-xl sm:text-2xl md:text-3xl font-bold text-emerald-600">{stats.total}</div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20 hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                    <CardTitle className="text-xs sm:text-sm font-medium">Categorias</CardTitle>
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                    <div className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-600">{stats.totalCategorias}</div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20 hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                    <CardTitle className="text-xs sm:text-sm font-medium">Em Depósito</CardTitle>
                    <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                    <div className="text-xl sm:text-2xl md:text-3xl font-bold text-amber-600">
                      {stats.porAlocacao
                        .filter(a => a.name !== 'EVENTO' && a.name !== 'FUNCIONARIO')
                        .reduce((sum: number, a: any) => sum + (a.value as number), 0)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20 hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                    <CardTitle className="text-xs sm:text-sm font-medium">Em Uso</CardTitle>
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                    <div className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-600">
                      {stats.porAlocacao
                        .filter(a => a.name === 'EVENTO' || a.name === 'FUNCIONARIO')
                        .reduce((sum: number, a: any) => sum + (a.value as number), 0)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Gráficos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Itens por Categoria */}
                <Card className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent px-3 sm:px-6 py-3 sm:py-4">
                    <CardTitle className="text-sm sm:text-base md:text-lg">Itens por Categoria</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 px-2 sm:px-6">
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={stats.porCategoria}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="value" name="Quantidade" radius={[4, 4, 0, 0]}>
                          {stats.porCategoria.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Itens por Status */}
                <Card className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent px-3 sm:px-6 py-3 sm:py-4">
                    <CardTitle className="text-sm sm:text-base md:text-lg">Distribuição por Status</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 px-2 sm:px-6">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={stats.porStatus}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          innerRadius={30}
                          paddingAngle={5}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {stats.porStatus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Itens por Alocação */}
                <Card className="lg:col-span-2 overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent px-3 sm:px-6 py-3 sm:py-4">
                    <CardTitle className="text-sm sm:text-base md:text-lg">Distribuição por Alocação</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 px-2 sm:px-6">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={stats.porAlocacao} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                        <YAxis dataKey="name" type="category" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} width={80} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="value" name="Quantidade" radius={[0, 4, 4, 0]}>
                          {stats.porAlocacao.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="relatorios" className="space-y-4 sm:space-y-6 animate-fade-in">
              <ReportGenerator stats={stats} />
            </TabsContent>

            <TabsContent value="configuracoes" className="space-y-6 animate-fade-in">
              <Tabs defaultValue="categorias" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3 bg-muted/50">
                  <TabsTrigger value="categorias">Categorias</TabsTrigger>
                  <TabsTrigger value="alocacoes">Alocações</TabsTrigger>
                  <TabsTrigger value="status">Status</TabsTrigger>
                </TabsList>

                <TabsContent value="categorias">
                  <EnumManager
                    title="Categorias"
                    tableName="categorias_item"
                    items={categorias}
                    itemCounts={itemCounts.categorias}
                    onRefresh={refetch}
                  />
                </TabsContent>

                <TabsContent value="alocacoes">
                  <EnumManager
                    title="Alocações"
                    tableName="alocacoes"
                    items={alocacoes}
                    itemCounts={itemCounts.alocacoes}
                    onRefresh={refetch}
                  />
                </TabsContent>

                <TabsContent value="status">
                  <EnumManager
                    title="Status"
                    tableName="status_item"
                    items={statusList}
                    itemCounts={itemCounts.status}
                    onRefresh={refetch}
                    showColor
                  />
                </TabsContent>
              </Tabs>

              <Card className="bg-muted/30">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground text-center">
                    Gerencie Categorias, Alocações e Status nas abas acima. Valores em uso não podem ser excluídos.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
