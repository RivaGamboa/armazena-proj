import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Plus, Copy, Trash2, Share2, Calendar, Clock, Eye, Edit } from "lucide-react";
import { format, addDays, addHours } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Convite {
  id: string;
  token: string;
  nome_convidado: string | null;
  nivel_acesso: string;
  expira_em: string;
  ativo: boolean;
  created_at: string;
}

export function InviteManager() {
  const [convites, setConvites] = useState<Convite[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nomeConvidado, setNomeConvidado] = useState("");
  const [nivelAcesso, setNivelAcesso] = useState("visitante");
  const [prazoTipo, setPrazoTipo] = useState("dias");
  const [prazoValor, setPrazoValor] = useState("7");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadConvites();
  }, []);

  const loadConvites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("convites_acesso")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setConvites((data as unknown as Convite[]) || []);
    } catch {
      toast.error("Erro ao carregar convites");
    } finally {
      setLoading(false);
    }
  };

  const criarConvite = async () => {
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const agora = new Date();
      let expiraEm: Date;
      const valor = parseInt(prazoValor) || 7;

      if (prazoTipo === "horas") {
        expiraEm = addHours(agora, valor);
      } else {
        expiraEm = addDays(agora, valor);
      }

      const { error } = await supabase.from("convites_acesso").insert({
        user_id: user.id,
        nome_convidado: nomeConvidado.trim() || null,
        nivel_acesso: nivelAcesso,
        expira_em: expiraEm.toISOString(),
      } as any);

      if (error) throw error;

      toast.success("Convite criado com sucesso!");
      setNomeConvidado("");
      setNivelAcesso("visitante");
      setPrazoValor("7");
      setDialogOpen(false);
      loadConvites();
    } catch {
      toast.error("Erro ao criar convite");
    } finally {
      setCreating(false);
    }
  };

  const revogarConvite = async (id: string) => {
    try {
      const { error } = await supabase
        .from("convites_acesso")
        .update({ ativo: false } as any)
        .eq("id", id);

      if (error) throw error;
      toast.success("Convite revogado");
      loadConvites();
    } catch {
      toast.error("Erro ao revogar convite");
    }
  };

  const excluirConvite = async (id: string) => {
    try {
      const { error } = await supabase
        .from("convites_acesso")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Convite excluído");
      loadConvites();
    } catch {
      toast.error("Erro ao excluir convite");
    }
  };

  const getLink = (token: string) => {
    return `${window.location.origin}/convidado/${token}`;
  };

  const copiarLink = (token: string) => {
    const link = getLink(token);
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  const compartilharWhatsApp = (convite: Convite) => {
    const link = getLink(convite.token);
    const nivel = convite.nivel_acesso === "editor" ? "Editor" : "Visitante";
    const expira = format(new Date(convite.expira_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

    const msg = encodeURIComponent(
      `🔑 *Convite de Acesso ao Inventário*\n\n` +
      `Olá${convite.nome_convidado ? ` ${convite.nome_convidado}` : ""}! Você recebeu acesso ao sistema de inventário.\n\n` +
      `📋 *Nível de acesso:* ${nivel}\n` +
      `📅 *Válido até:* ${expira}\n\n` +
      `🔗 Acesse pelo link:\n${link}`
    );

    const a = document.createElement("a");
    a.href = `https://wa.me/?text=${msg}`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const isExpirado = (expiraEm: string) => new Date(expiraEm) < new Date();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Convites de Acesso
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo Convite</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Novo Convite de Acesso
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Convidado (opcional)</Label>
                <Input
                  id="nome"
                  placeholder="Ex: João Silva"
                  value={nomeConvidado}
                  onChange={(e) => setNomeConvidado(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Nível de Acesso</Label>
                <Select value={nivelAcesso} onValueChange={setNivelAcesso}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visitante">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-blue-500" />
                        Visitante (somente leitura)
                      </div>
                    </SelectItem>
                    <SelectItem value="editor">
                      <div className="flex items-center gap-2">
                        <Edit className="h-4 w-4 text-emerald-500" />
                        Editor (acesso integral)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prazo de Validade</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={prazoValor}
                    onChange={(e) => setPrazoValor(e.target.value)}
                    className="w-24"
                  />
                  <Select value={prazoTipo} onValueChange={setPrazoTipo}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="horas">Horas</SelectItem>
                      <SelectItem value="dias">Dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  {prazoTipo === "horas"
                    ? `Expira em ${prazoValor} hora(s)`
                    : `Expira em ${prazoValor} dia(s)`}
                </p>
              </div>

              <Button onClick={criarConvite} disabled={creating} className="w-full">
                {creating ? "Criando..." : "Criar Convite"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
        ) : convites.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum convite criado. Crie um convite para compartilhar acesso ao seu inventário.
          </p>
        ) : (
          convites.map((convite) => {
            const expirado = isExpirado(convite.expira_em);
            const inativo = !convite.ativo || expirado;

            return (
              <div
                key={convite.id}
                className={`flex flex-col gap-2 p-3 rounded-lg border transition-colors ${
                  inativo ? "opacity-50 bg-muted/30" : "bg-card hover:bg-muted/20"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {convite.nivel_acesso === "editor" ? (
                      <Edit className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Eye className="h-4 w-4 text-blue-500 shrink-0" />
                    )}
                    <span className="text-sm font-medium truncate">
                      {convite.nome_convidado || "Sem nome"}
                    </span>
                    <Badge
                      variant={convite.nivel_acesso === "editor" ? "default" : "secondary"}
                      className="text-[10px] px-1.5 py-0 shrink-0"
                    >
                      {convite.nivel_acesso === "editor" ? "Editor" : "Visitante"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!inativo && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => copiarLink(convite.token)}
                          title="Copiar link"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-green-600"
                          onClick={() => compartilharWhatsApp(convite)}
                          title="Enviar por WhatsApp"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => revogarConvite(convite.id)}
                          title="Revogar acesso"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    {inativo && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => excluirConvite(convite.id)}
                        title="Excluir convite"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Criado: {format(new Date(convite.created_at), "dd/MM/yy", { locale: ptBR })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {expirado
                      ? "Expirado"
                      : `Expira: ${format(new Date(convite.expira_em), "dd/MM/yy HH:mm", { locale: ptBR })}`}
                  </span>
                  {!convite.ativo && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      Revogado
                    </Badge>
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
