import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Package, TrendingUp, AlertCircle, MapPin, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Constants } from "@/integrations/supabase/types";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    porCategoria: [] as any[],
    porStatus: [] as any[],
    porAlocacao: [] as any[],
  });

  // Dados variáveis do sistema (enums)
  const categorias = Constants.public.Enums.categoria_item_enum;
  const alocacoes = Constants.public.Enums.alocacao_enum;
  const statusList = Constants.public.Enums.status_item_enum;

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data: itens, error } = await supabase
        .from('itens_em_estoque')
        .select('*');

      if (error) throw error;

      if (!itens) return;

      // Total de itens
      const total = itens.length;

      // Estatísticas por categoria
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

      // Estatísticas por status
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

      // Estatísticas por alocação
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
        porCategoria,
        porStatus,
        porAlocacao,
      });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar estatísticas");
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#2e7d32', '#1b5e20', '#66bb6a', '#81c784', '#a5d6a7'];

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/menu")}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-bold">Dashboard de Estoque</h1>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground">Carregando...</p>
        ) : (
          <Tabs defaultValue="estatisticas" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="estatisticas">Estatísticas</TabsTrigger>
              <TabsTrigger value="configuracoes">
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </TabsTrigger>
            </TabsList>

            <TabsContent value="estatisticas" className="space-y-6">
              {/* Cards de resumo */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.total}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Categorias</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.porCategoria.length}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Em Depósito</CardTitle>
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats.porAlocacao.find(a => a.name === 'DEPOSITO')?.value || 0}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Em Uso</CardTitle>
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {(stats.porAlocacao.find(a => a.name === 'EVENTO')?.value || 0) +
                        (stats.porAlocacao.find(a => a.name === 'FUNCIONARIO')?.value || 0)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Gráficos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Itens por Categoria */}
                <Card>
                  <CardHeader>
                    <CardTitle>Itens por Categoria</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stats.porCategoria}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" fill="hsl(var(--primary))" name="Quantidade" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Itens por Status */}
                <Card>
                  <CardHeader>
                    <CardTitle>Distribuição por Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={stats.porStatus}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {stats.porStatus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Itens por Alocação */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Distribuição por Alocação</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stats.porAlocacao}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" fill="hsl(var(--primary))" name="Quantidade" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="configuracoes" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Categorias */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Categorias</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-3">
                      Valores disponíveis para categorização de itens
                    </p>
                    <div className="space-y-2">
                      {categorias.map((cat) => (
                        <div 
                          key={cat} 
                          className="flex items-center justify-between p-2 bg-muted rounded-md"
                        >
                          <span className="text-sm font-medium">{cat}</span>
                          <span className="text-xs text-muted-foreground">
                            {stats.porCategoria.find(c => c.name === cat)?.value || 0} itens
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Alocações */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Alocações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-3">
                      Locais onde os itens podem estar alocados
                    </p>
                    <div className="space-y-2">
                      {alocacoes.map((aloc) => (
                        <div 
                          key={aloc} 
                          className="flex items-center justify-between p-2 bg-muted rounded-md"
                        >
                          <span className="text-sm font-medium">{aloc}</span>
                          <span className="text-xs text-muted-foreground">
                            {stats.porAlocacao.find(a => a.name === aloc)?.value || 0} itens
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-3">
                      Estados possíveis para os itens do estoque
                    </p>
                    <div className="space-y-2">
                      {statusList.map((status) => (
                        <div 
                          key={status} 
                          className="flex items-center justify-between p-2 bg-muted rounded-md"
                        >
                          <span className="text-sm font-medium">{status}</span>
                          <span className="text-xs text-muted-foreground">
                            {stats.porStatus.find(s => s.name === status)?.value || 0} itens
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground text-center">
                    Os valores de Categoria, Alocação e Status são definidos no sistema. 
                    Para adicionar novos valores, entre em contato com o administrador do sistema.
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
