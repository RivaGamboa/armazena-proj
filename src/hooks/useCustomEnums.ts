import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CustomEnumItem {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  cor?: string;
}

export const useCustomEnums = () => {
  const [categorias, setCategorias] = useState<CustomEnumItem[]>([]);
  const [alocacoes, setAlocacoes] = useState<CustomEnumItem[]>([]);
  const [statusList, setStatusList] = useState<CustomEnumItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEnums = async () => {
    try {
      const [catRes, alocRes, statusRes] = await Promise.all([
        supabase.from("categorias_item").select("*").eq("ativo", true).order("nome"),
        supabase.from("alocacoes").select("*").eq("ativo", true).order("nome"),
        supabase.from("status_item").select("*").eq("ativo", true).order("nome"),
      ]);

      if (catRes.data) setCategorias(catRes.data);
      if (alocRes.data) setAlocacoes(alocRes.data);
      if (statusRes.data) setStatusList(statusRes.data);
    } catch (error) {
      console.error("Erro ao carregar enums:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEnums();
  }, []);

  return { categorias, alocacoes, statusList, loading, refetch: loadEnums };
};
