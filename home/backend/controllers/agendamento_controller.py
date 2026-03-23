from datetime import datetime, time, timedelta, timezone
from db.neon_db import executar_query
import traceback

# --- Constantes de Funcionamento ---
HORA_INICIO_PADRAO = time(9, 0)
HORA_FIM_PADRAO = time(18, 0)
INTERVALO_SLOT_MINUTOS = 30 

def calcular_horarios_disponiveis_neon(loja_id: int, servico_id: int, data_str: str):
    """
    Calcula slots livres no Neon baseados na capacidade da loja e agendamentos existentes.
    """
    try:
        # 1. Verificar se o dia está bloqueado
        bloqueio = executar_query(
            "SELECT motivo FROM public.dias_bloqueados WHERE data_bloqueada = %s AND (id_loja = %s OR id_loja IS NULL)",
            (data_str, loja_id)
        )
        if bloqueio: return [] # Dia fechado

        # 2. Buscar Regra de Capacidade e Duração
        regra = executar_query(
            """SELECT r.capacidade_simultanea, s.duracao_media_minutos 
               FROM public.servicos_loja_regras r
               JOIN public.servicos s ON r.id_servico = s.id_servico
               WHERE r.id_loja = %s AND r.id_servico = %s AND r.ativo = TRUE""",
            (loja_id, servico_id)
        )
        if not regra: return []
        
        capacidade = regra[0]['capacidade_simultanea']
        duracao = regra[0]['duracao_media_minutos'] or INTERVALO_SLOT_MINUTOS

        # 3. Buscar Agendamentos do Dia
        agendamentos = executar_query(
            """SELECT data_hora_inicio, data_hora_fim FROM public.agendamentos 
               WHERE id_loja = %s AND DATE(data_hora_inicio) = %s AND status != 'cancelado'""",
            (loja_id, data_str)
        )

        # 4. Gerar Slots e Validar Capacidade
        data_ref = datetime.strptime(data_str, '%Y-%m-%d').date()
        horarios_livres = []
        atual = datetime.combine(data_ref, HORA_INICIO_PADRAO)
        fim_dia = datetime.combine(data_ref, HORA_FIM_PADRAO)

        while atual + timedelta(minutes=duracao) <= fim_dia:
            slot_inicio = atual
            slot_fim = atual + timedelta(minutes=duracao)
            
            # Conta quantos agendamentos batem com este horário
            conflitos = 0
            for ag in agendamentos:
                # O Neon/Psycopg2 já retorna objetos datetime
                if slot_inicio < ag['data_hora_fim'] and slot_fim > ag['data_hora_inicio']:
                    conflitos += 1
            
            if conflitos < capacidade:
                horarios_livres.append(atual.strftime('%H:%M'))
            
            atual += timedelta(minutes=INTERVALO_SLOT_MINUTOS)

        return horarios_livres
    except Exception as e:
        print(f"Erro ao calcular horários: {e}")
        return []

def criar_novo_agendamento_neon(data: dict):
    """
    Valida e insere agendamento no Neon, simulando a auditoria no mesmo banco.
    """
    try:
        # Extração de dados
        loja_id = data['id_loja']
        servico_id = data['id_servico']
        inicio_str = data['data_hora_inicio'] # Ex: '2026-03-25T10:00:00'
        inicio_dt = datetime.fromisoformat(inicio_str)
        
        # Busca duração para calcular o fim
        servico = executar_query("SELECT duracao_media_minutos FROM public.servicos WHERE id_servico = %s", (servico_id,))
        duracao = servico[0]['duracao_media_minutos'] if servico else 30
        fim_dt = inicio_dt + timedelta(minutes=duracao)

        # Inserção no Neon
        sql_insert = """
            INSERT INTO public.agendamentos 
            (id_cliente, id_pet, id_loja, id_servico, data_hora_inicio, data_hora_fim, status, observacoes_cliente)
            VALUES (%s, %s, %s, %s, %s, %s, 'confirmado', %s)
            RETURNING id_agendamento
        """
        params = (data['id_cliente'], data.get('id_pet'), loja_id, servico_id, inicio_dt, fim_dt, data.get('observacoes_cliente'))
        
        novo_id = executar_query(sql_insert, params)

        if novo_id:
            # SIMULAÇÃO DE AUDITORIA: Salva na tabela de logs do próprio Neon
            executar_query(
                "INSERT INTO public.logs_auditoria (tabela, registro_id, acao) VALUES ('agendamentos', %s, 'INSERT')",
                (novo_id[0]['id_agendamento'],)
            )
            return {"id": novo_id[0]['id_agendamento'], "status": "sucesso"}
        
        return None
    except Exception as e:
        traceback.print_exc()
        raise e