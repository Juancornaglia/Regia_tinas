from flask import Blueprint, jsonify, request
from http import HTTPStatus
from db.neon_db import executar_query
# Importamos os controllers adaptados para o Neon
# Como deve ficar (Corrigido):
from controllers import recomendacao_controller, produto_controller

api_ecommerce = Blueprint('api_ecommerce', __name__, url_prefix='/api/ecommerce')

# --- Rotas de Vitrine (Home) ---

@api_ecommerce.route('/ofertas', methods=['GET'])
def get_ofertas():
    try:
        loja_id = request.args.get('loja_id', 1) # Padrão loja 1 se não enviar
        # O controller agora faz o SELECT no Neon filtrando por preco_promocional e loja_id
        ofertas = recomendacao_controller.buscar_ofertas_neon(loja_id)
        return jsonify(ofertas), HTTPStatus.OK
    except Exception as e:
        return jsonify({"error": f"Erro ao carregar ofertas: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR

@api_ecommerce.route('/novidades', methods=['GET'])
def get_novidades():
    try:
        loja_id = request.args.get('loja_id', 1)
        novidades = recomendacao_controller.buscar_novidades_neon(loja_id, limite=8)
        return jsonify(novidades), HTTPStatus.OK
    except Exception:
        return jsonify({"error": "Falha ao carregar novidades."}), HTTPStatus.INTERNAL_SERVER_ERROR

@api_ecommerce.route('/mais-vendidos', methods=['GET'])
def get_mais_vendidos():
    try:
        loja_id = request.args.get('loja_id', 1)
        # Busca itens com maior saída ou maior estoque para destacar
        mais_vendidos = recomendacao_controller.buscar_mais_vendidos_neon(loja_id, limite=12) 
        return jsonify(mais_vendidos), HTTPStatus.OK
    except Exception:
        return jsonify({"error": "Falha ao carregar mais vendidos."}), HTTPStatus.INTERNAL_SERVER_ERROR

# --- Rota: Detalhe do Produto ---
@api_ecommerce.route('/produtos/<int:produto_id>', methods=['GET'])
def get_produto_por_id(produto_id):
    try:
        # Busca direta no Neon pelo ID
        produto = produto_controller.buscar_produto_por_id_neon(produto_id)
        if not produto:
             return jsonify({"error": "Produto não encontrado."}), HTTPStatus.NOT_FOUND
        return jsonify(produto), HTTPStatus.OK
    except Exception:
        return jsonify({"error": "Falha ao buscar produto."}), HTTPStatus.INTERNAL_SERVER_ERROR

# --- Rota de Sincronização de Estoque ---
@api_ecommerce.route('/sync-estoque', methods=['POST'])
def sync():
    try:
        # Lógica para bater o estoque físico com o virtual no Neon
        resultado = recomendacao_controller.sinconizar_estoque_neon()
        return jsonify(resultado), HTTPStatus.OK
    except Exception as e:
        return jsonify({"error": str(e)}), HTTPStatus.INTERNAL_SERVER_ERROR