import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Filter, ChevronDown, ChevronUp, CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface AdvancedFiltersState {
  dataInicio: Date | undefined;
  dataFim: Date | undefined;
  quantidadeMin: string;
  quantidadeMax: string;
  comprimentoMin: string;
  comprimentoMax: string;
  larguraMin: string;
  larguraMax: string;
  profundidadeMin: string;
  profundidadeMax: string;
  pesoMin: string;
  pesoMax: string;
  categoria: string;
  status: string;
  alocacao: string;
}

interface AdvancedFiltersProps {
  filters: AdvancedFiltersState;
  onFiltersChange: (filters: AdvancedFiltersState) => void;
  onApply: () => void;
  onClear: () => void;
  categorias: string[];
  statusList: string[];
  alocacoes: string[];
}

export const initialFilters: AdvancedFiltersState = {
  dataInicio: undefined,
  dataFim: undefined,
  quantidadeMin: "",
  quantidadeMax: "",
  comprimentoMin: "",
  comprimentoMax: "",
  larguraMin: "",
  larguraMax: "",
  profundidadeMin: "",
  profundidadeMax: "",
  pesoMin: "",
  pesoMax: "",
  categoria: "all",
  status: "all",
  alocacao: "all",
};

export const AdvancedFilters = ({
  filters,
  onFiltersChange,
  onApply,
  onClear,
  categorias,
  statusList,
  alocacoes,
}: AdvancedFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const updateFilter = <K extends keyof AdvancedFiltersState>(
    key: K,
    value: AdvancedFiltersState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = () => {
    return (
      filters.dataInicio !== undefined ||
      filters.dataFim !== undefined ||
      filters.quantidadeMin !== "" ||
      filters.quantidadeMax !== "" ||
      filters.comprimentoMin !== "" ||
      filters.comprimentoMax !== "" ||
      filters.larguraMin !== "" ||
      filters.larguraMax !== "" ||
      filters.profundidadeMin !== "" ||
      filters.profundidadeMax !== "" ||
      filters.pesoMin !== "" ||
      filters.pesoMax !== "" ||
      (filters.categoria !== "all" && filters.categoria !== "") ||
      (filters.status !== "all" && filters.status !== "") ||
      (filters.alocacao !== "all" && filters.alocacao !== "")
    );
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-between h-10 sm:h-12",
            hasActiveFilters() && "border-primary bg-primary/5"
          )}
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="text-sm">Filtros Avançados</span>
            {hasActiveFilters() && (
              <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                Ativos
              </span>
            )}
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-3 space-y-4 p-3 sm:p-4 bg-card border rounded-lg">
        {/* Categoria, Status, Alocação */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm">Categoria</Label>
            <Select
              value={filters.categoria}
              onValueChange={(v) => updateFilter("categoria", v)}
            >
              <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categorias.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm">Status</Label>
            <Select
              value={filters.status}
              onValueChange={(v) => updateFilter("status", v)}
            >
              <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {statusList.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm">Alocação</Label>
            <Select
              value={filters.alocacao}
              onValueChange={(v) => updateFilter("alocacao", v)}
            >
              <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {alocacoes.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Data de Cadastro */}
        <div className="space-y-1.5">
          <Label className="text-xs sm:text-sm">Data de Cadastro</Label>
          <div className="grid grid-cols-2 gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-9 sm:h-10 justify-start text-left font-normal text-xs sm:text-sm",
                    !filters.dataInicio && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  {filters.dataInicio
                    ? format(filters.dataInicio, "dd/MM/yy", { locale: ptBR })
                    : "Início"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dataInicio}
                  onSelect={(date) => updateFilter("dataInicio", date)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-9 sm:h-10 justify-start text-left font-normal text-xs sm:text-sm",
                    !filters.dataFim && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  {filters.dataFim
                    ? format(filters.dataFim, "dd/MM/yy", { locale: ptBR })
                    : "Fim"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dataFim}
                  onSelect={(date) => updateFilter("dataFim", date)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Quantidade Total */}
        <div className="space-y-1.5">
          <Label className="text-xs sm:text-sm">Quantidade Total</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Mínimo"
              className="h-9 sm:h-10 text-xs sm:text-sm"
              value={filters.quantidadeMin}
              onChange={(e) => updateFilter("quantidadeMin", e.target.value)}
            />
            <Input
              type="number"
              placeholder="Máximo"
              className="h-9 sm:h-10 text-xs sm:text-sm"
              value={filters.quantidadeMax}
              onChange={(e) => updateFilter("quantidadeMax", e.target.value)}
            />
          </div>
        </div>

        {/* Dimensões */}
        <div className="space-y-1.5">
          <Label className="text-xs sm:text-sm">Dimensões (cm)</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Comprimento</span>
              <div className="flex gap-1">
                <Input
                  type="number"
                  placeholder="Min"
                  className="h-8 sm:h-9 text-xs"
                  value={filters.comprimentoMin}
                  onChange={(e) => updateFilter("comprimentoMin", e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Max"
                  className="h-8 sm:h-9 text-xs"
                  value={filters.comprimentoMax}
                  onChange={(e) => updateFilter("comprimentoMax", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Largura</span>
              <div className="flex gap-1">
                <Input
                  type="number"
                  placeholder="Min"
                  className="h-8 sm:h-9 text-xs"
                  value={filters.larguraMin}
                  onChange={(e) => updateFilter("larguraMin", e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Max"
                  className="h-8 sm:h-9 text-xs"
                  value={filters.larguraMax}
                  onChange={(e) => updateFilter("larguraMax", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <span className="text-xs text-muted-foreground">Profundidade</span>
              <div className="flex gap-1">
                <Input
                  type="number"
                  placeholder="Min"
                  className="h-8 sm:h-9 text-xs"
                  value={filters.profundidadeMin}
                  onChange={(e) => updateFilter("profundidadeMin", e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Max"
                  className="h-8 sm:h-9 text-xs"
                  value={filters.profundidadeMax}
                  onChange={(e) => updateFilter("profundidadeMax", e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Peso */}
        <div className="space-y-1.5">
          <Label className="text-xs sm:text-sm">Peso (kg)</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              step="0.1"
              placeholder="Mínimo"
              className="h-9 sm:h-10 text-xs sm:text-sm"
              value={filters.pesoMin}
              onChange={(e) => updateFilter("pesoMin", e.target.value)}
            />
            <Input
              type="number"
              step="0.1"
              placeholder="Máximo"
              className="h-9 sm:h-10 text-xs sm:text-sm"
              value={filters.pesoMax}
              onChange={(e) => updateFilter("pesoMax", e.target.value)}
            />
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1 h-9 sm:h-10 text-xs sm:text-sm"
            onClick={onClear}
          >
            <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            Limpar
          </Button>
          <Button
            className="flex-1 h-9 sm:h-10 text-xs sm:text-sm"
            onClick={onApply}
          >
            <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            Aplicar
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
