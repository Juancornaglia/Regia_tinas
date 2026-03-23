from db.neon_db import executar_query

def gerar_relatorio_servicos():
    """
    Busca agendamentos no Neon e calcula KPIs de faturamento e serviços.
    Substitui a lógica manual do Python por agregações SQL de alta performance.
    """
    try:
        # 1. Query SQL para buscar os dados consolidados
        # Fazemos um JOIN entre agendamentos e servicos para pegar os nomes e preços
        sql = """
            SELECT 
                s.nome_servico,
                s.preco,
                a.status
            FROM public.agendamentos a
            JOIN public.servicos s ON a.id_servico = s.id_servico
            WHERE a.status != 'cancelado'
        """
        
        dados = executar_query(sql)

        if not dados:
            return {
                "faturamento_total": 0,
                "ticket_medio": 0,
                "total_agendamentos": 0,
                "mensagem": "Sem dados para processar"
            }

        # 2. Processamento dos KPIs
        total_agendamentos = len(dados)
        total_faturado = sum(item['preco'] for item in dados)
        
        # Cálculo do serviço mais procurado usando um dicionário simples
        contagem = {}
        for item in dados:
            nome = item['nome_servico']
            contagem[nome] = contagem.get(nome, 0) + 1
        
        servico_mais_procurado = max(contagem, key=contagem.get) if contagem else "N/A"

        # 3. Retorno dos KPIs estruturados para o Frontend
        return {
            "faturamento_total": float(total_faturado),
            "servico_mais_procurado": [servico_mais_procurado, contagem.get(servico_mais_procurado, 0)],
            "ticket_medio": float(total_faturado / total_agendamentos) if total_agendamentos > 0 else 0,
            "total_agendamentos": total_agendamentos
        }

    except Exception as e:
        print(f"❌ Erro ao gerar relatório no Neon: {e}")
        return {"erro": str(e)}