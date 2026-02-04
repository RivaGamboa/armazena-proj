import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  CategoriaRestaurante, 
  ItemRestaurante, 
  MovimentacaoRestaurante, 
  DashboardStats,
  MovimentoTipo,
  Localizacao,
  ItemStatus
} from '@/types/restaurante';
import { toast } from 'sonner';

export const useRestauranteData = () => {
  const [categorias, setCategorias] = useState<CategoriaRestaurante[]>([]);
  const [itens, setItens] = useState<ItemRestaurante[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoRestaurante[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalItens: 0,
    estoqueBaixo: 0,
    emManutencao: 0,
    valorTotal: 0,
    totalCategorias: 0,
    movimentacoesHoje: 0
  });
  const [loading, setLoading] = useState(true);

  const loadCategorias = useCallback(async () => {
    const { data, error } = await supabase
      .from('categorias_restaurante')
      .select('*')
      .order('nome');
    
    if (error) {
      console.error('Error loading categories:', error);
      return;
    }
    setCategorias(data || []);
  }, []);

  const loadItens = useCallback(async () => {
    const { data, error } = await supabase
      .from('itens_restaurante')
      .select(`
        *,
        categoria:categorias_restaurante(*)
      `)
      .order('nome');
    
    if (error) {
      console.error('Error loading items:', error);
      return;
    }
    setItens(data || []);
  }, []);

  const loadMovimentacoes = useCallback(async (limit = 50) => {
    const { data, error } = await supabase
      .from('movimentacoes_restaurante')
      .select(`
        *,
        item:itens_restaurante(id, nome, categoria_id)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error loading movements:', error);
      return;
    }
    // Map data to match our type structure
    const mapped = (data || []).map(mov => ({
      ...mov,
      item: mov.item ? { ...mov.item } as any : undefined
    })) as MovimentacaoRestaurante[];
    setMovimentacoes(mapped);
  }, []);

  const calculateStats = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    
    // Get items stats
    const { data: itemsData } = await supabase
      .from('itens_restaurante')
      .select('quantidade, quantidade_minima, custo, status');
    
    // Get categories count
    const { count: categoriasCount } = await supabase
      .from('categorias_restaurante')
      .select('*', { count: 'exact', head: true });
    
    // Get today's movements
    const { count: movimentacoesHoje } = await supabase
      .from('movimentacoes_restaurante')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today);
    
    if (itemsData) {
      const totalItens = itemsData.reduce((sum, item) => sum + item.quantidade, 0);
      const estoqueBaixo = itemsData.filter(item => item.quantidade <= item.quantidade_minima).length;
      const emManutencao = itemsData.filter(item => item.status === 'manutencao').length;
      const valorTotal = itemsData.reduce((sum, item) => sum + ((item.custo || 0) * item.quantidade), 0);
      
      setStats({
        totalItens,
        estoqueBaixo,
        emManutencao,
        valorTotal,
        totalCategorias: categoriasCount || 0,
        movimentacoesHoje: movimentacoesHoje || 0
      });
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      loadCategorias(),
      loadItens(),
      loadMovimentacoes(),
      calculateStats()
    ]);
    setLoading(false);
  }, [loadCategorias, loadItens, loadMovimentacoes, calculateStats]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // CRUD Operations
  const createCategoria = async (data: { nome: string; descricao?: string; cor?: string }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { error } = await supabase
      .from('categorias_restaurante')
      .insert([{ nome: data.nome, descricao: data.descricao, cor: data.cor, criado_por: user.id }]);
    
    if (error) throw error;
    await loadCategorias();
    await calculateStats();
    toast.success('Categoria criada com sucesso!');
  };

  const updateCategoria = async (id: string, data: Partial<CategoriaRestaurante>) => {
    const { error } = await supabase
      .from('categorias_restaurante')
      .update(data)
      .eq('id', id);
    
    if (error) throw error;
    await loadCategorias();
    toast.success('Categoria atualizada!');
  };

  const deleteCategoria = async (id: string) => {
    const { error } = await supabase
      .from('categorias_restaurante')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    await loadCategorias();
    await calculateStats();
    toast.success('Categoria removida!');
  };

  const createItem = async (data: { 
    nome: string; 
    descricao?: string;
    categoria_id?: string;
    quantidade?: number;
    quantidade_minima?: number;
    localizacao?: Localizacao;
    fornecedor?: string;
    custo?: number;
    data_aquisicao?: string;
    codigo_barras?: string;
    foto_url?: string;
    status?: ItemStatus;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { error } = await supabase
      .from('itens_restaurante')
      .insert([{ 
        nome: data.nome,
        descricao: data.descricao,
        categoria_id: data.categoria_id,
        quantidade: data.quantidade ?? 0,
        quantidade_minima: data.quantidade_minima ?? 5,
        localizacao: data.localizacao ?? 'Deposito',
        fornecedor: data.fornecedor,
        custo: data.custo,
        data_aquisicao: data.data_aquisicao,
        codigo_barras: data.codigo_barras,
        foto_url: data.foto_url,
        status: data.status ?? 'ativo',
        criado_por: user.id 
      }]);
    
    if (error) throw error;
    await loadItens();
    await calculateStats();
    toast.success('Item cadastrado com sucesso!');
  };

  const updateItem = async (id: string, data: Partial<ItemRestaurante>) => {
    const { error } = await supabase
      .from('itens_restaurante')
      .update(data)
      .eq('id', id);
    
    if (error) throw error;
    await loadItens();
    await calculateStats();
    toast.success('Item atualizado!');
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase
      .from('itens_restaurante')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    await loadItens();
    await calculateStats();
    toast.success('Item removido!');
  };

  const createMovimentacao = async (data: {
    item_id: string;
    tipo: MovimentoTipo;
    quantidade: number;
    observacao?: string;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { error } = await supabase
      .from('movimentacoes_restaurante')
      .insert([{ ...data, usuario_id: user.id }]);
    
    if (error) throw error;
    await loadItens();
    await loadMovimentacoes();
    await calculateStats();
    toast.success('Movimentação registrada!');
  };

  const uploadItemPhoto = async (file: File, itemName: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${itemName.replace(/\s+/g, '-')}-${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('item-photos')
      .upload(fileName, file);
    
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage
      .from('item-photos')
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  return {
    categorias,
    itens,
    movimentacoes,
    stats,
    loading,
    refresh: loadAll,
    createCategoria,
    updateCategoria,
    deleteCategoria,
    createItem,
    updateItem,
    deleteItem,
    createMovimentacao,
    uploadItemPhoto
  };
};
