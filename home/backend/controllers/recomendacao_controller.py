from db.neon_db import executar_query

def buscar_ofertas_neon(loja_id: int):
    """
    Busca produtos com preço promocional no Neon.
    Filtra por loja_id para respeitar a unidade selecionada.
    """
    try:
        sql = """
            SELECT id_produto, nome_produto, url_imagem, preco, preco_promocional 
            FROM public.produtos 
            WHERE id_loja = %s 
              AND preco_promocional < preco 
              AND preco_promocional IS NOT NULL
            ORDER BY id_produto DESC 
            LIMIT 8
        """
        return executar_query(sql, (loja_id,))
    except Exception as e:
        print(f"[RecomendacaoController] Erro ao buscar ofertas: {e}")
        return []

def buscar_novidades_neon(loja_id: int, limite: int = 8):
    """
    Busca os produtos cadastrados mais recentemente no Neon.
    """
    try:
        sql = """
            SELECT id_produto, nome_produto, url_imagem, preco, preco_promocional 
            FROM public.produtos 
            WHERE id_loja = %s 
            ORDER BY id_produto DESC 
            LIMIT %s
        """
        return executar_query(sql, (loja_id, limite))
    except Exception as e:
        print(f"[RecomendacaoController] Erro ao buscar novidades: {e}")
        return []

def buscar_mais_vendidos_neon(loja_id: int, limite: int = 12):
    """
    Simula 'mais vendidos' trazendo os itens com maior estoque na unidade.
    """
    try:
        sql = """
            SELECT id_produto, nome_produto, url_imagem, preco, preco_promocional, quantidade_estoque 
            FROM public.produtos 
            WHERE id_loja = %s 
            ORDER BY quantidade_estoque DESC 
            LIMIT %s
        """
        return executar_query(sql, (loja_id, limite))
    except Exception as e:
        print(f"[RecomendacaoController] Erro ao buscar mais vendidos: {e}")
        return []