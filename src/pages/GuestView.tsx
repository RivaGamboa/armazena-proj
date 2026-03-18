import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Eye, Edit, Clock, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function GuestView() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<"loading" | "valid" | "expired" | "invalid">("loading");
  const [convite, setConvite] = useState<any>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [ownerName, setOwnerName] = useState("");

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    try {
      // Validate token using anon access (RLS policy allows active + not expired)
      const { data, error } = await supabase
        .from("convites_acesso")
        .select("*")
        .eq("token", token)
        .eq("ativo", true)
        .single();

      if (error || !data) {
        setStatus("invalid");
        return;
      }

      const conviteData = data as any;

      if (new Date(conviteData.expira_em) < new Date()) {
        setStatus("expired");
        return;
      }

      setConvite(conviteData);

      // Load owner's items using an edge function (since guest has no auth)
      await loadGuestData(conviteData.user_id);

      // Load owner name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", conviteData.user_id)
        .single();

      if (profile) setOwnerName((profile as any).full_name || "");

      setStatus("valid");
    } catch {
      setStatus("invalid");
    }
  };

  const loadGuestData = async (userId: string) => {
    // We need an edge function to bypass RLS for guest access
    try {
      const response = await supabase.functions.invoke("guest-data", {
        body: { token, user_id: userId },
      });

      if (response.data?.itens) {
        setItens(response.data.itens);
      }
    } catch {
      console.error("Erro ao carregar dados do convidado");
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Validando acesso...</div>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <ShieldAlert className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-lg font-bold">Convite Inválido</h2>
            <p className="text-sm text-muted-foreground">
              Este link de acesso não é válido ou foi revogado.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <Clock className="h-12 w-12 text-amber-500 mx-auto" />
            <h2 className="text-lg font-bold">Convite Expirado</h2>
            <p className="text-sm text-muted-foreground">
              Este link de acesso expirou. Solicite um novo convite ao proprietário.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isEditor = convite?.nivel_acesso === "editor";

  return (
    <div className="min-h-screen bg-background p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-lg sm:text-xl font-bold">Inventário{ownerName ? ` — ${ownerName}` : ""}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={isEditor ? "default" : "secondary"} className="text-xs">
                  {isEditor ? (
                    <><Edit className="h-3 w-3 mr-1" /> Editor</>
                  ) : (
                    <><Eye className="h-3 w-3 mr-1" /> Visitante</>
                  )}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Válido até {format(new Date(convite.expira_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-3 sm:p-4">
              <p className="text-xs text-muted-foreground">Total de Itens</p>
              <p className="text-2xl font-bold text-emerald-600">{itens.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="p-3 sm:p-4">
              <p className="text-xs text-muted-foreground">Categorias</p>
              <p className="text-2xl font-bold text-blue-600">
                {new Set(itens.map((i: any) => i.categoria_item)).size}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20 col-span-2 sm:col-span-1">
            <CardContent className="p-3 sm:p-4">
              <p className="text-xs text-muted-foreground">Alocações</p>
              <p className="text-2xl font-bold text-purple-600">
                {new Set(itens.map((i: any) => i.alocacao)).size}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Items table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm sm:text-base">Itens em Estoque</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Nome</TableHead>
                    <TableHead className="text-xs">SKU</TableHead>
                    <TableHead className="text-xs">Categoria</TableHead>
                    <TableHead className="text-xs">Alocação</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Qtd Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                        Nenhum item encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    itens.map((item: any) => (
                      <TableRow key={item.id_item}>
                        <TableCell className="text-xs font-medium">{item.nome_item}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{item.sku || "—"}</TableCell>
                        <TableCell className="text-xs">{item.categoria_item}</TableCell>
                        <TableCell className="text-xs">{item.alocacao}</TableCell>
                        <TableCell className="text-xs">{item.status_item}</TableCell>
                        <TableCell className="text-xs text-right font-medium">{item.quantidade_total || 0}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
