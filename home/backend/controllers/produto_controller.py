from db.neon_db import executar_query

def listar_produtos():
    """Lista todos os produtos para o Painel ADM usando Neon."""
    try:
        sql = "SELECT * FROM public.produtos ORDER BY nome_produto ASC"
        return executar_query(sql)
    except Exception as e:
        print(f"[ProdutoController] Erro ao listar produtos: {e}")
        return []

def buscar_produto_por_id_neon(produto_id: int):
    """Busca um produto pelo ID para edição e consulta no Neon."""
    try:
        sql = "SELECT * FROM public.produtos WHERE id_produto = %s"
        resultado = executar_query(sql, (produto_id,))
        return resultado[0] if resultado else None
    except Exception as e:
        print(f"[ProdutoController] Erro ao buscar produto ID {produto_id}: {e}")
        return None

def inserir_produto_neon(dados: dict):
    """Insere um novo produto no banco Neon."""
    try:
        sql = """
            INSERT INTO public.produtos 
            (nome_produto, preco, preco_promocional, quantidade_estoque, url_imagem, descricao, marca, tipo_produto, id_loja)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id_produto
        """
        valores = (
            dados['nome_produto'],
            dados['preco'],
            dados.get('preco_promocional'),
            dados.get('quantidade_estoque', 0),
            dados.get('url_imagem'),
            dados.get('descricao'),
            dados.get('marca'),
            dados.get('tipo_produto'),
            dados.get('id_loja', 1)
        )
        return executar_query(sql, valores)
    except Exception as e:
        print(f"[ProdutoController] Erro ao inserir produto: {e}")
        raise

def atualizar_produto_neon(produto_id: int, dados: dict):
    """Atualiza um produto existente no Neon."""
    try:
        # Removemos o ID dos dados para não tentar atualizar a chave primária
        dados.pop('id_produto', None)
        
        sql = """
            UPDATE public.produtos 
            SET nome_produto = %s, preco = %s, preco_promocional = %s, 
                quantidade_estoque = %s, url_imagem = %s, descricao = %s, 
                marca = %s, tipo_produto = %s
            WHERE id_produto = %s
        """
        valores = (
            dados['nome_produto'],
            dados['preco'],
            dados.get('preco_promocional'),
            dados.get('quantidade_estoque'),
            dados.get('url_imagem'),
            dados.get('descricao'),
            dados.get('marca'),
            dados.get('tipo_produto'),
            produto_id
        )
        executar_query(sql, valores)
        return True
    except Exception as e:
        print(f"[ProdutoController] Erro ao atualizar produto ID {produto_id}: {e}")
        return False

def deletar_produto_neon(produto_id: int):
    """Deleta um produto pelo ID no Neon."""
    try:
        sql = "DELETE FROM public.produtos WHERE id_produto = %s"
        executar_query(sql, (produto_id,))
        return True
    except Exception as e:
        print(f"[ProdutoController] Erro ao deletar produto ID {produto_id}: {e}")
        return False