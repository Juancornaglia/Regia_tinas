from flask import Blueprint, jsonify, request
from http import HTTPStatus
# Importamos a conexão do Neon que criamos na pasta db
from db.neon_db import executar_query 
# Importe seus controllers (ajuste os caminhos se necessário)
from controllers import produto_controller, admin_controller

# Define o Blueprint com o prefixo correto
api_admin = Blueprint('api_admin', __name__, url_prefix='/api/admin')

# --- ROTA: Relatório Geral ---
@api_admin.route('/relatorio-geral', methods=['GET'])
def relatorio_geral():
    try:
        # A lógica de soma e contagem agora acontece direto no SQL dentro do controller
        resultado = admin_controller.gerar_relatorio_servicos()
        return jsonify(resultado), HTTPStatus.OK
    except Exception as e:
        return jsonify({"error": f"Erro ao gerar relatório: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR

# --- ROTA: Produtos (Listar e Inserir) ---
@api_admin.route('/produtos', methods=['GET', 'POST'])
def produtos_admin():
    if request.method == 'GET':
        try:
            # Buscamos direto no Neon
            produtos = executar_query("SELECT * FROM public.produtos ORDER BY nome_produto ASC")
            return jsonify(produtos), HTTPStatus.OK
        except Exception as e:
            return jsonify({"error": "Falha ao listar produtos."}), HTTPStatus.INTERNAL_SERVER_ERROR
    
    if request.method == 'POST':
        dados = request.get_json()
        if not dados: 
            return jsonify({"error": "Dados inválidos."}), HTTPStatus.BAD_REQUEST
        
        try:
            # Chama o controller para inserir no Neon
            sucesso = produto_controller.inserir_produto_neon(dados)
            if sucesso:
                return jsonify({"message": "Produto inserido!"}), HTTPStatus.CREATED
        except Exception as e:
            return jsonify({"error": str(e)}), HTTPStatus.INTERNAL_SERVER_ERROR

# --- ROTA: Produtos (Buscar, Atualizar e Deletar) ---
@api_admin.route('/produtos/<int:produto_id>', methods=['GET', 'PUT', 'DELETE'])
def produto_por_id_admin(produto_id):
    
    if request.method == 'GET':
        try:
            produto = executar_query("SELECT * FROM public.produtos WHERE id_produto = %s", (produto_id,))
            if not produto:
                return jsonify({"error": "Produto não encontrado."}), HTTPStatus.NOT_FOUND
            return jsonify(produto[0]), HTTPStatus.OK
        except Exception as e:
            return jsonify({"error": "Erro ao buscar produto."}), HTTPStatus.INTERNAL_SERVER_ERROR

    if request.method == 'PUT':
        dados = request.get_json()
        try:
            # SQL para atualizar no Neon
            sql = """
                UPDATE public.produtos 
                SET nome_produto = %s, preco = %s, quantidade_estoque = %s, url_imagem = %s
                WHERE id_produto = %s
            """
            valores = (dados['nome_produto'], dados['preco'], dados['quantidade_estoque'], dados['url_imagem'], produto_id)
            executar_query(sql, valores)
            return jsonify({"message": "Produto atualizado com sucesso!"}), HTTPStatus.OK
        except Exception as e:
            return jsonify({"error": "Falha na atualização."}), HTTPStatus.INTERNAL_SERVER_ERROR

    if request.method == 'DELETE':
        try:
            executar_query("DELETE FROM public.produtos WHERE id_produto = %s", (produto_id,))
            return jsonify({"message": "Deletado com sucesso."}), HTTPStatus.OK
        except Exception as e:
            return jsonify({"error": "Erro ao deletar."}), HTTPStatus.INTERNAL_SERVER_ERROR