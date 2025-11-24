import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const systemPrompt = `Você é um assistente de gestão de estoque. Analise as perguntas do usuário sobre o estoque e retorne filtros JSON.

Categorias válidas: Ferramentas, Materiais, Equipamentos, Consumíveis
Status válidos: NOVO, USADO, DANIFICADO, EM_MANUTENCAO
Alocações válidas: DEPOSITO, EVENTO, FUNCIONARIO

Exemplos:
- "itens em EVENTO" → {"alocacao": "EVENTO"}
- "ferramentas USADAS" → {"categoria": "Ferramentas", "status": "USADO"}
- "mostre CONSUMÍVEIS" → {"categoria": "Consumíveis"}
- "materiais no DEPÓSITO novos" → {"categoria": "Materiais", "alocacao": "DEPOSITO", "status": "NOVO"}

SEMPRE responda APENAS com JSON válido no formato:
{
  "filters": {
    "categoria": "valor ou null",
    "status": "valor ou null", 
    "alocacao": "valor ou null"
  },
  "message": "mensagem amigável explicando o filtro aplicado"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições atingido. Tente novamente mais tarde." }), 
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos esgotados. Adicione créditos ao workspace." }), 
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("Resposta vazia da IA");
    }

    // Tentar extrair JSON da resposta
    let result;
    try {
      result = JSON.parse(content);
    } catch {
      // Se não for JSON válido, tentar extrair do markdown
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[1]);
      } else {
        result = JSON.parse(content);
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Erro no chat:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro desconhecido",
        filters: null,
        message: "Desculpe, não consegui processar sua pergunta."
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
