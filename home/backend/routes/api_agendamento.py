from flask import Blueprint, jsonify, request
from http import HTTPStatus
import traceback
# Importamos a nossa nova função de query global
from db.neon_db import executar_query
# Importamos o controller que agora deve usar o Neon internamente
from controllers.agendamento_controller import (
    calcular_horarios_disponiveis_neon, 
    criar_novo_agendamento_neon
)

api_agendamento = Blueprint('api_agendamento', __name__, url_prefix='/api/agendamento')

# --- ROTA: Horários Disponíveis (GET) ---
@api_agendamento.route('/horarios-disponiveis', methods=['GET'])
def horarios_disponiveis():
    try:
        loja_id = request.args.get('loja_id')
        servico_id = request.args.get('servico_id')
        data_str = request.args.get('data')
        
        if not all([loja_id, servico_id, data_str]):
            return jsonify({"error": "Parâmetros incompletos."}), HTTPStatus.BAD_REQUEST

        # O controller agora busca os horários ocupados no Neon e subtrai dos totais
        horarios = calcular_horarios_disponiveis_neon(int(loja_id), int(servico_id), data_str)
        return jsonify(horarios), HTTPStatus.OK

    except Exception as e:
        print(f"❌ Erro em /horarios-disponiveis: {e}")
        return jsonify({"error": "Erro ao calcular horários."}), HTTPStatus.INTERNAL_SERVER_ERROR


# --- ROTA: Criar Agendamento (POST) ---
@api_agendamento.route('/agendar', methods=['POST'])
def agendar():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Dados não fornecidos."}), HTTPStatus.BAD_REQUEST

    try:
        # 1. O Controller agora faz a inserção direta no Neon
        # Removemos o 'supabase' e o 'oracle_auditoria' daqui
        resultado = criar_novo_agendamento_neon(data)
        
        if resultado:
            return jsonify({
                "message": "Agendamento confirmado com sucesso no Neon!", 
                "agendamento": resultado
            }), HTTPStatus.CREATED
        
        return jsonify({"error": "Não foi possível confirmar o agendamento."}), HTTPStatus.BAD_REQUEST

    except ValueError as e:
        # Exemplo: Se o horário foi ocupado enquanto o usuário preenchia o form
        return jsonify({"error": str(e)}), HTTPStatus.CONFLICT 
    except Exception as e:
        print(f"❌ ERRO CRÍTICO em /agendar: {e}")
        traceback.print_exc()
        return jsonify({"error": "Erro interno ao processar agendamento."}), HTTPStatus.INTERNAL_SERVER_ERROR